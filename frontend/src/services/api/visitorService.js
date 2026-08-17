/**
 * Visitor Service
 * Handles visitor-related API calls
 */

import apiClient from "./apiClient";

class VisitorService {
  /**
   * Get visitor entries
   * @param {Object} params - Query parameters (date, status, etc.)
   * @returns {Promise<Array>} List of visitor records
   */
  static async getVisitors(params = {}) {
    try {
      const response = await apiClient.get("/visitors", { params });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch visitors");
    }
  }

  /**
   * Get visitor count
   * @returns {Promise<number>} Total visitor count
   */
  static async getVisitorCount() {
    try {
      const response = await apiClient.get("/visitors/count");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch visitor count");
    }
  }

  /**
   * Register new visitor
   * @param {Object} data - Visitor data
   * @returns {Promise<Object>} Created visitor record
   */
  static async registerVisitor(data) {
    try {
      const response = await apiClient.post("/visitors/register", data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to register visitor");
    }
  }

  /**
   * Check out visitor
   * @param {string} visitorId - Visitor ID
   * @returns {Promise<Object>} Updated visitor record
   */
  static async checkoutVisitor(visitorId) {
    try {
      const response = await apiClient.post(`/visitors/${visitorId}/checkout`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to checkout visitor");
    }
  }

  /**
   * Update visitor record
   * @param {string} id - Visitor ID
   * @param {Object} data - Updated visitor data
   * @returns {Promise<Object>} Updated visitor record
   */
  static async updateVisitor(id, data) {
    try {
      const response = await apiClient.put(`/visitors/${id}`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to update visitor");
    }
  }

  /**
   * Delete visitor record
   * @param {string} id - Visitor ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteVisitor(id) {
    try {
      const response = await apiClient.delete(`/visitors/${id}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to delete visitor");
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

    console.error(`[VisitorService Error]`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    const err = new Error(message);
    err.status = error?.response?.status;
    return err;
  }
}

export default VisitorService;
