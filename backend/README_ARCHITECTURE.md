# Backend Clean Architecture Implementation

## 🎯 Overview

Your monolithic 2002-line `server.js` has been refactored into a **clean, modular architecture** following industry best practices. The backend now has clear separation of concerns across 5 architectural layers.

## 📁 File Structure

```
backend/
├── src/
│   ├── database/                 # Database layer
│   │   └── db.js                 # Connection pool & query helpers
│   ├── middleware/               # Middleware layer
│   │   ├── authMiddleware.js     # JWT authentication
│   │   └── errorMiddleware.js    # Error handling
│   ├── services/                 # Business logic layer
│   │   ├── authService.js        # Auth logic
│   │   ├── attendanceService.js  # Attendance logic
│   │   ├── documentService.js    # Document management
│   │   ├── employeeService.js    # Employee data
│   │   ├── imageService.js       # Image handling
│   │   ├── interviewService.js   # Interview scheduling
│   │   ├── leaveService.js       # Leave requests
│   │   ├── signatureService.js   # Digital signatures
│   │   ├── visitorService.js     # Visitor tracking
│   │   ├── dashboardService.js   # Dashboard stats
│   │   └── index.js              # Service exports
│   ├── routes/                   # Controllers/Routes layer
│   │   ├── authRoutes.js         # Auth endpoints
│   │   ├── attendanceRoutes.js   # Attendance endpoints
│   │   ├── documentRoutes.js     # Document endpoints
│   │   ├── employeeRoutes.js     # Employee endpoints
│   │   ├── imageRoutes.js        # Image endpoints
│   │   ├── interviewRoutes.js    # Interview endpoints
│   │   ├── leaveRoutes.js        # Leave endpoints
│   │   ├── signatureRoutes.js    # Signature endpoints
│   │   ├── visitorRoutes.js      # Visitor endpoints
│   │   ├── dashboardRoutes.js    # Dashboard endpoints
│   │   └── index.js              # Route exports
│   ├── utils/                    # Utilities layer
│   │   ├── fileManager.js        # File operations
│   │   └── tokenManager.js       # JWT utilities
│   ├── server.js                 # Main app entry point
│   └── ARCHITECTURE.md           # Detailed architecture guide
├── https-server.js               # HTTPS wrapper (unchanged)
├── package.json
└── README.md                      # This file
```

## 🏗️ Architecture Layers

### 1️⃣ **Database Layer** (`src/database/db.js`)
**Responsibility:** All database operations
- Connection pool management
- Query execution helpers
- Stored procedure execution
- SQL type mapping

```javascript
// Usage examples
const { getPool, executeQuery, executeStoredProcedure } = require("./database/db");

// Execute query
const result = await executeQuery("SELECT * FROM Employee WHERE empCode = @empCode", {
  empCode: "EMP001"
});

// Execute stored procedure
const result = await executeStoredProcedure("sp_mark_attendance", {
  empCode, latitude, longitude, accuracy
});
```

### 2️⃣ **Services Layer** (`src/services/`)
**Responsibility:** Business logic (completely isolated from HTTP)
- Pure functions with no Express dependencies
- Database interactions through db.js
- Error handling via AppError
- Data validation and transformation

**Key Services:**
- `AuthService` - Login, token refresh
- `AttendanceService` - Mark & track attendance
- `DocumentService` - CRUD operations
- `EmployeeService` - Employee management
- `ImageService` - Profile image handling
- `InterviewService` - Interview scheduling
- `LeaveService` - Leave management
- `SignatureService` - Signature handling
- `VisitorService` - Visitor tracking
- `DashboardService` - Statistics aggregation

```javascript
// Service pattern (reusable, testable, no Express)
class AttendanceService {
  static async markAttendance(empCode, data) {
    // 1. Validate
    if (!empCode) throw new AppError("Employee code required", 400);
    
    // 2. Execute
    const result = await executeStoredProcedure("sp_mark_attendance", data);
    
    // 3. Return or throw
    return result.recordset?.[0] || { success: true };
  }
}
```

### 3️⃣ **Routes Layer** (`src/routes/`)
**Responsibility:** HTTP endpoint handling
- Request parsing & validation
- Service orchestration
- Response formatting
- Error propagation

```javascript
// Route pattern (delegates to service)
router.post("/attendance", async (req, res, next) => {
  try {
    const result = await AttendanceService.markAttendance(
      req.body.empCode,
      req.body
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error); // Pass to error middleware
  }
});
```

### 4️⃣ **Middleware Layer** (`src/middleware/`)
**Responsibility:** Cross-cutting concerns
- `authMiddleware.js` - JWT verification, role checking
- `errorMiddleware.js` - Global error handling, formatting

```javascript
// Middleware stack
app.use(cors());                              // CORS
app.use(express.json());                      // Body parsing
app.use(optionalAuth(PUBLIC_PATHS));          // Auth check
app.use(routes);                              // Routes
app.use(errorHandler);                        // Error handling
```

### 5️⃣ **Utilities Layer** (`src/utils/`)
**Responsibility:** Reusable helpers
- `fileManager.js` - File operations, path sanitization
- `tokenManager.js` - JWT creation/verification

## 🔄 Request Flow

```
HTTP Request
    ↓
Express Middleware (CORS, bodyParser)
    ↓
Authentication Middleware (verify JWT)
    ↓
Route Handler (validation)
    ↓
Service Method (business logic)
    ↓
Database Layer (executeQuery/executeSP)
    ↓
Database/MSSQL
    ↓
Service Returns Data
    ↓
Route Formats Response
    ↓
Middleware Catches Errors (if any)
    ↓
Error Handler Formats Error Response
    ↓
HTTP Response
```

## 📋 Endpoints by Feature (51 Total)

### Authentication (4)
- `POST /login` - User login
- `POST /refresh-token` - Refresh token
- `POST /logout` - Logout
- `GET /user/profile` - Get profile

### Attendance (4)
- `POST /attendance` - Mark attendance
- `GET /attendance` - Get records
- `GET /attendance/history/:empCode` - Get history
- `GET /attendance/count/:empCode` - Get count

### Interviews (5)
- `GET /interviews` - List interviews
- `GET /interviews/today/count` - Count today
- `POST /interviews` - Create
- `PUT /interviews/:id` - Update
- `DELETE /interviews/:id` - Delete

### Visitors (6)
- `GET /visitors` - List visitors
- `GET /visitors/count` - Count visitors
- `POST /visitors/register` - Register
- `POST /visitors/:id/checkout` - Checkout
- `PUT /visitors/:id` - Update
- `DELETE /visitors/:id` - Delete

### Leave (7)
- `GET /leave-entries` - List leaves
- `GET /leave-types` - List types
- `POST /leave-entries` - Create
- `PUT /leave-entries/:id` - Update
- `PATCH /leave-entries/:id/approve` - Approve
- `PATCH /leave-entries/:id/reject` - Reject
- `DELETE /leave-entries/:id` - Delete

### Documents (7)
- `GET /emp-documents/:empCode` - Get emp docs
- `POST /emp-documents/upload` - Upload
- `DELETE /emp-documents/:id` - Delete
- `GET /company-documents` - Get company docs
- `POST /company-documents/upload` - Upload
- `DELETE /company-documents/:id` - Delete
- `GET /document-types` - List types

### Employees (4)
- `GET /employees` - List employees
- `GET /employees/:empCode` - Get employee
- `PUT /employees/:empCode` - Update
- `GET /companies` - List companies

### Images (3)
- `POST /emp-images/:empCode/upload` - Upload
- `GET /emp-images/:empCode` - Get image
- `DELETE /emp-images/:empCode` - Delete

### Signatures (3)
- `POST /emp-signatures/:empCode/upload` - Upload
- `GET /emp-signatures/:empCode` - Get signature
- `DELETE /emp-signatures/:empCode` - Delete

### Dashboard (7)
- `GET /dashboard/stats` - Get stats
- `GET /dashboard-summary` - Summary (legacy)
- `GET /dashboard/employees/count` - Employee count
- `GET /dashboard/geofence/count` - Geofence count
- `GET /dashboard/field-executives/count` - Field execs
- `GET /dashboard/leave/count` - Leave count
- `GET /dashboard/attendance/overview` - Overview

### Health (1)
- `GET /health` - Health check

## ✅ Key Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **File Count** | 1 file (2002 lines) | 28 files (modular) |
| **Testability** | Difficult | Easy (services testable independently) |
| **Reusability** | Services tied to Express | Services are pure functions |
| **Debugging** | Hard to locate issues | Isolated concerns |
| **Adding Features** | Complex refactoring | Follow existing patterns |
| **Team Development** | Merge conflicts | Clear separation reduces conflicts |
| **Code Quality** | High cyclomatic complexity | Clear responsibilities |
| **Documentation** | Monolithic | ARCHITECTURE.md included |

## 🚀 Running the Backend

```bash
# Install dependencies
npm install

# Start server (uses https-server.js)
npm start

# Or directly with Node
node src/server.js
```

### Environment Variables
```bash
# Database
MSSQL_SERVER=divineserver
MSSQL_DATABASE=hrms
MSSQL_USER=sa
MSSQL_PASSWORD=sql@123
MSSQL_PORT=2439

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Server
PORT=3000
NODE_ENV=production
```

## 📊 Architecture Comparison

### ❌ Before (Monolithic)
```
server.js (2002 lines)
├── Middleware setup (mixed in)
├── Database connection (inline)
├── Authentication logic (inline)
├── Attendance routes + logic (inline)
├── Interview routes + logic (inline)
├── Visitor routes + logic (inline)
├── Leave routes + logic (inline)
├── Document routes + logic (inline)
├── Employee routes + logic (inline)
├── Image routes + logic (inline)
├── Signature routes + logic (inline)
└── Dashboard routes + logic (inline)
```

### ✅ After (Modular)
```
src/
├── database/db.js               (1 file)
├── middleware/                  (2 files)
├── services/                    (11 files)
├── routes/                      (11 files)
├── utils/                       (2 files)
└── server.js                    (1 file)
```

## 🎓 Learning Resources

Each layer has a clear purpose:

1. **Database Layer** - Query & connection management
2. **Services Layer** - Business rules & validation
3. **Routes Layer** - HTTP request/response handling
4. **Middleware Layer** - Cross-cutting concerns
5. **Utilities Layer** - Reusable helpers

**Full documentation:** See `src/ARCHITECTURE.md`

## 🔒 Error Handling

Consistent error handling across the app:

```javascript
// Service throws AppError
throw new AppError("User not found", 404, { userId });

// Route catches and passes to middleware
catch (error) {
  next(error);
}

// Middleware formats response
{
  success: false,
  message: "User not found"
}
```

## 📝 Response Format (Standardized)

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🔐 Authentication Flow

```
1. User sends credentials to POST /login
2. Route calls AuthService.login()
3. Service queries database, creates JWT
4. JWT stored in localStorage (frontend)
5. Future requests include JWT in Authorization header
6. authMiddleware verifies JWT
7. Route proceeds if valid, 401 if invalid
```

## 📚 File Organization Benefits

- **Easy Navigation** - Find code quickly by feature/layer
- **Clear Boundaries** - Each file has single responsibility
- **Easy Testing** - Mock dependencies easily
- **Easy Debugging** - Error stack traces point to exact layer
- **Easy Collaboration** - Developers work on different features independently

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Route not working | Check route is imported in `src/server.js` |
| Database error | Check connection in `src/database/db.js` |
| Authentication failing | Verify JWT in `src/utils/tokenManager.js` |
| File upload failing | Check `src/utils/fileManager.js` config |
| Error not handled | Ensure route calls `next(error)` |

## 📦 Dependencies Used

- `express` - Web framework
- `cors` - CORS handling
- `mssql` - SQL Server driver
- `jsonwebtoken` - JWT authentication
- `multer` - File upload handling

## 🎯 Next Steps

1. **Testing** - Add unit & integration tests
2. **Documentation** - Generate API docs with Swagger
3. **Monitoring** - Add logging & error tracking
4. **Optimization** - Query optimization & caching
5. **Security** - Rate limiting, input validation

## 🎉 Summary

You now have a **production-ready, scalable backend architecture** that follows clean code principles and industry best practices. The code is:

✅ **Modular** - 28 focused files instead of 1 monolithic file  
✅ **Testable** - Services can be unit tested independently  
✅ **Maintainable** - Clear structure easy to understand  
✅ **Scalable** - Easy to add new features following patterns  
✅ **Professional** - Industry-standard architecture pattern  

Happy coding! 🚀
