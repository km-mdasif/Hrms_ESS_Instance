/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import apiClient from "../api/apiClient";

class AuthService {
  /**
   * Login user with credentials
   * @param {string} username - User username
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with token and user data
   */
  static async login(username, password) {
    try {
      const response = await apiClient.post("/login", {
        username: String(username).trim(),
        password: String(password),
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Login failed");
    }
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  static async logout() {
    try {
      await apiClient.post("/logout");
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      this.clearStorageOnLogout();
    }
  }

  /**
   * Refresh authentication token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token
   */
  static async refreshToken(refreshToken) {
    try {
      const response = await apiClient.post("/refresh-token", { refreshToken });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Token refresh failed");
    }
  }

  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  static async getUserProfile() {
    try {
      const response = await apiClient.get("/user/profile");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch user profile");
    }
  }

  /**
   * Get company information
   * @returns {Promise<Array>} List of companies
   */
  static async getCompanies() {
    try {
      const response = await apiClient.get("/companies");
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch companies");
    }
  }

  /**
   * Clear authentication data from storage
   */
  static clearStorageOnLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("companyCode");
    localStorage.removeItem("attendanceEmpCode");
    localStorage.removeItem("attendanceEmpName");
    delete window.COMPANY_CODE;
    delete window.COMPANY_NAME;
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

    const errorData = {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    };

    console.error(`[AuthService Error]`, errorData);
    return new Error(message);
  }
}

export default AuthService;
