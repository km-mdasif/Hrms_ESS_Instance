/**
 * useInterview Hook
 * Custom hook for interview-related operations
 */

import { useState, useCallback } from "react";
import InterviewService from "../services/api/interviewService";

const useInterview = () => {
  const [interviews, setInterviews] = useState([]);
  const [interviewCount, setInterviewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInterviews = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await InterviewService.getInterviews(params);
      setInterviews(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch interviews");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInterviewCountToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await InterviewService.getInterviewCountToday();
      setInterviewCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch interview count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createInterview = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await InterviewService.createInterview(data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to create interview");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInterview = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await InterviewService.updateInterview(id, data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to update interview");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteInterview = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await InterviewService.deleteInterview(id);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete interview");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    interviews,
    interviewCount,
    loading,
    error,
    fetchInterviews,
    fetchInterviewCountToday,
    createInterview,
    updateInterview,
    deleteInterview,
    clearError,
  };
};

export default useInterview;
