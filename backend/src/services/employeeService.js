/**
 * Employee Service
 * Handles employee-related operations
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class EmployeeService {
  /**
   * Get employee by employee code
   */
  static async getEmployeeByCode(empCode) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_employee_details",
        empcode: String(empCode || "").trim()
      });

      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError("Employee not found", 404);
      }

      return result.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[EmployeeService] Get employee error:", error);
      throw new AppError("Failed to fetch employee", 500);
    }
  }

  /**
   * Get all employees
   */
  static async getAllEmployees(params = {}) {
    try {
      return [];
    } catch (error) {
      console.error("[EmployeeService] Get all employees error:", error);
      throw new AppError("Failed to fetch employees", 500);
    }
  }

  /**
   * Get employee count
   */
  static async getEmployeeCount(companyCode) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_active_employees",
        table_name: "Employee",
        column_name: "EmpStatus"
      });
      return Number(result.recordset?.[0]?.total_employees || 0);
    } catch (error) {
      console.error("[EmployeeService] Get employee count error:", error);
      throw new AppError("Failed to fetch employee count", 500);
    }
  }

  /**
   * Update employee information
   */
  static async updateEmployee(empCode, data) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[EmployeeService] Update employee error:", error);
      throw new AppError("Failed to update employee", 500);
    }
  }
}

module.exports = EmployeeService;
