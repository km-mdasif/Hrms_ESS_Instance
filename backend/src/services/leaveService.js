/**
 * Leave Service
 * Handles leave request management
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class LeaveService {
  /**
   * Get leave entries
   */
  static async getLeaveEntries(params = {}) {
    try {
      let query = "SELECT * FROM LeaveLog WHERE 1=1";
      const queryParams = {};

      if (params.empCode) {
        query += " AND empCode = @empCode";
        queryParams.empCode = String(params.empCode).trim();
      }

      if (params.status) {
        query += " AND status = @status";
        queryParams.status = params.status;
      }

      query += " ORDER BY leaveFromDate DESC";

      const result = await executeQuery(query, queryParams);
      return result.recordset || [];
    } catch (error) {
      console.error("[LeaveService] Get leave entries error:", error);
      throw new AppError("Failed to fetch leave entries", 500);
    }
  }

  /**
   * Get leave count
   */
  static async getLeaveCount(params = {}) {
    try {
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM LeaveLog 
         WHERE CAST(leaveFromDate AS DATE) <= CAST(GETDATE() AS DATE)
         AND CAST(leaveToDate AS DATE) >= CAST(GETDATE() AS DATE)
         AND status = 'Approved'`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
    } catch (error) {
      console.error("[LeaveService] Get leave count error:", error);
      throw new AppError("Failed to fetch leave count", 500);
    }
  }

  /**
   * Create leave entry
   */
  static async createLeaveEntry(data) {
    try {
      const params = {
        empCode: String(data.empCode).trim(),
        leaveType: data.leaveType,
        leaveFromDate: data.leaveFromDate,
        leaveToDate: data.leaveToDate,
        reason: data.reason || "",
        status: "Pending",
        appliedDate: new Date()
      };

      const result = await executeQuery(
        `INSERT INTO LeaveLog (empCode, leaveType, leaveFromDate, leaveToDate, reason, status, appliedDate)
         VALUES (@empCode, @leaveType, @leaveFromDate, @leaveToDate, @reason, @status, @appliedDate)
         SELECT SCOPE_IDENTITY() as id`,
        params
      );

      return { id: result.recordset?.[0]?.id, ...params };
    } catch (error) {
      console.error("[LeaveService] Create leave entry error:", error);
      throw new AppError("Failed to create leave entry", 500);
    }
  }

  /**
   * Update leave entry
   */
  static async updateLeaveEntry(id, data) {
    try {
      await executeQuery(
        `UPDATE LeaveLog SET reason = @reason, leaveFromDate = @leaveFromDate, leaveToDate = @leaveToDate WHERE id = @id`,
        { id, reason: data.reason, leaveFromDate: data.leaveFromDate, leaveToDate: data.leaveToDate }
      );

      return { success: true };
    } catch (error) {
      console.error("[LeaveService] Update leave entry error:", error);
      throw new AppError("Failed to update leave entry", 500);
    }
  }

  /**
   * Approve leave entry
   */
  static async approveLeaveEntry(id, approverId) {
    try {
      await executeQuery(
        `UPDATE LeaveLog SET status = @status, approvedBy = @approvedBy, approvedDate = @approvedDate WHERE id = @id`,
        { id, status: "Approved", approvedBy: approverId, approvedDate: new Date() }
      );

      return { success: true };
    } catch (error) {
      console.error("[LeaveService] Approve leave entry error:", error);
      throw new AppError("Failed to approve leave entry", 500);
    }
  }

  /**
   * Reject leave entry
   */
  static async rejectLeaveEntry(id, approverId, reason) {
    try {
      await executeQuery(
        `UPDATE LeaveLog SET status = @status, approvedBy = @approvedBy, rejectionReason = @rejectionReason WHERE id = @id`,
        { id, status: "Rejected", approvedBy: approverId, rejectionReason: reason }
      );

      return { success: true };
    } catch (error) {
      console.error("[LeaveService] Reject leave entry error:", error);
      throw new AppError("Failed to reject leave entry", 500);
    }
  }

  /**
   * Delete leave entry
   */
  static async deleteLeaveEntry(id) {
    try {
      await executeQuery(`DELETE FROM LeaveLog WHERE id = @id`, { id });
      return { success: true };
    } catch (error) {
      console.error("[LeaveService] Delete leave entry error:", error);
      throw new AppError("Failed to delete leave entry", 500);
    }
  }

  /**
   * Get leave types
   */
  static async getLeaveTypes() {
    try {
      const result = await executeQuery(
        `SELECT DISTINCT leaveType FROM LeaveLog ORDER BY leaveType`,
        {}
      );

      return result.recordset || [];
    } catch (error) {
      console.error("[LeaveService] Get leave types error:", error);
      throw new AppError("Failed to fetch leave types", 500);
    }
  }
}

module.exports = LeaveService;
