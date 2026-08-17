/**
 * Interview Routes
 * Handles interview scheduling
 */

const express = require("express");
const InterviewService = require("../services/interviewService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * GET /interviews
 * Get interviews
 */
router.get("/interviews", async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const interviews = await InterviewService.getInterviews({ date, status });

    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /interviews/today/count
 * Get interview count for today
 */
router.get("/interviews/today/count", async (req, res, next) => {
  try {
    const count = await InterviewService.getInterviewCountToday();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /interviews
 * Create new interview
 */
router.post("/interviews", async (req, res, next) => {
  try {
    const { candidateName, candidateEmail, interviewDate, interviewTime, position, interviewer } = req.body;

    if (!candidateName || !interviewDate) {
      throw new AppError("Candidate name and interview date are required", 400);
    }

    const result = await InterviewService.createInterview({
      candidateName,
      candidateEmail,
      interviewDate,
      interviewTime,
      position,
      interviewer,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /interviews/:id
 * Update interview
 */
router.put("/interviews/:id", async (req, res, next) => {
  try {
    await InterviewService.updateInterview(req.params.id, req.body);

    res.json({
      success: true,
      message: "Interview updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /interviews/:id
 * Delete interview
 */
router.delete("/interviews/:id", async (req, res, next) => {
  try {
    await InterviewService.deleteInterview(req.params.id);

    res.json({
      success: true,
      message: "Interview deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
