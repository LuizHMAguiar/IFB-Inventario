declare module 'papaparse' {
  const Papa: {
    parse: (input: string | File, config?: any) => any;
  } & any;
  export default Papa;
}

declare module 'sql.js' {
  type InitSqlJs = (opts?: { locateFile?: (file: string) => string }) => Promise<any>;
  const initSqlJs: InitSqlJs;
  export default initSqlJs;
}
