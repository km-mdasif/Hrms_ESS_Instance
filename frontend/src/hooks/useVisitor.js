/**
 * useVisitor Hook
 * Custom hook for visitor-related operations
 */

import { useState, useCallback } from "react";
import VisitorService from "../services/api/visitorService";

const useVisitor = () => {
  const [visitors, setVisitors] = useState([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVisitors = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await VisitorService.getVisitors(params);
      setVisitors(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch visitors");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVisitorCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await VisitorService.getVisitorCount();
      setVisitorCount(typeof count === "number" ? count : 0);
      return count;
    } catch (err) {
      setError(err.message || "Failed to fetch visitor count");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerVisitor = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await VisitorService.registerVisitor(data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to register visitor");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkoutVisitor = useCallback(async (visitorId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await VisitorService.checkoutVisitor(visitorId);
      return response;
    } catch (err) {
      setError(err.message || "Failed to checkout visitor");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVisitor = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await VisitorService.updateVisitor(id, data);
      return response;
    } catch (err) {
      setError(err.message || "Failed to update visitor");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteVisitor = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await VisitorService.deleteVisitor(id);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete visitor");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    visitors,
    visitorCount,
    loading,
    error,
    fetchVisitors,
    fetchVisitorCount,
    registerVisitor,
    checkoutVisitor,
    updateVisitor,
    deleteVisitor,
    clearError,
  };
};

export default useVisitor;
