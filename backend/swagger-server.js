/**
 * Swagger Documentation Server
 * Runs on port 5001
 * Serves Swagger UI for backend API documentation
 */

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const SWAGGER_PORT = process.env.SWAGGER_PORT || 5001;
const API_URL = process.env.API_URL || "http://localhost:5000";

// Swagger options
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Divine HRMS API",
      version: "1.0.0",
      description: "REST API for Divine HRMS ESS Instance",
      contact: {
        name: "Development Team",
      },
    },
    servers: [
      {
        url: API_URL,
        description: "Backend API Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [], // Will fetch from backend
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/", swaggerUi.serve);
app.get("/", swaggerUi.setup(swaggerSpec, { url: `${API_URL}/api-docs.json` }));

// Alternative: Redirect to backend Swagger
app.get("/api-docs", (req, res) => {
  res.redirect(`${API_URL}/api-docs`);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Swagger server is running on port " + SWAGGER_PORT });
});

// Start server
app.listen(SWAGGER_PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════╗
║  Divine HRMS Swagger Server Started    ║
║  ✓ Listening on port ${SWAGGER_PORT}              ║
║  ✓ Swagger UI: http://localhost:${SWAGGER_PORT}   ║
║  ✓ Backend API: ${API_URL}    ║
╚════════════════════════════════════════╝
  `);
});
