/**
 * Auth Context
 * Provides global authentication state for the application
 */

import { createContext, useState, useCallback, useEffect } from "react";
import AuthService from "../services/auth/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("token");
      const companyCode = localStorage.getItem("companyCode");

      if (token) {
        setIsLoggedIn(true);
        // You can fetch full user profile here if needed
        setUser({
          token,
          companyCode,
          empCode: localStorage.getItem("attendanceEmpCode"),
          empName: localStorage.getItem("attendanceEmpName"),
        });
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

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

      // Store user info
      const userType = response.userType || response.usertype || "employee";
      const userData = {
        token: response.token || response.accessToken,
        companyCode,
        userType,
        empName: response.empName || response.empname || username,
      };

      if (userType === "employee") {
        userData.empCode = username;
        localStorage.setItem("attendanceEmpCode", username);
        localStorage.setItem("attendanceEmpName", userData.empName);
      }

      setUser(userData);
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
      setUser(null);
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

  const value = {
    user,
    isLoggedIn,
    loading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
