/**
 * useDashboard Hook
 * Custom hook for dashboard statistics operations
 */

import { useState, useCallback } from "react";
import DashboardService from "../services/api/dashboardService";

const useDashboard = () => {
  const [stats, setStats] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [geofenceCount, setGeofenceCount] = useState(0);
  const [fieldExecutivesCount, setFieldExecutivesCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardStats = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getDashboardStats(params);
      setStats(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard statistics");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployeeCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await DashboardService.getEmployeeCount();
      setEmployeeCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch employee count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGeofenceCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await DashboardService.getGeofenceCount();
      setGeofenceCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch geofence count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFieldExecutivesCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await DashboardService.getFieldExecutivesCount();
      setFieldExecutivesCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch field executives count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaveCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await DashboardService.getLeaveCount();
      setLeaveCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch leave count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendanceOverview = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getAttendanceOverview(params);
      setAttendanceOverview(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch attendance overview");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    stats,
    employeeCount,
    geofenceCount,
    fieldExecutivesCount,
    leaveCount,
    attendanceOverview,
    loading,
    error,
    fetchDashboardStats,
    fetchEmployeeCount,
    fetchGeofenceCount,
    fetchFieldExecutivesCount,
    fetchLeaveCount,
    fetchAttendanceOverview,
    clearError,
  };
};

export default useDashboard;
