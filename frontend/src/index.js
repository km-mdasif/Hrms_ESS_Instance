import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    fontSize: 14,
    htmlFontSize: 14,
    body1: {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    button: {
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@import": 'url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap")',
        body: {
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          fontSize: 14,
          fontWeight: 400,
          backgroundColor: "#f5f7fb",
          color: "#0f172a",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: "0.01em",
          boxShadow: "none",
          minHeight: 42,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 10px 34px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": {
            fontSize: 14,
            fontWeight: 500,
            color: "#475467",
          },
          "& .MuiInputBase-root": {
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: "#ffffff",
            transition: "all 0.2s ease",
          },
          "& .MuiInputBase-input": {
            fontSize: 14,
            fontWeight: 500,
            paddingTop: 12.5,
            paddingBottom: 12.5,
          },
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#dfe4ea",
              borderWidth: 1,
            },
            "&:hover fieldset": {
              borderColor: "#c7d2e0",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#3b82f6",
              borderWidth: 1.5,
            },
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          "& .MuiInputLabel-root": {
            fontSize: 14,
            fontWeight: 500,
          },
          "& .MuiInputBase-root": {
            borderRadius: 12,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 12,
        },
        input: {
          fontSize: 14,
          fontWeight: 500,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
        },
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          color: "#64748b",
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
