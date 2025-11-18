import { getSqlJs } from './sqlInit';
import Papa from 'papaparse';

export type DB = any;

export async function csvFileToDbBytes(file: File): Promise<Uint8Array> {
  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  const SQL = await getSqlJs();
  const db = new SQL.Database();

  const fields = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
  if (!fields || fields.length === 0) throw new Error('CSV sem cabeçalho detectável');

  // Criar tabela 'item' com campos TEXT
  const cols = fields.map((f: string) => `"${f}" TEXT`).join(', ');
  db.run(`CREATE TABLE item (${cols});`);

  // Inserir dados da segunda linha em diante
  const placeholders = fields.map(() => '?').join(',');
  const fieldNames = fields.map((f: string) => `"${f}"`).join(',');
  const insertSQL = `INSERT INTO item (${fieldNames}) VALUES (${placeholders});`;
  
  const stmt = db.prepare(insertSQL);
  for (const r of rows) {
    const vals = fields.map((f: string) => (r[f] ?? '').toString());
    stmt.bind(vals);
    stmt.step();
    stmt.reset();
  }
  stmt.free();

  return db.export();
}
