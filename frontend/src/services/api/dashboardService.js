/**
 * Dashboard Service
 * Handles dashboard statistics and overview API calls
 */

import apiClient from "./apiClient";

class DashboardService {
  /**
   * Get dashboard statistics
   * @param {Object} params - Query parameters (date, filters, etc.)
   * @returns {Promise<Object>} Dashboard stats object
   */
  static async getDashboardStats(params = {}) {
    try {
      const response = await apiClient.get("/dashboard/stats", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch dashboard statistics");
    }
  }

  /**
   * Get employee count
   * @returns {Promise<number>} Total employee count
   */
  static async getEmployeeCount() {
    try {
      const response = await apiClient.get("/dashboard/employees/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch employee count");
    }
  }

  /**
   * Get geofence count
   * @returns {Promise<number>} Total geofence check-ins
   */
  static async getGeofenceCount() {
    try {
      const response = await apiClient.get("/dashboard/geofence/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch geofence count");
    }
  }

  /**
   * Get field executives count
   * @returns {Promise<number>} Count of field executives
   */
  static async getFieldExecutivesCount() {
    try {
      const response = await apiClient.get("/dashboard/field-executives/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch field executives count");
    }
  }

  /**
   * Get leave count
   * @returns {Promise<number>} Count of active leaves
   */
  static async getLeaveCount() {
    try {
      const response = await apiClient.get("/dashboard/leave/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch leave count");
    }
  }

  /**
   * Get attendance overview data
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Attendance overview data
   */
  static async getAttendanceOverview(params = {}) {
    try {
      const response = await apiClient.get("/dashboard/attendance/overview", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch attendance overview");
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

    console.error(`[DashboardService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default DashboardService;
