/**
 * Signature Service
 * Handles digital signature management
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile } = require("../utils/fileManager");

class SignatureService {
  /**
   * Upload employee signature
   */
  static async uploadSignature(empCode, file) {
    try {
      const params = {
        empCode: String(empCode).trim(),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      };

      // Check if signature already exists
      const existing = await executeQuery(
        `SELECT filename FROM EmpSignature WHERE empCode = @empCode`,
        { empCode: params.empCode }
      );

      if (existing.recordset && existing.recordset.length > 0) {
        // Delete old signature
        deleteFile(existing.recordset[0].filename);
        // Update existing
        await executeQuery(
          `UPDATE EmpSignature SET filename = @filename, mimeType = @mimeType, uploadedAt = @uploadedAt WHERE empCode = @empCode`,
          params
        );
      } else {
        // Insert new
        await executeQuery(
          `INSERT INTO EmpSignature (empCode, filename, originalName, mimeType, uploadedAt)
           VALUES (@empCode, @filename, @originalName, @mimeType, @uploadedAt)`,
          params
        );
      }

      return { success: true, filename: file.filename };
    } catch (error) {
      deleteFile(file.path);
      console.error("[SignatureService] Upload signature error:", error);
      throw new AppError("Failed to upload signature", 500);
    }
  }

  /**
   * Get employee signature
   */
  static async getSignature(empCode) {
    try {
      const result = await executeQuery(
        `SELECT filename FROM EmpSignature WHERE empCode = @empCode`,
        { empCode: String(empCode).trim() }
      );

      return result.recordset?.[0] || null;
    } catch (error) {
      console.error("[SignatureService] Get signature error:", error);
      throw new AppError("Failed to fetch signature", 500);
    }
  }

  /**
   * Delete employee signature
   */
  static async deleteSignature(empCode, filePath) {
    try {
      deleteFile(filePath);

      await executeQuery(
        `DELETE FROM EmpSignature WHERE empCode = @empCode`,
        { empCode: String(empCode).trim() }
      );

      return { success: true };
    } catch (error) {
      console.error("[SignatureService] Delete signature error:", error);
      throw new AppError("Failed to delete signature", 500);
    }
  }

  /**
   * Get signature as base64
   */
  static async getSignatureAsBase64(empCode, filePath) {
    try {
      const fs = require("fs");
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = fs.readFileSync(filePath);
      return buffer.toString("base64");
    } catch (error) {
      console.error("[SignatureService] Get signature as base64 error:", error);
      throw new AppError("Failed to read signature", 500);
    }
  }
}

module.exports = SignatureService;
