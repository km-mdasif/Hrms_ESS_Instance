const sql = require('./backend/node_modules/mssql');
const config = {
  server: '192.168.1.100',
  database: 'hrms',
  user: 'sa',
  password: 'sql@123',
  port: 2439,
  options: { encrypt: false, trustServerCertificate: true }
};
(async () => {
  try {
    const pool = await sql.connect(config);
    console.log('connected');
    const tables = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME IN ('usermaster','UserMaster','Employee','employee') ORDER BY TABLE_NAME");
    console.log('tables:', JSON.stringify(tables.recordset));
    for (const t of tables.recordset) {
      const cols = await pool.request()
        .input('schema', sql.NVarChar, t.TABLE_SCHEMA)
        .input('name', sql.NVarChar, t.TABLE_NAME)
        .query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@schema AND TABLE_NAME=@name ORDER BY ORDINAL_POSITION");
      console.log('columns for', `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`, JSON.stringify(cols.recordset));
    }
    const procs = await pool.request().query("SELECT SPECIFIC_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE' AND SPECIFIC_NAME='sp_webapi'");
    console.log('sp_webapi exists:', procs.recordset.length > 0);
    await pool.close();
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
