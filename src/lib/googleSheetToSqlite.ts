import initSqlJs from 'sql.js';
import Papa from 'papaparse';

export type DB = any;

export async function importGoogleSheetToSQLite(sheetUrl: string): Promise<DB> {
  // accept full sheet URL and try to convert to export CSV
  let csvUrl = sheetUrl;
  if (sheetUrl.includes('/edit')) {
    csvUrl = sheetUrl.replace('/edit#gid=', '/export?format=csv&gid=');
  } else if (!sheetUrl.includes('export?format=csv')) {
    // try to detect id and construct export url
    const m = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
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
