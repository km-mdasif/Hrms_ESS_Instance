/**
 * Visitor Service
 * Handles visitor registration and tracking
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class VisitorService {
  /**
   * Get visitors
   */
  static async getVisitors(params = {}) {
    try {
      let query = "SELECT * FROM Visitor WHERE 1=1";
      const queryParams = {};

      if (params.date) {
        query += " AND CAST(visitDate AS DATE) = CAST(@date AS DATE)";
        queryParams.date = new Date(params.date);
      }

      if (params.status) {
        query += " AND status = @status";
        queryParams.status = params.status;
      }

      query += " ORDER BY visitDate DESC";

      const result = await executeQuery(query, queryParams);
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
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Visitor WHERE CAST(visitDate AS DATE) = CAST(GETDATE() AS DATE)`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
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
      const params = {
        visitorName: data.visitorName,
        visitorEmail: data.visitorEmail,
        visitorPhone: data.visitorPhone,
        visitDate: new Date(),
        checkInTime: new Date(),
        purposeOfVisit: data.purposeOfVisit,
        hostName: data.hostName,
        status: "Checked In"
      };

      const result = await executeQuery(
        `INSERT INTO Visitor (visitorName, visitorEmail, visitorPhone, visitDate, checkInTime, purposeOfVisit, hostName, status)
         VALUES (@visitorName, @visitorEmail, @visitorPhone, @visitDate, @checkInTime, @purposeOfVisit, @hostName, @status)
         SELECT SCOPE_IDENTITY() as id`,
        params
      );

      return { id: result.recordset?.[0]?.id, ...params };
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
      await executeQuery(
        `UPDATE Visitor SET checkOutTime = @checkOutTime, status = @status WHERE id = @id`,
        { id, checkOutTime: new Date(), status: "Checked Out" }
      );

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
      await executeQuery(
        `UPDATE Visitor SET hostName = @hostName, purposeOfVisit = @purposeOfVisit WHERE id = @id`,
        { id, hostName: data.hostName, purposeOfVisit: data.purposeOfVisit }
      );

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
      await executeQuery(`DELETE FROM Visitor WHERE id = @id`, { id });
      return { success: true };
    } catch (error) {
      console.error("[VisitorService] Delete visitor error:", error);
      throw new AppError("Failed to delete visitor", 500);
    }
  }
}

module.exports = VisitorService;
