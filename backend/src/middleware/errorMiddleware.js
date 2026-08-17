/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

/**
 * Error handler middleware
 * Should be used as the last middleware in the app
 */
function errorHandler(err, req, res, next) {
  console.error("[Error Handler]", {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method
  });

  const status = err.status || 500;
  const message = err.message || "An error occurred";
  const data = err.data || null;

  return res.status(status).json({
    success: false,
    message,
    ...(data && { data }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
}

/**
 * Not found handler middleware
 * Handle 404 errors
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Resource not found"
  });
}

/**
 * Custom error class for consistent error handling
 */
class AppError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError
};
