/**
 * Signature Service
 * Handles digital signature management
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile } = require("../utils/fileManager");

class SignatureService {
  /**
   * Upload employee signature
   */
  static async uploadSignature(empCode, file) {
    try {
      await executeStoredProcedure("sp_webapi", {
        operation: "upsert_emp_signature",
        companycode: "01",
        empcode: String(empCode || "").trim(),
        signatureimage: file?.buffer || null,
        description: file?.originalname || "signature"
      });

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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_emp_signature",
        empcode: String(empCode || "").trim()
      });

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

      await executeStoredProcedure("sp_webapi", {
        operation: "delete_emp_signature",
        empcode: String(empCode || "").trim()
      });

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
