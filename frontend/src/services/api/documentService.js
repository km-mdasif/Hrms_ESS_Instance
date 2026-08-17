/**
 * Document Service
 * Handles all document-related API calls (company and employee documents)
 */

import apiClient from "./apiClient";

class DocumentService {
  /**
   * Upload employee document
   * @param {FormData} formData - Document file and metadata
   * @returns {Promise<Object>} Upload response
   */
  static async uploadEmpDocument(formData) {
    try {
      const response = await apiClient.post("/emp-documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to upload employee document");
    }
  }

  /**
   * Get employee documents
   * @param {string} empCode - Employee code
   * @returns {Promise<Array>} List of employee documents
   */
  static async getEmpDocuments(empCode) {
    try {
      const response = await apiClient.get(`/emp-documents/${encodeURIComponent(empCode)}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employee documents");
    }
  }

  /**
   * Download employee document
   * @param {string} docId - Document ID
   * @returns {Promise<Blob>} Document file
   */
  static async downloadEmpDocument(docId) {
    try {
      const response = await apiClient.get(`/emp-documents/download/${docId}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to download document");
    }
  }

  /**
   * Delete employee document
   * @param {string} docId - Document ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteEmpDocument(docId) {
    try {
      const response = await apiClient.delete(`/emp-documents/${docId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete document");
    }
  }

  /**
   * Upload company document
   * @param {FormData} formData - Document file and metadata
   * @returns {Promise<Object>} Upload response
   */
  static async uploadCompanyDocument(formData) {
    try {
      const response = await apiClient.post("/company-documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to upload company document");
    }
  }

  /**
   * Get company documents
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} List of company documents
   */
  static async getCompanyDocuments(params = {}) {
    try {
      const response = await apiClient.get("/company-documents", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch company documents");
    }
  }

  /**
   * Download company document
   * @param {string} docId - Document ID
   * @returns {Promise<Blob>} Document file
   */
  static async downloadCompanyDocument(docId) {
    try {
      const response = await apiClient.get(`/company-documents/download/${docId}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to download document");
    }
  }

  /**
   * Delete company document
   * @param {string} docId - Document ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteCompanyDocument(docId) {
    try {
      const response = await apiClient.delete(`/company-documents/${docId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete document");
    }
  }

  /**
   * Handle API errors consistently
   * @private
   */
  static _handleError(error, defaultMessage) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      defaultMessage ||
      "An error occurred";

    console.error(`[DocumentService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default DocumentService;
