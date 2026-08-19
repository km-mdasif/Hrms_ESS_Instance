/**
 * Employee Service
 * Handles employee selection for attendance and field executive screens
 */

import apiClient from "./apiClient";

class EmployeeService {
  /**
   * Get all employees
   * @returns {Promise<Array>} Employee list
   */
  static async getEmployees() {
    try {
      const response = await apiClient.get("/employees");
      const payload = response?.data || {};
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.records)
          ? payload.records
          : Array.isArray(payload)
            ? payload
            : [];
      return list;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employees");
    }
  }

  /**
   * Get employee by code
   * @param {string} empCode
   * @returns {Promise<Object>} Employee details
   */
  static async getEmployeeByCode(empCode) {
    try {
      const response = await apiClient.get(`/employees/${encodeURIComponent(empCode)}`);
      return response?.data?.data || response?.data || null;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employee details");
    }
  }

  static _handleError(error, defaultMessage) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      defaultMessage ||
      "An error occurred";

    console.error("[EmployeeService Error]", message);
    return new Error(message);
  }
}

export default EmployeeService;
