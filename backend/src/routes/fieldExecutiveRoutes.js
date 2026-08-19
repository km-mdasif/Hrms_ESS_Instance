const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { getPool } = require("../database/db");

const router = express.Router();

const DEFAULT_DOCUMENT_PATH = path.resolve(__dirname, "../../document-storage");
if (!fs.existsSync(DEFAULT_DOCUMENT_PATH)) {
  fs.mkdirSync(DEFAULT_DOCUMENT_PATH, { recursive: true });
}

const upload = multer({
  dest: DEFAULT_DOCUMENT_PATH,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Ensure FieldExecutiveVisit table exists
async function ensureFieldExecutiveTable() {
  const dbPool = await getPool();
  const query = `
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'FieldExecutiveVisit')
    BEGIN
      CREATE TABLE [dbo].[FieldExecutiveVisit] (
        [VisitID] INT PRIMARY KEY IDENTITY(1,1),
        [companycode] NVARCHAR(50) NOT NULL,
        [empcode] NVARCHAR(50) NOT NULL,
        [empname] NVARCHAR(200),
        [natureofwork] NVARCHAR(250) NOT NULL,
        [visitdatetime] DATETIME NOT NULL DEFAULT GETDATE(),
        [visittype] NVARCHAR(20) NOT NULL DEFAULT 'checkin',
        [clientname] NVARCHAR(200) NOT NULL,
        [latitude] DECIMAL(10,8),
        [longitude] DECIMAL(11,8),
        [accuracy] DECIMAL(10,2),
        [remarks] NVARCHAR(MAX),
        [employeeselfie] VARBINARY(MAX),
        [employeeselfie_base64] NVARCHAR(MAX),
        [clientselfie] VARBINARY(MAX),
        [clientselfie_base64] NVARCHAR(MAX),
        [documentname] NVARCHAR(200),
        [documentextension] NVARCHAR(50),
        [documentcontent] VARBINARY(MAX),
        [createddate] DATETIME NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX idx_fieldexecutive_empcode ON [dbo].[FieldExecutiveVisit] ([empcode]);
      CREATE INDEX idx_fieldexecutive_date ON [dbo].[FieldExecutiveVisit] ([visitdatetime]);
      CREATE INDEX idx_fieldexecutive_company ON [dbo].[FieldExecutiveVisit] ([companycode]);
    END
  `;
  await dbPool.request().query(query);
}

// POST: Save field executive onsite visit
router.post("/field-executive/onsite", upload.fields([
  { name: "employeeSelfie", maxCount: 1 },
  { name: "clientSelfie", maxCount: 1 },
  { name: "document", maxCount: 1 }
]), async (req, res) => {
  try {
    const tokenUser = req.user || {};
    const companyCode = String(req.body.companycode || tokenUser.companycode || "01").trim() || "01";
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

    // Validate required fields
    if (!employeeCode || !natureOfWork || !clientName) {
      return res.status(400).json({ error: "Employee code, nature of work, and client name are required." });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const employeeSelfieFile = req.files?.employeeSelfie?.[0];
    const clientSelfieFile = req.files?.clientSelfie?.[0];
    const documentFile = req.files?.document?.[0];

    const employeeSelfieSource = String(req.body.employeeSelfie || req.body.employeeSelfieBase64 || "").trim();
    const clientSelfieSource = String(req.body.clientSelfie || req.body.clientSelfieBase64 || "").trim();

    if (!employeeSelfieFile && !employeeSelfieSource) {
      return res.status(400).json({ error: "Employee selfie is required." });
    }
    if (!clientSelfieFile && !clientSelfieSource) {
      return res.status(400).json({ error: "Client selfie is required." });
    }

    const parseBase64Image = (base64Value) => {
      if (!base64Value) return null;
      const trimmed = String(base64Value).trim();
      const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i);
      const cleanBase64 = match ? match[2] : trimmed;
      if (!cleanBase64) return null;
      try {
        return Buffer.from(cleanBase64, "base64");
      } catch (e) {
        console.error("Base64 parse error:", e);
        return null;
      }
    };

    const employeeSelfieBuffer = employeeSelfieFile
      ? fs.readFileSync(employeeSelfieFile.path)
      : parseBase64Image(employeeSelfieSource);
    const clientSelfieBuffer = clientSelfieFile
      ? fs.readFileSync(clientSelfieFile.path)
      : parseBase64Image(clientSelfieSource);
    const documentBuffer = documentFile ? fs.readFileSync(documentFile.path) : null;
    const documentName = documentFile
      ? documentFile.originalname
      : String(req.body.documentName || "").trim() || null;
    const documentExtension = documentName ? path.extname(documentName).replace(".", "") : null;
    const visitDate = Number.isNaN(Date.parse(visitDateTime))
      ? new Date()
      : new Date(visitDateTime);

    await ensureFieldExecutiveTable();
    const dbPool = await getPool();
    const result = await dbPool
      .request()
      .input("companycode", sql.NVarChar(50), companyCode || "01")
      .input("empcode", sql.NVarChar(50), employeeCode)
      .input("empname", sql.NVarChar(200), employeeName || null)
      .input("natureofwork", sql.NVarChar(250), natureOfWork)
      .input("visitdatetime", sql.DateTime, visitDate)
      .input("visittype", sql.NVarChar(20), visitType || "checkin")
      .input("clientname", sql.NVarChar(200), clientName)
      .input("latitude", sql.Decimal(10, 8), parseFloat(latitude))
      .input("longitude", sql.Decimal(11, 8), parseFloat(longitude))
      .input(
        "accuracy",
        sql.Decimal(10, 2),
        accuracy !== undefined && accuracy !== null && accuracy !== ""
          ? parseFloat(accuracy)
          : null
      )
      .input("remarks", sql.NVarChar(sql.MAX), remarks || null)
      .input("employeeselfie", sql.VarBinary(sql.MAX), employeeSelfieBuffer)
      .input("employeeselfie_base64", sql.NVarChar(sql.MAX), employeeSelfieSource || null)
      .input("clientselfie", sql.VarBinary(sql.MAX), clientSelfieBuffer)
      .input("clientselfie_base64", sql.NVarChar(sql.MAX), clientSelfieSource || null)
      .input("documentname", sql.NVarChar(200), documentName || null)
      .input("documentextension", sql.NVarChar(50), documentExtension || null)
      .input("documentcontent", sql.VarBinary(sql.MAX), documentBuffer)
      .query(`
        INSERT INTO [dbo].[FieldExecutiveVisit] (
          [companycode], [empcode], [empname], [natureofwork], [visitdatetime], [visittype], [clientname], 
          [latitude], [longitude], [accuracy], [remarks], [employeeselfie], [employeeselfie_base64], 
          [clientselfie], [clientselfie_base64], [documentname], [documentextension], [documentcontent]
        )
        OUTPUT INSERTED.[VisitID]
        VALUES (
          @companycode, @empcode, @empname, @natureofwork, @visitdatetime, @visittype, @clientname,
          @latitude, @longitude, @accuracy, @remarks, @employeeselfie, @employeeselfie_base64,
          @clientselfie, @clientselfie_base64, @documentname, @documentextension, @documentcontent
        )
      `);

    // Clean up uploaded files
    if (employeeSelfieFile && fs.existsSync(employeeSelfieFile.path))
      fs.unlinkSync(employeeSelfieFile.path);
    if (clientSelfieFile && fs.existsSync(clientSelfieFile.path))
      fs.unlinkSync(clientSelfieFile.path);
    if (documentFile && fs.existsSync(documentFile.path))
      fs.unlinkSync(documentFile.path);

    return res.json({
      message: "Field executive onsite entry saved successfully.",
      visitId: result.recordset[0]?.VisitID,
      empcode: employeeCode,
      companycode: companyCode,
      visitdatetime: visitDate.toISOString(),
      visitType,
      clientName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });
  } catch (error) {
    console.error("Field executive save failed:", error);
    return res.status(500).json({ error: error.message || "Field executive save failed" });
  }
});

// GET: List field executive visits
router.get("/field-executive/list", async (req, res) => {
  try {
    await ensureFieldExecutiveTable();
    const dbPool = await getPool();
    const result = await dbPool.request().query(`
      SELECT TOP 100
        [VisitID], [companycode], [empcode], [empname], [natureofwork], [visitdatetime], 
        [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [documentname]
      FROM [dbo].[FieldExecutiveVisit]
      ORDER BY [visitdatetime] DESC
    `);
    return res.json({ message: "Field executive visits retrieved.", records: result.recordset || [] });
  } catch (error) {
    console.error("Field executive list failed:", error);
    return res.status(500).json({ error: error.message || "Failed to load field executive records" });
  }
});

// GET: Field executive employee history
router.get("/field-executive/employee/:empcode", async (req, res) => {
  try {
    const { empcode } = req.params;
    const safeEmpCode = String(empcode || "").trim();

    if (!safeEmpCode) {
      return res.status(400).json({ error: "Employee code is required." });
    }

    await ensureFieldExecutiveTable();
    const dbPool = await getPool();
    const result = await dbPool.request()
      .input("empcode", sql.NVarChar(50), safeEmpCode)
      .query(`
        SELECT TOP 50
          [VisitID], [companycode], [empcode], [empname], [natureofwork], [visitdatetime],
          [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [documentname]
        FROM [dbo].[FieldExecutiveVisit]
        WHERE [empcode] = @empcode
        ORDER BY [visitdatetime] DESC
      `);

    return res.json({
      message: "Employee field executive history retrieved.",
      records: result.recordset || [],
    });
  } catch (error) {
    console.error("Field executive employee history failed:", error);
    return res.status(500).json({ error: error.message || "Failed to load employee history" });
  }
});

// GET: Field executive report
router.get("/field-executive/report", async (req, res) => {
  try {
    const { fromDate, toDate, location } = req.query;
    const safeLocation = String(location || "").trim();

    await ensureFieldExecutiveTable();
    const dbPool = await getPool();
    let query = `
      SELECT [VisitID], [companycode], [empcode], [empname], [natureofwork], [visitdatetime],
             [visittype], [clientname], [latitude], [longitude], [accuracy], [remarks], [documentname]
      FROM [dbo].[FieldExecutiveVisit]
      WHERE 1 = 1
    `;
    const request = dbPool.request();

    if (fromDate) {
      query += ` AND [visitdatetime] >= @fromDate`;
      request.input("fromDate", sql.DateTime, new Date(fromDate));
    }
    if (toDate) {
      query += ` AND [visitdatetime] <= @toDate`;
      request.input("toDate", sql.DateTime, new Date(toDate));
    }
    if (safeLocation) {
      query += ` AND ([clientname] LIKE @location OR [natureofwork] LIKE @location OR [empname] LIKE @location)`;
      request.input("location", sql.NVarChar(200), `%${safeLocation}%`);
    }
    query += ` ORDER BY [visitdatetime] DESC`;

    const result = await request.query(query);
    return res.json({ message: "Field executive report retrieved.", records: result.recordset || [] });
  } catch (error) {
    console.error("Field executive report failed:", error);
    return res.status(500).json({ error: error.message || "Failed to get field executive report" });
  }
});

module.exports = router;
