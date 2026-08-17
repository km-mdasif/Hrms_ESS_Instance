/**
 * Dashboard Routes
 * Handles dashboard statistics
 */

const express = require("express");
const DashboardService = require("../services/dashboardService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * GET /dashboard/stats
 * Get dashboard statistics
 */
router.get("/dashboard/stats", async (req, res, next) => {
  try {
    const companyCode = req.user?.companycode || "01";
    const stats = await DashboardService.getDashboardSummary(companyCode);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard-summary
 * Get dashboard summary (legacy endpoint)
 */
router.get("/dashboard-summary", async (req, res, next) => {
  try {
    const companyCode = req.query.companyCode || "01";
    const stats = await DashboardService.getDashboardSummary(companyCode);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/employees/count
 * Get employee count
 */
router.get("/dashboard/employees/count", async (req, res, next) => {
  try {
    const companyCode = req.user?.companycode || "01";
    const count = await DashboardService.getEmployeeCount(companyCode);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/geofence/count
 * Get geofence count
 */
router.get("/dashboard/geofence/count", async (req, res, next) => {
  try {
    const count = await DashboardService.getGeofenceCount();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/field-executives/count
 * Get field executives count
 */
router.get("/dashboard/field-executives/count", async (req, res, next) => {
  try {
    const companyCode = req.user?.companycode || "01";
    const count = await DashboardService.getFieldExecutivesCount(companyCode);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/leave/count
 * Get leave count
 */
router.get("/dashboard/leave/count", async (req, res, next) => {
  try {
    const count = await DashboardService.getLeaveCount();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/attendance/overview
 * Get attendance overview
 */
router.get("/dashboard/attendance/overview", async (req, res, next) => {
  try {
    const data = await DashboardService.getAttendanceOverview(req.query);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
