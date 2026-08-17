/**
 * Validation Utilities
 * Common validation functions
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {Object} { isValid, message }
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }
  return { isValid: true, message: "" };
};

/**
 * Validate required fields
 * @param {Object} data - Object with fields to validate
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} { isValid, errors }
 */
export const validateRequired = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach((field) => {
    if (!data[field] || String(data[field]).trim() === "") {
      errors[field] = `${field} is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate username
 * @param {string} username
 * @returns {boolean}
 */
export const isValidUsername = (username) => {
  if (!username) return false;
  return username.length >= 3 && username.length <= 50;
};
