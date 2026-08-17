/**
 * JWT Token Management
 * Handles token creation and verification
 */

const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "mysecret";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "mysecret-refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Create access token for authenticated user
 */
function createAccessToken(user, companycode) {
  return jwt.sign(
    {
      username: user.username,
      companycode,
      userType: user.userType || "employee"
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Create refresh token for authenticated user
 */
function createRefreshToken(user, companycode) {
  return jwt.sign(
    {
      username: user.username,
      companycode,
      userType: user.userType || "employee",
      type: "refresh"
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}

/**
 * Extract token from request
 * Checks Authorization header and query string
 */
function getAuthToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const queryToken = String(req.query?.token || "").trim();
  return bearerToken || queryToken;
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAuthToken
};
