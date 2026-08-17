/**
 * Signature Routes
 * Handles digital signatures
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const SignatureService = require("../services/signatureService");
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
      cb(null, `sig-${timestamp}-${random}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * POST /emp-signatures/:empCode/upload
 * Upload employee signature
 */
router.post("/emp-signatures/:empCode/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const result = await SignatureService.uploadSignature(req.params.empCode, req.file);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /emp-signatures/:empCode
 * Get employee signature
 */
router.get("/emp-signatures/:empCode", async (req, res, next) => {
  try {
    const signature = await SignatureService.getSignature(req.params.empCode);

    if (!signature) {
      throw new AppError("Signature not found", 404);
    }

    res.json({
      success: true,
      data: signature
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /emp-signatures/:empCode
 * Delete employee signature
 */
router.delete("/emp-signatures/:empCode", async (req, res, next) => {
  try {
    await SignatureService.deleteSignature(req.params.empCode, req.body.filePath);

    res.json({
      success: true,
      message: "Signature deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
