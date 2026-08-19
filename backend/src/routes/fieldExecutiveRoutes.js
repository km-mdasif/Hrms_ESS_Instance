const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { executeStoredProcedure } = require("../database/db");

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
  await executeStoredProcedure("sp_webapi", { operation: "ensure_field_executive_table" });
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
    const result = await executeStoredProcedure("sp_webapi", {
      operation: "insert_field_executive_visit",
      companycode: companyCode || "01",
      empcode: employeeCode,
      empname: employeeName || null,
      natureofwork: natureOfWork,
      visitdatetime: visitDate,
      visittype: visitType || "checkin",
      clientname: clientName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy !== undefined && accuracy !== null && accuracy !== "" ? parseFloat(accuracy) : null,
      remarks: remarks || null,
      employeeselfie: employeeSelfieBuffer,
      employeeselfie_base64: employeeSelfieSource || null,
      clientselfie: clientSelfieBuffer,
      clientselfie_base64: clientSelfieSource || null,
      documentname: documentName || null,
      documentextension: documentExtension || null,
      documentcontent: documentBuffer
    });

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
    const result = await executeStoredProcedure("sp_webapi", {
      operation: "get_field_executive_list"
    });
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

    const result = await executeStoredProcedure("sp_webapi", {
      operation: "get_field_executive_list"
    });
    const records = (result.recordset || []).filter((record) =>
      String(record?.empcode || record?.EmpCode || "").trim() === safeEmpCode
    ).slice(0, 50);

    return res.json({
      message: "Employee field executive history retrieved.",
      records,
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

    const result = await executeStoredProcedure("sp_webapi", {
      operation: "get_field_executive_report",
      fromDate: fromDate ? new Date(fromDate) : null,
      toDate: toDate ? new Date(toDate) : null,
      location: safeLocation ? `%${safeLocation}%` : null
    });
    return res.json({ message: "Field executive report retrieved.", records: result.recordset || [] });
  } catch (error) {
    console.error("Field executive report failed:", error);
    return res.status(500).json({ error: error.message || "Failed to get field executive report" });
  }
});

module.exports = router;
