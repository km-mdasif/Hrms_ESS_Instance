/**
 * Image Service
 * Handles employee profile images
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile } = require("../utils/fileManager");
const fs = require("fs");

class ImageService {
  /**
   * Upload employee image
   */
  static async uploadEmployeeImage(empCode, file) {
    try {
      await executeStoredProcedure("sp_webapi", {
        operation: "upsert_emp_image",
        empcode: String(empCode || "").trim(),
        companycode: "01",
        empimage: file?.buffer || null,
        imagename: file?.originalname || "employee-image",
        description: "employee-image"
      });

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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_emp_image",
        empcode: String(empCode || "").trim()
      });

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

      await executeStoredProcedure("sp_webapi", {
        operation: "delete_emp_signature",
        empcode: String(empCode || "").trim()
      });

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
