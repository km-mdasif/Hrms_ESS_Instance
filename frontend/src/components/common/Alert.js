/**
 * Alert Component
 * Reusable alert component for showing messages
 */

import { Alert, AlertTitle, Box } from "@mui/material";

const AlertComponent = ({ 
  type = "error", 
  title, 
  message, 
  onClose,
  variant = "outlined"
}) => {
  if (!message) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={type} 
        onClose={onClose} 
        variant={variant}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  );
};

export default AlertComponent;
