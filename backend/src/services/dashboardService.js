/**
 * Dashboard Service
 * Handles dashboard statistics and summaries
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class DashboardService {
  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(companyCode) {
    try {
      const [
        employeeCount,
        interviewsToday,
        visitorsToday,
        leaveCount,
        geofenceCount,
        fieldExecutivesCount
      ] = await Promise.all([
        this.getEmployeeCount(companyCode),
        this.getInterviewsToday(),
        this.getVisitorsToday(),
        this.getLeaveCount(),
        this.getGeofenceCount(),
        this.getFieldExecutivesCount(companyCode)
      ]);

      return {
        employeeLiveCount: employeeCount,
        totalEmployees: employeeCount,
        interviewTodayCount: interviewsToday,
        visitorCount: visitorsToday,
        leaveCount,
        geofenceDetailsCount: geofenceCount,
        geofenceCheckins: geofenceCount,
        fieldCount: fieldExecutivesCount,
        fieldVisits: fieldExecutivesCount,
        timestamp: new Date()
      };
    } catch (error) {
      console.error("[DashboardService] Get dashboard summary error:", error);
      throw new AppError("Failed to fetch dashboard summary", 500);
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
      console.error("[DashboardService] Get employee count error:", error);
      return 0;
    }
  }

  /**
   * Get interviews scheduled for today
   */
  static async getInterviewsToday() {
    try {
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Interview 
         WHERE CAST(interviewDate AS DATE) = CAST(GETDATE() AS DATE)
         AND status != 'Cancelled'`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
    } catch (error) {
      console.error("[DashboardService] Get interviews today error:", error);
      return 0;
    }
  }

  /**
   * Get visitors for today
   */
  static async getVisitorsToday() {
    try {
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Visitor 
         WHERE CAST(visitDate AS DATE) = CAST(GETDATE() AS DATE)`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
    } catch (error) {
      console.error("[DashboardService] Get visitors today error:", error);
      return 0;
    }
  }

  /**
   * Get active leave count
   */
  static async getLeaveCount() {
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
      console.error("[DashboardService] Get leave count error:", error);
      return 0;
    }
  }

  /**
   * Get geofence attendance count
   */
  static async getGeofenceCount() {
    try {
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM AttendanceLog 
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
    } catch (error) {
      console.error("[DashboardService] Get geofence count error:", error);
      return 0;
    }
  }

  /**
   * Get field executives count
   */
  static async getFieldExecutivesCount(companyCode) {
    try {
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Employee 
         WHERE companycode = @companyCode 
         AND designation LIKE '%Field%'`,
        { companyCode }
      );

      return result.recordset?.[0]?.count || 0;
    } catch (error) {
      console.error("[DashboardService] Get field executives count error:", error);
      return 0;
    }
  }

  /**
   * Get attendance overview
   */
  static async getAttendanceOverview(params = {}) {
    try {
      const result = await executeQuery(
        `SELECT TOP 7 CAST(attendancedate AS DATE) as date, COUNT(*) as count
         FROM AttendanceLog
         GROUP BY CAST(attendancedate AS DATE)
         ORDER BY date DESC`,
        {}
      );

      return result.recordset || [];
    } catch (error) {
      console.error("[DashboardService] Get attendance overview error:", error);
      return [];
    }
  }
}

module.exports = DashboardService;
