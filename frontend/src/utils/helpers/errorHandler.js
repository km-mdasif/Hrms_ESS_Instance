/**
 * Error Handler Utilities
 * Centralized error handling
 */

/**
 * Format API error message
 * @param {Error} error - Error object from API
 * @returns {string} Formatted error message
 */
export const formatApiError = (error) => {
  if (!error) return "An unknown error occurred";

  // If it's already a string, return as is
  if (typeof error === "string") return error;

  // If it's an API error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // If it's an axios error
  if (error.message) {
    return error.message;
  }

  // Default error message
  return "An error occurred. Please try again.";
};

/**
 * Handle API errors consistently
 * @param {Error} error
 * @param {string} context - Context where error occurred
 * @returns {Object} { message, status, isNetworkError }
 */
export const handleApiError = (error, context = "API Call") => {
  console.error(`[${context} Error]`, error);

  if (!error.response) {
    return {
      message: "Network error. Please check your connection.",
      status: null,
      isNetworkError: true,
    };
  }

  const status = error.response.status;
  let message = error.response.data?.message || "An error occurred";

  // Handle specific status codes
  if (status === 401) {
    message = "Unauthorized. Please login again.";
  } else if (status === 403) {
    message = "Access denied. You don't have permission.";
  } else if (status === 404) {
    message = "Resource not found.";
  } else if (status === 500) {
    message = "Server error. Please try again later.";
  }

  return {
    message,
    status,
    isNetworkError: false,
  };
};

/**
 * Log error with context
 * @param {Error} error
 * @param {string} context - Where error occurred
 * @param {Object} additionalData - Additional data to log
 */
export const logError = (error, context = "Error", additionalData = {}) => {
  console.error(`[${context}]`, {
    error,
    message: error?.message,
    stack: error?.stack,
    status: error?.response?.status,
    data: error?.response?.data,
    ...additionalData,
  });
};

/**
 * Create user-friendly error message
 * @param {Error} error
 * @returns {string}
 */
export const getUserFriendlyMessage = (error) => {
  if (error.response?.status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (error.response?.status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (error.response?.status >= 500) {
    return "Server error. Please try again later.";
  }

  if (!error.response) {
    return "Connection error. Please check your internet.";
  }

  return error.response?.data?.message || error.message || "Something went wrong.";
};
