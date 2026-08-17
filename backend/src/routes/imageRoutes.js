/**
 * Image Routes
 * Handles employee profile images
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ImageService = require("../services/imageService");
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
      cb(null, `img-${timestamp}-${random}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * POST /emp-images/upload/:empCode
 * Upload employee image
 */
router.post("/emp-images/:empCode/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const result = await ImageService.uploadEmployeeImage(req.params.empCode, req.file);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /emp-images/:empCode
 * Get employee image
 */
router.get("/emp-images/:empCode", async (req, res, next) => {
  try {
    const image = await ImageService.getEmployeeImage(req.params.empCode);

    if (!image) {
      throw new AppError("Image not found", 404);
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /emp-images/:empCode
 * Delete employee image
 */
router.delete("/emp-images/:empCode", async (req, res, next) => {
  try {
    await ImageService.deleteEmployeeImage(req.params.empCode, req.body.filePath);

    res.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
