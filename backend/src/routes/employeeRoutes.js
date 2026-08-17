/**
 * Employee Routes
 * Handles employee information
 */

const express = require("express");
const EmployeeService = require("../services/employeeService");
const { AppError } = require("../middleware/errorMiddleware");

const router = express.Router();

/**
 * GET /employees/:empCode
 * Get employee by code
 */
router.get("/employees/:empCode", async (req, res, next) => {
  try {
    const employee = await EmployeeService.getEmployeeByCode(req.params.empCode);

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /employees
 * Get all employees
 */
router.get("/employees", async (req, res, next) => {
  try {
    const companyCode = req.user?.companycode || "01";
    const employees = await EmployeeService.getAllEmployees({
      companyCode,
      departmentCode: req.query.departmentCode
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /employees/:empCode
 * Update employee
 */
router.put("/employees/:empCode", async (req, res, next) => {
  try {
    await EmployeeService.updateEmployee(req.params.empCode, req.body);

    res.json({
      success: true,
      message: "Employee updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /companies
 * Get companies
 */
router.get("/companies", async (req, res, next) => {
  try {
    const { AuthService } = require("../services");
    const companies = await AuthService.getCompanies();

    res.json(companies);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
