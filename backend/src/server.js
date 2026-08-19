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
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 5000);

const normalizeOriginList = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const allowedOrigins = [
  ...normalizeOriginList(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS),
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://localhost:3001",
  "https://localhost:3001",
  "http://localhost:8080",
  "https://localhost:8080",
  "http://localhost:4173",
  "https://localhost:4173",
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:8000",
  "https://localhost:8000",
  "capacitor://localhost",
  "ios://localhost",
  "android://localhost",
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (/:(3000|3001|4173|5173|8080|8081|8000)\/?$/.test(origin)) {
    return true;
  }

  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
    return true;
  }

  if (/\.local(\.|:|\/|$)/.test(origin) || /^(capacitor|ios|android):\/\//.test(origin)) {
    return true;
  }

  return false;
};

// ============================================
// Middleware Configuration
// ============================================

// CORS middleware - Configure for frontend access
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Origin: ${req.get("origin") || "unknown"}`);
  next();
});

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

// Field Executive routes
app.use(routes.fieldExecutiveRoutes);

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

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Divine HRMS Backend Server Started   ║
║   ✓ Host: ${HOST}                        ║
║   ✓ Port: ${PORT}                      ║
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
