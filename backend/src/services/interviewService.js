/**
 * Interview Service
 * Handles interview/candidate scheduling
 */

const { executeQuery } = require("../database/db");
const { AppError } = require("../middleware/errorMiddleware");

class InterviewService {
  /**
   * Get interviews
   */
  static async getInterviews(params = {}) {
    try {
      let query = "SELECT * FROM Interview WHERE 1=1";
      const queryParams = {};

      if (params.date) {
        query += " AND CAST(interviewDate AS DATE) = CAST(@date AS DATE)";
        queryParams.date = new Date(params.date);
      }

      if (params.status) {
        query += " AND status = @status";
        queryParams.status = params.status;
      }

      query += " ORDER BY interviewDate DESC";

      const result = await executeQuery(query, queryParams);
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
      const result = await executeQuery(
        `SELECT COUNT(*) as count FROM Interview 
         WHERE CAST(interviewDate AS DATE) = CAST(GETDATE() AS DATE) 
         AND status != 'Cancelled'`,
        {}
      );

      return result.recordset?.[0]?.count || 0;
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
      const params = {
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        interviewDate: data.interviewDate,
        interviewTime: data.interviewTime,
        position: data.position,
        interviewer: data.interviewer,
        status: data.status || "Scheduled",
        notes: data.notes || ""
      };

      const result = await executeQuery(
        `INSERT INTO Interview (candidateName, candidateEmail, interviewDate, interviewTime, position, interviewer, status, notes)
         VALUES (@candidateName, @candidateEmail, @interviewDate, @interviewTime, @position, @interviewer, @status, @notes)
         SELECT SCOPE_IDENTITY() as id`,
        params
      );

      return { id: result.recordset?.[0]?.id, ...params };
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
      await executeQuery(
        `UPDATE Interview SET status = @status, notes = @notes WHERE id = @id`,
        { id, status: data.status, notes: data.notes }
      );

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
      await executeQuery(`DELETE FROM Interview WHERE id = @id`, { id });
      return { success: true };
    } catch (error) {
      console.error("[InterviewService] Delete interview error:", error);
      throw new AppError("Failed to delete interview", 500);
    }
  }
}

module.exports = InterviewService;
