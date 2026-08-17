/**
 * Helper Utilities
 * Common helper functions
 */

/**
 * Format date string
 * @param {string|Date} date
 * @param {string} format - Format pattern (e.g., 'DD/MM/YYYY')
 * @returns {string}
 */
export const formatDate = (date, format = "DD/MM/YYYY") => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  if (format === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  }
  if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }
  return d.toLocaleDateString();
};

/**
 * Format time string
 * @param {string|Date} time
 * @returns {string} HH:MM format
 */
export const formatTime = (time) => {
  if (!time) return "";
  const d = new Date(time);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * Capitalize first letter of string
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate string to specified length
 * @param {string} str
 * @param {number} length
 * @returns {string}
 */
export const truncate = (str, length = 50) => {
  if (!str) return "";
  return str.length > length ? str.substring(0, length) + "..." : str;
};

/**
 * Format currency
 * @param {number} amount
 * @param {string} currency - Currency code (e.g., 'USD')
 * @returns {string}
 */
export const formatCurrency = (amount, currency = "USD") => {
  if (isNaN(amount)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Delay execution
 * @param {number} ms - Milliseconds
 * @returns {Promise}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deep clone object
 * @param {Object} obj
 * @returns {Object}
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj
 * @returns {boolean}
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Merge objects
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export const mergeObjects = (target, source) => {
  return { ...target, ...source };
};
