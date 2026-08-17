/**
 * Employee Signature Service
 * Handles employee digital signature API calls
 */

import apiClient from "./apiClient";

class EmployeeSignatureService {
  /**
   * Validate employee exists
   * @param {string} empCode - Employee code
   * @returns {Promise<Object>} Employee details
   */
  static async validateEmployee(empCode) {
    try {
      const response = await apiClient.get(`/employees/${encodeURIComponent(empCode)}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Employee not found");
    }
  }

  /**
   * Get employee signature
   * @param {string} empCode - Employee code
   * @returns {Promise<Object>} Signature image data
   */
  static async getEmployeeSignature(empCode) {
    try {
      const response = await apiClient.get(`/emp-signatures/${encodeURIComponent(empCode)}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employee signature");
    }
  }

  /**
   * Upload or update employee signature
   * @param {string} empCode - Employee code
   * @param {FormData} formData - Signature file and metadata
   * @returns {Promise<Object>} Upload response
   */
  static async uploadEmployeeSignature(empCode, formData) {
    try {
      const response = await apiClient.post(
        `/emp-signatures/${encodeURIComponent(empCode)}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to upload employee signature");
    }
  }

  /**
   * Delete employee signature
   * @param {string} empCode - Employee code
   * @returns {Promise<Object>} Delete response
   */
  static async deleteEmployeeSignature(empCode) {
    try {
      const response = await apiClient.delete(
        `/emp-signatures/${encodeURIComponent(empCode)}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete employee signature");
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

    console.error(`[EmployeeSignatureService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default EmployeeSignatureService;
