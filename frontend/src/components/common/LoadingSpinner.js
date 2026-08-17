/**
 * Loading Spinner Component
 * Reusable loading indicator
 */

import { Box, CircularProgress, Typography } from "@mui/material";

const LoadingSpinner = ({ 
  loading = false, 
  message = "Loading...",
  fullScreen = false 
}) => {
  if (!loading) return null;

  const containerStyles = fullScreen 
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
      }
    : {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        py: 4,
      };

  return (
    <Box sx={containerStyles}>
      <CircularProgress />
      {message && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
