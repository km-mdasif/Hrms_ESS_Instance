/**
 * Leave Service
 * Handles leave-related API calls
 */

import apiClient from "./apiClient";

class LeaveService {
  /**
   * Get leave entries
   * @param {Object} params - Query parameters (empCode, dateFrom, dateTo, etc.)
   * @returns {Promise<Array>} List of leave entries
   */
  static async getLeaveEntries(params = {}) {
    try {
      const response = await apiClient.get("/leave-entries", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch leave entries");
    }
  }

  /**
   * Create new leave entry
   * @param {Object} data - Leave entry data
   * @returns {Promise<Object>} Created leave entry
   */
  static async createLeaveEntry(data) {
    try {
      const response = await apiClient.post("/leave-entries", data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to create leave entry");
    }
  }

  /**
   * Update leave entry
   * @param {string} id - Leave entry ID
   * @param {Object} data - Updated leave data
   * @returns {Promise<Object>} Updated leave entry
   */
  static async updateLeaveEntry(id, data) {
    try {
      const response = await apiClient.put(`/leave-entries/${id}`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to update leave entry");
    }
  }

  /**
   * Delete leave entry
   * @param {string} id - Leave entry ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteLeaveEntry(id) {
    try {
      const response = await apiClient.delete(`/leave-entries/${id}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete leave entry");
    }
  }

  /**
   * Get leave types
   * @returns {Promise<Array>} List of leave types
   */
  static async getLeaveTypes() {
    try {
      const response = await apiClient.get("/leave-types");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch leave types");
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

    console.error(`[LeaveService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default LeaveService;
