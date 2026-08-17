# Clean Architecture - Backend Node.js/Express

This document explains the clean architecture structure implemented in the backend Express.js application for improved maintainability, scalability, and testability.

## Directory Structure

```
backend/
├── src/
│   ├── database/
│   │   └── db.js                 # Database connection & pool management
│   ├── middleware/
│   │   ├── authMiddleware.js     # Authentication & authorization
│   │   └── errorMiddleware.js    # Error handling & custom errors
│   ├── services/                 # Business logic layer
│   │   ├── authService.js        # Authentication logic
│   │   ├── attendanceService.js  # Attendance operations
│   │   ├── documentService.js    # Document management
│   │   ├── employeeService.js    # Employee operations
│   │   ├── imageService.js       # Employee images
│   │   ├── interviewService.js   # Interview management
│   │   ├── leaveService.js       # Leave requests
│   │   ├── signatureService.js   # Digital signatures
│   │   ├── visitorService.js     # Visitor tracking
│   │   ├── dashboardService.js   # Dashboard statistics
│   │   └── index.js              # Services export
│   ├── routes/                   # Controllers/Routes layer
│   │   ├── authRoutes.js         # Authentication endpoints
│   │   ├── attendanceRoutes.js   # Attendance endpoints
│   │   ├── documentRoutes.js     # Document endpoints
│   │   ├── employeeRoutes.js     # Employee endpoints
│   │   ├── imageRoutes.js        # Image endpoints
│   │   ├── interviewRoutes.js    # Interview endpoints
│   │   ├── leaveRoutes.js        # Leave endpoints
│   │   ├── signatureRoutes.js    # Signature endpoints
│   │   ├── visitorRoutes.js      # Visitor endpoints
│   │   ├── dashboardRoutes.js    # Dashboard endpoints
│   │   └── index.js              # Routes export
│   ├── utils/                    # Utility functions
│   │   ├── fileManager.js        # File operations & storage
│   │   └── tokenManager.js       # JWT token management
│   └── server.js                 # Main app entry point
├── src-old/                      # Backup of original monolithic server
│   └── server.js                 # Original 2002-line server.js
├── package.json
├── https-server.js               # HTTPS wrapper (unchanged)
└── README.md                      # This file
```

## Architecture Layers

### 1. **Database Layer** (`src/database/db.js`)
- Centralized database connection management
- Connection pool handling
- Query and stored procedure execution utilities
- SQL type mapping helpers
- **Responsibilities:**
  - Database connection lifecycle
  - Connection pooling
  - Query execution helpers
  - Error logging

```javascript
// Usage
const { getPool, executeQuery, executeStoredProcedure } = require("./database/db");

const result = await executeQuery("SELECT * FROM Employee WHERE empcode = @empCode", {
  empCode: "EMP001"
});
```

### 2. **Services Layer** (`src/services/`)
- Pure business logic isolated from Express/HTTP
- No Express dependencies
- Database queries through db.js
- Error handling and validation
- **Responsibilities:**
  - Business rule enforcement
  - Data transformation
  - Database operations
  - Error handling

**Services:**
- `AuthService` - Login, token refresh, user profile
- `AttendanceService` - Attendance marking & history
- `DocumentService` - Document upload/download/delete
- `EmployeeService` - Employee information management
- `ImageService` - Employee profile images
- `InterviewService` - Interview scheduling
- `LeaveService` - Leave request management
- `SignatureService` - Digital signature management
- `VisitorService` - Visitor registration & tracking
- `DashboardService` - Dashboard statistics

```javascript
// Service pattern
class UserService {
  static async getUserProfile(username) {
    // 1. Validate input
    // 2. Query database
    // 3. Transform data
    // 4. Return result or throw AppError
  }
}
```

### 3. **Routes/Controllers Layer** (`src/routes/`)
- HTTP endpoint handlers
- Request validation
- Response formatting
- Error propagation to middleware
- **Responsibilities:**
  - Route definition
  - Request parsing
  - Parameter validation
  - Service orchestration
  - Response formatting

```javascript
// Route pattern
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error); // Pass to error middleware
  }
});
```

### 4. **Middleware Layer** (`src/middleware/`)
- Authentication & authorization
- Error handling
- Request/response processing
- **Responsibilities:**
  - JWT token verification
  - Permission checking
  - Error handling
  - Error formatting

```javascript
// Authentication middleware
app.use(requireAuth); // Protects routes

// Optional auth for public routes
app.use(optionalAuth(["/login", "/health"]));

// Error handling
app.use(errorHandler); // Last middleware
```

### 5. **Utilities Layer** (`src/utils/`)
- Reusable helper functions
- File management
- Token management
- **Responsibilities:**
  - JWT creation/verification
  - File operations
  - Path sanitization
  - Common utilities

## Key Patterns

### ✅ Service-Based Architecture

```javascript
// GOOD: Service handles business logic
class AttendanceService {
  static async markAttendance(empCode, data) {
    // Validate input
    // Query database
    // Return result
  }
}

// GOOD: Route delegates to service
router.post("/attendance", async (req, res, next) => {
  try {
    const result = await AttendanceService.markAttendance(...);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
```

### ✅ Error Handling

```javascript
// GOOD: Custom error class
class AppError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// GOOD: Service throws AppError
throw new AppError("User not found", 404);

// GOOD: Middleware handles all errors
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message });
}
```

### ✅ Dependency Injection Pattern

```javascript
// GOOD: Services are self-contained, no global state
static async markAttendance(empCode, data) {
  const db = await getPool(); // Get connection when needed
  // ... operations
}

// GOOD: Middleware-based authentication
app.use(optionalAuth(PUBLIC_PATHS));
```

### ✅ Database Query Abstraction

```javascript
// GOOD: Centralized query execution
const result = await executeQuery(
  "SELECT * FROM Employee WHERE empCode = @empCode",
  { empCode: "EMP001" }
);

// GOOD: Stored procedure execution
const result = await executeStoredProcedure("sp_mark_attendance", {
  empCode, latitude, longitude, accuracy
});
```

## ❌ What to Avoid

### ❌ DON'T: Direct database calls in routes
```javascript
// BAD: Database logic in route handler
router.get("/users/:id", async (req, res) => {
  const result = await sql.query("SELECT * FROM User WHERE id = " + req.params.id);
  res.json(result);
});

// GOOD: Use service
router.get("/users/:id", async (req, res, next) => {
  const user = await UserService.getUserById(req.params.id);
  res.json({ success: true, data: user });
});
```

### ❌ DON'T: Business logic in middleware
```javascript
// BAD
app.use((req, res, next) => {
  const count = await db.query("SELECT COUNT(*) FROM Users");
  req.userData = count;
  next();
});

// GOOD: Use services and pass through routes
```

### ❌ DON'T: Mixed concerns
```javascript
// BAD: Service depends on Express
class UserService {
  static async login(req, res) {
    // Mixing Express with business logic
  }
}

// GOOD: Service is pure business logic
class UserService {
  static async login(username, password) {
    // Returns data, throws errors
  }
}
```

## Endpoints Overview

### Authentication
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `POST /logout` - User logout
- `GET /user/profile` - Get user profile

### Attendance
- `POST /attendance` - Mark attendance
- `GET /attendance` - Get attendance records
- `GET /attendance/history/:empCode` - Get employee attendance history
- `GET /attendance/count/:empCode` - Get attendance count

### Interviews
- `GET /interviews` - List interviews
- `GET /interviews/today/count` - Count interviews for today
- `POST /interviews` - Create interview
- `PUT /interviews/:id` - Update interview
- `DELETE /interviews/:id` - Delete interview

### Visitors
- `GET /visitors` - List visitors
- `GET /visitors/count` - Count visitors
- `POST /visitors/register` - Register visitor
- `POST /visitors/:id/checkout` - Check out visitor
- `PUT /visitors/:id` - Update visitor
- `DELETE /visitors/:id` - Delete visitor

### Leave
- `GET /leave-entries` - List leave entries
- `GET /leave-types` - List leave types
- `POST /leave-entries` - Create leave entry
- `PUT /leave-entries/:id` - Update leave entry
- `PATCH /leave-entries/:id/approve` - Approve leave
- `PATCH /leave-entries/:id/reject` - Reject leave
- `DELETE /leave-entries/:id` - Delete leave entry

### Documents
- `GET /emp-documents/:empCode` - Get employee documents
- `POST /emp-documents/upload` - Upload employee document
- `DELETE /emp-documents/:id` - Delete employee document
- `GET /company-documents` - Get company documents
- `POST /company-documents/upload` - Upload company document
- `DELETE /company-documents/:id` - Delete company document
- `GET /document-types` - List document types

### Employees
- `GET /employees` - List employees
- `GET /employees/:empCode` - Get employee
- `PUT /employees/:empCode` - Update employee
- `GET /companies` - List companies

### Images & Signatures
- `POST /emp-images/:empCode/upload` - Upload employee image
- `GET /emp-images/:empCode` - Get employee image
- `DELETE /emp-images/:empCode` - Delete employee image
- `POST /emp-signatures/:empCode/upload` - Upload signature
- `GET /emp-signatures/:empCode` - Get signature
- `DELETE /emp-signatures/:empCode` - Delete signature

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard-summary` - Get dashboard summary (legacy)
- `GET /dashboard/employees/count` - Get employee count
- `GET /dashboard/geofence/count` - Get geofence count
- `GET /dashboard/field-executives/count` - Get field executives count
- `GET /dashboard/leave/count` - Get leave count
- `GET /dashboard/attendance/overview` - Get attendance overview

## Running the Server

### Option 1: Using new architecture
```bash
cd backend
npm start
# Runs https-server.js which loads src/server.js
```

### Option 2: Direct start
```bash
node src/server.js
```

## Migration Checklist

- ✅ Database layer created
- ✅ All services migrated
- ✅ All routes migrated
- ✅ Middleware setup
- ✅ Error handling implemented
- ✅ Utilities extracted
- ✅ Main server refactored
- ⏳ Integration tests needed
- ⏳ E2E tests needed
- ⏳ API documentation (Swagger) needed

## Benefits of This Architecture

1. **Separation of Concerns**
   - Each layer has single responsibility
   - Easy to understand and maintain

2. **Testability**
   - Services can be unit tested independently
   - No Express dependencies in business logic
   - Mock-friendly architecture

3. **Reusability**
   - Services can be used in CLI, worker jobs, etc.
   - No HTTP-specific code in services
   - Database operations centralized

4. **Scalability**
   - Easy to add new endpoints
   - Consistent patterns throughout
   - Clear extension points

5. **Maintainability**
   - Reduced complexity per file
   - Clear file organization
   - Easier debugging
   - Better code readability

6. **Flexibility**
   - Easy to swap database implementations
   - Easy to add middleware
   - Easy to add new features

## Next Steps

1. **Testing**
   - Unit tests for services
   - Integration tests for routes
   - E2E tests

2. **Documentation**
   - Swagger/OpenAPI documentation
   - API usage examples
   - Development guide

3. **Monitoring**
   - Logging implementation
   - Performance monitoring
   - Error tracking

4. **Optimization**
   - Query optimization
   - Caching strategy
   - Connection pooling tuning
