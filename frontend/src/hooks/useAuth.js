/**
 * useAuth Hook
 * Provides authentication state and methods to components
 */

import { useState, useCallback } from "react";
import AuthService from "../services/auth/authService";

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("token");
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.login(username, password);

      // Store tokens
      if (response.token || response.accessToken) {
        localStorage.setItem("token", response.token || response.accessToken);
      }
      if (response.refreshToken || response.refresh_token) {
        localStorage.setItem(
          "refreshToken",
          response.refreshToken || response.refresh_token
        );
      }

      // Store company info
      const companyCode = response.companycode || "01";
      localStorage.setItem("companyCode", companyCode);
      window.COMPANY_CODE = companyCode;

      // Store employee info if employee type
      const userType = response.userType || response.usertype || "employee";
      if (userType === "employee") {
        const empCode = username;
        const empName = response.empName || response.empname || username;
        localStorage.setItem("attendanceEmpCode", empCode);
        localStorage.setItem("attendanceEmpName", empName);
      }

      setIsLoggedIn(true);
      return response;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setIsLoggedIn(false);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoggedIn,
    loading,
    error,
    login,
    logout,
    clearError,
  };
};

export default useAuth;
