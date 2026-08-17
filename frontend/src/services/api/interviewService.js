/**
 * Interview Service
 * Handles interview/candidate-related API calls
 */

import apiClient from "./apiClient";

class InterviewService {
  /**
   * Get interview schedules
   * @param {Object} params - Query parameters (date, status, etc.)
   * @returns {Promise<Array>} List of interview records
   */
  static async getInterviews(params = {}) {
    try {
      const response = await apiClient.get("/interviews", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch interviews");
    }
  }

  /**
   * Get interview count for today
   * @returns {Promise<number>} Count of interviews today
   */
  static async getInterviewCountToday() {
    try {
      const response = await apiClient.get("/interviews/today/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch interview count");
    }
  }

  /**
   * Create new interview
   * @param {Object} data - Interview data
   * @returns {Promise<Object>} Created interview record
   */
  static async createInterview(data) {
    try {
      const response = await apiClient.post("/interviews", data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to create interview");
    }
  }

  /**
   * Update interview
   * @param {string} id - Interview ID
   * @param {Object} data - Updated interview data
   * @returns {Promise<Object>} Updated interview record
   */
  static async updateInterview(id, data) {
    try {
      const response = await apiClient.put(`/interviews/${id}`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to update interview");
    }
  }

  /**
   * Delete interview
   * @param {string} id - Interview ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteInterview(id) {
    try {
      const response = await apiClient.delete(`/interviews/${id}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete interview");
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

    console.error(`[InterviewService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default InterviewService;
