/**
 * Attendance Service
 * Handles attendance marking and history
 */

const { executeQuery, executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class AttendanceService {
  /**
   * Mark attendance with location and selfie
   */
  static async markAttendance(empCode, data) {
    try {
      const params = {
        empCode: String(empCode).trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        selfieFilename: data.selfieFilename,
        timestamp: new Date()
      };

      const result = await executeStoredProcedure("sp_mark_attendance", params);
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
      const dateFrom = params.dateFrom || new Date(new Date().setDate(new Date().getDate() - 30));
      const dateTo = params.dateTo || new Date();

      const result = await executeQuery(
        `SELECT * FROM AttendanceLog 
         WHERE empCode = @empCode 
         AND attendancedate BETWEEN @dateFrom AND @dateTo
         ORDER BY attendancedate DESC`,
        {
          empCode: String(empCode).trim(),
          dateFrom,
          dateTo
        }
      );

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
      const dateFrom = params.dateFrom || new Date(new Date().getFullYear(), 0, 1);
      const dateTo = params.dateTo || new Date();

      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM AttendanceLog 
         WHERE empCode = @empCode 
         AND attendancedate BETWEEN @dateFrom AND @dateTo`,
        {
          empCode: String(empCode).trim(),
          dateFrom,
          dateTo
        }
      );

      return result.recordset?.[0]?.count || 0;
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
      const result = await executeQuery(
        `SELECT COUNT(*) as geofenceCount FROM AttendanceLog 
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
        {}
      );

      return result.recordset?.[0] || { geofenceCount: 0 };
    } catch (error) {
      console.error("[AttendanceService] Get geofence summary error:", error);
      throw new AppError("Failed to fetch geofence summary", 500);
    }
  }
}

module.exports = AttendanceService;
