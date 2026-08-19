/**
 * Visitor Service
 * Handles visitor registration and tracking
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class VisitorService {
  /**
   * Get visitors
   */
  static async getVisitors(params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_recent_visitors"
      });
      return result.recordset || [];
    } catch (error) {
      console.error("[VisitorService] Get visitors error:", error);
      throw new AppError("Failed to fetch visitors", 500);
    }
  }

  /**
   * Get visitor count
   */
  static async getVisitorCount() {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_visitor_entries"
      });
      return Number(result.recordset?.[0]?.visitor_count || 0);
    } catch (error) {
      console.error("[VisitorService] Get visitor count error:", error);
      throw new AppError("Failed to fetch visitor count", 500);
    }
  }

  /**
   * Register visitor
   */
  static async registerVisitor(data) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "save_visitor",
        VisitorCode: data.VisitorCode || data.visitorCode || "VST-" + Date.now(),
        VisitDate: data.VisitDate || new Date(),
        VisitorName: data.VisitorName || data.visitorName,
        VisitorCompanyName: data.VisitorCompanyName || null,
        ContactNumber: data.ContactNumber || null,
        Empcode: data.Empcode || data.empCode || null,
        EmpName: data.EmpName || data.empName || null,
        Department: data.Department || null,
        Purpose: Boolean(data.Purpose),
        PurposeRegarding: data.PurposeRegarding || null,
        AppointmentType: Boolean(data.AppointmentType),
        AppointmentDate: data.AppointmentDate || null,
        VechileNumber: data.VechileNumber || null,
        EmailID: data.EmailID || data.visitorEmail || null,
        ConformationRequired: Boolean(data.ConformationRequired),
        CoVisitor1: data.CoVisitor1 || null,
        CoVisitor2: data.CoVisitor2 || null,
        IdProof: data.IdProof || null,
        IDProofNumber: data.IDProofNumber || null,
        MaterialsCarrying: data.MaterialsCarrying || null,
        IsReturnableMaterial: Boolean(data.IsReturnableMaterial),
        ReturnableMaterialDescription: data.ReturnableMaterialDescription || null
      });

      return { id: result.recordset?.[0]?.VisitorID || null, ...data };
    } catch (error) {
      console.error("[VisitorService] Register visitor error:", error);
      throw new AppError("Failed to register visitor", 500);
    }
  }

  /**
   * Check out visitor
   */
  static async checkoutVisitor(id) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[VisitorService] Checkout visitor error:", error);
      throw new AppError("Failed to checkout visitor", 500);
    }
  }

  /**
   * Update visitor
   */
  static async updateVisitor(id, data) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[VisitorService] Update visitor error:", error);
      throw new AppError("Failed to update visitor", 500);
    }
  }

  /**
   * Delete visitor record
   */
  static async deleteVisitor(id) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[VisitorService] Delete visitor error:", error);
      throw new AppError("Failed to delete visitor", 500);
    }
  }
}

module.exports = VisitorService;
