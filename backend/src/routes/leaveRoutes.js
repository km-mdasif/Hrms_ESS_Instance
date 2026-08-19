/**
 * Leave Routes
 * Handles leave requests
 */

const express = require("express");
const LeaveService = require("../services/leaveService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * GET /leave-entries
 * Get leave entries
 */
router.get("/leave-entries", async (req, res, next) => {
  try {
    const empCode = req.query.empCode || req.query.empcode || req.query.employeeCode || null;
    const status = req.query.status || null;
    const leaves = await LeaveService.getLeaveEntries({ empCode, status, isAdmin: req.user?.userType === "admin" || req.user?.role === "admin" });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /leave-types
 * Get leave types
 */
router.get("/leave-types", async (req, res, next) => {
  try {
    const types = await LeaveService.getLeaveTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /leave-entries
 * Create new leave entry
 */
router.post("/leave-entries", async (req, res, next) => {
  try {
    const { empCode, leaveType, leaveFromDate, leaveToDate, reason } = req.body;

    if (!empCode || !leaveType || !leaveFromDate || !leaveToDate) {
      throw new AppError("Employee code, leave type, and dates are required", 400);
    }

    const result = await LeaveService.createLeaveEntry(req.body);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /leave-entries/:id
 * Update leave entry
 */
router.put("/leave-entries/:id", async (req, res, next) => {
  try {
    await LeaveService.updateLeaveEntry(req.params.id, req.body);

    res.json({
      success: true,
      message: "Leave entry updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /leave-entries/:id/approve
 * Approve leave entry
 */
router.patch("/leave-entries/:id/approve", async (req, res, next) => {
  try {
    await LeaveService.approveLeaveEntry(req.params.id, req.user.username);

    res.json({
      success: true,
      message: "Leave approved successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /leave-entries/:id/reject
 * Reject leave entry
 */
router.patch("/leave-entries/:id/reject", async (req, res, next) => {
  try {
    const { reason } = req.body;
    await LeaveService.rejectLeaveEntry(req.params.id, req.user.username, reason);

    res.json({
      success: true,
      message: "Leave rejected successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /leave-entries/:id
 * Delete leave entry
 */
router.delete("/leave-entries/:id", async (req, res, next) => {
  try {
    await LeaveService.deleteLeaveEntry(req.params.id);

    res.json({
      success: true,
      message: "Leave entry deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
