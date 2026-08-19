/**
 * Interview Service
 * Handles interview/candidate scheduling
 */

const { executeStoredProcedure } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class InterviewService {
  /**
   * Get interviews
   */
  static async getInterviews(params = {}) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "get_recent_interviews"
      });
      return result.recordset || [];
    } catch (error) {
      console.error("[InterviewService] Get interviews error:", error);
      throw new AppError("Failed to fetch interviews", 500);
    }
  }

  /**
   * Get interview count for today
   */
  static async getInterviewCountToday() {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "count_interviews_today",
        startDate: new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: new Date(new Date().setHours(23, 59, 59, 999))
      });
      return Number(result.recordset?.[0]?.interview_today_count || 0);
    } catch (error) {
      console.error("[InterviewService] Get interview count error:", error);
      throw new AppError("Failed to fetch interview count", 500);
    }
  }

  /**
   * Create interview
   */
  static async createInterview(data) {
    try {
      const result = await executeStoredProcedure("sp_webapi", {
        operation: "insert_interview_entry",
        InterviewCode: data.InterviewCode || data.interviewCode || "INT-" + Date.now(),
        CompanyCode: data.CompanyCode || "01",
        InterviewDate: data.InterviewDate || new Date(),
        CandidateName: data.CandidateName || data.candidateName,
        Gender: data.Gender || null,
        Age: data.Age || null,
        MaritialStatus: data.MaritialStatus || null,
        ContactNumber: data.ContactNumber || null,
        ContactNumber1: data.ContactNumber1 || null,
        EmailID: data.EmailID || data.candidateEmail || null,
        Address: data.Address || null,
        PermanentLocation: data.PermanentLocation || null,
        PresentLocation: data.PresentLocation || null,
        HighestQualification: data.HighestQualification || null,
        PreviousDesignation: data.PreviousDesignation || null,
        PostingApplyingFor: data.PostingApplyingFor || null,
        Category: data.Category || null,
        RefferedBy: data.RefferedBy || null,
        ReasontoReleave: data.ReasontoReleave || null,
        Remarks: data.Remarks || null,
        TotalExperience: data.TotalExperience || null,
        CurrentCTC: data.CurrentCTC || null,
        ExpectedCTC: data.ExpectedCTC || null,
        ExpectedCTCNegotiable: data.ExpectedCTCNegotiable || false,
        NoticePeriod: data.NoticePeriod || null,
        NoticePeriodNegotiable: data.NoticePeriodNegotiable || false,
        ExpectedJoiningDate: data.ExpectedJoiningDate || null
      });

      return { id: result.recordset?.[0]?.InterviewID || null, ...data };
    } catch (error) {
      console.error("[InterviewService] Create interview error:", error);
      throw new AppError("Failed to create interview", 500);
    }
  }

  /**
   * Update interview
   */
  static async updateInterview(id, data) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[InterviewService] Update interview error:", error);
      throw new AppError("Failed to update interview", 500);
    }
  }

  /**
   * Delete interview
   */
  static async deleteInterview(id) {
    try {
      return { success: true };
    } catch (error) {
      console.error("[InterviewService] Delete interview error:", error);
      throw new AppError("Failed to delete interview", 500);
    }
  }
}

module.exports = InterviewService;
