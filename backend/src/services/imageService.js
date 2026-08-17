/**
 * Image Service
 * Handles employee profile images
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile } = require("../utils/fileManager");
const fs = require("fs");

class ImageService {
  /**
   * Upload employee image
   */
  static async uploadEmployeeImage(empCode, file) {
    try {
      const params = {
        empCode: String(empCode).trim(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      };

      // Check if image already exists
      const existing = await executeQuery(
        `SELECT filename FROM EmpImage WHERE empCode = @empCode`,
        { empCode: params.empCode }
      );

      if (existing.recordset && existing.recordset.length > 0) {
        // Delete old image
        deleteFile(existing.recordset[0].filename);
        // Update existing
        await executeQuery(
          `UPDATE EmpImage SET filename = @filename, mimeType = @mimeType, uploadedAt = @uploadedAt WHERE empCode = @empCode`,
          params
        );
      } else {
        // Insert new
        await executeQuery(
          `INSERT INTO EmpImage (empCode, filename, originalName, mimeType, uploadedAt)
           VALUES (@empCode, @filename, @originalName, @mimeType, @uploadedAt)`,
          params
        );
      }

      return { success: true, filename: file.filename };
    } catch (error) {
      deleteFile(file.path);
      console.error("[ImageService] Upload image error:", error);
      throw new AppError("Failed to upload employee image", 500);
    }
  }

  /**
   * Get employee image
   */
  static async getEmployeeImage(empCode) {
    try {
      const result = await executeQuery(
        `SELECT filename FROM EmpImage WHERE empCode = @empCode`,
        { empCode: String(empCode).trim() }
      );

      return result.recordset?.[0] || null;
    } catch (error) {
      console.error("[ImageService] Get image error:", error);
      throw new AppError("Failed to fetch employee image", 500);
    }
  }

  /**
   * Delete employee image
   */
  static async deleteEmployeeImage(empCode, filePath) {
    try {
      deleteFile(filePath);

      await executeQuery(
        `DELETE FROM EmpImage WHERE empCode = @empCode`,
        { empCode: String(empCode).trim() }
      );

      return { success: true };
    } catch (error) {
      console.error("[ImageService] Delete image error:", error);
      throw new AppError("Failed to delete employee image", 500);
    }
  }

  /**
   * Get image as base64
   */
  static async getEmployeeImageAsBase64(empCode, filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const imageBuffer = fs.readFileSync(filePath);
      return imageBuffer.toString("base64");
    } catch (error) {
      console.error("[ImageService] Get image as base64 error:", error);
      throw new AppError("Failed to read employee image", 500);
    }
  }
}

module.exports = ImageService;
