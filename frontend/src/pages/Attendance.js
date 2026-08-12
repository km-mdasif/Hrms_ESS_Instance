import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { PhotoCamera, LocationOn, SaveAlt, Refresh } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

export default function Attendance({ onLogout }) {
  const [empCode, setEmpCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("attendanceEmpCode") || "";
    }
    return "";
  });
  const [employeeName, setEmployeeName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("attendanceEmpName") || "";
    }
    return "";
  });
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Mark attendance with location & selfie (Multiple entries allowed for field visits)");
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [locationSupported, setLocationSupported] = useState(true);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("info");
  const [secureContext, setSecureContext] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const normalizeEmpCode = (value) => String(value || "").trim();
  const isEmployeeAttendanceLogin = Boolean(normalizeEmpCode(typeof window !== "undefined" ? localStorage.getItem("attendanceEmpCode") || "" : ""));

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

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
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

  const parseAttendanceDateValue = (value) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string") {
      const trimmed = String(value).trim();
      if (!trimmed) {
        return null;
      }

      const normalized = trimmed.replace(/\s+/, "T");
      const parsedDate = new Date(normalized);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }

      const dateMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{1,2}):(\d{1,2})/);
      if (dateMatch) {
        const [, year, month, day, hour, minute, second] = dateMatch;
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      }

      const sqlDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
      if (sqlDateMatch) {
        const [, year, month, day, hour, minute, second] = sqlDateMatch;
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      }
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const formatAttendanceTime = (record) => {
    const rawValue = record?.attendancedate || record?.servertime || record?.timestamp || record?.created_at || record?.createdAt || record?.datetime || record?.createdon;
    if (!rawValue) {
      return "Unknown time";
    }

    const parsedDate = parseAttendanceDateValue(rawValue);
    if (!parsedDate) {
      return String(rawValue);
    }

    const day = String(parsedDate.getDate()).padStart(2, "0");
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const year = parsedDate.getFullYear();
    const hours = String(parsedDate.getHours()).padStart(2, "0");
    const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
    const seconds = String(parsedDate.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const fetchRecentAttendanceHistory = async (employeeCode) => {
    const code = normalizeEmpCode(employeeCode);
    if (!code) {
      setRecentAttendance([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance-history/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setRecentAttendance([]);
        return;
      }

      const data = await parseJsonResponse(response);
      const records = Array.isArray(data?.records) ? data.records : [];
      const sortedRecords = [...records].sort((a, b) => {
        const timeA = parseAttendanceDateValue(a?.attendancedate || a?.servertime || a?.timestamp || a?.created_at || a?.createdAt || a?.datetime || a?.createdon || 0);
        const timeB = parseAttendanceDateValue(b?.attendancedate || b?.servertime || b?.timestamp || b?.created_at || b?.createdAt || b?.datetime || b?.createdon || 0);
        const valueA = timeA ? timeA.getTime() : 0;
        const valueB = timeB ? timeB.getTime() : 0;
        return valueB - valueA;
      });
      setRecentAttendance(sortedRecords.slice(0, 5));
    } catch (err) {
      console.error("Fetch recent attendance failed:", err);
      setRecentAttendance([]);
    }
  };

  const fetchEmployeeName = async (employeeCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(employeeCode)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setEmployeeName("");
        if (typeof window !== "undefined") {
          localStorage.removeItem("attendanceEmpName");
        }
        return;
      }
      const data = await parseJsonResponse(response);
      const newName = data?.empname || data?.username || employeeCode || "";
      setEmployeeName(newName);
      if (typeof window !== "undefined") {
        if (newName) {
          localStorage.setItem("attendanceEmpName", newName);
        } else {
          localStorage.removeItem("attendanceEmpName");
        }
      }
    } catch (err) {
      console.error("Fetch employee name failed:", err);
      setEmployeeName("");
      if (typeof window !== "undefined") {
        localStorage.removeItem("attendanceEmpName");
      }
    }
  };

  // Get user's geolocation
  const fetchLocation = async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        setUserMessage("Geolocation is not supported by your browser.");
        setMessageSeverity("error");
        setLocationSupported(false);
        setStatusMessage("Geolocation not supported.");
        setLoading(false);
        return;
      }

      const isSecure = typeof window !== "undefined" ? window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" : true;
      setSecureContext(isSecure);

      if (!isSecure) {
        setUserMessage("Location access requires a secure context (HTTPS or localhost). Please open the app over HTTPS or use localhost.");
        setMessageSeverity("error");
        setStatusMessage("Secure context required for location access.");
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setAccuracy(position.coords.accuracy);
          setStatusMessage(
            `📍 Location captured: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)} (Accuracy: ${Math.round(position.coords.accuracy)}m)`
          );
          setLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          const errorMessages = {
            1: "Permission denied. Please allow location permission.",
            2: "Position unavailable. Check your device location settings.",
            3: "Timeout while fetching location. Try again.",
          };
          const friendlyMessage = isIOSBrowser()
            ? `${errorMessages[error.code] || error.message} On iPhone/iPad, tap Allow when prompted and make sure Location Services are enabled in Settings.`
            : `${errorMessages[error.code] || error.message}`;
          setUserMessage(friendlyMessage);
          setMessageSeverity("error");
          setStatusMessage(`Location fetch failed: ${friendlyMessage}`);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (err) {
      console.error("Location error:", err);
      setStatusMessage("Failed to fetch location");
      setLoading(false);
    }
  };

  // Check attendance count for today (informational only - allow multiple)
  const checkAttendanceStatus = async () => {
    try {
      const empCodeVal = normalizeEmpCode(empCode);
      if (!empCodeVal) {
        setUserMessage("Please enter employee code.");
        setMessageSeverity("error");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/attendance-count/${encodeURIComponent(empCodeVal)}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await parseJsonResponse(response);
        setAttendanceCount(data?.attendance_count || 0);
        if (data?.already_marked) {
          setStatusMessage(`✅ Attendance marked ${data.attendance_count} time(s) today (Multiple entries allowed for field visits)`);
        } else {
          setStatusMessage("Ready to mark first attendance of the day");
        }
        await fetchEmployeeName(empCodeVal);
        await fetchRecentAttendanceHistory(empCodeVal);
      }
    } catch (err) {
      console.error("Check attendance error:", err);
    }
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

  // Capture selfie from camera
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      setStatusMessage("Camera access is not supported by this browser. Please use a device with camera access.");
      return;
    }

    stopCameraStream();

    try {
      const primaryConstraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const fallbackConstraints = {
        video: { facingMode: "user" },
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
      setUserMessage(friendlyMessage);
      setMessageSeverity("error");
      setStatusMessage(friendlyMessage);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      context.save();
      context.translate(canvasRef.current.width, 0);
      context.scale(-1, 1);
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      context.restore();

      // Prefer toBlob; if unavailable, fall back to dataURL conversion
      canvasRef.current.toBlob((blob) => {
        let filePromise;
        if (blob) {
          const file = new File([blob], "selfie.png", { type: "image/png" });
          filePromise = Promise.resolve(file);
        } else {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          const fallbackBlob = dataURLtoBlob(dataUrl);
          const file = new File([fallbackBlob], "selfie.png", { type: "image/png" });
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

  const handleSaveAttendance = async () => {
    let companyCode = String(localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCode)) companyCode = companyCode.padStart(2, "0");
    const employeeCode = normalizeEmpCode(empCode);

    if (!employeeCode || !companyCode.trim()) {
      setUserMessage("Please login first.");
      setMessageSeverity("error");
      return;
    }

    if (!latitude || !longitude) {
      setUserMessage("Please fetch location first.");
      setMessageSeverity("error");
      return;
    }

    if (!selectedFile) {
      setUserMessage("Please capture selfie first.");
      setMessageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("empcode", employeeCode);
      formData.append("companycode", companyCode.trim());
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      formData.append("status", "Present");
      formData.append("remarks", `Marked from location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      formData.append("accuracy", accuracy != null ? String(accuracy) : "");
      formData.append("selfie", selectedFile);

      const response = await fetch(`${API_BASE_URL}/attendance-geofence`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      });

      const result = await parseJsonResponse(response);
      if (response.ok) {
        const nextCount = attendanceCount + 1;
        setAttendanceCount(nextCount);
        setStatusMessage(`✅ Attendance marked successfully at ${new Date().toLocaleTimeString()} (Total: ${nextCount} entry for today)`);
        setMessageSeverity("success");
        setUserMessage("Attendance marked successfully. Camera reopened for the next entry.");
        setAttendanceMarked(true);
        setSelectedFile(null);
        setSelectedPreview("");
        setLatitude(null);
        setLongitude(null);
        setAccuracy(null);
        setCameraRequested(false);
        setTimeout(() => {
          setCameraRequested(true);
          checkAttendanceStatus();
          fetchRecentAttendanceHistory(employeeCode);
        }, 400);
      } else {
        setUserMessage("Save failed: " + (result?.message || "Unknown error"));
        setMessageSeverity("error");
      }
    } catch (err) {
      console.error("Save attendance error:", err);
      setUserMessage("Error saving attendance.");
      setMessageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMobileDevice(isMobileBrowser());
    setSecureContext(typeof window !== "undefined" ? window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" : true);
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!cameraRequested || selectedPreview) {
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      setCameraAvailable(false);
      setStatusMessage("Camera access is not supported by this browser. Please use a device with camera access.");
    }
  }, [cameraRequested, selectedPreview]);

  useEffect(() => {
    const code = normalizeEmpCode(empCode);
    if (!code) {
      setRecentAttendance([]);
      return;
    }

    if (!employeeName) {
      fetchEmployeeName(code);
    }

    fetchRecentAttendanceHistory(code);
  }, [empCode, employeeName]);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography variant="h6" fontWeight={700}>
           Divine HRMS Attendance
        </Typography>
        {onLogout ? (
          <Button variant="outlined" color="secondary" startIcon={<Logout />} onClick={onLogout}>
            Logout
          </Button>
        ) : null}
      </Stack>

      {/* Employee Code & Location Section */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
              🎯 Mark Attendance with Geofence & Selfie
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {isEmployeeAttendanceLogin ? (
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      Employee Code
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {empCode || "Not available"}
                    </Typography>
                  </Paper>
                ) : (
                  <TextField
                    fullWidth
                    label="Employee Code"
                    value={empCode}
                    onChange={(e) => {
                      setEmpCode(e.target.value);
                      if (!e.target.value.trim()) {
                        setEmployeeName("");
                      }
                    }}
                    onBlur={() => {
                      const code = normalizeEmpCode(empCode);
                      if (code) fetchEmployeeName(code);
                    }}
                    placeholder="Enter employee code"
                    size="small"
                  />
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  value={employeeName}
                  disabled
                  placeholder="Employee name will appear here"
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={checkAttendanceStatus}
                  disabled={loading || !empCode.trim()}
                  fullWidth
                >
                  Check Status
                </Button>
              </Grid>
            </Grid>

            <Chip
              label={statusMessage}
              color={statusMessage.includes("✅") ? "success" : "primary"}
              variant="outlined"
            />

            {attendanceCount > 0 && (
              <Alert severity="info">
                ✅ You have marked attendance {attendanceCount} time(s) today. Multiple entries allowed for field work.
              </Alert>
            )}

            <Button
              variant="outlined"
              startIcon={<LocationOn />}
              onClick={fetchLocation}
              disabled={loading}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : "📍 Fetch My Location"}
            </Button>

            {latitude && longitude && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "#f0f9ff",
                  border: "1px solid #0ea5e9",
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  📍 Location Captured
                </Typography>
                <Typography variant="caption">
                  Latitude: {latitude.toFixed(6)}
                </Typography>
                <br />
                <Typography variant="caption">
                  Longitude: {longitude.toFixed(6)}
                </Typography>
                <br />
                <Typography variant="caption">
                  Accuracy: {accuracy ? Math.round(accuracy) + "m" : "N/A"}
                </Typography>
              </Paper>
            )}

            {accuracy != null && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  📏 Accuracy Meter
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current location accuracy: {Math.round(accuracy)}m
                </Typography>
              </Paper>
            )}

          </Stack>
        </CardContent>
      </Card>

      {/* Selfie Capture Section */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
              📷 Capture Selfie
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    width: "100%",
                    height: 300,
                    bgcolor: "#000",
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedPreview ? (
                    <img
                      src={selectedPreview}
                      alt="Selfie preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : cameraAvailable ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                      }}
                    />
                  ) : (
                    <Box sx={{ color: "#cbd5e1", textAlign: "center", px: 2 }}>
                      Camera unavailable.
                      <br />
                      Please use a device with camera access.
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={2} sx={{ height: "100%" }}>
                  {!selectedPreview ? (
                    <Stack spacing={1.5}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        onClick={openCamera}
                        fullWidth
                        sx={{ py: 1.75 }}
                      >
                        {cameraRequested ? "Camera Ready" : "📹 Open Camera"}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<PhotoCamera />}
                        onClick={captureSelfie}
                        fullWidth
                        disabled={!cameraRequested || loading}
                        sx={{ py: 2 }}
                      >
                        📸 Capture Selfie
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Typography variant="body2" color="success.main">
                        ✅ Selfie captured successfully
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => {
                          setSelectedFile(null);
                          setSelectedPreview("");
                          setCameraRequested(false);
                          openCamera();
                        }}
                        fullWidth
                      >
                        Retake Selfie
                      </Button>
                    </>
                  )}

                  {!secureContext && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Location and camera access work best over HTTPS or localhost. If you are testing on mobile, open the app with a secure URL.
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<SaveAlt />}
                    onClick={handleSaveAttendance}
                    disabled={loading || !selectedFile || !latitude || !longitude}
                    fullWidth
                    sx={{ py: 2, fontWeight: 600 }}
                  >
                    {loading ? "Saving..." : "✅ Mark Attendance"}
                  </Button>

                  {attendanceMarked && (
                    <Alert severity="success">
                      Attendance marked successfully at {new Date().toLocaleTimeString()}
                    </Alert>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Info Section */}
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
              ℹ️ Attendance Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ✓ Location captured with GPS coordinates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ✓ Selfie captured as image (no facial recognition)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ✓ Multiple entries allowed per day for field visits
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ✓ Server time recorded: {new Date().toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ✓ Track employee location and activity throughout the day
            </Typography>

            {recentAttendance.length > 0 && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  🕒 Last 5 Attendance Operations
                </Typography>
                <Stack spacing={1}>
                  {recentAttendance.map((record, index) => (
                    <Box key={`${record?.attendanceid || record?.id || index}`} sx={{ borderTop: index > 0 ? "1px solid #e2e8f0" : "none", pt: index > 0 ? 1 : 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {record?.latitude != null && record?.longitude != null ? `Location: ${Number(record.latitude).toFixed(4)}, ${Number(record.longitude).toFixed(4)}` : "Location captured"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Date & Time: {formatAttendanceTime(record)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
