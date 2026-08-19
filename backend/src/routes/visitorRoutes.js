/**
 * Visitor Routes
 * Handles visitor registration and tracking
 */

const express = require("express");
const VisitorService = require("../services/visitorService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * GET /visitors
 * Get visitors
 */
router.get("/visitors", async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const visitors = await VisitorService.getVisitors({ date, status });

    res.json({
      success: true,
      data: visitors
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /visitor-entries
 * Compatibility alias for visitor entry screen
 */
router.get("/visitor-entries", async (req, res, next) => {
  try {
    const visitors = await VisitorService.getVisitors(req.query);
    res.json({ success: true, data: visitors });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /visitors/count
 * Get visitor count
 */
router.get("/visitors/count", async (req, res, next) => {
  try {
    const count = await VisitorService.getVisitorCount();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /visitors
 * Register new visitor (compatibility alias)
 */
router.post("/visitors", async (req, res, next) => {
  try {
    const { visitorName, visitorEmail, visitorPhone, purposeOfVisit, hostName, VisitorName, VisitorCode } = req.body;

    if (!visitorName && !VisitorName) {
      throw new AppError("Visitor name is required", 400);
    }

    if (!hostName && !VisitorCode) {
      throw new AppError("Visitor code is required", 400);
    }

    const result = await VisitorService.registerVisitor(req.body);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /visitor-entries/checkin
 * Compatibility alias for visitor entry screen
 */
router.post("/visitor-entries/checkin", async (req, res, next) => {
  try {
    const result = await VisitorService.registerVisitor(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /visitors/register
 * Register new visitor
 */
router.post("/visitors/register", async (req, res, next) => {
  try {
    const { visitorName, visitorEmail, visitorPhone, purposeOfVisit, hostName } = req.body;

    if (!visitorName || !hostName) {
      throw new AppError("Visitor name and host name are required", 400);
    }

    const result = await VisitorService.registerVisitor(req.body);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /visitor-entries/:id/checkout
 * Compatibility alias for visitor entry screen
 */
router.patch("/visitor-entries/:id/checkout", async (req, res, next) => {
  try {
    await VisitorService.checkoutVisitor(req.params.id);
    res.json({ success: true, message: "Visitor checked out successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /visitors/:id/checkout
 * Check out visitor
 */
router.post("/visitors/:id/checkout", async (req, res, next) => {
  try {
    await VisitorService.checkoutVisitor(req.params.id);

    res.json({
      success: true,
      message: "Visitor checked out successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /visitors/:id
 * Update visitor
 */
router.put("/visitors/:id", async (req, res, next) => {
  try {
    await VisitorService.updateVisitor(req.params.id, req.body);

    res.json({
      success: true,
      message: "Visitor updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /visitors/:id
 * Delete visitor
 */
router.delete("/visitors/:id", async (req, res, next) => {
  try {
    await VisitorService.deleteVisitor(req.params.id);

    res.json({
      success: true,
      message: "Visitor deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
