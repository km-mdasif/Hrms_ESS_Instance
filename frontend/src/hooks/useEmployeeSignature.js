/**
 * useEmployeeSignature Hook
 * Custom hook for employee signature operations
 */

import { useState, useCallback } from "react";
import EmployeeSignatureService from "../services/api/employeeSignatureService";

const useEmployeeSignature = () => {
  const [employee, setEmployee] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateEmployee = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmployeeSignatureService.validateEmployee(empCode);
      setEmployee(data);
      return data;
    } catch (err) {
      setError(err.message || "Employee not found");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployeeSignature = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmployeeSignatureService.getEmployeeSignature(empCode);
      setSignature(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch employee signature");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadEmployeeSignature = useCallback(async (empCode, formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await EmployeeSignatureService.uploadEmployeeSignature(empCode, formData);
      setSignature(response);
      return response;
    } catch (err) {
      setError(err.message || "Failed to upload employee signature");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEmployeeSignature = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await EmployeeSignatureService.deleteEmployeeSignature(empCode);
      setSignature(null);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete employee signature");
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
    signature,
    loading,
    error,
    validateEmployee,
    fetchEmployeeSignature,
    uploadEmployeeSignature,
    deleteEmployeeSignature,
    clearError,
  };
};

export default useEmployeeSignature;
