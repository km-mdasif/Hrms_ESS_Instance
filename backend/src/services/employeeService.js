/**
 * Employee Service
 * Handles employee-related operations
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class EmployeeService {
  /**
   * Get employee by employee code
   */
  static async getEmployeeByCode(empCode) {
    try {
      const result = await executeQuery(
        `SELECT * FROM Employee WHERE empcode = @empCode`,
        { empCode: String(empCode).trim() }
      );

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
      let query = "SELECT empcode, empname, companycode, designation FROM Employee WHERE 1=1";
      const queryParams = {};

      if (params.companyCode) {
        query += " AND companycode = @companyCode";
        queryParams.companyCode = params.companyCode;
      }

      if (params.departmentCode) {
        query += " AND departmentcode = @departmentCode";
        queryParams.departmentCode = params.departmentCode;
      }

      query += " ORDER BY empname";

      const result = await executeQuery(query, queryParams);
      return result.recordset || [];
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
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Employee WHERE companycode = @companyCode`,
        { companyCode }
      );

      return result.recordset?.[0]?.count || 0;
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
      const result = await executeQuery(
        `UPDATE Employee 
         SET empname = @empname, designation = @designation, departmentcode = @departmentcode
         WHERE empcode = @empCode`,
        {
          empCode: String(empCode).trim(),
          empname: data.empname,
          designation: data.designation,
          departmentcode: data.departmentcode
        }
      );

      return { success: true };
    } catch (error) {
      console.error("[EmployeeService] Update employee error:", error);
      throw new AppError("Failed to update employee", 500);
    }
  }
}

module.exports = EmployeeService;
