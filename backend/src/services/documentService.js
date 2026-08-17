/**
 * Document Service
 * Handles document upload, download, and deletion
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile, getFileStats } = require("../utils/fileManager");

class DocumentService {
  /**
   * Upload employee document
   */
  static async uploadEmpDocument(empCode, file, metadata) {
    try {
      const params = {
        empCode: String(empCode).trim(),
        documentType: metadata.documentType || "General",
        description: metadata.description || "",
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      };

      const result = await executeQuery(
        `INSERT INTO EmpDocument (empCode, documentType, description, filename, originalName, fileSize, mimeType, uploadedAt)
         VALUES (@empCode, @documentType, @description, @filename, @originalName, @fileSize, @mimeType, @uploadedAt)
         SELECT SCOPE_IDENTITY() as id`,
        params
      );

      return {
        id: result.recordset?.[0]?.id,
        filename: file.filename,
        originalName: file.originalname
      };
    } catch (error) {
      deleteFile(file.path);
      console.error("[DocumentService] Upload document error:", error);
      throw new AppError("Failed to upload document", 500);
    }
  }

  /**
   * Get employee documents
   */
  static async getEmpDocuments(empCode) {
    try {
      const result = await executeQuery(
        `SELECT * FROM EmpDocument WHERE empCode = @empCode ORDER BY uploadedAt DESC`,
        { empCode: String(empCode).trim() }
      );

      return result.recordset || [];
    } catch (error) {
      console.error("[DocumentService] Get employee documents error:", error);
      throw new AppError("Failed to fetch employee documents", 500);
    }
  }

  /**
   * Delete employee document
   */
  static async deleteEmpDocument(docId, filePath) {
    try {
      deleteFile(filePath);

      await executeQuery(
        `DELETE FROM EmpDocument WHERE id = @id`,
        { id: docId }
      );

      return { success: true };
    } catch (error) {
      console.error("[DocumentService] Delete document error:", error);
      throw new AppError("Failed to delete document", 500);
    }
  }

  /**
   * Upload company document
   */
  static async uploadCompanyDocument(file, metadata) {
    try {
      const params = {
        documentType: metadata.documentType || "General",
        description: metadata.description || "",
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        companyCode: metadata.companyCode || "01",
        uploadedAt: new Date()
      };

      const result = await executeQuery(
        `INSERT INTO CompanyDocument (documentType, description, filename, originalName, fileSize, mimeType, companyCode, uploadedAt)
         VALUES (@documentType, @description, @filename, @originalName, @fileSize, @mimeType, @companyCode, @uploadedAt)
         SELECT SCOPE_IDENTITY() as id`,
        params
      );

      return {
        id: result.recordset?.[0]?.id,
        filename: file.filename,
        originalName: file.originalname
      };
    } catch (error) {
      deleteFile(file.path);
      console.error("[DocumentService] Upload company document error:", error);
      throw new AppError("Failed to upload company document", 500);
    }
  }

  /**
   * Get company documents
   */
  static async getCompanyDocuments(companyCode) {
    try {
      const result = await executeQuery(
        `SELECT * FROM CompanyDocument WHERE companyCode = @companyCode ORDER BY uploadedAt DESC`,
        { companyCode }
      );

      return result.recordset || [];
    } catch (error) {
      console.error("[DocumentService] Get company documents error:", error);
      throw new AppError("Failed to fetch company documents", 500);
    }
  }

  /**
   * Delete company document
   */
  static async deleteCompanyDocument(docId, filePath) {
    try {
      deleteFile(filePath);

      await executeQuery(
        `DELETE FROM CompanyDocument WHERE id = @id`,
        { id: docId }
      );

      return { success: true };
    } catch (error) {
      console.error("[DocumentService] Delete company document error:", error);
      throw new AppError("Failed to delete company document", 500);
    }
  }

  /**
   * Get document types
   */
  static async getDocumentTypes() {
    try {
      const result = await executeQuery(
        `SELECT DISTINCT documentType FROM DocumentType ORDER BY documentType`,
        {}
      );

      return result.recordset || [];
    } catch (error) {
      console.error("[DocumentService] Get document types error:", error);
      throw new AppError("Failed to fetch document types", 500);
    }
  }
}

module.exports = DocumentService;
