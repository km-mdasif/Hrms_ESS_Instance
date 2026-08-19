import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Clear, Create, SaveAlt } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

export default function EmployeeSignature() {
  const [empCode, setEmpCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeValidated, setEmployeeValidated] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [existingSignatureBase64, setExistingSignatureBase64] = useState("");
  const [statusMessage, setStatusMessage] = useState("Search for an employee code to begin signing.");
  const [pageMessage, setPageMessage] = useState("");
  const [pageSeverity, setPageSeverity] = useState("info");
  const [openDeleteSignature, setOpenDeleteSignature] = useState(false);
  const canvasRef = useRef(null);

  const normalizeEmpCode = (value) => String(value || "").trim();

  const getAuthHeaders = (headers = {}) => {
    const token = localStorage.getItem("token") || "";
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const parseJsonResponse = async (response) => {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      return { message: text };
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawSignatureOnCanvas = (signatureBase64) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    resetCanvas();
    if (!signatureBase64) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = signatureBase64.startsWith("data:") ? signatureBase64 : `data:image/png;base64,${signatureBase64}`;
  };

  const isCanvasBlank = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return true;
    }

    const context = canvas.getContext("2d");
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return !imageData.some((value, index) => index % 4 !== 3 && value !== 255);
  };

  useEffect(() => {
    resetCanvas();
  }, []);

  const fetchExistingSignature = async (employeeCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/forSignature/${encodeURIComponent(employeeCode)}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setExistingSignatureBase64("");
        setShowPad(false);
        resetCanvas();
        return;
      }

      const result = await parseJsonResponse(response);
      const signatureBase64 = String(result?.signatureBase64 || "").trim();
      if (signatureBase64) {
        setExistingSignatureBase64(signatureBase64);
        setShowPad(true);
        drawSignatureOnCanvas(signatureBase64);
      } else {
        setExistingSignatureBase64("");
        setShowPad(false);
        resetCanvas();
      }
    } catch (err) {
      console.error("Failed to load existing signature:", err);
      setExistingSignatureBase64("");
      setShowPad(false);
      resetCanvas();
    }
  };

  const fetchEmployee = async () => {
    const employeeCode = normalizeEmpCode(empCode);
    if (!employeeCode) {
      setPageMessage("Please enter an employee code.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(employeeCode)}`, {
        headers: getAuthHeaders(),
      });

      const result = await parseJsonResponse(response);
      if (!response.ok) {
        setEmployeeValidated(false);
        setEmployeeName("");
        setExistingSignatureBase64("");
        setShowPad(false);
        resetCanvas();
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("companyCode");
          setStatusMessage("Please login again to continue.");
          setPageMessage("Please login again to continue.");
          setPageSeverity("warning");
        } else {
          setStatusMessage(result?.message || "Employee not found.");
          setPageMessage(result?.message || "Employee not found.");
          setPageSeverity("warning");
        }
        return;
      }

      setEmployeeValidated(true);
      setEmployeeName(result?.empname || result?.username || "");
      setShowPad(true);
      setStatusMessage("Employee verified. You can open the signature pad and save the signature.");
      setPageMessage("");
      setPageSeverity("info");
      resetCanvas();
      await fetchExistingSignature(employeeCode);
    } catch (err) {
      console.error("Failed to validate employee:", err);
      setEmployeeValidated(false);
      setEmployeeName("");
      setShowPad(false);
      resetCanvas();
      setPageMessage("Error validating employee.");
      setPageSeverity("error");
      setStatusMessage("Error validating employee");
    } finally {
      setLoading(false);
    }
  };

  const beginStroke = (event) => {
    if (!showPad) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);
  };

  const continueStroke = (event) => {
    if (!isDrawing || !showPad) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endStroke = (event) => {
    if (!showPad) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setIsDrawing(false);
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleSave = async () => {
    let companyCode = String(localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCode)) companyCode = companyCode.padStart(2, "0");
    const employeeCode = normalizeEmpCode(empCode);

    if (!employeeValidated || !companyCode.trim()) {
      setPageMessage("Please validate an employee and ensure you are logged in before saving.");
      setPageSeverity("error");
      return;
    }

    if (!showPad || isCanvasBlank()) {
      setPageMessage("Please draw a signature before saving.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const signatureBase64 = canvas.toDataURL("image/png");

      const response = await fetch(`${API_BASE_URL}/forSignature`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empcode: employeeCode,
          companycode: companyCode.trim(),
          description: description.trim(),
          signatureBase64,
        }),
      });

      const result = await parseJsonResponse(response);
      if (response.ok) {
        setStatusMessage("Employee signature saved successfully.");
        setPageMessage("");
        setPageSeverity("info");
        setExistingSignatureBase64(signatureBase64);
        drawSignatureOnCanvas(signatureBase64);
        setShowPad(true);
      } else {
        setPageMessage("Save failed: " + (result?.message || "Unknown error"));
        setPageSeverity("error");
      }
    } catch (err) {
      console.error("Save signature error:", err);
      setPageMessage("Error saving employee signature.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteSignature = () => {
    setOpenDeleteSignature(true);
  };

  const handleDelete = async () => {
    const employeeCode = normalizeEmpCode(empCode);
    if (!employeeCode) {
      setPageMessage("Please enter an employee code before deleting the signature.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/forSignature/${encodeURIComponent(employeeCode)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await parseJsonResponse(response);
      if (response.ok) {
        setStatusMessage("Employee signature deleted successfully.");
        setPageMessage("");
        setPageSeverity("info");
        setExistingSignatureBase64("");
        resetCanvas();
        setShowPad(false);
      } else {
        setPageMessage("Delete failed: " + (result?.message || "Unknown error"));
        setPageSeverity("error");
      }
    } catch (err) {
      console.error("Delete signature error:", err);
      setPageMessage("Error deleting employee signature.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Employee Signature</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Capture and manage employee digital signatures</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="Signature" sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Box>
      </Card>

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
              <Box sx={{ display: "grid", gap: 2, width: "100%" }}>
                <TextField
                  label="Employee Code"
                  value={empCode}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setEmpCode(nextValue);
                    if (!nextValue.trim()) {
                      setEmployeeValidated(false);
                      setEmployeeName("");
                      setShowPad(false);
                      resetCanvas();
                      setStatusMessage("Search for an employee code to begin signing.");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      fetchEmployee();
                    }
                  }}
                  placeholder="Enter employee code"
                  size="small"
                  sx={{ minWidth: 240 }}
                />
                <TextField
                  label="Employee Name"
                  value={employeeName}
                  size="small"
                  placeholder="Employee name will appear after search"
                  InputProps={{ readOnly: true }}
                />
              </Box>
              <Button variant="contained" onClick={fetchEmployee} disabled={loading || !empCode.trim()}>
                Search
              </Button>
            </Stack>
            <Chip label={statusMessage} color="primary" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {!employeeValidated ? (
            <Box sx={{ p: 3, textAlign: "center", bgcolor: "#f0f9ff", borderRadius: 2, border: "2px dashed #0ea5e9" }}>
              <Typography variant="body1" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                🔍 Search First
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter an employee code and validate the employee before opening the signature pad.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional note"
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Create />}
                  onClick={() => {
                    setShowPad(true);
                    resetCanvas();
                  }}
                  disabled={loading}
                >
                  Open Signature Pad
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Clear />}
                  onClick={() => {
                    resetCanvas();
                    setShowPad(true);
                  }}
                  disabled={loading}
                >
                  Clear Pad
                </Button>
                <Button variant="contained" startIcon={<SaveAlt />} onClick={handleSave} disabled={loading}>
                  Save Signature
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={requestDeleteSignature}
                  disabled={loading || !employeeValidated}
                >
                  Delete Signature
                </Button>
              </Stack>

              {pageMessage ? (
                <Chip label={pageMessage} color={pageSeverity === "error" ? "error" : pageSeverity === "warning" ? "warning" : "info"} variant="outlined" />
              ) : null}
              <Dialog open={openDeleteSignature} onClose={() => setOpenDeleteSignature(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                  <Typography>Are you sure you want to delete this signature?</Typography>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenDeleteSignature(false)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      setOpenDeleteSignature(false);
                      await handleDelete();
                    }}
                    color="error"
                    variant="contained"
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </DialogActions>
              </Dialog>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "#f8fbff",
                  border: "1px solid #bfd3ff",
                }}
              >
                {showPad ? (
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={320}
                    style={{ width: "100%", height: "320px", borderRadius: 12, backgroundColor: "#ffffff", touchAction: "none", cursor: "crosshair" }}
                    onPointerDown={beginStroke}
                    onPointerMove={continueStroke}
                    onPointerUp={endStroke}
                    onPointerLeave={endStroke}
                  />
                ) : (
                  <Box sx={{ minHeight: 320, display: "grid", placeItems: "center", border: "2px dashed #cbd5e1", borderRadius: 3, bgcolor: "#ffffff" }}>
                    <Typography variant="body2" color="text.secondary">
                      Open the signature pad to start drawing.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
