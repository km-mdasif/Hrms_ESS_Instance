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

async function ensureLeaveLogTable(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LeaveLog')
  BEGIN
   CREATE TABLE [dbo].[LeaveLog](
    [LeaveLogID] [int] IDENTITY(1,1) NOT NULL,
    [CompanyCode] [nvarchar](50) NULL,
    [EmpCode] [nvarchar](50) NULL,
    [FromDate] [datetime] NULL,
    [ToDate] [datetime] NULL,
    [Information] [nvarchar](50) NULL,
    [Description] [nvarchar](500) NULL,
    [isApproved] [bit] NOT NULL CONSTRAINT [DF__LeaveLog__isAppr__25077354] DEFAULT ((0)),
    [IsCancel] [bit] NOT NULL CONSTRAINT [DF_LeaveLog_IsCancel] DEFAULT ((0)),
    CONSTRAINT [PK_LeaveLog] PRIMARY KEY CLUSTERED ([LeaveLogID] ASC)
   ) ON [PRIMARY];
   CREATE INDEX idx_leave_log_empcode ON [dbo].[LeaveLog] ([EmpCode]);
   CREATE INDEX idx_leave_log_company ON [dbo].[LeaveLog] ([CompanyCode]);
  END
  IF COL_LENGTH('dbo.LeaveLog', 'CompanyCode') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [CompanyCode] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'EmpCode') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [EmpCode] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'FromDate') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [FromDate] DATETIME NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'ToDate') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [ToDate] DATETIME NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'Information') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [Information] NVARCHAR(50) NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'Description') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [Description] NVARCHAR(500) NULL;
  END
  IF COL_LENGTH('dbo.LeaveLog', 'isApproved') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [isApproved] BIT NOT NULL CONSTRAINT [DF__LeaveLog__isAppr__25077354] DEFAULT ((0));
  END
  IF COL_LENGTH('dbo.LeaveLog', 'IsCancel') IS NULL
  BEGIN
   ALTER TABLE [dbo].[LeaveLog] ADD [IsCancel] BIT NOT NULL CONSTRAINT [DF_LeaveLog_IsCancel] DEFAULT ((0));
  END
 `);
}

async function ensureInterviewTables(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewEntry](
    [InterviewID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewCode] [nvarchar](50) NOT NULL,
    [CompanyCode] [nvarchar](50) NULL,
    [InterviewDate] [datetime] NULL,
    [CandidateName] [nvarchar](50) NULL,
    [Gender] [nvarchar](50) NULL,
    [Age] [int] NULL,
    [MaritialStatus] [nvarchar](50) NULL,
    [ContactNumber] [nvarchar](50) NULL,
    [ContactNumber1] [nvarchar](50) NULL,
    [EmailID] [nvarchar](50) NULL,
    [Address] [nvarchar](max) NULL,
    [PermanentLocation] [nvarchar](250) NULL,
    [PresentLocation] [nvarchar](250) NULL,
    [HighestQualification] [nvarchar](50) NULL,
    [PreviousDesignation] [nvarchar](250) NULL,
    [PostingApplyingFor] [nvarchar](250) NULL,
    [Category] [nvarchar](50) NULL,
    [RefferedBy] [nvarchar](150) NULL,
    [ReasontoReleave] [nvarchar](max) NULL,
    [Remarks] [nvarchar](max) NULL,
    [TotalExperience] [decimal](18, 2) NULL,
    [CurrentCTC] [decimal](18, 0) NULL,
    [ExpectedCTC] [decimal](18, 2) NULL,
    [ExpectedCTCNegotiable] [bit] NULL,
    [NoticePeriod] [decimal](18, 2) NULL,
    [NoticePeriodNegotiable] [bit] NULL,
    [ExpectedJoiningDate] [datetime] NULL,
    CONSTRAINT [PK_InterviewEntry] PRIMARY KEY CLUSTERED ([InterviewID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewTimeEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewTimeEntry](
    [InterviewTimeID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NULL,
    [InterviewDateTime] [datetime] NULL,
    [notes] [nvarchar](max) NULL,
    CONSTRAINT [PK_InterviewTimeEntry] PRIMARY KEY CLUSTERED ([InterviewTimeID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewSkillEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewSkillEntry](
    [SkillID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NULL,
    [SkillName] [nvarchar](150) NULL,
    [Experience] [decimal](18, 2) NULL,
    CONSTRAINT [PK_InterviewSkillEntry] PRIMARY KEY CLUSTERED ([SkillID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewRelationEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewRelationEntry](
    [RelationID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NULL,
    [RelationName] [nvarchar](150) NULL,
    [Relationship] [nvarchar](150) NULL,
    [Age] [int] NULL,
    CONSTRAINT [PK_InterviewRelationEntry] PRIMARY KEY CLUSTERED ([RelationID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewTimeEntryLevel')
  BEGIN
   CREATE TABLE [dbo].[InterviewTimeEntryLevel](
    [InterviewTimeEntryLevelID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NULL,
    [ConductedBy] [nvarchar](max) NULL,
    [NotesConductedBy] [nvarchar](max) NULL,
    [NotesCandiadate] [nvarchar](max) NULL,
    [RoundStatus] [int] NULL,
    [RoundScore] [int] NULL,
    [MoveToNextRound] [bit] NULL,
    CONSTRAINT [PK_InterviewFinalEntry] PRIMARY KEY CLUSTERED ([InterviewTimeEntryLevelID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewFinalEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewFinalEntry](
    [InterviewFinalID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NULL,
    [IDProof] [nvarchar](50) NULL,
    [IDProofNumber] [nvarchar](50) NULL,
    [FinalRoundStatus] [int] NULL,
    [FinalRoundScore] [int] NULL,
    [InterviewStatus] [int] NULL,
    [Notes] [nvarchar](max) NULL,
    [JoiningDate] [datetime] NULL,
    [FixedCTC] [int] NULL,
    CONSTRAINT [PK_InterviewFinalEntry] PRIMARY KEY CLUSTERED ([InterviewFinalID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewExperienceEntry')
  BEGIN
   CREATE TABLE [dbo].[InterviewExperienceEntry](
    [ExperienceID] [int] IDENTITY(1,1) NOT NULL,
    [InterViewID] [int] NULL,
    [CompanyName] [nvarchar](250) NULL,
    [Experience] [decimal](18, 2) NULL,
    [Salary] [decimal](18, 2) NULL,
    CONSTRAINT [PK_InterviewExperienceEntry] PRIMARY KEY CLUSTERED ([ExperienceID] ASC)
   ) ON [PRIMARY];
  END

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InterviewAddress')
  BEGIN
   CREATE TABLE [dbo].[InterviewAddress](
    [InterviewAddressID] [int] IDENTITY(1,1) NOT NULL,
    [InterviewID] [int] NOT NULL,
    [ContactPersonName] [nvarchar](150) NULL,
    [Careof] [nvarchar](50) NULL,
    [CareOfName] [nvarchar](150) NULL,
    [DoorNo] [nvarchar](150) NULL,
    [Address1] [nvarchar](500) NULL,
    [Address2] [nvarchar](500) NULL,
    [AddressType] [nvarchar](50) NULL,
    [LandMark] [nvarchar](500) NULL,
    [CurrentLocation] [nvarchar](500) NULL,
    [PermanentLocation] [nvarchar](500) NULL,
    [CurrentAddress] [nvarchar](max) NULL,
    [Village] [nvarchar](50) NULL,
    [Town] [nvarchar](50) NULL,
    [District] [nvarchar](50) NULL,
    [State] [nvarchar](50) NULL,
    [Country] [nvarchar](50) NULL,
    [PinCode] [nvarchar](50) NULL,
    [ContactNo] [nvarchar](50) NULL,
    [Remarks] [nvarchar](500) NULL,
    CONSTRAINT [PK__Intervie__687C1EE805C3D225] PRIMARY KEY CLUSTERED ([InterviewAddressID] ASC)
   ) ON [PRIMARY];
  END
 `);
}

async function ensureVisitorTables(){
 const dbPool=await getPool();
 await dbPool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VisitorEntry')
  BEGIN
   CREATE TABLE [dbo].[VisitorEntry](
    [VisitorID] [int] IDENTITY(1,1) NOT NULL,
    [VisitorCode] [nvarchar](50) NULL,
    [VisitDate] [datetime] NULL,
    [VisitorName] [nvarchar](150) NULL,
    [VisitorCompanyName] [nvarchar](150) NULL,
    [ContactNumber] [nvarchar](50) NULL,
    [Empcode] [nvarchar](50) NULL,
    [EmpName] [nvarchar](150) NULL,
    [Department] [nvarchar](50) NULL,
    [Purpose] [bit] NULL,
    [PurposeRegarding] [nvarchar](max) NULL,
    [AppointmentType] [bit] NULL,
    [AppointmentDate] [datetime] NULL,
    [VechileNumber] [nvarchar](50) NULL,
    [EmailID] [nvarchar](50) NULL,
    [ConformationRequired] [bit] NULL,
    [CoVisitor1] [nvarchar](50) NULL,
    [CoVisitor2] [nvarchar](50) NULL,
    [IdProof] [nvarchar](50) NULL,
    [IDProofNumber] [nvarchar](150) NULL,
    [MaterialsCarrying] [nvarchar](50) NULL,
    [IsReturnableMaterial] [bit] NULL,
    [ReturnableMaterialDescription] [nvarchar](max) NULL,
    CONSTRAINT [PK_VisitorEntry] PRIMARY KEY CLUSTERED ([VisitorID] ASC)
   ) ON [PRIMARY];
   CREATE INDEX idx_visitor_empcode ON [dbo].[VisitorEntry] ([Empcode]);
   CREATE INDEX idx_visitor_date ON [dbo].[VisitorEntry] ([VisitDate]);
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

async function countActiveEmployees() {
 const dbPool = await getPool();
 const candidateTables = ["Employee", "employee"];
 const candidateColumns = ["EmpStatus", "empstatus", "empstaus", "Status", "status"];

 for (const tableName of candidateTables) {
  for (const columnName of candidateColumns) {
   try {
    const result = await dbPool.request()
     .query(`SELECT COUNT(*) AS total_employees FROM [dbo].[${tableName}] WHERE [${columnName}] = 1`);
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
  const fallbackResult = await dbPool.request().query(`SELECT COUNT(*) AS total_employees FROM [dbo].[Employee]`);
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

  const leaveCountResult = await dbPool.request().query(`SELECT COUNT(*) AS leave_count FROM [dbo].[LeaveLog]`);

  try {
   const visitorCountResult = await dbPool.request().query(`SELECT COUNT(*) AS visitor_count FROM [dbo].[VisitorEntry]`);
   visitorCount = Number(visitorCountResult.recordset?.[0]?.visitor_count || 0);
  } catch (error) {
   visitorCount = 0;
  }

  try {
   const interviewTodayResult = await dbPool.request()
    .input("startDate", sql.DateTime, startOfDay)
    .input("endDate", sql.DateTime, endOfDay)
    .query(`SELECT COUNT(*) AS interview_today_count FROM [dbo].[InterviewEntry] WHERE [InterviewDate] >= @startDate AND [InterviewDate] < @endDate`);
   interviewTodayCount = Number(interviewTodayResult.recordset?.[0]?.interview_today_count || 0);
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
   documentsVerified: Number(summaryRow.documents_verified ?? summaryRow.documentsVerified ?? leaveCountResult.recordset?.[0]?.leave_count || 0),
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

app.get("/interviews", async (req, res) => {
 try {
  await ensureInterviewTables();
  const dbPool = await getPool();
  const result = await dbPool.request().query(`SELECT TOP 20 * FROM [dbo].[InterviewEntry] ORDER BY [InterviewID] DESC`);
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
  const result = await dbPool.request().query(`SELECT TOP 50 * FROM [dbo].[VisitorEntry] ORDER BY [VisitorID] DESC`);
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
   .query(`INSERT INTO [dbo].[VisitorEntry]
    ([VisitorCode],[VisitDate],[VisitorName],[VisitorCompanyName],[ContactNumber],[Empcode],[EmpName],[Department],[Purpose],[PurposeRegarding],[AppointmentType],[AppointmentDate],[VechileNumber],[EmailID],[ConformationRequired],[CoVisitor1],[CoVisitor2],[IdProof],[IDProofNumber],[MaterialsCarrying],[IsReturnableMaterial],[ReturnableMaterialDescription])
    OUTPUT INSERTED.[VisitorID]
    VALUES (@VisitorCode,@VisitDate,@VisitorName,@VisitorCompanyName,@ContactNumber,@Empcode,@EmpName,@Department,@Purpose,@PurposeRegarding,@AppointmentType,@AppointmentDate,@VechileNumber,@EmailID,@ConformationRequired,@CoVisitor1,@CoVisitor2,@IdProof,@IDProofNumber,@MaterialsCarrying,@IsReturnableMaterial,@ReturnableMaterialDescription)`);
  
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
    .input("InterviewCode", sql.NVarChar(50), interviewCode)
    .input("CompanyCode", sql.NVarChar(50), String(interview.CompanyCode || "01"))
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
    .query(`INSERT INTO [dbo].[InterviewEntry]
      ([InterviewCode],[CompanyCode],[InterviewDate],[CandidateName],[Gender],[Age],[MaritialStatus],[ContactNumber],[ContactNumber1],[EmailID],[Address],[PermanentLocation],[PresentLocation],[HighestQualification],[PreviousDesignation],[PostingApplyingFor],[Category],[RefferedBy],[ReasontoReleave],[Remarks],[TotalExperience],[CurrentCTC],[ExpectedCTC],[ExpectedCTCNegotiable],[NoticePeriod],[NoticePeriodNegotiable],[ExpectedJoiningDate])
      OUTPUT INSERTED.[InterviewID]
      VALUES (@InterviewCode,@CompanyCode,@InterviewDate,@CandidateName,@Gender,@Age,@MaritialStatus,@ContactNumber,@ContactNumber1,@EmailID,@Address,@PermanentLocation,@PresentLocation,@HighestQualification,@PreviousDesignation,@PostingApplyingFor,@Category,@RefferedBy,@ReasontoReleave,@Remarks,@TotalExperience,@CurrentCTC,@ExpectedCTC,@ExpectedCTCNegotiable,@NoticePeriod,@NoticePeriodNegotiable,@ExpectedJoiningDate)`);

   const interviewId = insertInterview.recordset?.[0]?.InterviewID;

   if (interviewId) {
    for (const skill of skills) {
      if (!skill || (!skill.SkillName && skill.Experience === "" && skill.Experience === undefined && skill.Experience === null)) continue;
      await transaction.request()
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("SkillName", sql.NVarChar(150), skill.SkillName || null)
       .input("Experience", sql.Decimal(18, 2), skill.Experience !== "" && skill.Experience !== null && skill.Experience !== undefined ? Number(skill.Experience) : null)
       .query(`INSERT INTO [dbo].[InterviewSkillEntry] ([InterviewID],[SkillName],[Experience]) VALUES (@InterviewID,@SkillName,@Experience)`);
    }

    for (const relation of relations) {
      if (!relation || (!relation.RelationName && !relation.Relationship && !relation.Age)) continue;
      await transaction.request()
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("RelationName", sql.NVarChar(150), relation.RelationName || null)
       .input("Relationship", sql.NVarChar(150), relation.Relationship || null)
       .input("Age", sql.Int, relation.Age !== "" && relation.Age !== null && relation.Age !== undefined ? Number(relation.Age) : null)
       .query(`INSERT INTO [dbo].[InterviewRelationEntry] ([InterviewID],[RelationName],[Relationship],[Age]) VALUES (@InterviewID,@RelationName,@Relationship,@Age)`);
    }

    for (const slot of timeSlots) {
      if (!slot || (!slot.InterviewDateTime && !slot.notes)) continue;
      await transaction.request()
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("InterviewDateTime", sql.DateTime, slot.InterviewDateTime ? new Date(slot.InterviewDateTime) : null)
       .input("notes", sql.NVarChar(sql.MAX), slot.notes || null)
       .query(`INSERT INTO [dbo].[InterviewTimeEntry] ([InterviewID],[InterviewDateTime],[notes]) VALUES (@InterviewID,@InterviewDateTime,@notes)`);
    }

    if (finalEntry && Object.keys(finalEntry).some((key) => String(finalEntry[key] ?? "") !== "")) {
      await transaction.request()
       .input("InterviewID", sql.Int, Number(interviewId))
       .input("IDProof", sql.NVarChar(50), finalEntry.IDProof || null)
       .input("IDProofNumber", sql.NVarChar(50), finalEntry.IDProofNumber || null)
       .input("FinalRoundStatus", sql.Int, finalEntry.FinalRoundStatus !== "" && finalEntry.FinalRoundStatus !== null && finalEntry.FinalRoundStatus !== undefined ? Number(finalEntry.FinalRoundStatus) : null)
       .input("FinalRoundScore", sql.Int, finalEntry.FinalRoundScore !== "" && finalEntry.FinalRoundScore !== null && finalEntry.FinalRoundScore !== undefined ? Number(finalEntry.FinalRoundScore) : null)
       .input("InterviewStatus", sql.Int, finalEntry.InterviewStatus !== "" && finalEntry.InterviewStatus !== null && finalEntry.InterviewStatus !== undefined ? Number(finalEntry.InterviewStatus) : null)
       .input("Notes", sql.NVarChar(sql.MAX), finalEntry.Notes || null)
       .input("JoiningDate", sql.DateTime, finalEntry.JoiningDate ? new Date(finalEntry.JoiningDate) : null)
       .input("FixedCTC", sql.Int, finalEntry.FixedCTC !== "" && finalEntry.FixedCTC !== null && finalEntry.FixedCTC !== undefined ? Number(finalEntry.FixedCTC) : null)
       .query(`INSERT INTO [dbo].[InterviewFinalEntry] ([InterviewID],[IDProof],[IDProofNumber],[FinalRoundStatus],[FinalRoundScore],[InterviewStatus],[Notes],[JoiningDate],[FixedCTC]) VALUES (@InterviewID,@IDProof,@IDProofNumber,@FinalRoundStatus,@FinalRoundScore,@InterviewStatus,@Notes,@JoiningDate,@FixedCTC)`);
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

  let query = `SELECT [LeaveLogID], [CompanyCode], [EmpCode], [FromDate], [ToDate], [Information], [Description], [isApproved], [IsCancel]
    FROM [dbo].[LeaveLog]`;
  const params = [];

  if (!isAdmin && empCode) {
    query += ` WHERE [EmpCode] = @empCode`;
    params.push({ name: "empCode", type: sql.NVarChar(50), value: empCode });
  }

  if (isAdmin) {
    query += ` ORDER BY [LeaveLogID] DESC`;
  } else if (empCode) {
    query += ` ORDER BY [FromDate] DESC`;
  } else {
    query += ` WHERE [EmpCode] = @empCode ORDER BY [FromDate] DESC`;
    params.push({ name: "empCode", type: sql.NVarChar(50), value: req.user?.username || "" });
  }

  const request = dbPool.request();
  for (const param of params) {
    request.input(param.name, param.type, param.value);
  }

  const result = await request.query(query);
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
  const normalizedCompanyCode = String(companyCode || "01").trim() || "01";
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
   .input("companyCode", sql.NVarChar(50), normalizedCompanyCode)
   .input("empCode", sql.NVarChar(50), normalizedEmpCode)
   .input("fromDate", sql.DateTime, startDate)
   .input("toDate", sql.DateTime, endDate)
   .input("information", sql.NVarChar(50), normalizedInfo)
   .input("description", sql.NVarChar(500), String(description || ""))
   .query(`INSERT INTO [dbo].[LeaveLog] ([CompanyCode],[EmpCode],[FromDate],[ToDate],[Information],[Description],[isApproved],[IsCancel])
    VALUES (@companyCode,@empCode,@fromDate,@toDate,@information,@description,0,0)`);

  return res.status(201).json({
    message: "Leave request added successfully",
    leaveLogId: result && result.recordset && result.recordset[0] ? result.recordset[0].LeaveLogID : null,
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
   .input("leaveLogId", sql.Int, leaveLogId)
   .input("isApproved", sql.Bit, Boolean(isApproved))
   .query(`UPDATE [dbo].[LeaveLog]
    SET [isApproved] = @isApproved,
        [IsCancel] = CASE WHEN @isApproved = 0 THEN 1 ELSE 0 END
    WHERE [LeaveLogID] = @leaveLogId`);

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
