/**
 * Employee Image Service
 * Handles employee profile image API calls
 */

import apiClient from "./apiClient";

class EmpImageService {
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
   * Get employee image
   * @param {string} empCode - Employee code
   * @returns {Promise<Object>} Employee image data
   */
  static async getEmployeeImage(empCode) {
    try {
      const response = await apiClient.get(`/emp-images/${encodeURIComponent(empCode)}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employee image");
    }
  }

  /**
   * Upload or update employee image
   * @param {string} empCode - Employee code
   * @param {FormData} formData - Image file and metadata
   * @returns {Promise<Object>} Upload response
   */
  static async uploadEmployeeImage(empCode, formData) {
    try {
      const response = await apiClient.post(
        `/emp-images/${encodeURIComponent(empCode)}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to upload employee image");
    }
  }

  /**
   * Delete employee image
   * @param {string} empCode - Employee code
   * @returns {Promise<Object>} Delete response
   */
  static async deleteEmployeeImage(empCode) {
    try {
      const response = await apiClient.delete(
        `/emp-images/${encodeURIComponent(empCode)}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete employee image");
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

    console.error(`[EmpImageService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default EmpImageService;
