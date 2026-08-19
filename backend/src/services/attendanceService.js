/**
 * Attendance Service
 * Handles attendance marking and history
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class AttendanceService {
  /**
   * Mark attendance with location and selfie
   */
  static async markAttendance(empCode, data) {
    try {
      const selfieBase64 = String(data?.selfieBase64 || "").trim();
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "save_attendance_geofence",
        empcode: String(empCode || "").trim(),
        companycode: String(data?.companyCode || "01").trim() || "01",
        latitude: data?.latitude ?? null,
        longitude: data?.longitude ?? null,
        selfiimage: data?.selfieBuffer || (selfieBase64 ? Buffer.from(selfieBase64, "base64") : null),
        selfieimage_base64: selfieBase64 || null,
        status: data?.status || "Present",
        remarks: data?.remarks || "",
        geofenceradius: data?.geofenceRadius ?? null
      });

      return result.recordset?.[0] || { success: true };
    } catch (error) {
      console.error("[AttendanceService] Mark attendance error:", error);
      throw new AppError("Failed to mark attendance", 500);
    }
  }

  /**
   * Get attendance history for employee
   */
  static async getAttendanceHistory(empCode, params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_attendance_history",
        empcode: String(empCode || "").trim()
      });

      return result.recordset || [];
    } catch (error) {
      console.error("[AttendanceService] Get attendance history error:", error);
      throw new AppError("Failed to fetch attendance history", 500);
    }
  }

  /**
   * Get attendance count for employee
   */
  static async getAttendanceCount(empCode, params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_today_attendance_count",
        empcode: String(empCode || "").trim()
      });

      return Number(result.recordset?.[0]?.attendance_count || 0);
    } catch (error) {
      console.error("[AttendanceService] Get attendance count error:", error);
      throw new AppError("Failed to fetch attendance count", 500);
    }
  }

  /**
   * Get geofence attendance summary
   */
  static async getGeofenceSummary(params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_geofence_checkins",
        startDate: params.startDate || new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: params.endDate || new Date(new Date().setHours(23, 59, 59, 999))
      });

      return result.recordset?.[0] || { geofenceCount: 0 };
    } catch (error) {
      console.error("[AttendanceService] Get geofence summary error:", error);
      throw new AppError("Failed to fetch geofence summary", 500);
    }
  }
}

module.exports = AttendanceService;
