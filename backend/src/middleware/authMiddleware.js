/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user info to request
 */

const { getAuthToken, verifyAccessToken } = require("../utils/tokenManager");

/**
 * Middleware to require authentication
 * Verifies token and attaches user to req.user
 */
function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.user = verifyAccessToken(token);
    
    // Ensure companycode is properly formatted
    try {
      const cc = String(req.user?.companycode || "01").trim();
      req.user.companycode = /^\d$/.test(cc)
        ? cc.padStart(2, "0")
        : cc || "01";
    } catch (e) {
      req.user.companycode = "01";
    }

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Middleware to skip authentication for specific routes
 * Returns authentication middleware function that allows public paths
 */
function optionalAuth(publicPaths = []) {
  return (req, res, next) => {
    if (publicPaths.includes(req.path)) {
      return next();
    }
    return requireAuth(req, res, next);
  };
}

module.exports = {
  requireAuth,
  optionalAuth
};
