# Clean Architecture - Visual Diagrams

## 1. Complete Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Interface                             │
│                       (React Frontend)                              │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                HTTP Requests/Responses
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                           HTTP Layer                                │
│                          Express.js                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Middleware Stack                          │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────┐  ┌──────────┐ ┌──────┐ │  │
│  │  │  CORS   │→ │  Body    │→ │Auth │→ │ Routes  │→│Error │ │  │
│  │  │         │  │ Parser   │  │     │  │         │ │Handler│ │  │
│  │  └─────────┘  └──────────┘  └─────┘  └──────────┘ └──────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                            Routes (Controllers)
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         Routes Layer                                │
│                    (src/routes/*.js)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  authRoutes  attendanceRoutes  documentRoutes  ... (10 files) │  │
│  │  - Parse requests                                            │  │
│  │  - Validate input                                            │  │
│  │  - Orchestrate services                                      │  │
│  │  - Format responses                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                            Services (Business Logic)
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                        Services Layer                               │
│                    (src/services/*.js)                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  authService  attendanceService  documentService ... (10)    │  │
│  │  - Business rules & logic                                    │  │
│  │  - Data validation & transformation                          │  │
│  │  - Error handling (throw AppError)                           │  │
│  │  - NO Express dependencies (testable!)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                            Database Operations
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                       Database Layer                                │
│                      (src/database/db.js)                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  - Connection pooling                                        │  │
│  │  - Query execution (executeQuery)                            │  │
│  │  - Stored procedure execution (executeStoredProcedure)       │  │
│  │  - SQL type mapping                                          │  │
│  │  - Error logging                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                       MSSQL Database                                │
│                                                                     │
│  Tables:                                                            │
│  ├── User              ├── AttendanceLog                            │
│  ├── Employee          ├── EmpDocument                              │
│  ├── Company           ├── CompanyDocument                          │
│  ├── Interview         ├── EmpImage                                 │
│  ├── Visitor           └── EmpSignature                             │
│  └── LeaveLog                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Supporting Layers:
┌─────────────────┐    ┌────────────────┐
│   Middleware    │    │    Utilities   │
│  (src/middleware│    │  (src/utils)   │
│                 │    │                │
│ - authMiddle... │    │ - fileManager  │
│ - errorMiddle...│    │ - tokenManager │
└─────────────────┘    └────────────────┘
```

---

## 2. Request Flow - Detailed

```
Client Browser sends request:
    POST /leave-entries
    Authorization: Bearer {jwt_token}
    { "empCode": "E001", "leaveType": "Sick", ... }
                    │
                    ↓
        ┌────────────────────────┐
        │  Express Middleware    │
        │  (CORS, BodyParser)    │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   Auth Middleware      │
        │ Verify JWT in header   │
        │ Attach user to req     │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Route Handler                 │
        │  leaveRoutes.js POST /leave... │
        │ 1. Extract req.body            │
        │ 2. Validate required fields    │
        │ 3. Call LeaveService.create()  │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Service Method                │
        │  LeaveService.create()         │
        │ 1. Validate business rules     │
        │ 2. Transform data              │
        │ 3. Call executeQuery()         │
        │ 4. Return result or throw      │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Database Layer                │
        │  executeQuery()                │
        │ 1. Build SQL query             │
        │ 2. Map types                   │
        │ 3. Get connection from pool    │
        │ 4. Execute on MSSQL            │
        │ 5. Release connection          │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  MSSQL Server                  │
        │  INSERT INTO LeaveLog (...)    │
        │  VALUES (...)                  │
        │  RETURNS: new row id           │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Back to Service               │
        │  Receives: { id: 123, ... }    │
        │  Returns to route              │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Back to Route Handler         │
        │  Format response:              │
        │  res.json({                    │
        │    success: true,              │
        │    data: { id: 123, ... }      │
        │  })                            │
        └────────────┬───────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Response sent to browser      │
        │  HTTP 200 OK                   │
        │  JSON body                     │
        └────────────────────────────────┘

Error scenario (if any layer fails):
    Route catches error:
        catch (error) { next(error) }
                    │
                    ↓
        Error Middleware catches:
        - Log error
        - Format response
        - Send HTTP error status
                    │
                    ↓
        Browser receives error response
        HTTP 400/401/404/500
        { success: false, message: "error description" }
```

---

## 3. Layered Architecture

```
                    Presentation Tier
                    ┌─────────────────┐
                    │  React Frontend │
                    │  (Components)   │
                    └────────┬────────┘
                             │
                    Business Logic Tier
        ┌───────────────────┬────────────────────┐
        │                   │                    │
    ┌───▼────┐       ┌─────▼─────┐        ┌────▼──┐
    │ Routes │       │ Services  │        │ Utils │
    │(HTTP)  │       │(Logic)    │        │       │
    └───┬────┘       └─────┬─────┘        └────┬──┘
        │                  │                   │
        │            Database Tier            │
        └──────────┬────────────┬──────────────┘
                   │            │
               ┌───▼───────────▼───┐
               │  Database Layer   │
               │  (Connection Pool,│
               │   Query Exec)     │
               └────────┬──────────┘
                        │
                   Data Tier
                        │
                   ┌────▼──────┐
                   │  MSSQL    │
                   │ Database  │
                   └───────────┘

Properties:
✓ Each layer independent
✓ Easy to test (mock layers)
✓ Easy to replace (swap implementation)
✓ Easy to scale (distribute layers)
✓ Separation of concerns
```

---

## 4. Service Class Pattern

```
┌────────────────────────────────────────────────┐
│         AttendanceService.js                   │
├────────────────────────────────────────────────┤
│                                                │
│  Class: AttendanceService (static methods)     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  static async markAttendance(empCode, data) │
│  │  ├─ Validate input                       │ │
│  │  ├─ Call executeStoredProcedure()        │ │
│  │  ├─ Transform result                     │ │
│  │  ├─ Throw AppError if failed             │ │
│  │  └─ Return result or throw error         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  static async getAttendanceHistory(...)  │ │
│  │  ├─ Validate parameters                  │ │
│  │  ├─ Build query conditions               │ │
│  │  ├─ Call executeQuery()                  │ │
│  │  ├─ Format response                      │ │
│  │  └─ Return result                        │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  static async getAttendanceCount(...)    │ │
│  │  ├─ Query database                       │ │
│  │  └─ Return count                         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Dependencies:                                 │
│  - No Express! (testable)                     │
│  - Only uses database layer                   │
│  - Only uses AppError                         │
│                                                │
└────────────────────────────────────────────────┘

Usage in Route:
┌─────────────────────────────────────────┐
│  router.post("/attendance", async ...) │
│  ├─ Extract req.body                   │
│  ├─ Validate                           │
│  ├─ await AttendanceService.mark(...) │
│  ├─ Format response                    │
│  ├─ res.json(response)                │
│  └─ catch → next(error)                │
└─────────────────────────────────────────┘
```

---

## 5. Error Handling Flow

```
Service throws error:
    throw new AppError("Invalid empCode", 400);
                │
                ↓
    Route catches:
        catch (error) { next(error); }
                │
                ↓
    Global Error Middleware:
    ┌──────────────────────────────────┐
    │  errorHandler(err, req, res)     │
    ├──────────────────────────────────┤
    │ 1. Log error details             │
    │ 2. Get status (err.status || 500)│
    │ 3. Format response               │
    │ 4. res.status(status).json(...)  │
    │ 5. Include stack trace if dev    │
    └──────────────────────────────────┘
                │
                ↓
    Response to client:
    {
        "success": false,
        "message": "Invalid empCode",
        "status": 400
    }
```

---

## 6. File Dependency Tree

```
src/server.js (main app)
├── src/middleware/authMiddleware.js
│   └── src/utils/tokenManager.js
│       └── (jsonwebtoken package)
│
├── src/middleware/errorMiddleware.js
│   └── (custom AppError class)
│
├── src/routes/*.js (all 10 route files)
│   ├── src/services/*.js (all 10 services)
│   │   ├── src/database/db.js
│   │   │   └── (mssql package)
│   │   ├── src/middleware/errorMiddleware.js
│   │   │   └── (AppError class)
│   │   └── src/utils/fileManager.js (if used)
│   │       └── (fs, path packages)
│   │
│   └── src/utils/fileManager.js (if used)
│       └── (fs, path packages)
│
└── node_modules/
    ├── express
    ├── cors
    ├── mssql
    ├── jsonwebtoken
    ├── multer
    └── (others)

✓ Circular dependencies: NONE
✓ Clear dependency flow: Database → Services → Routes → Server
✓ Easy to understand: Each layer clearly defined
```

---

## 7. Authentication Flow

```
Browser
   │
   ├─→ POST /login {username, password}
   │
   ↓
Route: authRoutes.js
   │
   ├─→ Validate input
   │
   ├─→ AuthService.login(username, password)
   │
   ↓
Service: authService.js
   │
   ├─→ Query "SELECT * FROM User WHERE username = ?"
   │   (via executeQuery)
   │
   ├─→ Verify password
   │
   ├─→ tokenManager.createAccessToken(user)
   │
   ├─→ tokenManager.createRefreshToken(user)
   │
   ├─→ Return { token, accessToken, refreshToken, user }
   │
   ↓
Route formats response
   │
   ├─→ res.json({ success: true, data: tokens })
   │
   ↓
Browser
   │
   ├─→ localStorage.setItem("token", accessToken)
   │
   ├─→ Future requests include:
   │   Authorization: Bearer {accessToken}
   │
   ├─→ authMiddleware.verifyAccessToken(token)
   │   ├─→ Success: attach user to req.user
   │   └─→ Failure: return 401 Unauthorized
   │
   ↓
Route executes as authenticated user
```

---

## 8. Feature-Based Organization

```
Features (51 endpoints):

Authentication (4)
├── src/services/authService.js
├── src/routes/authRoutes.js
└── Endpoints: /login, /refresh-token, /logout, /user/profile

Attendance (4)
├── src/services/attendanceService.js
├── src/routes/attendanceRoutes.js
└── Endpoints: /attendance, /attendance/history, /attendance/count

... (similar for 8 other features)

Each feature is self-contained:
✓ Service handles logic
✓ Route handles HTTP
✓ Can be developed independently
✓ Easy to add, remove, or modify
```

---

## 9. Data Flow Example - Add Leave Request

```
Step 1: Frontend sends request
    POST /leave-entries
    {
        "empCode": "E001",
        "leaveType": "Sick",
        "leaveFromDate": "2024-01-15",
        "leaveToDate": "2024-01-17",
        "reason": "Medical appointment"
    }

Step 2: Route handler receives
    leaveRoutes.js
    └─ Extract & validate request body

Step 3: Service processes
    leaveService.js
    ├─ Check: Employee exists?
    ├─ Check: Leave type valid?
    ├─ Check: Dates reasonable?
    └─ Execute: INSERT INTO LeaveLog

Step 4: Database executes
    db.js
    ├─ Get connection from pool
    ├─ Build SQL: INSERT INTO LeaveLog (...)
    ├─ Bind parameters
    ├─ Execute query
    └─ Release connection

Step 5: Service processes result
    leaveService.js
    ├─ Get back: new row ID = 123
    ├─ Return: { id: 123, status: "Pending", ... }

Step 6: Route formats response
    leaveRoutes.js
    ├─ Format as: { success: true, data: {...} }
    └─ res.status(201).json(response)

Step 7: Frontend receives
    {
        "success": true,
        "data": {
            "id": 123,
            "empCode": "E001",
            "status": "Pending",
            "createdAt": "2024-01-14T10:30:00"
        }
    }

Step 8: Frontend updates UI
    ├─ Show success message
    ├─ Add to leave list
    └─ Clear form
```

---

## 10. Scalability Structure

```
Current: Single Backend Instance
┌─────────────────┐
│  Express Server │
│  ├─ Routes      │
│  ├─ Services    │
│  └─ Database    │
└─────────────────┘

Future: Scalable (microservices-ready)
┌──────────────────┐  ┌──────────────────┐
│ API Gateway      │  │ Load Balancer    │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
    ┌────▼──┐            ┌────▼──┐
    │Instance│            │Instance│
    │   1    │    ...     │   N    │
    └─┬──┬──┘            └─┬──┬──┘
      │  │                 │  │
      └──┼─────────┬───────┼──┘
         │         │       │
    ┌────▼─────────▼───────▼────┐
    │   Shared Database Pool     │
    │   (MSSQL Connection)       │
    └────────────────────────────┘

Why this architecture supports scaling:
✓ Services have no instance state
✓ Database layer is centralized
✓ Each instance can be replaced
✓ Services can become microservices
✓ Database stays centralized (MSSQL)
```

---

This visual guide complements the detailed documentation. Refer to it when understanding the architecture flow! 📊
