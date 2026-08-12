// DB check script - call with: node scripts/db-check.js <username> <password>
// Aligns with backend/server.js connection settings and /login authentication route.
let sql;
try {
  sql = require('mssql');
} catch (e) {
  sql = require('../backend/node_modules/mssql');
}

const [,, username, password] = process.argv;
if(!username || !password){
  console.error('Usage: node scripts/db-check.js <username> <password>');
  process.exit(2);
}

function parseSqlServerAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return { server: "", instanceName: "", port: undefined };
  const normalized = raw.replace(/\//g, "\\");
  let serverPart = normalized;
  let instanceName = "";
  let port;
  const commaIndex = normalized.lastIndexOf(",");
  if (commaIndex > -1) {
    serverPart = normalized.slice(0, commaIndex).trim();
    const portValue = Number(normalized.slice(commaIndex + 1).trim());
    if (Number.isInteger(portValue) && portValue > 0) {
      port = portValue;
    }
  }
  const backslashIndex = serverPart.indexOf("\\");
  if (backslashIndex > -1) {
    instanceName = serverPart.slice(backslashIndex + 1).trim();
    serverPart = serverPart.slice(0, backslashIndex).trim();
  }
  return { server: serverPart, instanceName, port };
}

const sqlServerInput = process.env.MSSQL_SERVER || process.env.DB_SERVER || "divineserver";
const sqlDatabase = process.env.MSSQL_DATABASE || process.env.DB_NAME || "hrms";
const sqlUser = process.env.MSSQL_USER || process.env.DB_USER || "sa";
const sqlPassword = process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD || "sql@123";
const sqlPortInput = process.env.MSSQL_PORT || process.env.DB_PORT || 2439;
const sqlInstanceInput = process.env.MSSQL_INSTANCE || process.env.DB_INSTANCE || "SQL2022";

const parsedSqlServer = parseSqlServerAddress(sqlServerInput);
const sqlServer = parsedSqlServer.server || "divineserver";
const sqlInstance = parsedSqlServer.instanceName || sqlInstanceInput;
const sqlPort = Number(parsedSqlServer.port ?? sqlPortInput);

const dbConfig = {
  server: sqlServer,
  database: sqlDatabase,
  user: sqlUser,
  password: sqlPassword,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

if (Number.isInteger(sqlPort) && sqlPort > 0) {
  dbConfig.port = sqlPort;
} else if (sqlInstance) {
  dbConfig.options.instanceName = sqlInstance;
}

console.log('SQL config:', {
  server: dbConfig.server,
  database: dbConfig.database,
  port: dbConfig.port || 'default',
  instanceName: dbConfig.options.instanceName || 'none'
});
(async()=>{
  try{
    await sql.connect(dbConfig);
    console.log('Connected to DB:', dbConfig.server + '/' + dbConfig.database);

    const q = async (text, params = {}) => {
      const request = new sql.Request();
      for(const k of Object.keys(params)) request.input(k, params[k]);
      const r = await request.query(text);
      return r.recordset || [];
    };

    console.log('\nChecking login route authentication through sp_webapi.authenticate_user');
    try {
      const request = new sql.Request();
      request.input('operation', sql.NVarChar(50), 'authenticate_user');
      request.input('username', sql.NVarChar(100), String(username).trim());
      request.input('password', sql.NVarChar(100), String(password));
      const result = await request.execute('sp_webapi');
      console.log('authenticate_user result:', result.recordset?.[0] || null);
    } catch (e) {
      console.error('err authenticate_user', e.message);
    }

    console.log('\nChecking usermaster (usermaster)');
    try{
      const r = await q(`SELECT TOP 1 username, password FROM dbo.usermaster WHERE username = @username AND password = @password`, { username, password });
      console.log('usermaster result:', r[0] || null);
    }catch(e){ console.error('err usermaster', e.message); }

    console.log('\nChecking UserMaster (case-sensitive name)');
    try{
      const r = await q(`SELECT TOP 1 username, password FROM dbo.UserMaster WHERE username = @username AND password = @password`, { username, password });
      console.log('UserMaster result:', r[0] || null);
    }catch(e){ console.error('err UserMaster', e.message); }

    console.log('\nChecking Employee (empcode match)');
    try{
      const r = await q(`SELECT TOP 1 empcode, password, username, empname FROM dbo.Employee WHERE empcode = @username AND password = @password`, { username, password });
      console.log('Employee (empcode) result:', r[0] || null);
    }catch(e){ console.error('err Employee', e.message); }

    console.log('\nChecking employee (lowercase)');
    try{
      const r = await q(`SELECT TOP 1 empcode, password, username, empname FROM dbo.employee WHERE empcode = @username AND password = @password`, { username, password });
      console.log('employee (empcode) result:', r[0] || null);
    }catch(e){ console.error('err employee', e.message); }

    console.log('\nChecking Employee (username match)');
    try{
      const r = await q(`SELECT TOP 1 username, password, empcode, empname FROM dbo.Employee WHERE username = @username AND password = @password`, { username, password });
      console.log('Employee (username) result:', r[0] || null);
    }catch(e){ console.error('err Employee username', e.message); }

    console.log('\nChecking employee (username match lowercase)');
    try{
      const r = await q(`SELECT TOP 1 username, password, empcode, empname FROM dbo.employee WHERE username = @username AND password = @password`, { username, password });
      console.log('employee (username) result:', r[0] || null);
    }catch(e){ console.error('err employee username', e.message); }

  }catch(err){
    console.error('CONNECT ERR', err.message);
  }finally{
    try{ await sql.close(); }catch(e){}
  }
})();
