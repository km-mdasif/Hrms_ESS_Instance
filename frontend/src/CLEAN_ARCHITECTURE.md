# Clean Architecture - Frontend React Project

This document explains the clean architecture structure implemented in the frontend React application for improved maintainability and scalability.

## Directory Structure

```
src/
├── components/           # React components (UI layer)
│   ├── common/          # Reusable UI components (Alert, Spinner, etc.)
│   └── pages/           # Page-level components (Login, Dashboard, etc.)
├── services/            # Business logic & API calls (Application & Domain layers)
│   ├── api/            # API service classes
│   │   ├── apiClient.js           # Axios instance with interceptors
│   │   ├── attendanceService.js   # Attendance API calls
│   │   └── ...
│   ├── auth/           # Authentication services
│   │   └── authService.js         # Auth API calls
│   └── index.js        # Service exports
├── hooks/              # Custom React hooks (Business logic)
│   ├── useAuth.js              # Authentication hook
│   ├── useApi.js               # Generic API hook
│   ├── useLocalStorage.js      # LocalStorage hook
│   ├── useAuthContext.js       # Auth context consumer hook
│   └── index.js
├── context/            # React Context (State management)
│   ├── AuthContext.js          # Global auth state
│   └── ...
├── utils/              # Utility functions & helpers
│   ├── helpers/
│   │   ├── helpers.js          # General helpers (format, validate, etc.)
│   │   └── errorHandler.js     # Error handling utilities
│   ├── validators/
│   │   └── validators.js       # Input validation functions
│   └── ...
├── constants/          # Application constants
│   └── index.js                # Constants (messages, status codes, etc.)
├── models/             # Data models & TypeScript types (optional)
├── middleware/         # Middleware functions (interceptors, etc.)
├── App.js              # Main App component
├── index.js            # Entry point
└── config.js           # Configuration
```

## Architecture Layers

### 1. **Presentation Layer** (`components/`)
- Contains all React components
- **Responsibilities:**
  - Render UI
  - Handle user interactions
  - Display data
- **Rules:**
  - Components should be as "dumb" as possible
  - Use custom hooks to access business logic
  - No API calls directly in components
  - Import from hooks and context

```jsx
// Good: Using hooks and context
import { useAuth } from "../hooks";
import { AlertComponent, LoadingSpinner } from "../components/common";

function LoginPage() {
  const { login, loading, error } = useAuth();
  
  return (
    <>
      <LoadingSpinner loading={loading} />
      <AlertComponent type="error" message={error} />
    </>
  );
}
```

### 2. **Application/Business Logic Layer** (`hooks/`, `context/`)
- Custom hooks handle business logic
- Context provides global state management
- **Responsibilities:**
  - Data transformation
  - State management
  - Business rule enforcement
- **Rules:**
  - Hooks call services
  - Context wraps the app
  - No component-specific logic in services

```jsx
// useAuth.js - Custom hook with business logic
export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const login = useCallback(async (username, password) => {
    const response = await AuthService.login(username, password);
    // Business logic here
    setIsLoggedIn(true);
    return response;
  }, []);
  
  return { isLoggedIn, login };
};
```

### 3. **Domain/Service Layer** (`services/`)
- Encapsulates business domain logic
- API service classes handle all HTTP calls
- **Responsibilities:**
  - API communication
  - Data formatting
  - Error handling
- **Rules:**
  - No React dependencies
  - Pure functions
  - Reusable across components

```jsx
// authService.js - Service layer
class AuthService {
  static async login(username, password) {
    const response = await apiClient.post("/login", {
      username: String(username).trim(),
      password: String(password),
    });
    return response.data;
  }
}
```

### 4. **Data/Infrastructure Layer** (`services/api/apiClient.js`)
- Central API client with interceptors
- **Responsibilities:**
  - HTTP requests
  - Token management
  - Request/response interceptors
  - Error handling

```jsx
// apiClient.js - Infrastructure layer
const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Key Patterns

### ✅ DO: Use Hooks for Business Logic

```jsx
// components/pages/Login.js
import { useAuth } from "../../hooks";
import { AlertComponent, LoadingSpinner } from "../common";

function LoginPage() {
  const { login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    clearError();
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <Box>
      <LoadingSpinner loading={loading} />
      <AlertComponent type="error" message={error} onClose={clearError} />
      {/* Form JSX */}
    </Box>
  );
}
```

### ✅ DO: Create Services for API Calls

```jsx
// services/api/attendanceService.js
class AttendanceService {
  static async getAttendance(params) {
    const response = await apiClient.get("/attendance", { params });
    return response.data;
  }

  static async markAttendance(data) {
    const response = await apiClient.post("/attendance", data);
    return response.data;
  }
}
```

### ✅ DO: Use Context for Global State

```jsx
// context/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Business logic here
  
  return (
    <AuthContext.Provider value={{ user, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

// App.js
function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
```

### ❌ DON'T: Make API Calls Directly in Components

```jsx
// ❌ BAD
function BadComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/attendance`).then(setData);
  }, []);

  return <div>{data}</div>;
}
```

### ❌ DON'T: Mix Business Logic and UI Logic

```jsx
// ❌ BAD - Too much logic in component
function BadLoginComponent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);

  const handleLogin = async () => {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      username,
      password,
    });
    localStorage.setItem("token", response.data.token);
    setToken(response.data.token);
  };

  return <form onSubmit={handleLogin}>...</form>;
}
```

## Implementing Clean Architecture: Step-by-Step

### Step 1: Create a Service

```jsx
// services/api/leaveService.js
import apiClient from "./apiClient";

class LeaveService {
  static async getLeaveRequests(filters = {}) {
    try {
      const response = await apiClient.get("/leave", { params: filters });
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to fetch leave requests");
    }
  }

  static async submitLeaveRequest(data) {
    try {
      const response = await apiClient.post("/leave", data);
      return response.data;
    } catch (error) {
      throw this._handleError(error, "Failed to submit leave request");
    }
  }

  static _handleError(error, message) {
    console.error(message, error);
    return new Error(error.response?.data?.message || message);
  }
}

export default LeaveService;
```

### Step 2: Create a Custom Hook

```jsx
// hooks/useLeave.js
import { useState, useCallback } from "react";
import { LeaveService } from "../services";

const useLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaves = useCallback(async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await LeaveService.getLeaveRequests(filters);
      setLeaves(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitLeave = useCallback(async (leaveData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await LeaveService.submitLeaveRequest(leaveData);
      setLeaves([...leaves, response]);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [leaves]);

  return { leaves, loading, error, fetchLeaves, submitLeave };
};

export default useLeave;
```

### Step 3: Use in Component

```jsx
// components/pages/LeaveEntry.js
import { useLeave } from "../../hooks";
import { AlertComponent, LoadingSpinner } from "../common";

function LeaveEntryPage() {
  const { leaves, loading, error, fetchLeaves, submitLeave } = useLeave();

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleSubmit = async (formData) => {
    try {
      await submitLeave(formData);
      // Show success message
    } catch (err) {
      // Error is handled in hook
    }
  };

  return (
    <Box>
      <LoadingSpinner loading={loading} />
      <AlertComponent type="error" message={error} />
      <LeaveForm onSubmit={handleSubmit} />
      <LeaveList leaves={leaves} />
    </Box>
  );
}
```

## Benefits of Clean Architecture

✅ **Maintainability**: Each layer has clear responsibilities
✅ **Testability**: Services and hooks are easy to test
✅ **Reusability**: Services and hooks can be used across components
✅ **Scalability**: Easy to add new features without breaking existing code
✅ **Readability**: Code is organized and easy to understand
✅ **Independence**: UI, business logic, and API layers are independent

## Common Mistakes to Avoid

1. **API calls in components** - Always use services
2. **Business logic in components** - Use hooks for this
3. **Shared state in multiple contexts** - Use one context per concern
4. **No error handling** - Always handle errors in services
5. **Direct localStorage access** - Use hooks or services
6. **Hardcoded URLs** - Use constants and config

## Migration Guide

To migrate existing pages to this architecture:

1. **Extract API calls** → Create a service class
2. **Extract business logic** → Create a custom hook
3. **Simplify component** → Use hooks and services
4. **Handle errors** → Use error handler utilities
5. **Test thoroughly** → Unit test services and hooks

## Best Practices

- **Keep components focused** on UI rendering
- **Keep services focused** on API communication
- **Keep hooks focused** on state and effects
- **Keep utilities focused** on pure functions
- **Use constants** instead of magic strings
- **Always handle errors** appropriately
- **Use TypeScript** for better type safety (future enhancement)
- **Write tests** for services and hooks

## Resources

- React Hooks Documentation: https://react.dev/reference/react
- Clean Code JavaScript: https://github.com/ryanmcdermott/clean-code-javascript
- Separation of Concerns: https://en.wikipedia.org/wiki/Separation_of_concerns

---

**Last Updated**: 2024
**Maintainer**: Development Team
