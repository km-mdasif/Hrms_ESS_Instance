import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CloudUpload, PhotoCamera, SaveAlt } from "@mui/icons-material";
import { API_BASE_URL } from "../config";
import { getEmployeeName } from "../utils/employee";

export default function EmpImage() {
  const [empCode, setEmpCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [imageName, setImageName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingImage, setExistingImage] = useState("");
  const [employeeValidated, setEmployeeValidated] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("user");
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState("Search for an employee code to load the saved image.");

  const normalizeEmpCode = (value) => String(value || "").trim();
  const previewImage = selectedPreview || (existingImage ? `data:image/png;base64,${existingImage}` : "");

  const isMobileBrowser = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const userAgent = navigator.userAgent || "";
    const mobilePattern = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i;
    return mobilePattern.test(userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
  };

  const isIOSBrowser = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  };

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

  const clearImageState = () => {
    setExistingImage("");
    setImageName("");
    setDescription("");
    setSelectedFile(null);
    setSelectedPreview("");
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Revoke object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (selectedPreview && selectedPreview.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreview);
      }
    };
  }, [selectedPreview]);

  useEffect(() => {
    setIsMobileDevice(isMobileBrowser());
  }, []);

  useEffect(() => {
    if (!employeeValidated || !cameraRequested || selectedPreview) {
      return;
    }

    startCamera();

    return () => {
      stopCameraStream();
    };
  }, [employeeValidated, cameraRequested, cameraFacingMode, isMobileDevice, selectedPreview]);

  const [pageMessage, setPageMessage] = useState("");
  const [pageSeverity, setPageSeverity] = useState("info");

  const fetchEmployeeImage = async () => {
    const employeeCode = normalizeEmpCode(empCode);
    if (!employeeCode) {
      setPageMessage("Please enter an employee code.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      // ONLY check if employee exists in employee table
      const employeeCheck = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(employeeCode)}`, {
        headers: getAuthHeaders(),
      });

      if (!employeeCheck.ok) {
        const error = await parseJsonResponse(employeeCheck);
        setEmployeeValidated(false);
        setEmployeeName("");
        clearImageState();
        if (employeeCheck.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("companyCode");
          setStatusMessage("Please login again to continue.");
          setPageMessage("Please login again to continue.");
          setPageSeverity("warning");
        } else {
          setStatusMessage(error?.message || "Employee not found.");
          setPageMessage(error?.message || "Employee not found.");
          setPageSeverity("warning");
        }
        return;
      }

      // Employee found in employee table - enable camera and save options
      const data = await parseJsonResponse(employeeCheck);
      setEmployeeValidated(true);
      setEmployeeName(getEmployeeName(data));
      clearImageState();
      setStatusMessage("Employee verified. Ready to capture or update image.");
    } catch (err) {
      console.error("Failed to validate employee:", err);
      setEmployeeValidated(false);
      clearImageState();
      setPageMessage("Error validating employee.");
      setPageSeverity("error");
      setStatusMessage("Error validating employee");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (selectedPreview && selectedPreview.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreview);
    }

    setSelectedFile(file);
    setSelectedPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const stopCameraStream = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const openCamera = async () => {
    setCameraRequested(true);
    await startCamera();
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      setStatusMessage("Camera access is not supported by this browser. Please use a device with camera access.");
      return;
    }

    stopCameraStream();

    try {
      const preferredFacingMode = isMobileDevice ? cameraFacingMode : "user";
      const primaryConstraints = {
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const fallbackConstraints = {
        video: { facingMode: preferredFacingMode },
        audio: false,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (primaryErr) {
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      setCameraAvailable(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play() was blocked:", playErr);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraAvailable(false);
      const friendlyMessage = isIOSBrowser()
        ? "Failed to access camera. Tap Allow when the prompt appears and make sure camera permissions are enabled in Settings."
        : "Failed to access camera. Please allow camera permissions and try again.";
      setStatusMessage(friendlyMessage);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      const shouldMirror = isMobileDevice ? cameraFacingMode === "user" : true;
      context.save();
      if (shouldMirror) {
        context.translate(canvasRef.current.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      context.restore();

      canvasRef.current.toBlob((blob) => {
        let filePromise;
        if (blob) {
          const file = new File([blob], "employee-image.png", { type: "image/png" });
          filePromise = Promise.resolve(file);
        } else {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          const fallbackBlob = dataURLtoBlob(dataUrl);
          const file = new File([fallbackBlob], "employee-image.png", { type: "image/png" });
          filePromise = Promise.resolve(file);
        }

        filePromise.then((file) => {
          setSelectedFile(file);
          setSelectedPreview(canvasRef.current.toDataURL("image/png"));
          stopCameraStream();
        });
      });
    }
  };

  const toggleCameraFacingMode = () => {
    if (!isMobileDevice) {
      return;
    }

    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    setCameraRequested(true);
  };

  const handleSave = async () => {
    let companyCode = String(localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCode)) companyCode = companyCode.padStart(2, "0");
    const employeeCode = normalizeEmpCode(empCode);

    if (!employeeValidated || !companyCode.trim() || !selectedFile) {
      setPageMessage("Please search for a valid employee, ensure you are logged in, and select an image file.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("empcode", employeeCode);
      formData.append("companycode", companyCode.trim());
      formData.append("imagename", imageName.trim() || "");
      formData.append("description", description.trim());
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/emp-image`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      });

      const result = await parseJsonResponse(response);
      if (response.ok) {
        setStatusMessage("Employee image saved successfully.");
        setExistingImage(result?.imageBase64 || "");
        setImageName(result?.imagename || imageName.trim() || "");
        setSelectedFile(null);
        setSelectedPreview("");
      } else {
        setPageMessage("Save failed: " + (result?.message || "Unknown error"));
        setPageSeverity("error");
      }
    } catch (err) {
      console.error("Save image error:", err);
      setPageMessage("Error saving employee image.");
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
              <Typography variant="h5" fontWeight={800}>Employee Image</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Upload and manage employee profile images</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="Photos" sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
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
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setEmpCode(nextValue);
                    if (!nextValue.trim()) {
                      setEmployeeValidated(false);
                      setEmployeeName("");
                      setSelectedFile(null);
                      setSelectedPreview("");
                      setExistingImage("");
                      setImageName("");
                      setDescription("");
                      setStatusMessage("Search for an employee code to load the saved image.");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchEmployeeImage();
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
              <Button variant="contained" onClick={fetchEmployeeImage} disabled={loading || !empCode.trim()}>
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
                Please enter an employee code and click "Search" above to validate the employee. Once found, camera and save options will be enabled.
              </Typography>
            </Box>
          ) : (
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: "#1e293b", textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                    ✓ Employee Verified
                  </Typography>
                  <TextField
                    fullWidth
                    label="Image Name"
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                    placeholder="Optional image label"
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    multiline
                    minRows={3}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button variant="outlined" fullWidth startIcon={<PhotoCamera />} disabled={loading} sx={{ py: 1.5 }} onClick={openCamera}>
                      {cameraRequested ? "Camera Ready" : "Open Camera"}
                    </Button>
                    <Button variant="outlined" fullWidth startIcon={<PhotoCamera />} disabled={loading || !cameraRequested} sx={{ py: 1.5 }} onClick={captureSelfie}>
                      Capture Image
                    </Button>
                    {isMobileDevice ? (
                      <Button variant="outlined" fullWidth startIcon={<PhotoCamera />} disabled={loading} sx={{ py: 1.5 }} onClick={toggleCameraFacingMode}>
                        {cameraFacingMode === "user" ? "Switch to Back" : "Switch to Front"}
                      </Button>
                    ) : null}
                    <Button variant="outlined" component="label" fullWidth startIcon={<CloudUpload />} disabled={loading} sx={{ py: 1.5 }}>
                      Upload Image
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelection}
                      />
                    </Button>
                  </Stack>
                  {selectedFile && (
                    <Typography variant="body2" color="success.main" sx={{ display: "flex", alignItems: "center" }}>
                      ✓ Selected: {selectedFile.name}
                    </Typography>
                  )}
                  <Button variant="contained" onClick={handleSave} disabled={loading || !selectedFile} startIcon={<SaveAlt />} sx={{ py: 1.5, fontWeight: 600 }}>
                    Save Employee Image
                  </Button>
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 3,
                  minHeight: 320,
                  width: "100%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "#f8fbff",
                  border: "1px dashed #bfd3ff",
                }}
              >
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Employee preview"
                    style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 12, objectFit: "contain" }}
                  />
                ) : (
                  <Box sx={{ display: "grid", gap: 1, width: "100%" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: "100%", maxHeight: 320, borderRadius: 12, backgroundColor: "#000", transform: cameraFacingMode === "user" || !isMobileDevice ? "scaleX(-1)" : "none" }}
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      {cameraAvailable ? "Camera ready. Capture an image to preview it here." : "Camera is not available on this device."}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Divider />

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Stored employee profile photo will be associated with the entered employee code and the active company code.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
