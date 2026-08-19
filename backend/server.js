const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
const sql=require("mssql");
const swaggerUi=require("swagger-ui-express");
const swaggerJsdoc=require("swagger-jsdoc");
const multer=require("multer");
const fs=require("fs");
const path=require("path");
const app=express();
app.use(cors({
 origin: true,
 credentials: true,
 methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
 allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({limit:"50mb"}));
app.use(express.urlencoded({limit:"50mb",extended:true}));
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.use((req,res,next)=>{
 const publicPaths=["/login","/refresh-token","/api-docs","/api-docs.json","/companies","/health","/dashboard-summary"];
 if(publicPaths.includes(req.path)){
  return next();
 }
 return requireAuth(req,res,next);
});

const DEFAULT_DOCUMENT_PATH=path.resolve(__dirname,"document-storage");
const DEFAULT_COMPANY_CODE="01";
const upload=multer({
 dest:DEFAULT_DOCUMENT_PATH,
 limits:{fileSize:10*1024*1024}
});
const ACCESS_TOKEN_SECRET=process.env.JWT_ACCESS_SECRET || "mysecret";
const REFRESH_TOKEN_SECRET=process.env.JWT_REFRESH_SECRET || "mysecret-refresh";
const ACCESS_TOKEN_EXPIRY="15m";
const REFRESH_TOKEN_EXPIRY="7d";

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

const dbConfig={
 server: sqlServer,
 database: sqlDatabase,
 user: sqlUser,
 password: sqlPassword,
 options:{
  encrypt:false,
  trustServerCertificate:true
 }
};

if (Number.isInteger(sqlPort) && sqlPort > 0) {
 dbConfig.port = sqlPort;
} else if (sqlInstance) {
 dbConfig.options.instanceName = sqlInstance;
}

let pool;

async function getPool(){
 if(!pool){
  pool=await sql.connect(dbConfig);
 }
 return pool;
}

async function getDocumentDirectory(){
 const dbPool=await getPool();
 const result=await dbPool.request()
  .input("operation", sql.NVarChar(50), "get_document_directory")
  .execute("sp_webapi");
 const documentPath=result.recordset[0]?.DocumentPath || DEFAULT_DOCUMENT_PATH;
 const normalizedPath=String(documentPath || DEFAULT_DOCUMENT_PATH).replace(/[\\/]+$/, "") || DEFAULT_DOCUMENT_PATH;
 if(!fs.existsSync(normalizedPath)){
  fs.mkdirSync(normalizedPath,{recursive:true});
 }
 return normalizedPath;
}

function getAuthToken(req){
 const authHeader=req.headers.authorization || "";
 const bearerToken=authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
 const queryToken=String(req.query?.token || "").trim();
 return bearerToken || queryToken;
}

function createAccessToken(user,companycode){
 return jwt.sign({username:user.username, companycode, userType:user.userType || "employee"}, ACCESS_TOKEN_SECRET,{expiresIn:ACCESS_TOKEN_EXPIRY});
}

function createRefreshToken(user,companycode){
 return jwt.sign({username:user.username, companycode, userType:user.userType || "employee", type:"refresh"}, REFRESH_TOKEN_SECRET,{expiresIn:REFRESH_TOKEN_EXPIRY});
}

function requireAuth(req,res,next){
 const token=getAuthToken(req);
 if(!token){
  return res.status(401).json({message:"Authentication required"});
 }
 try{
  req.user=jwt.verify(token,ACCESS_TOKEN_SECRET);
  // ensure companycode default and padding
  try{
   const cc = String(req.user?.companycode || DEFAULT_COMPANY_CODE).trim();
   req.user.companycode = (/^\d$/.test(cc) ? cc.padStart(2,'0') : (cc || DEFAULT_COMPANY_CODE));
  }catch(e){
   req.user.companycode = DEFAULT_COMPANY_CODE;
  }
  return next();
 }catch(err){
  return res.status(401).json({message:"Invalid or expired token"});
 }
}

function sanitizePathSegment(value){
 return String(value || "")
  .replace(/[<>:"/\\|?*]+/g,"_")
  .replace(/\s+/g," ")
  .trim();
}

function buildDocumentFilename(companycode,empcode,extension=""){
 const safeCompanyCode=sanitizePathSegment(companycode || DEFAULT_COMPANY_CODE);
 const safeEmpCode=sanitizePathSegment(empcode || "");
 const normalizedExtension=String(extension || "").trim().replace(/^\./, "");
 const baseName=`${safeCompanyCode}_${safeEmpCode}`;
 return normalizedExtension ? `${baseName}.${normalizedExtension}` : baseName;
}

function buildDocumentFolderPath(documentPath,documentname){
 const safeDocumentName=sanitizePathSegment(documentname);
 return path.join(documentPath,safeDocumentName);
}

function buildCompanyDocumentBaseName(documentCode, documentName) {
 const safeCode = sanitizePathSegment(documentCode || DEFAULT_COMPANY_CODE).replace(/\s+/g, "_");
 const safeName = sanitizePathSegment(documentName || "document").replace(/\s+/g, "_");
 const normalizedCode = safeCode || DEFAULT_COMPANY_CODE;
 const normalizedName = safeName || "document";
 return `${normalizedCode}_${normalizedName}`;
}

function buildCompanyDocumentFileName(documentCode, documentName, extension = "") {
 const normalizedExtension = String(extension || "").trim().replace(/^\./, "");
 const baseName = buildCompanyDocumentBaseName(documentCode, documentName);
 return normalizedExtension ? `${baseName}.${normalizedExtension}` : baseName;
}

function getCompanyDocumentFilePath(documentFolder, documentCode, documentName, extension = "") {
 const exactPath = path.join(documentFolder, buildCompanyDocumentFileName(documentCode, documentName, extension));
 if (fs.existsSync(exactPath)) {
  return exactPath;
 }
 const legacyName = `company_${sanitizePathSegment(documentName || "").replace(/\s+/g, "_")}`;
 const legacyPath = path.join(documentFolder, legacyName);
 if (fs.existsSync(legacyPath)) {
  return legacyPath;
 }
 const fallbackPath = path.join(documentFolder, `${buildCompanyDocumentBaseName(documentCode, documentName)}.${String(extension || "").trim().replace(/^\./, "")}`);
 if (fs.existsSync(fallbackPath)) {
  return fallbackPath;
 }
 // try zero-padded numeric company code fallback (e.g., '1' -> '01')
 try {
  const codeStr = String(documentCode || "");
  if (/^\d$/.test(codeStr)) {
   const padded = codeStr.padStart(2, "0");
   const paddedPath = path.join(documentFolder, buildCompanyDocumentFileName(padded, documentName, extension));
   if (fs.existsSync(paddedPath)) {
    return paddedPath;
   }
  }
 } catch (e) {}
 return exactPath;
}

function normalizeCompanyDocumentRoot(documentPath, documentName){
 const docPath = String(documentPath || "").replace(/[\\/]+$/, "");
 if(!docPath) return docPath;
 try{
  const lastSeg = String(path.basename(docPath) || "").trim().toLowerCase();
  const safeName = String(documentName || "").trim().toLowerCase();
  if(safeName && lastSeg === safeName){
   return path.dirname(docPath);
  }
 }catch(e){}
 return docPath;
}

function getDocumentFilePath(documentFolder,companycode,empcode,extension=""){
 const withExtension=path.win32.join(documentFolder,buildDocumentFilename(companycode,empcode,extension));
 if(fs.existsSync(withExtension)){
  return withExtension;
 }
 const legacyPath=path.win32.join(documentFolder,buildDocumentFilename(companycode,empcode));
 if(fs.existsSync(legacyPath)){
  return legacyPath;
 }
 return withExtension;
}

async function ensureEmpImageTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_emp_image_table")
  .execute("sp_webapi");
}

async function ensureEmpSignatureTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_emp_signature_table")
  .execute("sp_webapi");
}

async function ensureAttendanceGeofenceTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_attendance_geofence_table")
  .execute("sp_webapi");
}

async function ensureFieldExecutiveTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_field_executive_table")
  .execute("sp_webapi");
}

async function ensureCompanyDocumentTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_company_document_table")
  .execute("sp_webapi");
}

async function ensureLeaveLogTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_leave_log_table")
  .execute("sp_webapi");
}

async function ensureInterviewTables(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_interview_tables")
  .execute("sp_webapi");
}

async function ensureVisitorTables(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_visitor_tables")
  .execute("sp_webapi");
}

async function ensureCompanyDocumentPathTable(){
 const dbPool=await getPool();
 await dbPool.request()
  .input("operation", sql.NVarChar(50), "ensure_company_document_path_table")
  .execute("sp_webapi");
}

async function getCompanyDocumentDirectory(){
 await ensureCompanyDocumentPathTable();
 const dbPool=await getPool();
 const result=await dbPool.request()
  .input("operation", sql.NVarChar(50), "get_company_document_directory")
  .execute("sp_webapi");
 const documentPath=result.recordset[0]?.DocumentPath || DEFAULT_DOCUMENT_PATH;
 const normalizedPath=String(documentPath || DEFAULT_DOCUMENT_PATH).replace(/[\\/]+$/, "") || DEFAULT_DOCUMENT_PATH;
 if(!fs.existsSync(normalizedPath)){
  fs.mkdirSync(normalizedPath,{recursive:true});
 }
 return normalizedPath;
}

function findCompanyDocumentFile(documentFolder, documentName){
 if(!documentFolder || !fs.existsSync(documentFolder)){
  return null;
 }
 const safeBaseName=`company_${sanitizePathSegment(documentName).replace(/\s+/g,"_")}`;
 const entries=fs.readdirSync(documentFolder);
 const match=entries.find((entry)=>entry === safeBaseName || entry.startsWith(`${safeBaseName}.`));
 return match ? path.join(documentFolder,match) : null;
}

async function employeeExists(empcode){
 const dbPool=await getPool();
 const normalizedEmpCode=String(empcode || "").trim();
 if(!normalizedEmpCode){
  return false;
 }

 const result=await dbPool.request()
  .input("operation", sql.NVarChar(50), "employee_exists")
  .input("empcode", sql.NVarChar(50), normalizedEmpCode)
  .execute("sp_webapi");
 return Boolean(result.recordset[0]?.employee_exists);
}

async function countEmployeeStatus(tableName, statusColumn, statusValue) {
 const dbPool = await getPool();
 const result = await dbPool.request()
  .input("operation", sql.NVarChar(50), "count_employee_status")
  .input("table_name", sql.NVarChar(128), String(tableName || ""))
  .input("status_column", sql.NVarChar(128), String(statusColumn || ""))
  .input("status_value", sql.NVarChar(50), String(statusValue ?? ""))
  .execute("sp_webapi");
 return Number(result.recordset?.[0]?.status_count || 0);
}

async function countActiveEmployees() {
 const dbPool = await getPool();
 const candidateTables = ["Employee", "employee"];
 const candidateColumns = ["EmpStatus", "empstatus", "empstaus", "Status", "status"];

 for (const tableName of candidateTables) {
  for (const columnName of candidateColumns) {
   try {
    const result = await dbPool.request()
     .input("operation", sql.NVarChar(50), "count_active_employees")
     .input("table_name", sql.NVarChar(128), String(tableName || ""))
     .input("column_name", sql.NVarChar(128), String(columnName || ""))
     .execute("sp_webapi");
    const count = Number(result.recordset?.[0]?.total_employees || 0);
    if (count > 0 || (tableName === candidateTables[candidateTables.length - 1] && columnName === candidateColumns[candidateColumns.length - 1])) {
     return count;
    }
   } catch (error) {
    // column or table may not exist in this schema; continue trying the next candidate.
   }
  }
 }

 try {
  const fallbackResult = await dbPool.request()
   .input("operation", sql.NVarChar(50), "count_active_employees")
   .input("table_name", sql.NVarChar(128), "Employee")
   .input("column_name", sql.NVarChar(128), "EmpStatus")
   .execute("sp_webapi");
  return Number(fallbackResult.recordset?.[0]?.total_employees || 0);
 } catch (error) {
  return 0;
 }
}

async function getDashboardSummary(){
 const dbPool=await getPool();
 const now = new Date();
 const startOfDay = new Date(now);
 startOfDay.setHours(0, 0, 0, 0);
 const endOfDay = new Date(now);
 endOfDay.setHours(23, 59, 59, 999);

 let interviewTodayCount = 0;
 let visitorCount = 0;

 try {
  const geofenceCountResult = await dbPool.request()
   .input("operation", sql.NVarChar(50), "count_geofence_checkins")
   .input("startDate", sql.DateTime, startOfDay)
   .input("endDate", sql.DateTime, endOfDay)
   .execute("sp_webapi");

  const fieldVisitResult = await dbPool.request()
   .input("operation", sql.NVarChar(50), "count_field_visits")
   .input("startDate", sql.DateTime, startOfDay)
   .input("endDate", sql.DateTime, endOfDay)
   .execute("sp_webapi");

  const leaveCountResult = await dbPool.request()
   .input("operation", sql.NVarChar(50), "count_leave_entries")
   .execute("sp_webapi");

  try {
   const visitorCountResult = await dbPool.request()
    .input("operation", sql.NVarChar(50), "count_visitor_entries")
    .execute("sp_webapi");
   visitorCount = Number(visitorCountResult.recordset?.[0]?.visitor_count || 0);
  } catch (error) {
   visitorCount = 0;
  }

  try {
   const interviewTodayResult = await dbPool.request()
    .input("operation", sql.NVarChar(50), "count_interviews_today")
    .input("startDate", sql.DateTime, startOfDay)
    .input("endDate", sql.DateTime, endOfDay)
    .execute("sp_webapi");
   interviewTodayCount = Number(interviewTodayResult.recordset?.[0]?.interview_count || 0);
  } catch (error) {
   interviewTodayCount = 0;
  }

  const totalEmployees = await countActiveEmployees();

  const summaryResult = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_dashboard_summary")
   .execute("sp_webapi");

  const summaryRow = summaryResult.recordset?.[0] || {};
  const leftEmployees = Number(summaryRow.left_employees ?? summaryRow.leftEmployees ?? 0);
  const candidateCount = Number(summaryRow.candidate_count ?? summaryRow.candidateCount ?? summaryRow.documents_verified ?? summaryRow.documentsVerified ?? totalEmployees);
  const joinedEmployees = Number(summaryRow.joined_employees ?? summaryRow.joinedEmployees ?? totalEmployees);
  const joinsToday = Number(summaryRow.joins_today ?? summaryRow.joinsToday ?? 0);
  const leftsToday = Number(summaryRow.lefts_today ?? summaryRow.leftsToday ?? 0);

  return {
   geofenceCheckins: Number(geofenceCountResult.recordset?.[0]?.geofence_checkins || 0),
   fieldVisits: Number(fieldVisitResult.recordset?.[0]?.field_visits || 0),
   totalEmployees,
   joinedEmployees,
   leftEmployees,
   joinsToday,
   leftsToday,
   leaveCount: Number(leaveCountResult.recordset?.[0]?.leave_count || 0),
   candidateCount,
   documentsVerified: Number(summaryRow.documents_verified ?? summaryRow.documentsVerified ?? leaveCountResult.recordset?.[0]?.leave_count ?? 0),
   interviewTodayCount,
   employeeLiveCount: totalEmployees,
   geofenceDetailsCount: Number(geofenceCountResult.recordset?.[0]?.geofence_checkins || 0),
   fieldCount: Number(fieldVisitResult.recordset?.[0]?.field_visits || 0),
   visitorCount,
  };
 } catch (error) {
  console.error("getDashboardSummary failed:", error);
  return {
   geofenceCheckins: 0,
   fieldVisits: 0,
   totalEmployees: 0,
   joinedEmployees: 0,
   leftEmployees: 0,
   joinsToday: 0,
   leftsToday: 0,
   leaveCount: 0,
   candidateCount: 0,
   documentsVerified: 0,
   interviewTodayCount: 0,
   employeeLiveCount: 0,
   geofenceDetailsCount: 0,
   fieldCount: 0,
   visitorCount: 0,
  };
 }
}

async function getEmployeeDetails(empcode){
 const dbPool=await getPool();
 const normalizedEmpCode=String(empcode || "").trim();
 if(!normalizedEmpCode){
  return null;
 }

 try {
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_employee_details")
   .input("empcode", sql.NVarChar(50), normalizedEmpCode)
   .execute("sp_webapi");

  const row = result.recordset?.[0];
  if (!row) {
   return null;
  }

  const employeeNameValue = row.empname ? String(row.empname).trim() : "";
  const fallbackName = row.username ? String(row.username).trim() : String(row.empcode || "").trim();

  return {
   empcode: row.empcode,
   empname: employeeNameValue || fallbackName || null,
   username: row.username,
  };
 } catch (err) {
  console.warn("getEmployeeDetails failed via sp_webapi:", err.message);
  return null;
 }
}

async function getCompanyProfileByCode(companyCode) {
  const normalizedCompanyCode = String(companyCode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const dbPool = await getPool();

  const companiesResult = await dbPool.request()
    .input("operation", sql.NVarChar(50), "get_companies")
    .execute("sp_webapi");

  const company = (companiesResult.recordset || []).find((item) => {
    const currentCode = String(item.companycode || item.CompanyCode || item.COMPANYCODE || "").trim();
    return currentCode === normalizedCompanyCode;
  });

  if (company) {
    return {
      companycode: String(company.companycode || company.CompanyCode || company.COMPANYCODE || normalizedCompanyCode).trim() || normalizedCompanyCode,
      companyname: String(company.companyname || company.CompanyName || company.COMPANYNAME || "Company").trim() || "Company",
    };
  }

  return {
    companycode: normalizedCompanyCode,
    companyname: "Company",
  };
}

async function authenticateUser(username,password,companyCode=DEFAULT_COMPANY_CODE){
 const normalizedUsername=String(username || "").trim();
 const normalizedPassword=String(password || "");
 const normalizedCompanyCode = String(companyCode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;

 if(normalizedUsername === "admin" && normalizedPassword === "admin@123!"){
  return { username: normalizedUsername, userType: "admin", empname: "Admin", empcode: "10001", companycode: normalizedCompanyCode };
 }

 const dbPool=await getPool();

 try {
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "authenticate_user")
   .input("username", sql.NVarChar(100), normalizedUsername)
   .input("password", sql.NVarChar(100), normalizedPassword)
   .execute("sp_webapi");

  const row = result.recordset?.[0];
  if(!row?.username){
   return null;
  }

  const userType = String(row.usertype || "employee").toLowerCase();
  const user = {
   username: String(row.username || normalizedUsername).trim(),
   userType,
   empcode: String(row.empcode || row.employeecode || row.username || "").trim(),
   companycode: normalizedCompanyCode,
  };

  if (row.empname) {
   user.empname = row.empname;
  } else if (userType === "employee") {
   const employeeDetails = await getEmployeeDetails(user.empcode || user.username);
   if (employeeDetails?.empname) {
     user.empname = employeeDetails.empname;
   }
  }

  return user;
 } catch (error) {
  console.error("Stored procedure auth failed:", error);
  return null;
 }
}

async function detectUserType(username, password, dbPool) {
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "");

  if (!normalizedUsername) {
    return "employee";
  }

  try {
    const result = await dbPool.request()
      .input("operation", sql.NVarChar(50), "authenticate_user")
      .input("username", sql.NVarChar(100), normalizedUsername)
      .input("password", sql.NVarChar(100), normalizedPassword)
      .execute("sp_webapi");

    const row = result.recordset?.[0];
    if (!row) {
      return "employee";
    }

    return userType === "admin" ? "admin" : "employee";
  } catch (error) {
    console.warn("detectUserType failed via sp_webapi:", error.message);
    return "employee";
  }
}

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: {type: string}
 *               password: {type: string}
 *     responses:
 *       200: {description: OK}
 */
app.post("/login",async(req,res)=>{
 const {username,password,companycode} = req.body || {};
 try{
  const resolvedCompanyCode = String(companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const user = await authenticateUser(username, password, resolvedCompanyCode);
  if(user){
   const companyInfo = await getCompanyProfileByCode(user.companycode || resolvedCompanyCode);
   const accessToken = createAccessToken(user, user.companycode || resolvedCompanyCode);
   const refreshToken = createRefreshToken(user, user.companycode || resolvedCompanyCode);
   return res.json({
    token: accessToken,
    refreshToken,
    username: user.username,
    companycode: user.companycode || resolvedCompanyCode,
    companyName: companyInfo.companyname,
    companyname: companyInfo.companyname,
    userType: user.userType,
    empName: user.empname || null,
    empName: user.empname || null,
    empCode: user.empcode || user.empCode || null,
    empcode: user.empcode || user.empCode || null,
   });
  }
  res.status(401).json({message:"User name or Password invalid"});
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Database error"});
 }
});

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: {type: string}
 *     responses:
 *       200: {description: OK}
 */
app.post("/refresh-token",(req,res)=>{
 const {refreshToken}=req.body || {};
 if(!refreshToken){
  return res.status(400).json({message:"Refresh token is required"});
 }
 try{
  const payload=jwt.verify(refreshToken,REFRESH_TOKEN_SECRET);
  const companycode=String(payload.companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const accessToken=createAccessToken({username:payload.username, userType:payload.userType || "employee"}, companycode);
  const nextRefreshToken=createRefreshToken({username:payload.username, userType:payload.userType || "employee"}, companycode);
  return res.json({
   token:accessToken,
   refreshToken:nextRefreshToken,
   username:payload.username,
   companycode,
   userType:payload.userType || "employee",
  });
 }catch(err){
  return res.status(401).json({message:"Invalid or expired refresh token"});
 }
});

app.get("/health",(req,res)=>{
 res.json({status:"ok", service:"backend", timestamp:new Date().toISOString()});
});

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Get company name
 *     responses:
 *       200: {description: OK}
 */
app.get("/dashboard-summary",async(req,res)=>{
 try{
  const summary = await getDashboardSummary();
  res.json(summary);
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Dashboard summary failed",error:err.message});
 }
});

app.get("/companies",async(req,res)=>{
 try{
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_companies")
   .execute("sp_webapi");
  res.json(result.recordset);
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Database error",error:err.message});
 }
});

app.get("/interviews", async (req, res) => {
 try {
  await ensureInterviewTables();
  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_recent_interviews")
   .execute("sp_webapi");
  return res.json(result.recordset || []);
 } catch (err) {
  console.error("Interview fetch failed:", err);
  return res.status(500).json({ message: "Failed to load interviews", error: err.message });
 }
});

app.get("/visitors", async (req, res) => {
 try {
  await ensureVisitorTables();
  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_recent_visitors")
   .execute("sp_webapi");
  return res.json(result.recordset || []);
 } catch (err) {
  console.error("Visitor fetch failed:", err);
  return res.status(500).json({ message: "Failed to load visitors", error: err.message });
 }
});

app.post("/visitors", async (req, res) => {
 try {
  await ensureVisitorTables();
  const visitor = req.body || {};
  const visitorCode = String(visitor.VisitorCode || "").trim();
  const visitorName = String(visitor.VisitorName || "").trim();
  if (!visitorCode || !visitorName) {
    return res.status(400).json({ message: "Visitor code and name are required." });
  }

  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "save_visitor")
   .input("VisitorCode", sql.NVarChar(50), visitorCode)
   .input("VisitDate", sql.DateTime, visitor.VisitDate ? new Date(visitor.VisitDate) : null)
   .input("VisitorName", sql.NVarChar(150), visitorName)
   .input("VisitorCompanyName", sql.NVarChar(150), visitor.VisitorCompanyName || null)
   .input("ContactNumber", sql.NVarChar(50), visitor.ContactNumber || null)
   .input("Empcode", sql.NVarChar(50), visitor.Empcode || null)
   .input("EmpName", sql.NVarChar(150), visitor.EmpName || null)
   .input("Department", sql.NVarChar(50), visitor.Department || null)
   .input("Purpose", sql.Bit, Boolean(visitor.Purpose))
   .input("PurposeRegarding", sql.NVarChar(sql.MAX), visitor.PurposeRegarding || null)
   .input("AppointmentType", sql.Bit, Boolean(visitor.AppointmentType))
   .input("AppointmentDate", sql.DateTime, visitor.AppointmentDate ? new Date(visitor.AppointmentDate) : null)
   .input("VechileNumber", sql.NVarChar(50), visitor.VechileNumber || null)
   .input("EmailID", sql.NVarChar(50), visitor.EmailID || null)
   .input("ConformationRequired", sql.Bit, Boolean(visitor.ConformationRequired))
   .input("CoVisitor1", sql.NVarChar(50), visitor.CoVisitor1 || null)
   .input("CoVisitor2", sql.NVarChar(50), visitor.CoVisitor2 || null)
   .input("IdProof", sql.NVarChar(50), visitor.IdProof || null)
   .input("IDProofNumber", sql.NVarChar(150), visitor.IDProofNumber || null)
   .input("MaterialsCarrying", sql.NVarChar(50), visitor.MaterialsCarrying || null)
   .input("IsReturnableMaterial", sql.Bit, Boolean(visitor.IsReturnableMaterial))
   .input("ReturnableMaterialDescription", sql.NVarChar(sql.MAX), visitor.ReturnableMaterialDescription || null)
   .execute("sp_webapi");

  return res.status(201).json({ message: "Visitor saved successfully", visitorId: result.recordset?.[0]?.VisitorID || null });
 } catch (err) {
  console.error("Visitor save failed:", err);
  return res.status(500).json({ message: "Visitor could not be saved", error: err.message });
 }
});

app.post("/interviews", async (req, res) => {
 try {
  await ensureInterviewTables();
  const payload = req.body || {};
  const interview = payload || {};
  const skills = Array.isArray(interview.skills) ? interview.skills : [];
  const relations = Array.isArray(interview.relations) ? interview.relations : [];
  const timeSlots = Array.isArray(interview.timeSlots) ? interview.timeSlots : [];
  const finalEntry = interview.finalEntry || {};

  const interviewCode = String(interview.InterviewCode || "").trim();
  const candidateName = String(interview.CandidateName || "").trim();
  if (!interviewCode || !candidateName) {
    return res.status(400).json({ message: "Interview code and candidate name are required." });
  }

  const dbPool = await getPool();
  const transaction = new sql.Transaction(dbPool);
  await transaction.begin();

  try {
   const insertInterview = await transaction.request()
    .input("operation", sql.NVarChar(50), "insert_interview_entry")
    .input("InterviewCode", sql.NVarChar(50), interviewCode)
    .input("CompanyCode", sql.NVarChar(50), String(interview.CompanyCode || DEFAULT_COMPANY_CODE))
    .input("InterviewDate", sql.DateTime, interview.InterviewDate ? new Date(interview.InterviewDate) : null)
    .input("CandidateName", sql.NVarChar(50), candidateName)
    .input("Gender", sql.NVarChar(50), interview.Gender || null)
    .input("Age", sql.Int, interview.Age ? Number(interview.Age) : null)
    .input("MaritialStatus", sql.NVarChar(50), interview.MaritialStatus || null)
    .input("ContactNumber", sql.NVarChar(50), interview.ContactNumber || null)
    .input("ContactNumber1", sql.NVarChar(50), interview.ContactNumber1 || null)
    .input("EmailID", sql.NVarChar(50), interview.EmailID || null)
    .input("Address", sql.NVarChar(sql.MAX), interview.Address || null)
    .input("PermanentLocation", sql.NVarChar(250), interview.PermanentLocation || null)
    .input("PresentLocation", sql.NVarChar(250), interview.PresentLocation || null)
    .input("HighestQualification", sql.NVarChar(50), interview.HighestQualification || null)
    .input("PreviousDesignation", sql.NVarChar(250), interview.PreviousDesignation || null)
    .input("PostingApplyingFor", sql.NVarChar(250), interview.PostingApplyingFor || null)
    .input("Category", sql.NVarChar(50), interview.Category || null)
    .input("RefferedBy", sql.NVarChar(150), interview.RefferedBy || null)
    .input("ReasontoReleave", sql.NVarChar(sql.MAX), interview.ReasontoReleave || null)
    .input("Remarks", sql.NVarChar(sql.MAX), interview.Remarks || null)
    .input("TotalExperience", sql.Decimal(18, 2), interview.TotalExperience !== "" && interview.TotalExperience !== null && interview.TotalExperience !== undefined ? Number(interview.TotalExperience) : null)
    .input("CurrentCTC", sql.Decimal(18, 0), interview.CurrentCTC !== "" && interview.CurrentCTC !== null && interview.CurrentCTC !== undefined ? Number(interview.CurrentCTC) : null)
    .input("ExpectedCTC", sql.Decimal(18, 2), interview.ExpectedCTC !== "" && interview.ExpectedCTC !== null && interview.ExpectedCTC !== undefined ? Number(interview.ExpectedCTC) : null)
    .input("ExpectedCTCNegotiable", sql.Bit, Boolean(interview.ExpectedCTCNegotiable))
    .input("NoticePeriod", sql.Decimal(18, 2), interview.NoticePeriod !== "" && interview.NoticePeriod !== null && interview.NoticePeriod !== undefined ? Number(interview.NoticePeriod) : null)
    .input("NoticePeriodNegotiable", sql.Bit, Boolean(interview.NoticePeriodNegotiable))
    .input("ExpectedJoiningDate", sql.DateTime, interview.ExpectedJoiningDate ? new Date(interview.ExpectedJoiningDate) : null)
    .execute("sp_webapi");

   const interviewId = insertInterview.recordset?.[0]?.InterviewID;

   if (interviewId) {
    for (const skill of skills) {
      if (!skill || (!skill.SkillName && skill.Experience === "" && skill.Experience === undefined && skill.Experience === null)) continue;
      await transaction.request()
       .input("operation", sql.NVarChar(50), "insert_interview_skill")
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("SkillName", sql.NVarChar(150), skill.SkillName || null)
       .input("Experience", sql.Decimal(18, 2), skill.Experience !== "" && skill.Experience !== null && skill.Experience !== undefined ? Number(skill.Experience) : null)
       .execute("sp_webapi");
    }

    for (const relation of relations) {
      if (!relation || (!relation.RelationName && !relation.Relationship && !relation.Age)) continue;
      await transaction.request()
       .input("operation", sql.NVarChar(50), "insert_interview_relation")
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("RelationName", sql.NVarChar(150), relation.RelationName || null)
       .input("Relationship", sql.NVarChar(150), relation.Relationship || null)
       .input("Age", sql.Int, relation.Age !== "" && relation.Age !== null && relation.Age !== undefined ? Number(relation.Age) : null)
       .execute("sp_webapi");
    }

    for (const slot of timeSlots) {
      if (!slot || (!slot.InterviewDateTime && !slot.notes)) continue;
      await transaction.request()
       .input("operation", sql.NVarChar(50), "insert_interview_time")
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("InterviewDateTime", sql.DateTime, slot.InterviewDateTime ? new Date(slot.InterviewDateTime) : null)
       .input("notes", sql.NVarChar(sql.MAX), slot.notes || null)
       .execute("sp_webapi");
    }

    if (finalEntry && Object.keys(finalEntry).some((key) => String(finalEntry[key] ?? "") !== "")) {
      await transaction.request()
       .input("operation", sql.NVarChar(50), "insert_interview_final")
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("IDProof", sql.NVarChar(50), finalEntry.IDProof || null)
       .input("IDProofNumber", sql.NVarChar(50), finalEntry.IDProofNumber || null)
       .input("FinalRoundStatus", sql.Int, finalEntry.FinalRoundStatus !== "" && finalEntry.FinalRoundStatus !== null && finalEntry.FinalRoundStatus !== undefined ? Number(finalEntry.FinalRoundStatus) : null)
       .input("FinalRoundScore", sql.Int, finalEntry.FinalRoundScore !== "" && finalEntry.FinalRoundScore !== null && finalEntry.FinalRoundScore !== undefined ? Number(finalEntry.FinalRoundScore) : null)
       .input("InterviewStatus", sql.Int, finalEntry.InterviewStatus !== "" && finalEntry.InterviewStatus !== null && finalEntry.InterviewStatus !== undefined ? Number(finalEntry.InterviewStatus) : null)
       .input("Notes", sql.NVarChar(sql.MAX), finalEntry.Notes || null)
       .input("JoiningDate", sql.DateTime, finalEntry.JoiningDate ? new Date(finalEntry.JoiningDate) : null)
       .input("FixedCTC", sql.Int, finalEntry.FixedCTC !== "" && finalEntry.FixedCTC !== null && finalEntry.FixedCTC !== undefined ? Number(finalEntry.FixedCTC) : null)
       .execute("sp_webapi");
    }
   }

   await transaction.commit();
   return res.status(201).json({ message: "Interview saved successfully", interviewId: interviewId || null });
  } catch (txError) {
   await transaction.rollback();
   throw txError;
  }
 } catch (err) {
  console.error("Interview save failed:", err);
  return res.status(500).json({ message: "Interview could not be saved", error: err.message });
 }
});

app.get("/leave-entries", async (req, res) => {
 try {
  await ensureLeaveLogTable();
  const dbPool = await getPool();
  const empCode = String(req.query.empcode || "").trim();
  const requestUser = req.user || {};
  const isAdmin = String(requestUser.userType || "").toLowerCase() === "admin";

  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_leave_entries")
   .input("empCode", sql.NVarChar(50), isAdmin ? null : (empCode || req.user?.username || ""))
   .input("isAdmin", sql.Bit, isAdmin)
   .execute("sp_webapi");

  return res.json(result.recordset || []);
 } catch (err) {
  console.error("Leave entries fetch failed:", err);
  return res.status(500).json({ message: "Failed to load leave entries", error: err.message });
 }
});

app.post("/leave-entries", async (req, res) => {
 try {
  await ensureLeaveLogTable();
  const { companyCode, empCode, fromDate, toDate, information, description } = req.body || {};
  const normalizedCompanyCode = String(companyCode || DEFAULT_COMPANY_CODE).trim() || "01";
  const normalizedEmpCode = String(empCode || req.user?.username || "").trim();
  const normalizedInfo = String(information || "").trim();

  if (!normalizedEmpCode || !fromDate || !toDate || !normalizedInfo) {
    return res.status(400).json({ message: "Employee code, leave dates and information are required." });
  }

  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ message: "Please provide valid leave dates." });
  }
  if (startDate > endDate) {
    return res.status(400).json({ message: "From date cannot be after To date." });
  }

  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "save_leave_entry")
   .input("companyCode", sql.NVarChar(50), normalizedCompanyCode)
   .input("empCode", sql.NVarChar(50), normalizedEmpCode)
   .input("fromDate", sql.DateTime, startDate)
   .input("toDate", sql.DateTime, endDate)
   .input("information", sql.NVarChar(50), normalizedInfo)
   .input("description", sql.NVarChar(500), String(description || ""))
   .execute("sp_webapi");

  return res.status(201).json({
    message: "Leave request added successfully",
    leaveLogId: result.recordset?.[0]?.LeaveLogID || null,
  });
 } catch (err) {
  console.error("Leave entry insert failed:", err);
  return res.status(500).json({ message: "Leave entry could not be saved", error: err.message });
 }
});

app.patch("/leave-entries/:leaveLogId/approve", async (req, res) => {
 try {
  await ensureLeaveLogTable();
  const leaveLogId = Number(req.params.leaveLogId);
  const { isApproved } = req.body || {};

  if (!Number.isInteger(leaveLogId)) {
    return res.status(400).json({ message: "Valid leave request id is required." });
  }

  const dbPool = await getPool();
  await dbPool.request()
   .input("operation", sql.NVarChar(50), "approve_leave_entry")
   .input("leaveLogId", sql.Int, leaveLogId)
   .input("isApproved", sql.Bit, Boolean(isApproved))
   .execute("sp_webapi");

  return res.json({ message: "Leave status updated successfully" });
 } catch (err) {
  console.error("Leave approval update failed:", err);
  return res.status(500).json({ message: "Approval update failed", error: err.message });
 }
});

/**
 * @swagger
 * /document-types:
 *   get:
 *     summary: Get all document types
 *     responses:
 *       200: {description: OK}
 */
app.get("/document-types",async(req,res)=>{
 try{
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_document_types")
   .execute("sp_webapi");
  res.json(result.recordset);
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Database error",error:err.message});
 }
});

/**
 * @swagger
 * /emp-documents/{empcode}:
 *   get:
 *     summary: Get documents for employee
 *     parameters:
 *       - in: path
 *         name: empcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: {description: OK}
 */
app.get("/emp-documents/:empcode",async(req,res)=>{
 try{  await ensureEmpImageTable();  const {empcode}=req.params;
  const dbPool=await getPool();

  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_emp_documents")
   .input("empcode",sql.NVarChar(50),empcode)
   .execute("sp_webapi");
  
  if(result.recordset.length===0){
   return res.status(404).json({message:"No documents found"});
  }
  res.json(result.recordset);
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Database error",error:err.message});
 }
});

/**
 * @swagger
 * /upload-document:
 *   post:
 *     summary: Upload employee document
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               empcode: {type: string}
 *               documentname: {type: string}
 *               file: {type: string, format: binary}
 *     responses:
 *       200: {description: OK}
 */
app.post("/upload-document",upload.single("file"),async(req,res)=>{
 try{
  if(!req.file){
   return res.status(400).json({message:"No file uploaded"});
  }
  
  const {empcode,documentname,companycode}=req.body;
  const resolvedCompanyCode=String(companycode || "01").trim() || "01";
  const dbPool=await getPool();

  const file=req.file;
  const ext=path.extname(file.originalname).substring(1) || "bin";
  const docDir=await getDocumentDirectory();
  const documentFolder=buildDocumentFolderPath(docDir,documentname);

  if(!fs.existsSync(docDir)){
   fs.mkdirSync(docDir,{recursive:true});
  }
  if(!fs.existsSync(documentFolder)){
   fs.mkdirSync(documentFolder,{recursive:true});
  }
  
  const newFilename=buildDocumentFilename(resolvedCompanyCode,empcode,ext);
  const newPath=path.win32.join(documentFolder,newFilename);
  const existingDoc=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_document_metadata")
   .input("empcode",sql.NVarChar(50),empcode)
   .input("documentname",sql.NVarChar(100),documentname)
   .execute("sp_webapi");

  if(existingDoc.recordset.length>0){
   const oldCompanyCode=existingDoc.recordset[0].companycode || resolvedCompanyCode;
   const oldExtension=existingDoc.recordset[0].documentextension || "";
   const oldFilePath=getDocumentFilePath(buildDocumentFolderPath(docDir,documentname),oldCompanyCode,empcode,oldExtension);
   if(fs.existsSync(oldFilePath)){
    fs.unlinkSync(oldFilePath);
   }
  }

  if(fs.existsSync(newPath)){
   fs.unlinkSync(newPath);
  }
  fs.copyFileSync(file.path,newPath);
  fs.unlinkSync(file.path);
  
  await dbPool.request()
   .input("operation", sql.NVarChar(50), "upsert_emp_document")
   .input("empcode",sql.NVarChar(50),empcode)
   .input("companycode",sql.NVarChar(50),resolvedCompanyCode)
   .input("documentname",sql.NVarChar(100),documentname)
   .input("documentextension",sql.NVarChar(10),ext)
   .execute("sp_webapi");
  
  res.json({message:"Document uploaded successfully",filename:newFilename, path:newPath});
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Upload failed",error:err.message});
 }
});

app.get("/employees/:empcode",async(req,res)=>{
 try{
  const {empcode}=req.params;
  const trimmedEmpCode=String(empcode || "").trim();
  const exists=await employeeExists(trimmedEmpCode);
  if(!exists){
   return res.status(404).json({message:"Employee not found"});
  }

  const details=await getEmployeeDetails(trimmedEmpCode);
  return res.json({
   message:"Employee found",
   empcode: trimmedEmpCode,
   empname: details?.empname || details?.username || trimmedEmpCode,
  });
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Employee check failed",error:err.message});
 }
});

app.post("/forSignature",async(req,res)=>{
 try{
  const {empcode,companycode,description,signatureBase64}=req.body || {};
  const resolvedCompanyCode=String(companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const safeEmpCode=String(empcode || "").trim();
  const safeDescription=String(description || "").trim();

  if(!safeEmpCode || !signatureBase64){
   return res.status(400).json({message:"Employee code and signature data are required"});
  }

  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found. Signature upload is allowed only for an existing employee"});
  }

  await ensureEmpSignatureTable();

  const dbPool=await getPool();
  const normalizedSignature=String(signatureBase64 || "").replace(/^data:image\/\w+;base64,/, "");
  const signatureBuffer=Buffer.from(normalizedSignature, "base64");

  await dbPool.request()
   .input("operation", sql.NVarChar(50), "upsert_emp_signature")
   .input("companycode", sql.NVarChar(50), resolvedCompanyCode)
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .input("signatureimage", sql.VarBinary(sql.MAX), signatureBuffer)
   .input("description", sql.NVarChar(200), safeDescription)
   .execute("sp_webapi");

  res.json({
   message:"Employee signature saved successfully",
   companycode:resolvedCompanyCode,
   empcode:safeEmpCode,
   description:safeDescription,
  });
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Save failed",error:err.message});
 }
});

app.get("/forSignature/:empcode",async(req,res)=>{
 try{
  const safeEmpCode=String(req.params.empcode || "").trim();
  if(!safeEmpCode){
   return res.status(400).json({message:"Employee code is required"});
  }

  await ensureEmpSignatureTable();
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_emp_signature")
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .execute("sp_webapi");

  if(!result.recordset.length){
   return res.status(404).json({message:"Signature not found"});
  }

  const row=result.recordset[0];
  const imageBuffer=row.signatureimage ? Buffer.from(row.signatureimage) : Buffer.alloc(0);
  return res.json({
   companycode:row.companycode,
   empcode:row.empcode,
   description:row.description,
   signatureBase64:imageBuffer.length ? imageBuffer.toString("base64") : "",
  });
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Fetch failed",error:err.message});
 }
});

app.delete("/forSignature/:empcode",async(req,res)=>{
 try{
  const safeEmpCode=String(req.params.empcode || "").trim();
  if(!safeEmpCode){
   return res.status(400).json({message:"Employee code is required"});
  }

  await ensureEmpSignatureTable();
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "delete_emp_signature")
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .execute("sp_webapi");

  return res.json({
   message:"Employee signature deleted successfully",
   empcode:safeEmpCode,
   rowsAffected:result.rowsAffected?.[0] || 0,
  });
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Delete failed",error:err.message});
 }
});

app.post("/emp-image",upload.single("file"),async(req,res)=>{
 try{
  if(!req.file){
   return res.status(400).json({message:"No image uploaded"});
  }

  await ensureEmpImageTable();

  const {empcode,companycode,imagename,description}=req.body;
  const resolvedCompanyCode=String(companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const safeEmpCode=String(empcode || "").trim();
  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found. Upload is allowed only for an existing employee"});
  }
  const safeImageName=String(imagename || path.basename(req.file.originalname || "employee-image")).trim();
  const safeDescription=String(description || "").trim();
  const fileBuffer=fs.readFileSync(req.file.path);
  const dbPool=await getPool();

  await dbPool.request()
   .input("operation", sql.NVarChar(50), "upsert_emp_image")
   .input("companycode",sql.NVarChar(50),resolvedCompanyCode)
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .input("empimage",sql.Image,fileBuffer)
   .input("imagename",sql.NVarChar(200),safeImageName)
   .input("description",sql.NVarChar(200),safeDescription)
   .execute("sp_webapi");

  if(fs.existsSync(req.file.path)){
   fs.unlinkSync(req.file.path);
  }

  res.json({
   message:"Employee image saved successfully",
   companycode:resolvedCompanyCode,
   empcode:safeEmpCode,
   imagename:safeImageName,
   description:safeDescription,
   imageBase64:fileBuffer.toString("base64")
  });
 }catch(err){
  console.error(err);
  if(req.file && fs.existsSync(req.file.path)){
   fs.unlinkSync(req.file.path);
  }
  res.status(500).json({message:"Save failed",error:err.message});
 }
});

app.get("/emp-image/:empcode",async(req,res)=>{
 try{
  await ensureEmpImageTable();
  const {empcode}=req.params;
  const safeEmpCode=String(empcode || "").trim();

  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found"});
  }

  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_emp_image")
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .execute("sp_webapi");

  if(result.recordset.length===0){
   return res.status(404).json({message:"Employee image not found"});
  }

  const row=result.recordset[0];
  const imageBuffer=row.empimage ? Buffer.from(row.empimage) : Buffer.alloc(0);

  res.json({
   companycode:row.companycode,
   empcode:row.empcode,
   imagename:row.imagename,
   description:row.description,
   imageBase64:imageBuffer.length ? imageBuffer.toString("base64") : ""
  });
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Fetch failed",error:err.message});
 }
});

// Attendance Geofence - Save attendance with selfie and location
app.post("/attendance-geofence",upload.single("selfie"),async(req,res)=>{
 try{
  const {empcode,companycode,latitude,longitude,status,remarks,radius,geofenceRadius,geofence_radius,accuracy}=req.body;
  const safeEmpCode=String(empcode || "").trim();
  const resolvedCompanyCode=String(companycode || "01").trim() || "01";
  const rawRadius=radius ?? geofenceRadius ?? geofence_radius ?? accuracy ?? null;
  const parsedRadius=rawRadius === null || rawRadius === undefined || rawRadius === "" ? null : parseFloat(rawRadius);

  let selfieBase64="";
  if(req.file){
   const fileBuffer=fs.readFileSync(req.file.path);
   selfieBase64=fileBuffer.toString("base64");
  } else {
   const fallbackBase64=req.body.selfieBase64 || req.body.selfie_image_base64 || req.body.selfiebase64 || "";
   selfieBase64=String(fallbackBase64 || "").trim();
  }

  if(!safeEmpCode || !latitude || !longitude || !selfieBase64){
   return res.status(400).json({message:"Employee code, location (latitude/longitude), and selfie image are required"});
  }

  // Verify employee exists
  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found"});
  }

  await ensureAttendanceGeofenceTable();
  const dbPool=await getPool();
  const selfieImageBuffer = selfieBase64 ? Buffer.from(selfieBase64, "base64") : null;

  const result=await dbPool.request()
   .input("operation",sql.NVarChar(50),"save_attendance_geofence")
   .input("companycode",sql.NVarChar(50),resolvedCompanyCode)
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .input("latitude",sql.Decimal(10,8),parseFloat(latitude))
   .input("longitude",sql.Decimal(11,8),parseFloat(longitude))
   .input("selfiimage",sql.VarBinary(sql.MAX),selfieImageBuffer)
   .input("selfieimage_base64",sql.NVarChar(sql.MAX),selfieBase64 || null)
   .input("status",sql.NVarChar(20),status || "Present")
   .input("remarks",sql.NVarChar(500),remarks || "")
   .input("geofenceradius",sql.Decimal(10,2),Number.isFinite(parsedRadius) ? parsedRadius : null)
   .execute("sp_webapi");

  if(req.file && fs.existsSync(req.file.path)){
   fs.unlinkSync(req.file.path);
  }

  const attendanceID=result.recordset[0]?.AttendanceID;
  res.json({
   message:"Attendance saved successfully with location and selfie",
   attendanceID:attendanceID,
   empcode:safeEmpCode,
   companycode:resolvedCompanyCode,
   latitude:parseFloat(latitude),
   longitude:parseFloat(longitude),
   radius:Number.isFinite(parsedRadius) ? parsedRadius : null,
   accuracy:Number.isFinite(parsedRadius) ? parsedRadius : null,
   status:status || "Present",
   servertime:new Date().toISOString(),
   selfieBase64:selfieBase64
  });
 }catch(err){
  console.error(err);
  if(req.file && fs.existsSync(req.file.path)){
   fs.unlinkSync(req.file.path);
  }
  res.status(500).json({message:"Attendance save failed",error:err.message});
 }
});

app.post("/field-executive/onsite", upload.fields([
  { name: "employeeSelfie", maxCount: 1 },
  { name: "clientSelfie", maxCount: 1 },
  { name: "document", maxCount: 1 }
]), async (req, res) => {
 try {
  const tokenUser = req.user || {};
  const companyCode = String(req.body.companycode || tokenUser.companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  const employeeCode = String(req.body.employeeCode || req.body.empcode || "").trim();
  const employeeName = String(req.body.employeeName || req.body.empname || "").trim();
  const natureOfWork = String(req.body.natureOfWork || req.body.natureofwork || "").trim();
  const visitType = String(req.body.visitType || req.body.visittype || "checkin").trim();
  const clientName = String(req.body.clientName || req.body.clientname || "").trim();
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const remarks = String(req.body.remarks || "").trim();
  const accuracy = req.body.accuracy;
  const visitDateTime = req.body.visitDateTime || req.body.visitdatetime || new Date().toISOString();

  if (!employeeCode || !natureOfWork || !clientName) {
   return res.status(400).json({ message: "Employee code, nature of work, and client name are required." });
  }
  if (!latitude || !longitude) {
   return res.status(400).json({ message: "Latitude and longitude are required." });
  }

  const employeeSelfieFile = req.files?.employeeSelfie?.[0];
  const clientSelfieFile = req.files?.clientSelfie?.[0];
  const documentFile = req.files?.document?.[0];

  const employeeSelfieSource = String(req.body.employeeSelfie || req.body.employeeSelfieBase64 || "").trim();
  const clientSelfieSource = String(req.body.clientSelfie || req.body.clientSelfieBase64 || "").trim();

  if (!employeeSelfieFile && !employeeSelfieSource) {
   return res.status(400).json({ message: "Employee selfie is required." });
  }
  if (!clientSelfieFile && !clientSelfieSource) {
   return res.status(400).json({ message: "Client selfie is required." });
  }

  const parseBase64Image = (base64Value) => {
   if (!base64Value) return null;
   const trimmed = String(base64Value).trim();
   const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i);
   const cleanBase64 = match ? match[2] : trimmed;
   if (!cleanBase64) return null;
   return Buffer.from(cleanBase64, "base64");
  };

  const employeeSelfieBuffer = employeeSelfieFile ? fs.readFileSync(employeeSelfieFile.path) : parseBase64Image(employeeSelfieSource);
  const clientSelfieBuffer = clientSelfieFile ? fs.readFileSync(clientSelfieFile.path) : parseBase64Image(clientSelfieSource);
  const documentBuffer = documentFile ? fs.readFileSync(documentFile.path) : null;
  const documentName = documentFile ? documentFile.originalname : String(req.body.documentName || "").trim() || null;
  const documentExtension = documentName ? path.extname(documentName).replace(".", "") : null;
  const visitDate = Number.isNaN(Date.parse(visitDateTime)) ? new Date() : new Date(visitDateTime);

  await ensureFieldExecutiveTable();
  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("companycode", sql.NVarChar(50), companyCode || DEFAULT_COMPANY_CODE)
   .input("empcode", sql.NVarChar(50), employeeCode)
   .input("empname", sql.NVarChar(200), employeeName || null)
   .input("natureofwork", sql.NVarChar(250), natureOfWork)
   .input("visitdatetime", sql.DateTime, visitDate)
   .input("visittype", sql.NVarChar(20), visitType || "checkin")
   .input("clientname", sql.NVarChar(200), clientName)
   .input("latitude", sql.Decimal(10,8), parseFloat(latitude))
   .input("longitude", sql.Decimal(11,8), parseFloat(longitude))
   .input("accuracy", sql.Decimal(10,2), accuracy !== undefined && accuracy !== null && accuracy !== "" ? parseFloat(accuracy) : null)
   .input("remarks", sql.NVarChar(sql.MAX), remarks || null)
   .input("employeeselfie", sql.VarBinary(sql.MAX), employeeSelfieBuffer)
   .input("employeeselfie_base64", sql.NVarChar(sql.MAX), employeeSelfieSource || null)
   .input("clientselfie", sql.VarBinary(sql.MAX), clientSelfieBuffer)
   .input("clientselfie_base64", sql.NVarChar(sql.MAX), clientSelfieSource || null)
   .input("documentname", sql.NVarChar(200), documentName || null)
   .input("documentextension", sql.NVarChar(50), documentExtension || null)
   .input("documentcontent", sql.VarBinary(sql.MAX), documentBuffer)
   .execute("sp_webapi");

  if (employeeSelfieFile && fs.existsSync(employeeSelfieFile.path)) fs.unlinkSync(employeeSelfieFile.path);
  if (clientSelfieFile && fs.existsSync(clientSelfieFile.path)) fs.unlinkSync(clientSelfieFile.path);
  if (documentFile && fs.existsSync(documentFile.path)) fs.unlinkSync(documentFile.path);

  return res.json({
   message: "Field executive onsite entry saved successfully.",
   visitId: result.recordset[0]?.VisitID,
   empcode: employeeCode,
   companycode: companyCode,
   visitdatetime: visitDate.toISOString(),
   visitType,
   clientName,
   latitude: parseFloat(latitude),
   longitude: parseFloat(longitude)
  });
 } catch (error) {
  console.error("Field executive save failed:", error);
  return res.status(500).json({ message: "Field executive save failed", error: error.message });
 }
});

app.get("/field-executive/list", async (req, res) => {
 try {
  await ensureFieldExecutiveTable();
  const dbPool = await getPool();
  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_field_executive_list")
   .execute("sp_webapi");
  return res.json({ message: "Field executive visits retrieved.", records: result.recordset || [] });
 } catch (error) {
  console.error("Field executive list failed:", error);
  return res.status(500).json({ message: "Failed to load field executive records", error: error.message });
 }
});

app.get("/field-executive/report", async (req, res) => {
 try {
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;
  const location = String(req.query.location || "").trim();

  await ensureFieldExecutiveTable();
  const dbPool = await getPool();

  const result = await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_field_executive_report")
   .input("fromDate", sql.DateTime, fromDate ? new Date(fromDate) : null)
   .input("toDate", sql.DateTime, toDate ? new Date(toDate) : null)
   .input("location", sql.NVarChar(200), location ? `%${location}%` : null)
   .execute("sp_webapi");

  return res.json({ message: "Field executive report retrieved.", records: result.recordset || [] });
 } catch (error) {
  console.error("Field executive report failed:", error);
  return res.status(500).json({ message: "Failed to get field executive report", error: error.message });
 }
});

// Get Attendance History
app.get("/attendance-history/:empcode",async(req,res)=>{
 try{
  const {empcode}=req.params;
  const safeEmpCode=String(empcode || "").trim();

  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found"});
  }

  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation",sql.NVarChar(50),"get_attendance_history")
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .execute("sp_webapi");

  res.json({
   message:"Attendance history retrieved",
   records:result.recordset || []
  });
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Fetch failed",error:err.message});
 }
});

// Get Today Attendance Count
app.get("/attendance-count/:empcode",async(req,res)=>{
 try{
  const {empcode}=req.params;
  const safeEmpCode=String(empcode || "").trim();

  const employeeFound=await employeeExists(safeEmpCode);
  if(!employeeFound){
   return res.status(404).json({message:"Employee not found"});
  }

  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation",sql.NVarChar(50),"get_today_attendance_count")
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .execute("sp_webapi");

  const count=result.recordset[0]?.attendance_count || 0;
  res.json({
   empcode:safeEmpCode,
   attendance_count:count,
   already_marked:count > 0
  });
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Count failed",error:err.message});
 }
});

/**
 * @swagger
 * /delete-document:
 *   delete:
 *     summary: Delete employee document
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               empcode: {type: string}
 *               documentname: {type: string}
 *     responses:
 *       200: {description: OK}
 */
app.delete("/delete-document",async(req,res)=>{
 try{
  const {empcode,documentname,companycode}=req.body;
  const resolvedCompanyCode=String(companycode || "01").trim() || "01";
  
  const dbPool=await getPool();

  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_document_metadata")
   .input("empcode",sql.NVarChar(50),empcode)
   .input("documentname",sql.NVarChar(100),documentname)
   .execute("sp_webapi");
  
  if(result.recordset.length===0){
   return res.status(404).json({message:"Document not found"});
  }
  
  const ext=result.recordset[0].documentextension || "bin";
  const companyCode=result.recordset[0].companycode || resolvedCompanyCode;
  const docDir=await getDocumentDirectory();
  const documentFolder=buildDocumentFolderPath(docDir,documentname);
  const filename=buildDocumentFilename(companyCode,empcode,ext);
  const filePath=getDocumentFilePath(documentFolder,companyCode,empcode,ext);
  
  if(fs.existsSync(filePath)){
   fs.unlinkSync(filePath);
  }
  
  await dbPool.request()
   .input("operation", sql.NVarChar(50), "delete_emp_document")
   .input("empcode",sql.NVarChar(50),empcode)
   .input("companycode",sql.NVarChar(50),resolvedCompanyCode)
   .input("documentname",sql.NVarChar(100),documentname)
   .execute("sp_webapi");
  
  res.json({message:"Document deleted successfully", deletedFile:filename});
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Delete failed",error:err.message});
 }
});

app.get("/download-document/:empcode/:documentname",async(req,res)=>{
 try{
  const {empcode,documentname}=req.params;
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_document_metadata")
   .input("empcode",sql.NVarChar(50),empcode)
   .input("documentname",sql.NVarChar(100),documentname)
   .execute("sp_webapi");

  if(result.recordset.length===0){
   return res.status(404).json({message:"Document not found"});
  }

  const ext=result.recordset[0].documentextension || "bin";
  const companyCode=result.recordset[0].companycode || DEFAULT_COMPANY_CODE;
  const docDir=await getDocumentDirectory();
  const documentFolder=buildDocumentFolderPath(docDir,documentname);
  const fileName=buildDocumentFilename(companyCode,empcode,ext);
  const filePath=getDocumentFilePath(documentFolder,companyCode,empcode,ext);

  if(!fs.existsSync(filePath)){
   return res.status(404).json({message:"File does not exist in document path"});
  }

  res.download(filePath,fileName);
 }catch(err){
  console.error(err);
  res.status(500).json({message:"Download failed",error:err.message});
 }
});

app.get("/company-documents",async(req,res)=>{
 try{
  await ensureCompanyDocumentTable();
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation", sql.NVarChar(50), "get_company_documents")
   .execute("sp_webapi");
  return res.json(result.recordset || []);
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Failed to fetch company documents",error:err.message});
 }
});

app.post("/company-documents",upload.single("file"),async(req,res)=>{
 try{
  if(!req.file){
   return res.status(400).json({message:"No file uploaded"});
  }

  await ensureCompanyDocumentTable();
  const {documentname,documentcode,companycode,status,expirydate,remainderon}=req.body;
  const safeName=String(documentname || "").trim();
  let safeCode=String(documentcode || companycode || req.body?.companycode || req.user?.companycode || DEFAULT_COMPANY_CODE).trim() || DEFAULT_COMPANY_CODE;
  if (/^\d$/.test(safeCode)) safeCode = safeCode.padStart(2, '0');
  const safeStatus=String(status || "true").toLowerCase() === "true";
  const safeExpiryDate=String(expirydate || "").trim();
  const safeRemainderOn=String(remainderon || "").trim();

  if(!safeName){
   return res.status(400).json({message:"Document name is required"});
  }

  const dbPool=await getPool();
  const ext=path.extname(req.file.originalname).substring(1) || "bin";
  const docDir=await getCompanyDocumentDirectory();
  // Normalize configured docDir to the company document root (avoid per-document folders saved in DB)
  const documentFolder = normalizeCompanyDocumentRoot(docDir, safeName) || docDir;
  if(!fs.existsSync(documentFolder)){
   fs.mkdirSync(documentFolder,{recursive:true});
  }

  const fileName=buildCompanyDocumentFileName(safeCode,safeName,ext);
  const filePath=path.join(documentFolder,fileName);
  if(fs.existsSync(filePath)){fs.unlinkSync(filePath);}
  fs.copyFileSync(req.file.path,filePath);
  fs.unlinkSync(req.file.path);

  const insertResult=await dbPool.request()
   .input("operation",sql.NVarChar(50),"insert_company_document")
   .input("documentcode",sql.NVarChar(50),safeCode || null)
   .input("documentname",sql.NVarChar(50),safeName)
   .input("documentextension",sql.NVarChar(50),ext || null)
   .input("status",sql.Bit,safeStatus)
   .input("expirydate",sql.DateTime, safeExpiryDate ? new Date(safeExpiryDate) : null)
   .input("remainderon",sql.DateTime, safeRemainderOn ? new Date(safeRemainderOn) : null)
   .execute("sp_webapi");

  return res.json({
   message:"Company document uploaded successfully",
   documentId:insertResult.recordset[0]?.DocumentID,
   documentCode:safeCode,
   documentName:safeName,
   documentExtension:ext,
   fileName:fileName,
   filePath:filePath,
  });
 }catch(err){
  console.error(err);
  if(req.file && fs.existsSync(req.file.path)){
   fs.unlinkSync(req.file.path);
  }
  return res.status(500).json({message:"Upload failed",error:err.message});
 }
});

app.delete("/company-documents/:documentId",async(req,res)=>{
 try{
  const {documentId}=req.params;
  await ensureCompanyDocumentTable();
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation",sql.NVarChar(50),"get_company_document")
   .input("documentId",sql.Int,Number(documentId))
   .execute("sp_webapi");
  if(result.recordset.length===0){
   return res.status(404).json({message:"Company document not found"});
  }

  const docCode=String(result.recordset[0].DocumentCode || "").trim() || DEFAULT_COMPANY_CODE;
  const docName=String(result.recordset[0].DocumentName || "").trim();
  const docExt=String(result.recordset[0].DocumentExtension || "").trim();
  if(docName){
  const docDir=await getCompanyDocumentDirectory();
  const documentFolder = normalizeCompanyDocumentRoot(docDir, docName) || docDir;
  const filePath=getCompanyDocumentFilePath(documentFolder,docCode,docName,docExt);
   if(filePath && fs.existsSync(filePath)){
    fs.unlinkSync(filePath);
   }
  }

  await dbPool.request()
   .input("operation",sql.NVarChar(50),"delete_company_document")
   .input("documentId",sql.Int,Number(documentId))
   .execute("sp_webapi");

  return res.json({message:"Company document deleted successfully"});
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Delete failed",error:err.message});
 }
});

app.get("/download-company-document/:documentId",async(req,res)=>{
 try{
  const {documentId}=req.params;
  await ensureCompanyDocumentTable();
  const dbPool=await getPool();
  const result=await dbPool.request()
   .input("operation",sql.NVarChar(50),"get_company_document")
   .input("documentId",sql.Int,Number(documentId))
   .execute("sp_webapi");
  if(result.recordset.length===0){
   return res.status(404).json({message:"Company document not found"});
  }

  const docCode=String(result.recordset[0].DocumentCode || "").trim() || DEFAULT_COMPANY_CODE;
  const docName=String(result.recordset[0].DocumentName || "").trim();
  const docExt=String(result.recordset[0].DocumentExtension || "").trim();
  const docDir=await getCompanyDocumentDirectory();
  const documentFolder = normalizeCompanyDocumentRoot(docDir, docName) || docDir;
  const filePath=getCompanyDocumentFilePath(documentFolder,docCode,docName,docExt);
  if(!filePath || !fs.existsSync(filePath)){
   return res.status(404).json({message:"File does not exist in document path"});
  }

  return res.download(filePath,path.basename(filePath));
 }catch(err){
  console.error(err);
  return res.status(500).json({message:"Download failed",error:err.message});
 }
});

const spec=swaggerJsdoc({definition:{openapi:"3.0.0",info:{title:"Demo API",version:"1.0.0"},servers:[{url:"https://localhost:5000"}]},apis:["./server.js"]});
app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(spec));
app.get("/api-docs.json",(req,res)=>{
 res.json(spec);
});

app.get("/*", (req, res) => {
 const indexPath = path.join(__dirname, "../frontend/build/index.html");
 if (fs.existsSync(indexPath)) {
  return res.sendFile(indexPath);
 }
 return res.status(404).send("Not Found");
});

module.exports = app;
