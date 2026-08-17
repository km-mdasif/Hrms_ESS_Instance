/**
 * Services Index
 * Central export point for all services
 */

module.exports = {
  AuthService: require("./authService"),
  AttendanceService: require("./attendanceService"),
  DocumentService: require("./documentService"),
  EmployeeService: require("./employeeService"),
  ImageService: require("./imageService"),
  InterviewService: require("./interviewService"),
  VisitorService: require("./visitorService"),
  LeaveService: require("./leaveService"),
  SignatureService: require("./signatureService"),
  DashboardService: require("./dashboardService")
};
