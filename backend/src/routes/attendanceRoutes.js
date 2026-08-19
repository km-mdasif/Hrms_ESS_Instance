/**
 * Attendance Routes
 * Handles attendance marking and history
 */

const express = require("express");
const AttendanceService = require("../services/attendanceService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * POST /attendance
 * Mark attendance with location and selfie
 */
router.post("/attendance", async (req, res, next) => {
  try {
    const { empCode, companyCode, latitude, longitude, accuracy, status, remarks, selfieBase64, selfieFilename } = req.body;

    if (!empCode) {
      throw new AppError("Employee code is required", 400);
    }

    const result = await AttendanceService.markAttendance(empCode, {
      companyCode,
      latitude,
      longitude,
      status,
      remarks,
      selfieBase64,
      accuracy,
      selfieFilename
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /attendance
 * Get attendance records
 */
router.get("/attendance", async (req, res, next) => {
  try {
    const { empCode, dateFrom, dateTo } = req.query;

    const attendance = await AttendanceService.getAttendanceHistory(empCode, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /attendance/count/:empCode
 * Get attendance count for employee
 */
router.get("/attendance/count/:empCode", async (req, res, next) => {
  try {
    const count = await AttendanceService.getAttendanceCount(req.params.empCode, req.query);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /attendance/history/:empCode
 * Get attendance history for employee
 */
router.get("/attendance/history/:empCode", async (req, res, next) => {
  try {
    const history = await AttendanceService.getAttendanceHistory(req.params.empCode, req.query);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
