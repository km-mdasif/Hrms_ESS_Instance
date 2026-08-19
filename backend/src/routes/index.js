/**
 * Routes Index
 * Central export point for all routes
 */

module.exports = {
  authRoutes: require("./authRoutes"),
  attendanceRoutes: require("./attendanceRoutes"),
  interviewRoutes: require("./interviewRoutes"),
  visitorRoutes: require("./visitorRoutes"),
  leaveRoutes: require("./leaveRoutes"),
  dashboardRoutes: require("./dashboardRoutes"),
  documentRoutes: require("./documentRoutes"),
  employeeRoutes: require("./employeeRoutes"),
  imageRoutes: require("./imageRoutes"),
  signatureRoutes: require("./signatureRoutes"),
  fieldExecutiveRoutes: require("./fieldExecutiveRoutes")
};
