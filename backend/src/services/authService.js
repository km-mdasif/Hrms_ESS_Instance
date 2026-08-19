/**
 * Authentication Service
 * Handles authentication business logic
 */

const { executeStoredProcedure } = require("../database/db");
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

      const userResult = await executeStoredProcedure("sp_webapi", {
        operation: "authenticate_user",
        username: trimmedUsername,
        password: trimmedPassword
      });

      if (!userResult.recordset || userResult.recordset.length === 0) {
        throw new AppError("Invalid username or password", 401);
      }

      const authRow = userResult.recordset[0];
      const userType = String(authRow.usertype || "employee").toLowerCase();
      const normalizedUserName = String(authRow.username || trimmedUsername).trim();
      const empCode = String(authRow.empcode || authRow.employeecode || "").trim();

      const userRecord = {
        UserCode: authRow.usercode || authRow.UserCode || "",
        UserName: normalizedUserName,
        employeecode: empCode,
        IsAdmin: userType === "admin",
        IsAudit: userType === "auditor",
        IsActive: 1,
        userType,
        empname: authRow.empname || authRow.EmpName || normalizedUserName,
        companycode: authRow.companycode || authRow.CompanyCode || "01"
      };

      let companyCode = String(userRecord.companycode || "01").trim() || "01";
      let empName = userRecord.empname || userRecord.UserName || "User";

      if (empCode) {
        try {
          const empResult = await executeStoredProcedure("sp_webapi", {
            operation: "get_employee_details",
            empcode: empCode
          });

          if (empResult.recordset && empResult.recordset.length > 0) {
            const empRecord = empResult.recordset[0];
            companyCode = String(empRecord.companycode || empRecord.CompanyCode || "01").trim() || "01";
            empName = String(empRecord.empname || empRecord.EmpName || userRecord.UserName || userRecord.username).trim() || userRecord.UserName || userRecord.username;
          }
        } catch (empError) {
          console.warn("[AuthService] Failed to fetch employee details:", empError);
        }
      }

      // Create tokens
      const accessToken = createAccessToken(userRecord, companyCode);
      const refreshToken = createRefreshToken(userRecord, companyCode);

      return {
        token: accessToken,
        accessToken,
        refreshToken,
        username: userRecord.UserName,
        usercode: userRecord.UserCode,
        companycode: companyCode,
        userType,
        empName,
        empcode: empCode
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_companies"
      });
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_user_profile",
        username: String(username || "").trim()
      });

      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError("User not found", 404);
      }

      const userRecord = result.recordset[0];
      const empCode = String(userRecord.employeecode || "").trim();

      let companyCode = String(userRecord.companycode || "01").trim() || "01";
      let empName = userRecord.UserName || userRecord.username || userRecord.EmpName || "User";

      if (empCode) {
        try {
          const empResult = await executeStoredProcedure("sp_webapi", {
            operation: "get_employee_details",
            empcode: empCode
          });

          if (empResult.recordset && empResult.recordset.length > 0) {
            const empRecord = empResult.recordset[0];
            companyCode = String(empRecord.companycode || empRecord.CompanyCode || "01").trim() || "01";
            empName = String(empRecord.empname || empRecord.EmpName || userRecord.UserName || userRecord.username).trim() || userRecord.UserName || userRecord.username;
          }
        } catch (empError) {
          console.warn("[AuthService] Failed to fetch employee details:", empError);
        }
      }

      const userType = userRecord.IsAdmin ? "admin" : (userRecord.IsAudit ? "auditor" : "employee");

      return {
        username: userRecord.UserName,
        usercode: userRecord.UserCode,
        companycode: companyCode,
        userType,
        empName,
        empcode: empCode
      };
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
