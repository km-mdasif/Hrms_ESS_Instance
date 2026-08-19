/**
 * Dashboard Service
 * Handles dashboard statistics and summaries
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class DashboardService {
  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(companyCode) {
    try {
      const [employeeCount, interviewsToday, visitorsToday, leaveCount, geofenceCount, fieldExecutivesCount] = await Promise.all([
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_active_employees",
        table_name: "Employee",
        column_name: "EmpStatus"
      });
      return Number(result.recordset?.[0]?.total_employees || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_interviews_today",
        startDate: new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: new Date(new Date().setHours(23, 59, 59, 999))
      });
      return Number(result.recordset?.[0]?.interview_today_count || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_visitor_entries"
      });
      return Number(result.recordset?.[0]?.visitor_count || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_leave_entries"
      });
      return Number(result.recordset?.[0]?.leave_count || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_geofence_checkins",
        startDate: new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: new Date(new Date().setHours(23, 59, 59, 999))
      });
      return Number(result.recordset?.[0]?.geofence_checkins || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_active_employees",
        table_name: "Employee",
        column_name: "EmpStatus"
      });
      return Number(result.recordset?.[0]?.total_employees || 0);
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
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_geofence_checkins",
        startDate: params.startDate || new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: params.endDate || new Date(new Date().setHours(23, 59, 59, 999))
      });

      return result.recordset ? [{ date: new Date().toISOString(), count: Number(result.recordset?.[0]?.geofence_checkins || 0) }] : [];
    } catch (error) {
      console.error("[DashboardService] Get attendance overview error:", error);
      return [];
    }
  }
}

module.exports = DashboardService;
