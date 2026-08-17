/**
 * useLeave Hook
 * Custom hook for leave-related operations
 */

import { useState, useCallback } from "react";
import LeaveService from "../services/api/leaveService";

const useLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaves = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await LeaveService.getLeaveEntries(params);
      setLeaves(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch leave entries");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createLeave = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await LeaveService.createLeaveEntry(data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to create leave entry");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLeave = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await LeaveService.updateLeaveEntry(id, data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to update leave entry");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLeave = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await LeaveService.deleteLeaveEntry(id);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete leave entry");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await LeaveService.getLeaveTypes();
      setLeaveTypes(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch leave types");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    leaves,
    leaveTypes,
    loading,
    error,
    fetchLeaves,
    createLeave,
    updateLeave,
    deleteLeave,
    fetchLeaveTypes,
    clearError,
  };
};

export default useLeave;
