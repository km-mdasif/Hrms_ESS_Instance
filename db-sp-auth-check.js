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
    const sqlText = `
      SELECT definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON m.object_id = o.object_id
      WHERE o.name = 'sp_webapi' AND type = 'P';
    `;
    const result = await pool.request().query(sqlText);
    if (!result.recordset.length) {
      console.log('proc not found');
      return;
    }
    const def = result.recordset[0].definition;
    const lines = def.split(/\r?\n/);
    const start = lines.findIndex(l => /authenticate_user/i.test(l));
    console.log('authenticate_user line index', start);
    console.log(lines.slice(Math.max(0, start-10), start+40).join('\n'));
    await pool.close();
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
