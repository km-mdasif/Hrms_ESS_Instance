/**
 * API Services - Main export file
 * All API service classes are exported from here for easy imports
 */

export { default as apiClient } from "./api/apiClient";
export { default as AttendanceService } from "./api/attendanceService";
export { default as DocumentService } from "./api/documentService";
export { default as EmpImageService } from "./api/empImageService";
export { default as EmployeeService } from "./api/employeeService";
export { default as EmployeeSignatureService } from "./api/employeeSignatureService";
export { default as LeaveService } from "./api/leaveService";
export { default as InterviewService } from "./api/interviewService";
export { default as VisitorService } from "./api/visitorService";
export { default as DashboardService } from "./api/dashboardService";

// Export auth services
export { default as AuthService } from "./auth/authService";
