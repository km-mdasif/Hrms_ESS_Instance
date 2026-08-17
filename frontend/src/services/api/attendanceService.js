/**
 * Attendance Service
 * Handles all attendance-related API calls
 */

import apiClient from "./apiClient";

class AttendanceService {
  /**
   * Get attendance records
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} List of attendance records
   */
  static async getAttendance(params = {}) {
    try {
      const response = await apiClient.get("/attendance", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch attendance");
    }
  }

  /**
   * Mark attendance
   * @param {Object} data - Attendance data
   * @returns {Promise<Object>} Marked attendance record
   */
  static async markAttendance(data) {
    try {
      const response = await apiClient.post("/attendance", data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to mark attendance");
    }
  }

  /**
   * Update attendance record
   * @param {string} id - Attendance record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated attendance record
   */
  static async updateAttendance(id, data) {
    try {
      const response = await apiClient.put(`/attendance/${id}`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to update attendance");
    }
  }

  /**
   * Delete attendance record
   * @param {string} id - Attendance record ID
   * @returns {Promise<void>}
   */
  static async deleteAttendance(id) {
    try {
      await apiClient.delete(`/attendance/${id}`);
    } catch (error) {
      throw this._handleError(error, "Failed to delete attendance");
    }
  }

  static _handleError(error, defaultMessage) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      defaultMessage;
    console.error(`[AttendanceService Error]`, message);
    return new Error(message);
  }
}

export default AttendanceService;
