/**
 * Authentication Service
 * Handles authentication business logic
 */

const { executeQuery } = require("../database/db");
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require("../utils/tokenManager");
const { AppError } = require("../middleware/errorMiddleware");

class AuthService {
  /**
   * Authenticate user with username and password
   */
  static async login(username, password) {
    try {
      const trimmedUsername = String(username || "").trim();
      const trimmedPassword = String(password || "").trim();

      if (!trimmedUsername || !trimmedPassword) {
        throw new AppError("Username and password are required", 400);
      }

      // Query to get user from database
      // This assumes a stored procedure or query that validates credentials
      const result = await executeQuery(
        `SELECT TOP 1 username, companycode, userType, empName, empcode 
         FROM [User] 
         WHERE username = @username AND password = @password`,
        { username: trimmedUsername, password: trimmedPassword }
      );

      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError("Invalid username or password", 401);
      }

      const user = result.recordset[0];
      const companyCode = String(user.companycode || "01").trim() || "01";

      // Create tokens
      const accessToken = createAccessToken(user, companyCode);
      const refreshToken = createRefreshToken(user, companyCode);

      return {
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          username: user.username,
          companycode: companyCode,
          userType: user.userType || "employee",
          empName: user.empName || user.username,
          empcode: user.empcode
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[AuthService] Login error:", error);
      throw new AppError("Login failed", 500);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshTokenString) {
    try {
      if (!refreshTokenString) {
        throw new AppError("Refresh token is required", 400);
      }

      const decoded = verifyRefreshToken(refreshTokenString);
      const user = { username: decoded.username, userType: decoded.userType };
      const companycode = decoded.companycode;

      const newAccessToken = createAccessToken(user, companycode);

      return {
        token: newAccessToken,
        accessToken: newAccessToken
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[AuthService] Token refresh error:", error);
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  /**
   * Get companies list
   */
  static async getCompanies() {
    try {
      const result = await executeQuery("SELECT companycode, companyname FROM Company");
      return result.recordset || [];
    } catch (error) {
      console.error("[AuthService] Get companies error:", error);
      throw new AppError("Failed to fetch companies", 500);
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(username) {
    try {
      const result = await executeQuery(
        `SELECT username, companycode, userType, empName, empcode 
         FROM [User] 
         WHERE username = @username`,
        { username }
      );

      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError("User not found", 404);
      }

      return result.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[AuthService] Get user profile error:", error);
      throw new AppError("Failed to fetch user profile", 500);
    }
  }

  /**
   * Logout user (token invalidation if needed)
   */
  static async logout(username) {
    try {
      // Implement token blacklist or other logout logic if needed
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
      throw new AppError("Logout failed", 500);
    }
  }
}

module.exports = AuthService;
