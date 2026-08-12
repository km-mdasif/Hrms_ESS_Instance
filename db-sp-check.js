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
    const procDef = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_webapi')) AS procdef");
    console.log('procdef length', procDef.recordset.length);
    if(procDef.recordset.length) console.log(procDef.recordset[0].procdef.slice(0, 2000));
    const result = await pool.request()
      .input('operation', sql.NVarChar(50), 'authenticate_user')
      .input('username', sql.NVarChar(100), 'admin')
      .input('password', sql.NVarChar(100), '123456')
      .execute('sp_webapi');
    console.log('execute result keys', Object.keys(result));
    console.log('recordset length', result.recordset.length);
    console.log('recordset', JSON.stringify(result.recordset));
    await pool.close();
  } catch(e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
