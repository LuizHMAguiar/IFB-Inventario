import initSqlJs from 'sql.js';
import Papa from 'papaparse';

export type DB = any;

export async function importGoogleSheetToSQLite(sheetUrl: string): Promise<DB> {
  // accept full sheet URL and try to convert to export CSV
  // sanitize input: if user pasted multiple URLs (concatenated), pick the first occurrence
  const urls = sheetUrl.match(/https?:\/\/[^\s'"\)]+/g);
  if (urls && urls.length > 0) sheetUrl = urls[0];
  let csvUrl = sheetUrl;
  try {
    // if the URL already points to an exported CSV or a published /pub URL, use it as-is
    const lower = sheetUrl.toLowerCase();
    if (lower.includes('export?format=csv') || lower.includes('output=csv') || lower.includes('/pub')) {
      csvUrl = sheetUrl;
    } else {
      // parse and try to reconstruct cleanly
      const u = new URL(sheetUrl);
      // preserve gid and single if present
      const gid = u.searchParams.get('gid');
      const single = u.searchParams.get('single');

      // detect spreadsheets id in path
      const m = sheetUrl.match(/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
      if (m) {
        const id = m[1];
        if (sheetUrl.includes('/spreadsheets/d/e/')) {
          const out = new URL('https://docs.google.com');
          out.pathname = `/spreadsheets/d/e/${id}/pub`;
          if (gid) out.searchParams.set('gid', gid);
          if (single) out.searchParams.set('single', single);
          out.searchParams.set('output', 'csv');
          csvUrl = out.toString();
        } else {
          const out = new URL('https://docs.google.com');
          out.pathname = `/spreadsheets/d/${id}/export`;
          if (gid) out.searchParams.set('gid', gid);
          if (single) out.searchParams.set('single', single);
          out.searchParams.set('format', 'csv');
          csvUrl = out.toString();
        }
      } else {
        // fallback to original URL
        csvUrl = sheetUrl;
      }
    }
  } catch (err) {
    // fallback to original
    csvUrl = sheetUrl;
  }

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('Falha ao baixar CSV: ' + res.statusText);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string,string>[];

  const SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });
  const db = new SQL.Database();

  // infer columns from headers (parsed.meta.fields)
  const fields = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
  if (!fields || fields.length === 0) throw new Error('Planilha sem cabeçalho detectável');

  const cols = fields.map((f: string) => `"[${f}]" TEXT`).join(', ');
  db.run(`CREATE TABLE itens (${cols});`);

  const insertSQL = `INSERT INTO itens (${fields.map((f: string)=>`"[${f}]"`).join(',')}) VALUES (${fields.map(()=>'?').join(',')});`;
  const stmt = db.prepare(insertSQL);
  for (const r of rows) {
    const vals = fields.map((f: string) => (r[f] ?? '').toString());
    stmt.run(vals);
  }
  stmt.free();

  return db;
}

// Serialize a sql.js Database to a base64 string for persistence
export function serializeDbToBase64(db: any): string {
  // db.export() returns Uint8Array
  const u8 = db.export();
  let binary = '';
  const len = u8.length;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

// Deserialize from base64 to a sql.js Database instance
export async function deserializeDbFromBase64(b64: string): Promise<DB> {
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  const SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });
  const db = new SQL.Database(u8);
  return db;
}
