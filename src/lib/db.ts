import { getSqlJs } from './sqlInit';

export type DB = any;

export async function deserializeDbFromBase64(b64: string): Promise<DB> {
  const SQL = await getSqlJs();
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new SQL.Database(bytes);
}

export function findItemByNumero(db:any, numero:string) {
  if (!db) return null;
  // try common column names for number: numero, id, etiqueta, tag
  // get columns
  const info = db.exec("PRAGMA table_info('item');");
  const cols = (info[0]?.values ?? []).map((v:any)=>v[1].toString());
  // choose candidate column
  const candidates = ['numero','id','etiqueta','tag','codigo','codigo_item','codigo_item'.toLowerCase()];
  let colName = cols.map((c:any)=>c.toString().toLowerCase()).find((c:any)=>candidates.includes(c));
  if (!colName) colName = cols[0];
  // perform select
  try {
    const stmt = db.prepare(`SELECT * FROM item WHERE "${colName}" = ? LIMIT 1;`);
    stmt.bind([numero]);
    const ok = stmt.step();
    if (!ok) { stmt.free(); return null; }
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  } catch (err:any){
    console.error(err);
    return null;
  }
}
