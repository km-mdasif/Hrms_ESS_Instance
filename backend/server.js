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
   const cc = String(req.user?.companycode || "01").trim();
   req.user.companycode = (/^\d$/.test(cc) ? cc.padStart(2,'0') : (cc || '01'));
  }catch(e){
   req.user.companycode = '01';
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
 const safeCompanyCode=sanitizePathSegment(companycode || "01");
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
 const safeCode = sanitizePathSegment(documentCode || "01").replace(/\s+/g, "_");
 const safeName = sanitizePathSegment(documentName || "document").replace(/\s+/g, "_");
 const normalizedCode = safeCode || "01";
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
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'empsignature')
  BEGIN
   CREATE TABLE [dbo].[empsignature] (
    [companycode] NVARCHAR(50) NULL,
    [empcode] NVARCHAR(50) NOT NULL,
    [signatureimage] IMAGE NULL,
    [description] NVARCHAR(200) NULL
   );
   CREATE INDEX idx_empsignature_empcode ON [dbo].[empsignature] ([empcode]);
  END
  IF COL_LENGTH('dbo.empsignature', 'companycode') IS NULL
  BEGIN
   ALTER TABLE [dbo].[empsignature] ADD [companycode] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.empsignature', 'signatureimage') IS NULL
  BEGIN
   ALTER TABLE [dbo].[empsignature] ADD [signatureimage] IMAGE NULL;
  END
  IF COL_LENGTH('dbo.empsignature', 'description') IS NULL
  BEGIN
   ALTER TABLE [dbo].[empsignature] ADD [description] NVARCHAR(200) NULL;
  END
 `);
}

async function ensureAttendanceGeofenceTable(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttendanceGeofence')
  BEGIN
   CREATE TABLE [dbo].[AttendanceGeofence] (
    [AttendanceID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [companycode] NVARCHAR(50) NOT NULL,
    [empcode] NVARCHAR(50) NOT NULL,
    [attendancedate] DATETIME NOT NULL DEFAULT GETDATE(),
    [latitude] DECIMAL(10,8) NOT NULL,
    [longitude] DECIMAL(11,8) NOT NULL,
    [selfiimage] IMAGE NULL,
    [selfieimage_base64] NVARCHAR(MAX) NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'Present',
    [remarks] NVARCHAR(500) NULL,
    [geofenceradius] DECIMAL(10,2) NULL
   );
   CREATE INDEX idx_attendance_empcode ON [dbo].[AttendanceGeofence] ([empcode]);
   CREATE INDEX idx_attendance_date ON [dbo].[AttendanceGeofence] ([attendancedate]);
   CREATE INDEX idx_attendance_company ON [dbo].[AttendanceGeofence] ([companycode]);
  END
  IF COL_LENGTH('dbo.AttendanceGeofence', 'selfiimage') IS NULL
  BEGIN
   ALTER TABLE [dbo].[AttendanceGeofence] ADD [selfiimage] IMAGE NULL;
  END
  IF COL_LENGTH('dbo.AttendanceGeofence', 'selfieimage_base64') IS NULL
  BEGIN
   ALTER TABLE [dbo].[AttendanceGeofence] ADD [selfieimage_base64] NVARCHAR(MAX) NULL;
  END
  IF COL_LENGTH('dbo.AttendanceGeofence', 'geofenceradius') IS NULL
  BEGIN
   ALTER TABLE [dbo].[AttendanceGeofence] ADD [geofenceradius] DECIMAL(10,2) NULL;
  END
 `);
}

async function ensureCompanyDocumentTable(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DocumentCompany')
  BEGIN
   CREATE TABLE [dbo].[DocumentCompany](
    [DocumentID] [int] IDENTITY(1,1) NOT NULL,
    [DocumentCode] [nvarchar](50) NULL,
    [DocumentName] [nvarchar](50) NULL,
    [DocumentExtension] [nvarchar](50) NULL,
    [Status] [bit] NULL,
    [ExpiryDate] [datetime] NULL,
    [RemainderOn] [datetime] NULL,
    CONSTRAINT [PK_DocumentCompany] PRIMARY KEY CLUSTERED ([DocumentID] ASC)
   ) ON [PRIMARY];
   CREATE INDEX idx_documentcompany_name ON [dbo].[DocumentCompany] ([DocumentName]);
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'DocumentCode') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentCode] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'DocumentName') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentName] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'DocumentExtension') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [DocumentExtension] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'Status') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [Status] BIT NULL;
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'ExpiryDate') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [ExpiryDate] DATETIME NULL;
  END
  IF COL_LENGTH('dbo.DocumentCompany', 'RemainderOn') IS NULL
  BEGIN
   ALTER TABLE [dbo].[DocumentCompany] ADD [RemainderOn] DATETIME NULL;
  END
 `);
}

async function ensureCompanyDocumentPathTable(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DocumentPathCompany')
  BEGIN
   CREATE TABLE [dbo].[DocumentPathCompany] (
    [documentpath] NVARCHAR(MAX) NOT NULL
   );
   INSERT INTO [dbo].[DocumentPathCompany] ([documentpath]) VALUES ('z:\\HRMS COMPANY DOCUMENTS\\');
  END
 `);
}

async function getCompanyDocumentDirectory(){
 await ensureCompanyDocumentPathTable();
 const dbPool=await getPool();
 const result=await dbPool.request().query(`SELECT TOP 1 [documentpath] AS DocumentPath FROM [dbo].[DocumentPathCompany]`);
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
  .query(`SELECT COUNT(*) AS status_count FROM [dbo].[${tableName}] WHERE [${statusColumn}] = ${statusValue}`);
 return Number(result.recordset?.[0]?.status_count || 0);
}

async function getDashboardSummary(){
 const dbPool=await getPool();
 const now = new Date();
 const startOfDay = new Date(now);
 startOfDay.setHours(0, 0, 0, 0);
 const endOfDay = new Date(now);
 endOfDay.setHours(23, 59, 59, 999);

 const geofenceCountResult = await dbPool.request()
  .input("startDate", sql.DateTime, startOfDay)
  .input("endDate", sql.DateTime, endOfDay)
  .query(`SELECT COUNT(*) AS geofence_checkins
    FROM [dbo].[AttendanceGeofence]
    WHERE [attendancedate] >= @startDate AND [attendancedate] < @endDate`);

 const fieldVisitResult = await dbPool.request()
  .input("startDate", sql.DateTime, startOfDay)
  .input("endDate", sql.DateTime, endOfDay)
  .query(`SELECT COUNT(DISTINCT [empcode]) AS field_visits
    FROM [dbo].[AttendanceGeofence]
    WHERE [attendancedate] >= @startDate AND [attendancedate] < @endDate AND LEN(ISNULL([empcode], '')) > 0`);

 const summaryResult = await dbPool.request()
  .input("operation", sql.NVarChar(50), "get_dashboard_summary")
  .execute("sp_webapi");

 const summaryRow = summaryResult.recordset?.[0] || {};
 const totalEmployees = Number(summaryRow.total_employees ?? summaryRow.totalEmployees ?? 0);
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
  candidateCount,
  documentsVerified: candidateCount,
 };
}

async function getEmployeeDetails(empcode){
 const dbPool=await getPool();
 const normalizedEmpCode=String(empcode || "").trim();
 if(!normalizedEmpCode){
  return null;
 }

 const candidateTables=["Employee","employee"];
 for(const tableName of candidateTables){
  try{
   let result;
   try {
    result = await dbPool.request()
     .input("empcode", sql.NVarChar(50), normalizedEmpCode)
     .query(`SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname, [UserName] AS username FROM [dbo].[${tableName}] WHERE [EmpCode] = @empcode`);
   } catch (innerErr) {
    if (innerErr && /Invalid column name 'UserName'|Invalid column name \[UserName\]/i.test(innerErr.message)) {
     result = await dbPool.request()
      .input("empcode", sql.NVarChar(50), normalizedEmpCode)
      .query(`SELECT TOP 1 [EmpCode] AS empcode, [EmpName] AS empname FROM [dbo].[${tableName}] WHERE [EmpCode] = @empcode`);
    } else {
     throw innerErr;
    }
   }

   if(!result.recordset.length){
    continue;
   }

   const row=result.recordset[0];
   const employeeNameValue = row.empname ? String(row.empname).trim() : "";
   const fallbackName = row.username ? String(row.username).trim() : String(row.empcode || "").trim();

   return {
    empcode: row.empcode,
    empname: employeeNameValue || fallbackName || null,
    username: row.username,
   };
  }catch(err){
   console.warn("getEmployeeDetails failed for table", tableName, err.message);
  }
 }

 return null;
}

async function authenticateUser(username,password){
 const normalizedUsername=String(username || "").trim();
 const normalizedPassword=String(password || "");

 if(normalizedUsername === "admin" && normalizedPassword === "123456"){
  return { username: normalizedUsername, userType: "admin", empname: "Admin" };
 }

 const dbPool=await getPool();
 const result=await dbPool.request()
  .input("operation", sql.NVarChar(50), "authenticate_user")
  .input("username", sql.NVarChar(100), normalizedUsername)
  .input("password", sql.NVarChar(100), normalizedPassword)
  .execute("sp_webapi");
 const row = result.recordset[0];
 // Helpful debug: show what the stored-proc returned for diagnosis
 console.debug && console.debug('authenticate_user result:', result.recordset && result.recordset.length ? result.recordset : []);
 if(!row?.username){
  return null;
 }
 const userType = row.usertype || 'employee';
 const user = { username: row.username, userType };
 if(userType === "employee"){
  if(row.empname){
   user.empname = row.empname;
  } else {
   const employeeDetails = await getEmployeeDetails(row.username);
   if(employeeDetails?.empname){
    user.empname = employeeDetails.empname;
   }
  }
 }
 return user;
}

async function detectUserType(username,password,dbPool){
 const adminResult=await dbPool.request()
  .input("username", sql.NVarChar(100), username)
  .input("password", sql.NVarChar(100), password)
  .query(`SELECT TOP 1 1 AS isAdmin FROM [dbo].[usermaster] WHERE [username]=@username AND [password]=@password UNION SELECT TOP 1 1 AS isAdmin FROM [dbo].[UserMaster] WHERE [username]=@username AND [password]=@password`);
 if(adminResult.recordset.length){
  return "admin";
 }
 return "employee";
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
 const {username,password}=req.body;
 try{
  const user=await authenticateUser(username,password);
  if(user){
   const companycode = String(req.body.companycode || "01").trim() || "01";
   const accessToken=createAccessToken(user,companycode);
   const refreshToken=createRefreshToken(user,companycode);
   return res.json({
    token:accessToken,
    refreshToken,
    username:user.username,
    companycode,
    userType:user.userType,
    empName:user.empname || null,
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
  const companycode=String(payload.companycode || "01").trim() || "01";
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
  const resolvedCompanyCode=String(companycode || "01").trim() || "01";
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

  const existingSignature=await dbPool.request()
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .query(`SELECT TOP 1 1 AS existsRow FROM [dbo].[empsignature] WHERE [empcode] = @empcode`);

  if(existingSignature.recordset[0]?.existsRow){
   await dbPool.request()
    .input("companycode", sql.NVarChar(50), resolvedCompanyCode)
    .input("empcode", sql.NVarChar(50), safeEmpCode)
    .input("signatureimage", sql.VarBinary(sql.MAX), signatureBuffer)
    .input("description", sql.NVarChar(200), safeDescription)
    .query(`UPDATE [dbo].[empsignature]
      SET [companycode] = @companycode,
          [signatureimage] = @signatureimage,
          [description] = @description
      WHERE [empcode] = @empcode`);
  } else {
   await dbPool.request()
    .input("companycode", sql.NVarChar(50), resolvedCompanyCode)
    .input("empcode", sql.NVarChar(50), safeEmpCode)
    .input("signatureimage", sql.VarBinary(sql.MAX), signatureBuffer)
    .input("description", sql.NVarChar(200), safeDescription)
    .query(`INSERT INTO [dbo].[empsignature] ([companycode], [empcode], [signatureimage], [description])
      VALUES (@companycode, @empcode, @signatureimage, @description)`);
  }

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
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .query(`SELECT TOP 1 [companycode], [empcode], [signatureimage], [description]
    FROM [dbo].[empsignature] WHERE [empcode] = @empcode`);

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
   .input("empcode", sql.NVarChar(50), safeEmpCode)
   .query(`DELETE FROM [dbo].[empsignature] WHERE [empcode] = @empcode`);

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
  const resolvedCompanyCode=String(companycode || "01").trim() || "01";
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
   .input("companycode",sql.NVarChar(50),resolvedCompanyCode)
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .input("latitude",sql.Decimal(10,8),parseFloat(latitude))
   .input("longitude",sql.Decimal(11,8),parseFloat(longitude))
   .input("selfiimage",sql.VarBinary(sql.MAX),selfieImageBuffer)
   .input("selfieimage_base64",sql.NVarChar(sql.MAX),selfieBase64 || null)
   .input("status",sql.NVarChar(20),status || "Present")
   .input("remarks",sql.NVarChar(500),remarks || "")
   .input("geofenceradius",sql.Decimal(10,2),Number.isFinite(parsedRadius) ? parsedRadius : null)
   .query(`INSERT INTO [dbo].[AttendanceGeofence] (
      [companycode], [empcode], [latitude], [longitude], [selfiimage], [selfieimage_base64], [status], [remarks], [geofenceradius]
    )
    OUTPUT INSERTED.[AttendanceID]
    VALUES (@companycode, @empcode, @latitude, @longitude, @selfiimage, @selfieimage_base64, @status, @remarks, @geofenceradius)`);

  if(fs.existsSync(req.file.path)){
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
   .input("empcode",sql.NVarChar(50),safeEmpCode)
   .query(`SELECT TOP 5
      [AttendanceID], [companycode], [empcode], [attendancedate], [latitude], [longitude], [status], [remarks], [geofenceradius]
    FROM [dbo].[AttendanceGeofence]
    WHERE [empcode] = @empcode
    ORDER BY [attendancedate] DESC`);

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
  const companyCode=result.recordset[0].companycode || "01";
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
  const result=await dbPool.request().query(`
   SELECT [DocumentID], [DocumentCode], [DocumentName], [DocumentExtension], [Status], [ExpiryDate], [RemainderOn]
   FROM [dbo].[DocumentCompany]
   ORDER BY [DocumentID] DESC
  `);
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
  let safeCode=String(documentcode || companycode || req.body?.companycode || req.user?.companycode || "").trim() || "01";
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
   .input("documentcode",sql.NVarChar(50),safeCode || null)
   .input("documentname",sql.NVarChar(50),safeName)
   .input("documentextension",sql.NVarChar(50),ext || null)
   .input("status",sql.Bit,safeStatus)
   .input("expirydate",sql.DateTime, safeExpiryDate ? new Date(safeExpiryDate) : null)
   .input("remainderon",sql.DateTime, safeRemainderOn ? new Date(safeRemainderOn) : null)
   .query(`INSERT INTO [dbo].[DocumentCompany] ([DocumentCode], [DocumentName], [DocumentExtension], [Status], [ExpiryDate], [RemainderOn])
    OUTPUT INSERTED.[DocumentID]
    VALUES (@documentcode, @documentname, @documentextension, @status, @expirydate, @remainderon)`);

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
   .input("documentId",sql.Int,Number(documentId))
   .query(`SELECT TOP 1 [DocumentID], [DocumentCode], [DocumentName], [DocumentExtension] FROM [dbo].[DocumentCompany] WHERE [DocumentID] = @documentId`);
  if(result.recordset.length===0){
   return res.status(404).json({message:"Company document not found"});
  }

  const docCode=String(result.recordset[0].DocumentCode || "").trim() || "01";
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
   .input("documentId",sql.Int,Number(documentId))
   .query(`DELETE FROM [dbo].[DocumentCompany] WHERE [DocumentID] = @documentId`);

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
   .input("documentId",sql.Int,Number(documentId))
   .query(`SELECT TOP 1 [DocumentID], [DocumentCode], [DocumentName], [DocumentExtension] FROM [dbo].[DocumentCompany] WHERE [DocumentID] = @documentId`);
  if(result.recordset.length===0){
   return res.status(404).json({message:"Company document not found"});
  }

  const docCode=String(result.recordset[0].DocumentCode || "").trim() || "01";
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
