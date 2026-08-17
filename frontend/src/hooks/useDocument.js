/**
 * useDocument Hook
 * Custom hook for document-related operations
 */

import { useState, useCallback } from "react";
import DocumentService from "../services/api/documentService";

const useDocument = () => {
  const [empDocuments, setEmpDocuments] = useState([]);
  const [companyDocuments, setCompanyDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmpDocuments = useCallback(async (empCode) => {
    setLoading(true);
    setError(null);
    try {
      const data = await DocumentService.getEmpDocuments(empCode);
      setEmpDocuments(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch employee documents");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadEmpDocument = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await DocumentService.uploadEmpDocument(formData);
      return response;
    } catch (err) {
      setError(err.message || "Failed to upload employee document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadEmpDocument = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await DocumentService.downloadEmpDocument(docId);
      return blob;
    } catch (err) {
      setError(err.message || "Failed to download document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEmpDocument = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await DocumentService.deleteEmpDocument(docId);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanyDocuments = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await DocumentService.getCompanyDocuments(params);
      setCompanyDocuments(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch company documents");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadCompanyDocument = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await DocumentService.uploadCompanyDocument(formData);
      return response;
    } catch (err) {
      setError(err.message || "Failed to upload company document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadCompanyDocument = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await DocumentService.downloadCompanyDocument(docId);
      return blob;
    } catch (err) {
      setError(err.message || "Failed to download document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCompanyDocument = useCallback(async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await DocumentService.deleteCompanyDocument(docId);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete document");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    empDocuments,
    companyDocuments,
    loading,
    error,
    fetchEmpDocuments,
    uploadEmpDocument,
    downloadEmpDocument,
    deleteEmpDocument,
    fetchCompanyDocuments,
    uploadCompanyDocument,
    downloadCompanyDocument,
    deleteCompanyDocument,
    clearError,
  };
};

export default useDocument;
