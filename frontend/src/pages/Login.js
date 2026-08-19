import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock, Person } from "@mui/icons-material";
import { useState } from "react";
import { useAuthContext } from "../hooks";
import AuthService from "../services/auth/authService";
import Dashboard from "./Dashboard";

const safeGetItem = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Login Page Component
 * Uses clean architecture with AuthContext for state management
 * Delegates API calls to AuthService through context
 */
export default function Login() {
  const { isLoggedIn, user, login, logout, loading, error: contextError, clearError } = useAuthContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCloseErrorDialog = () => {
    setErrorMessage("");
    clearError();
  };

  const handleLogin = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    setErrorMessage("");
    clearError();

    const requestUsername = String(username).trim();
    const requestPassword = String(password);

    if (!requestUsername || !requestPassword.trim()) {
      setErrorMessage("Please enter username or employee code and password.");
      return;
    }

    try {
      if (requestUsername) {
        safeSetItem("attendanceEmpCode", requestUsername);
      }

      const response = await login(requestUsername, requestPassword);

      if (!response || !(response.token || response.accessToken)) {
        throw new Error("Login response was incomplete. Please try again.");
      }

      try {
        const companyCode = safeGetItem("companyCode", "01");
        const companies = await AuthService.getCompanies();
        if (companies && Array.isArray(companies) && companies.length > 0) {
          const company = companies.find((c) => String(c.companycode || c.CompanyCode || "") === String(companyCode));
          if (company) {
            const companyName = company.companyname || company.CompanyName || "Company";
            safeSetItem("companyName", companyName);
            window.COMPANY_NAME = companyName;
          }
        }
      } catch (companyErr) {
        console.warn("Failed to fetch company name:", companyErr);
      }
    } catch (err) {
      setPassword("");
      
      let errorMsg = err.message || "Check your username and password.";
      
      if (!err.response) {
        // Network error (no response from server)
        if (err.code === "ECONNABORTED") {
          errorMsg = "Network request timed out. Check if backend server is running on port 5000.";
        } else if (err.message?.includes("ERR_FAILED") || err.message?.includes("Network")) {
          errorMsg = "Network error: Cannot reach the backend server. Make sure it is running and reachable from this device.";
        } else {
          errorMsg = `Network error: ${err.message}. Check console (F12) for details.`;
        }
      } else if (err.response?.status === 0) {
        errorMsg = "Cannot connect to backend server. Is it running on port 5000?";
      }
      
      console.error("[Login Error]", {
        message: err.message,
        status: err.response?.status,
        url: err.config?.url,
      });
      
      setErrorMessage(errorMsg);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUsername("");
      setPassword("");
      setShowPassword(false);
      setErrorMessage("");
      clearError();
    } catch (err) {
      console.error("Logout error:", err);
      setErrorMessage(err.message || "Logout failed.");
    }
  };

  if (isLoggedIn && user) {
    const userType = user.userType || "employee";
    const dashboardName = user.empName || user.username || user.userName || "User";
    return (
      <Dashboard
        username={dashboardName}
        userType={userType}
        onLogout={handleLogout}
      />
    );
  }

  const displayError = errorMessage || contextError;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #edf7f3 0%, #e6f3ef 35%, #f7faf8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.12)",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(6px)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #0c3d5a 0%, #0f8b94 100%)",
              p: 3.5,
              textAlign: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Box
              sx={{
                width: 54,
                height: 54,
                mx: "auto",
                mb: 2,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(111, 255, 170, 0.35), rgba(18, 154, 95, 0.85))",
                border: "1px solid rgba(180,255,210,0.75)",
                boxShadow: "0 10px 24px rgba(16, 185, 129, 0.24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              D
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: "white", mb: 0.5, letterSpacing: "0.02em" }}>
              Divine HRMS
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
              Employee Self Portal System
            </Typography>
          </Box>

          <Box sx={{ p: 4 }} component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{
                    mb: 1.5,
                    color: "#1e293b",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  Username
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter your username or employee code"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (displayError) {
                      setErrorMessage("");
                      clearError();
                    }
                  }}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  InputProps={{
                    startAdornment: (
                      <Person sx={{ mr: 1.5, color: "#64748b", fontSize: 20 }} />
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "#f8fafc",
                      borderRadius: 2,
                      "& fieldset": { borderColor: "#d9e7e2" },
                      "&:hover fieldset": { borderColor: "#a7d7c2" },
                      "&.Mui-focused fieldset": { borderColor: "#2ab67d" },
                    },
                    "& .MuiOutlinedInput-input": {
                      p: 1.5,
                      fontSize: "0.95rem",
                      color: "#0f172a",
                      "&::placeholder": { color: "#94a3b8", opacity: 1 },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{
                    mb: 1.5,
                    color: "#1e293b",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (displayError) {
                      setErrorMessage("");
                      clearError();
                    }
                  }}
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <Lock sx={{ mr: 1.5, color: "#64748b", fontSize: 20 }} />
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          sx={{ color: "#64748b", "&:hover": { color: "#3b82f6" } }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "#f8fafc",
                      borderRadius: 2,
                      "& fieldset": { borderColor: "#d9e7e2" },
                      "&:hover fieldset": { borderColor: "#a7d7c2" },
                      "&.Mui-focused fieldset": { borderColor: "#2ab67d" },
                    },
                    "& .MuiOutlinedInput-input": {
                      p: 1.5,
                      fontSize: "0.95rem",
                      color: "#0f172a",
                      "&::placeholder": { color: "#94a3b8", opacity: 1 },
                    },
                  }}
                />
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  background: "linear-gradient(135deg, #1f9d6d 0%, #0f8b94 100%)",
                  p: 1.75,
                  fontSize: "1rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderRadius: 2,
                  mt: 1,
                  boxShadow: "0 14px 24px rgba(31, 157, 109, 0.25)",
                  transition: "all 0.25s ease",
                  "&:hover:not(:disabled)": {
                    boxShadow: "0 18px 28px rgba(31, 157, 109, 0.32)",
                    transform: "translateY(-2px)",
                  },
                  "&:disabled": {
                    background: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                  },
                }}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>

              <Typography variant="caption" sx={{ color: "#64748b", textAlign: "center", mt: 2 }}>
                Use your credentials to access Divine HRMS
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(displayError)}
        onClose={handleCloseErrorDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#b91c1c" }}>Login Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#7f1d1d", fontSize: "0.96rem" }}>
            {displayError}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseErrorDialog} variant="contained" color="error" sx={{ borderRadius: 2, px: 2.5 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          bottom: 16,
          color: "rgba(255, 255, 255, 0.5)",
          textAlign: "center",
          width: "100%",
        }}
      >
        Divine Info System © 2026 | Divine HRMS Platform
      </Typography>
    </Box>
  );
}
