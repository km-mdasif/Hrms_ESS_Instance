/**
 * Auth Context
 * Provides global authentication state for the application
 */

import { createContext, useState, useCallback, useEffect } from "react";
import AuthService from "../services/auth/authService";

export const AuthContext = createContext();

const safeGetItem = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    return false;
  }
};

const isJwtExpired = (token) => {
  if (!token || typeof token !== "string") {
    return true;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return true;
  }

  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!payload || typeof payload.exp !== "number") {
      return false;
    }
    return payload.exp * 1000 <= Date.now();
  } catch (error) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      const token = safeGetItem("token");
      const companyCode = safeGetItem("companyCode", "01");
      const storedUserType = safeGetItem("userType", "employee");
      const storedUsername = safeGetItem("username", safeGetItem("userName", "User"));
      const storedEmpCode = safeGetItem("attendanceEmpCode", "");
      const storedEmpName = safeGetItem("attendanceEmpName", storedUsername);

      if (token && !isJwtExpired(token)) {
        setIsLoggedIn(true);
        setUser({
          token,
          companyCode,
          username: storedUsername,
          userType: storedUserType,
          empCode: storedEmpCode,
          empName: storedEmpName,
        });
        window.COMPANY_CODE = companyCode;
        window.COMPANY_NAME = localStorage.getItem("companyName") || window.COMPANY_NAME || "Company";
      } else {
        AuthService.clearStorageOnLogout();
        setUser(null);
        setIsLoggedIn(false);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (username, password, companyCode) => {
    setLoading(true);
    setError(null);
    try {
      AuthService.clearStorageOnLogout();
      const response = await AuthService.login(username, password, companyCode);

      if (response.token || response.accessToken) {
        safeSetItem("token", response.token || response.accessToken);
      }
      if (response.refreshToken || response.refresh_token) {
        safeSetItem("refreshToken", response.refreshToken || response.refresh_token);
      }

      const resolvedCompanyCode = response.companycode || response.companyCode || safeGetItem("companyCode", "01") || "01";
      const companyName = response.companyName || response.companyname || response.company_name || safeGetItem("companyName", "Company") || "Company";
      safeSetItem("companyCode", resolvedCompanyCode);
      safeSetItem("companyName", companyName);
      window.COMPANY_CODE = resolvedCompanyCode;
      window.COMPANY_NAME = companyName;

      const userType = response.userType || response.usertype || "employee";
      const usernameFromServer = response.username || response.userName || username;
      const empName = response.empName || response.empname || usernameFromServer;
      const empCode = response.empcode || response.empCode || response.employeecode || usernameFromServer;

      const userData = {
        token: response.token || response.accessToken,
        companyCode: resolvedCompanyCode,
        companyName,
        userType,
        username: usernameFromServer,
        empName,
        empCode,
      };

      // Store employee info in localStorage for all user types
      safeSetItem("attendanceEmpCode", empCode);
      safeSetItem("attendanceEmpName", empName);
      safeSetItem("username", usernameFromServer);
      safeSetItem("userName", usernameFromServer);
      safeSetItem("userType", userType);
      safeSetItem("userData", JSON.stringify(userData));
      setUser(userData);
      setIsLoggedIn(true);
      return response;
    } catch (err) {
      AuthService.clearStorageOnLogout();
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await AuthService.logout();
      setUser(null);
      setIsLoggedIn(false);
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("companyCode");
        localStorage.removeItem("companyName");
        localStorage.removeItem("attendanceEmpCode");
        localStorage.removeItem("attendanceEmpName");
        localStorage.removeItem("username");
        localStorage.removeItem("userName");
        localStorage.removeItem("userType");
        localStorage.removeItem("userData");
      } catch (error) {
        // ignore storage cleanup errors on iOS/private browsing
      }
      delete window.COMPANY_CODE;
      delete window.COMPANY_NAME;
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed");
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
