import { Box, Button, Card, CardContent, Stack, TextField, Typography, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff, Lock, Person } from "@mui/icons-material";
import { useState } from "react";
import { useAuthContext } from "../hooks";
import AuthService from "../services/auth/authService";
import Dashboard from "./Dashboard";
import Attendance from "./Attendance";

/**
 * Login Page Component
 * Uses clean architecture with AuthContext for state management
 * Delegates API calls to AuthService through context
 */
export default function Login() {
  const { isLoggedIn, user, login, loading, error: contextError } = useAuthContext();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    setErrorMessage("");

    const requestUsername = String(username).trim();
    const requestPassword = String(password);

    if (!requestUsername || !requestPassword) {
      setErrorMessage("Please enter username and password.");
      return;
    }

    try {
      await login(requestUsername, requestPassword);
      // Fetch company details after login
      try {
        const companies = await AuthService.getCompanies();
        if (companies && Array.isArray(companies) && companies.length > 0) {
          const companyCode = localStorage.getItem("companyCode") || "01";
          const company = companies.find(c => c.companycode === companyCode);
          if (company) {
            window.COMPANY_NAME = company.companyname;
          }
        }
      } catch (companyErr) {
        console.warn("Failed to fetch company name:", companyErr);
      }
    } catch (err) {
      setPassword("");
      setErrorMessage(err.message || "Check your username and password.");
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setUsername("");
      setPassword("");
      setShowPassword(false);
      setErrorMessage("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Show dashboard if logged in
  if (isLoggedIn && user) {
    const userType = user.userType || "employee";
    return (
      <Dashboard 
        username={user.empName || user.username || "User"} 
        userType={userType} 
        onLogout={handleLogout} 
      />
    );
  }

  const displayError = errorMessage || contextError;

  return (
    <Box sx={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 2
    }}>
      <Card sx={{
        width: "100%",
        maxWidth: 480,
        borderRadius: 3,
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <CardContent sx={{ p: 0 }}>
          {/* Header Section */}
          <Box sx={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
            p: 4,
            textAlign: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: "white", mb: 0.5 }}>
              Divine HRMS
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Employee Self Portal System
            </Typography>
          </Box>

          {/* Form Section */}
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Username Field */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: "#1e293b", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  User Name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (displayError) setErrorMessage("");
                  }}
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <Person sx={{ mr: 1.5, color: "#64748b", fontSize: 20 }} />
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "#f8fafc",
                      borderRadius: 1.5,
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e1" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                    },
                    "& .MuiOutlinedInput-input": {
                      p: 1.5,
                      fontSize: "0.95rem",
                      "&::placeholder": { color: "#94a3b8", opacity: 1 }
                    }
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: "#1e293b", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                      borderRadius: 1.5,
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e1" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                    },
                    "& .MuiOutlinedInput-input": {
                      p: 1.5,
                      fontSize: "0.95rem",
                      "&::placeholder": { color: "#94a3b8", opacity: 1 }
                    }
                  }}
                />
              </Box>

              {/* Login Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleLogin}
                disabled={loading}
                sx={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  p: 1.75,
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderRadius: 1.5,
                  mt: 1,
                  transition: "all 0.3s ease",
                  "&:hover:not(:disabled)": {
                    boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)",
                    transform: "translateY(-2px)"
                  },
                  "&:disabled": {
                    background: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
                  }
                }}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>

              {displayError && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: "#b91c1c", fontWeight: 700, mb: 0.5 }}>
                    Login error
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#991b1b" }}>
                    {displayError}
                  </Typography>
                </Box>
              )}

              {/* Info Text */}
              <Typography variant="caption" sx={{ color: "#64748b", textAlign: "center", mt: 2 }}>
                Use your credentials to access the Divine HRMS
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Typography variant="caption" sx={{
        position: "absolute",
        bottom: 16,
        color: "rgba(255, 255, 255, 0.5)",
        textAlign: "center",
        width: "100%"
      }}>
        Divine Info System © 2026 | Divine HRMS Platform
      </Typography>
    </Box>
  );
}
 );
}