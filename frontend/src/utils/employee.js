export const getEmployeePayload = (response) => response?.data?.data || response?.data || response || {};

export const getEmployeeName = (response) => {
  const employee = getEmployeePayload(response);
  return String(
    employee?.empname ||
      employee?.EmpName ||
      employee?.employeeName ||
      employee?.EmployeeName ||
      employee?.username ||
      employee?.name ||
      ""
  ).trim();
};
