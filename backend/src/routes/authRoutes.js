/**
 * Authentication Routes
 * Handles login, token refresh, and logout
 */

const express = require("express");
const AuthService = require("../services/authService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * POST /login
 * Authenticate user and return access/refresh tokens
 */
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError("Username and password are required", 400);
    }

    const result = await AuthService.login(username, password);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /refresh-token
 * Refresh access token using refresh token
 */
router.post("/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /logout
 * Logout user (token invalidation)
 */
router.post("/logout", async (req, res, next) => {
  try {
    const result = await AuthService.logout(req.user?.username);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /user/profile
 * Get current user profile
 */
router.get("/user/profile", async (req, res, next) => {
  try {
    const profile = await AuthService.getUserProfile(req.user.username);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
