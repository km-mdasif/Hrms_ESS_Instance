/**
 * Main Server Entry Point
 * Express server with clean architecture
 * 
 * Structure:
 * - Database layer (src/database)
 * - Services layer (src/services)
 * - Routes/Controllers layer (src/routes)
 * - Middleware layer (src/middleware)
 * - Utilities (src/utils)
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import middleware
const { optionalAuth } = require("./middleware/authMiddleware");
const { errorHandler, notFoundHandler } = require("./middleware/errorMiddleware");

// Import routes
const routes = require("./routes");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Configuration
// ============================================

// CORS middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "../../frontend/build")));

// ============================================
// Authentication Middleware
// ============================================

const PUBLIC_PATHS = [
  "/login",
  "/refresh-token",
  "/api-docs",
  "/api-docs.json",
  "/companies",
  "/health",
  "/dashboard-summary"
];

app.use(optionalAuth(PUBLIC_PATHS));

// ============================================
// Health Check Route
// ============================================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date()
  });
});

// ============================================
// API Routes
// ============================================

// Authentication routes
app.use(routes.authRoutes);

// Attendance routes
app.use(routes.attendanceRoutes);

// Interview routes
app.use(routes.interviewRoutes);

// Visitor routes
app.use(routes.visitorRoutes);

// Leave routes
app.use(routes.leaveRoutes);

// Dashboard routes
app.use(routes.dashboardRoutes);

// Document routes
app.use(routes.documentRoutes);

// Employee routes
app.use(routes.employeeRoutes);

// Image routes
app.use(routes.imageRoutes);

// Signature routes
app.use(routes.signatureRoutes);

// ============================================
// Frontend Routes
// ============================================

// Serve frontend for all unmatched routes
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/build/index.html"));
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Divine HRMS Backend Server Started   ║
║   ✓ Listening on port ${PORT}               ║
║   ✓ Clean Architecture Enabled         ║
║   ✓ Database: MSSQL Connected          ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;
