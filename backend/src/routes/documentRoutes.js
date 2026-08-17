/**
 * Document Routes
 * Handles document upload, download, and deletion
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const DocumentService = require("../services/documentService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();
const docDir = path.resolve(__dirname, "../../document-storage");
fs.mkdirSync(docDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: docDir,
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(file.originalname);
      cb(null, `doc-${timestamp}-${random}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * GET /emp-documents/:empCode
 * Get employee documents
 */
router.get("/emp-documents/:empCode", async (req, res, next) => {
  try {
    const docs = await DocumentService.getEmpDocuments(req.params.empCode);

    res.json({
      success: true,
      data: docs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /emp-documents/upload
 * Upload employee document
 */
router.post("/emp-documents/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const empCode = req.body.empCode || req.user?.username;
    if (!empCode) {
      throw new AppError("Employee code is required", 400);
    }

    const result = await DocumentService.uploadEmpDocument(empCode, req.file, req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /emp-documents/:id
 * Delete employee document
 */
router.delete("/emp-documents/:id", async (req, res, next) => {
  try {
    await DocumentService.deleteEmpDocument(req.params.id, req.body.filePath);

    res.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /document-types
 * Get document types
 */
router.get("/document-types", async (req, res, next) => {
  try {
    const types = await DocumentService.getDocumentTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /company-documents
 * Get company documents
 */
router.get("/company-documents", async (req, res, next) => {
  try {
    const companyCode = req.user?.companycode || "01";
    const docs = await DocumentService.getCompanyDocuments(companyCode);

    res.json({
      success: true,
      data: docs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /company-documents/upload
 * Upload company document
 */
router.post("/company-documents/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const companyCode = req.user?.companycode || "01";

    const result = await DocumentService.uploadCompanyDocument(req.file, {
      ...req.body,
      companyCode
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /company-documents/:id
 * Delete company document
 */
router.delete("/company-documents/:id", async (req, res, next) => {
  try {
    await DocumentService.deleteCompanyDocument(req.params.id, req.body.filePath);

    res.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
