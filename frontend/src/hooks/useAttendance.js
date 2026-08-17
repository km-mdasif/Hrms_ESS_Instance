/**
 * useAttendance Hook
 * Custom hook for attendance-related operations
 */

import { useState, useCallback } from "react";
import AttendanceService from "../services/api/attendanceService";

const useAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAttendance = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AttendanceService.getAttendance(params);
      setAttendance(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AttendanceService.markAttendance(data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to mark attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAttendance = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AttendanceService.updateAttendance(id, data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to update attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    attendance,
    loading,
    error,
    fetchAttendance,
    markAttendance,
    updateAttendance,
    clearError,
  };
};

export default useAttendance;
