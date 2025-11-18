import initSqlJs from 'sql.js';

let sqlInstance: any = null;

export async function getSqlJs() {
  if (!sqlInstance) {
    sqlInstance = await initSqlJs({
      locateFile: (file: string) => `/sql-wasm.wasm`
    });
  }
  return sqlInstance;
}
