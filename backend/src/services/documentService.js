/**
 * Document Service
 * Handles document upload, download, and deletion
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");
const { deleteFile } = require("../utils/fileManager");

class DocumentService {
  /**
   * Upload employee document
   */
  static async uploadEmpDocument(empCode, file, metadata) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "upsert_emp_document",
        empcode: String(empCode || "").trim(),
        companycode: String(metadata?.companyCode || "01").trim() || "01",
        documentname: metadata?.documentType || "General",
        documentextension: file?.mimetype?.split("/")?.[1] || "bin"
      });

      return {
        id: result.recordset?.[0]?.DocumentID || null,
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_emp_documents",
        empcode: String(empCode || "").trim()
      });

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

      await executeStoredProcedure("sp_webapi", {
        operation: "delete_emp_document",
        documentId: Number(docId)
      });

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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "insert_company_document",
        documentcode: metadata?.documentCode || "01",
        documentname: metadata?.documentName || file?.originalname || "document",
        documentextension: file?.mimetype?.split("/")?.[1] || "bin",
        status: metadata?.status ?? 1,
        expirydate: metadata?.expiryDate || null,
        remainderon: metadata?.remainderOn || null
      });

      return {
        id: result.recordset?.[0]?.DocumentID || null,
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_company_documents",
        companycode: String(companyCode || "01").trim() || "01"
      });

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

      await executeStoredProcedure("sp_webapi", {
        operation: "delete_company_document",
        documentId: Number(docId)
      });

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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_document_types"
      });

      return result.recordset || [];
    } catch (error) {
      console.error("[DocumentService] Get document types error:", error);
      throw new AppError("Failed to fetch document types", 500);
    }
  }
}

module.exports = DocumentService;
