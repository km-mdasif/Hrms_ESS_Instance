/**
 * Application Constants
 * Centralized constants used throughout the application
 */

// User Types
export const USER_TYPES = {
  EMPLOYEE: "employee",
  MANAGER: "manager",
  ADMIN: "admin",
  HR: "hr",
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// API Endpoints (if needed for reference)
export const API_ENDPOINTS = {
  LOGIN: "/login",
  LOGOUT: "/logout",
  REFRESH_TOKEN: "/refresh-token",
  USER_PROFILE: "/user/profile",
  COMPANIES: "/companies",
  ATTENDANCE: "/attendance",
  LEAVE: "/leave",
  DOCUMENTS: "/documents",
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  HALF_DAY: "half_day",
  ON_LEAVE: "on_leave",
  LATE: "late",
};

// Document Types
export const DOCUMENT_TYPES = {
  COMPANY: "company",
  EMPLOYEE: "employee",
  IDENTIFICATION: "identification",
  CONTRACT: "contract",
  CERTIFICATE: "certificate",
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50],
};

// Form Field Types
export const FIELD_TYPES = {
  TEXT: "text",
  EMAIL: "email",
  PASSWORD: "password",
  NUMBER: "number",
  DATE: "date",
  SELECT: "select",
  CHECKBOX: "checkbox",
  RADIO: "radio",
  TEXTAREA: "textarea",
};

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please enter a valid email",
  INVALID_PASSWORD: "Password must be at least 6 characters",
  PASSWORD_MISMATCH: "Passwords do not match",
  USERNAME_SHORT: "Username must be at least 3 characters",
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNAUTHORIZED: "Please login to continue",
  FORBIDDEN: "You don't have permission to access this",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  SAVED_SUCCESS: "Saved successfully",
  DELETED_SUCCESS: "Deleted successfully",
  UPDATED_SUCCESS: "Updated successfully",
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: "token",
  REFRESH_TOKEN: "refreshToken",
  COMPANY_CODE: "companyCode",
  ATTENDANCE_EMP_CODE: "attendanceEmpCode",
  ATTENDANCE_EMP_NAME: "attendanceEmpName",
  USER_PREFERENCES: "userPreferences",
};
