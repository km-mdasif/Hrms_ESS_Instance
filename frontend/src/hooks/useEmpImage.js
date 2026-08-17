/**
 * useEmpImage Hook
 * Custom hook for employee image operations
 */

import { useState, useCallback } from "react";
import EmpImageService from "../services/api/empImageService";

const useEmpImage = () => {
  const [employee, setEmployee] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateEmployee = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmpImageService.validateEmployee(empCode);
      setEmployee(data);
      return data;
    } catch (err) {
      setError(err.message || "Employee not found");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployeeImage = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmpImageService.getEmployeeImage(empCode);
      setImage(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch employee image");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadEmployeeImage = useCallback(async (empCode, formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await EmpImageService.uploadEmployeeImage(empCode, formData);
      setImage(response);
      return response;
    } catch (err) {
      setError(err.message || "Failed to upload employee image");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEmployeeImage = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await EmpImageService.deleteEmployeeImage(empCode);
      setImage(null);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete employee image");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    employee,
    image,
    loading,
    error,
    validateEmployee,
    fetchEmployeeImage,
    uploadEmployeeImage,
    deleteEmployeeImage,
    clearError,
  };
};

export default useEmpImage;
