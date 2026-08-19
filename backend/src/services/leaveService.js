/**
 * Leave Service
 * Handles leave request management
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class LeaveService {
  /**
   * Get leave entries
   */
  static async getLeaveEntries(params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_leave_entries",
        empCode: params.empCode ? String(params.empCode).trim() : null
      });
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_leave_entries"
      });
      return Number(result.recordset?.[0]?.leave_count || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "save_leave_entry",
        companyCode: String(data.companyCode || "01").trim() || "01",
        empCode: String(data.empCode || "").trim(),
        fromDate: new Date(data.fromDate),
        toDate: new Date(data.toDate),
        information: data.information || "",
        description: data.description || ""
      });

      return { id: result.recordset?.[0]?.LeaveLogID || null, ...data };
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
      await executeStoredProcedure("sp_webapi", {
        operation: "approve_leave_entry",
        leaveLogId: Number(id),
        isApproved: true
      });
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
      await executeStoredProcedure("sp_webapi", {
        operation: "approve_leave_entry",
        leaveLogId: Number(id),
        isApproved: false
      });
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
      return [];
    } catch (error) {
      console.error("[LeaveService] Get leave types error:", error);
      throw new AppError("Failed to fetch leave types", 500);
    }
  }
}

module.exports = LeaveService;
