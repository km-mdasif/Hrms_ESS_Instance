/**
 * Database Configuration and Connection Management
 * Central database pool management with connection handling
 */

const sql = require("mssql");

const sqlServerInput = process.env.MSSQL_SERVER || process.env.DB_SERVER || "divineserver";
const sqlDatabase = process.env.MSSQL_DATABASE || process.env.DB_NAME || "hrms";
const sqlUser = process.env.MSSQL_USER || process.env.DB_USER || "sa";
const sqlPassword = process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD || "sql@123";
const sqlPortInput = process.env.MSSQL_PORT || process.env.DB_PORT || 2439;
const sqlInstanceInput = process.env.MSSQL_INSTANCE || process.env.DB_INSTANCE || "";

/**
 * Parse SQL Server address
 * Handles server\instance format and server,port format
 */
function parseSqlServerAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return { server: "", instanceName: "", port: undefined };
  
  const normalized = raw.replace(/\//g, "\\");
  let serverPart = normalized;
  let instanceName = "";
  let port;
  
  // Extract port if using comma notation
  const commaIndex = normalized.lastIndexOf(",");
  if (commaIndex > -1) {
    serverPart = normalized.slice(0, commaIndex).trim();
    const portValue = Number(normalized.slice(commaIndex + 1).trim());
    if (Number.isInteger(portValue) && portValue > 0) {
      port = portValue;
    }
  }
  
  // Extract instance if using backslash notation
  const backslashIndex = serverPart.indexOf("\\");
  if (backslashIndex > -1) {
    instanceName = serverPart.slice(backslashIndex + 1).trim();
    serverPart = serverPart.slice(0, backslashIndex).trim();
  }
  
  return { server: serverPart, instanceName, port };
}

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

let pool;

/**
 * Get or create database connection pool
 * Ensures single pool instance for connection reuse
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    console.log("✓ Database connection pool created");
    console.log(`✓ Database target: ${sqlServer}${sqlInstance ? `\\${sqlInstance}` : ""}:${sqlPort}/${sqlDatabase}`);
  }
  return pool;
}

/**
 * Close database connection pool
 */
async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log("✓ Database connection pool closed");
  }
}

/**
 * Execute a stored procedure
 */
async function executeStoredProcedure(procedureName, inputParams = {}) {
  try {
    const dbPool = await getPool();
    const parameterResult = await dbPool.request()
      .input("procedureName", sql.NVarChar(128), procedureName)
      .query(`
        SELECT parameter_name = p.name
        FROM sys.parameters p
        INNER JOIN sys.procedures sp ON sp.object_id = p.object_id
        INNER JOIN sys.schemas ss ON ss.schema_id = sp.schema_id
        WHERE ss.name = N'dbo' AND sp.name = @procedureName
      `);
    const declaredParameters = new Set(
      parameterResult.recordset.map(({ parameter_name }) => String(parameter_name).replace(/^@/, "").toLowerCase())
    );
    let request = dbPool.request();
    
    // Add input parameters
    Object.entries(inputParams).forEach(([key, value]) => {
      if (declaredParameters.size && !declaredParameters.has(String(key).toLowerCase())) {
        console.warn(`[DB] Ignoring unsupported parameter @${key} for ${procedureName}`);
        return;
      }
      const sqlType = getSqlType(value);
      request = request.input(key, sqlType, value);
    });
    
    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    console.error(`[DB Error] Stored Procedure ${procedureName}:`, error);
    throw error;
  }
}

/**
 * Execute a SQL query
 */
async function executeQuery(query, inputParams = {}) {
  try {
    const dbPool = await getPool();
    let request = dbPool.request();
    
    // Add input parameters
    Object.entries(inputParams).forEach(([key, value]) => {
      const sqlType = getSqlType(value);
      request = request.input(key, sqlType, value);
    });
    
    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error("[DB Error] Query execution:", error);
    throw error;
  }
}

/**
 * Determine SQL data type from JavaScript value
 */
function getSqlType(value) {
  if (value === null || value === undefined) return sql.NVarChar;
  if (Buffer.isBuffer(value)) return sql.Image;
  if (typeof value === "number") return Number.isInteger(value) ? sql.Int : sql.Float;
  if (typeof value === "boolean") return sql.Bit;
  if (value instanceof Date) return sql.DateTime2;
  return sql.NVarChar;
}

module.exports = {
  getPool,
  closePool,
  executeStoredProcedure,
  executeQuery,
  sql
};
