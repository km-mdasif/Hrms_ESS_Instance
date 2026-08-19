import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  LocationOn,
  PhotoCamera,
  UploadFile,
  EventAvailable,
  Map,
  AccountCircle,
  NoteAlt,
  Divider as DividerIcon,
} from "@mui/icons-material";
import { API_BASE_URL } from "../config";
import EmployeeService from "../services/api/employeeService";

const initialForm = {
  employeeCode: "",
  employeeName: "",
  natureOfWork: "",
  visitDateTime: new Date().toISOString().slice(0, 16),
  visitType: "checkin",
  remarks: "",
  clientName: "",
  latitude: "",
  longitude: "",
};

const defaultVisitTypes = ["checkin", "checkout"];

export default function FieldExecutive({ username, userType = "employee" }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [geofenceList, setGeofenceList] = useState([]);
  const [fieldExecutiveList, setFieldExecutiveList] = useState([]);
  const [selectedGeoFence, setSelectedGeoFence] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState("employee");
  const [cameraFacingMode, setCameraFacingMode] = useState("user");
  const [employeeSelfie, setEmployeeSelfie] = useState("");
  const [clientSelfie, setClientSelfie] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState("");
  const [employeeCodeFromStorage, setEmployeeCodeFromStorage] = useState("");
  const [employeeList, setEmployeeList] = useState([]);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [recentFieldExecutive, setRecentFieldExecutive] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const adminView = String(userType || "").trim().toLowerCase() === "admin";

  useEffect(() => {
    const code = localStorage.getItem("attendanceEmpCode") || username || "";
    const storedName = localStorage.getItem("attendanceEmpName") || "";
    setEmployeeCodeFromStorage(code);
    setForm((prev) => ({
      ...prev,
      employeeCode: adminView ? prev.employeeCode || "" : code,
      employeeName: adminView ? prev.employeeName || "" : storedName || username || prev.employeeName || "",
    }));
    setIsMobileDevice(Boolean(window?.navigator?.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(window?.navigator?.userAgent || "")));
    fetchFieldExecutiveData();
    fetchGeofenceList();
    if (adminView) {
      fetchEmployeeList();
    }
  }, [username, adminView]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (statusMessage.trim()) {
      setMessageDialogOpen(true);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (!adminView) {
      const currentEmployeeCode = form.employeeCode || employeeCodeFromStorage || username || "";
      if (currentEmployeeCode) {
        fetchRecentFieldExecutiveHistory(currentEmployeeCode);
      } else {
        setRecentFieldExecutive([]);
      }
    } else {
      setRecentFieldExecutive([]);
    }
  }, [adminView, form.employeeCode, employeeCodeFromStorage, username]);

  const handleCloseMessageDialog = () => {
    setMessageDialogOpen(false);
    setStatusMessage("");
    setSeverity("info");
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || "";
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    };
  };

  const fetchEmployeeList = async () => {
    try {
      const list = await EmployeeService.getEmployees();
      setEmployeeList(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Employee list fetch failed:", error);
      setEmployeeList([]);
    }
  };

  const fetchFieldExecutiveData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/field-executive/list`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to load field executive records");
      }
      const data = await response.json();
      const list = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setFieldExecutiveList(list);
    } catch (error) {
      console.error("Field executive fetch failed:", error);
      setFieldExecutiveList([]);
    }
  };

  const fetchGeofenceList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance-geofence/list`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to load geofence list");
      }
      const data = await response.json();
      const list = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setGeofenceList(list);
    } catch (error) {
      console.error("Geofence fetch failed:", error);
      setGeofenceList([]);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const fetchEmployeeNameByCode = async (employeeCode) => {
    const code = String(employeeCode || "").trim();
    if (!code) {
      setForm((prev) => ({ ...prev, employeeName: "" }));
      return;
    }

    try {
      const employee = await EmployeeService.getEmployeeByCode(code);
      const employeeName = employee?.empname || employee?.EmpName || employee?.employeeName || employee?.name || "";
      setForm((prev) => ({
        ...prev,
        employeeName: employeeName || prev.employeeName || "",
      }));
    } catch (error) {
      console.error("Fetch employee name failed:", error);
      setForm((prev) => ({ ...prev, employeeName: prev.employeeName || "" }));
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "employeeCode" && value.trim() === "") {
      setForm((prev) => ({ ...prev, employeeName: "" }));
    }
  };

  const toggleCameraFacingMode = () => {
    if (!isMobileDevice) {
      return;
    }

    setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const openCamera = async (mode) => {
    setCameraMode(mode);
    setCameraOpen(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSeverity("error");
      setStatusMessage("Camera access is not available in this browser.");
      return;
    }

    try {
      const preferredFacingMode = mode === "employee" ? "user" : (isMobileDevice ? cameraFacingMode : "user");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera open failed:", error);
      setSeverity("error");
      setStatusMessage("Unable to access the camera. Please allow camera permission.");
      setCameraOpen(false);
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const shouldMirror = isMobileDevice ? cameraFacingMode === "user" : true;
    context.save();
    if (shouldMirror) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    const imageData = canvas.toDataURL("image/jpeg");

    if (cameraMode === "employee") {
      setEmployeeSelfie(imageData);
    } else {
      setClientSelfie(imageData);
    }

    stopCamera();
    setCameraOpen(false);
    setSeverity("success");
    setStatusMessage("Selfie captured successfully.");
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setDocumentFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setDocumentPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setDocumentPreview("");
    }
  };

  const dataUrlToBlob = (dataUrl, filename = "image.jpg") => {
    if (!dataUrl) return null;
    try {
      const parts = dataUrl.split(",");
      const header = parts[0];
      const base64 = parts[1];
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return new File([bytes], filename, { type: mimeType });
    } catch (error) {
      console.error("Failed to convert data URL to blob:", error);
      return null;
    }
  };

  const submitFieldVisit = async () => {
    if (!form.employeeCode || !form.natureOfWork || !form.clientName) {
      setSeverity("error");
      setStatusMessage("Employee code, nature of work, and client name are required.");
      return;
    }

    if (!employeeSelfie || !clientSelfie) {
      setSeverity("error");
      setStatusMessage("Both employee and client selfies are required.");
      return;
    }

    if (!form.latitude || !form.longitude) {
      setSeverity("error");
      setStatusMessage("Location coordinates are required. Please choose a geofence or allow location access.");
      return;
    }

    setLoading(true);
    try {
      const employeeSelfieBlob = dataUrlToBlob(employeeSelfie, "employee-selfie.jpg");
      const clientSelfieBlob = dataUrlToBlob(clientSelfie, "client-selfie.jpg");

      if (!employeeSelfieBlob || !clientSelfieBlob) {
        throw new Error("Failed to process selfie images. Please try capturing them again.");
      }

      const body = new FormData();
      body.append("employeeCode", form.employeeCode);
      body.append("employeeName", form.employeeName || username || "");
      body.append("natureOfWork", form.natureOfWork);
      body.append("visitDateTime", form.visitDateTime || new Date().toISOString().slice(0, 16));
      body.append("visitType", form.visitType);
      body.append("clientName", form.clientName);
      body.append("latitude", String(form.latitude));
      body.append("longitude", String(form.longitude));
      body.append("remarks", form.remarks || "");
      body.append("employeeSelfie", employeeSelfieBlob);
      body.append("clientSelfie", clientSelfieBlob);
      if (documentFile) body.append("document", documentFile);

      const response = await fetch(`${API_BASE_URL}/field-executive/onsite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const backendMessage = data?.error || data?.message || "Unable to save onsite field visit";
        throw new Error(backendMessage);
      }

      setSeverity("success");
      setStatusMessage(data?.message || "Field executive onsite entry saved successfully.");
      setForm({
        ...initialForm,
        employeeCode: form.employeeCode,
        employeeName: form.employeeName || username || "",
        visitDateTime: new Date().toISOString().slice(0, 16),
      });
      setSelectedGeoFence("");
      setDocumentFile(null);
      setDocumentPreview("");
      setEmployeeSelfie("");
      setClientSelfie("");
      fetchFieldExecutiveData();
    } catch (error) {
      const message = error?.message || "Unable to save field executive record.";
      setSeverity("error");
      setStatusMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSeverity("error");
      setStatusMessage("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationAccuracy(position.coords.accuracy);
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setSeverity("success");
        setStatusMessage(
          `Location captured: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)} (Accuracy: ${Math.round(position.coords.accuracy)}m)`
        );
      },
      (error) => {
        setSeverity("error");
        const message = error?.code === 1
          ? "Location permission denied. Please allow location access to continue."
          : error?.code === 2
            ? "Location unavailable. Please try again."
            : error?.code === 3
              ? "Location timeout. Please try again."
              : "Location fetch failed. Please try again.";
        setStatusMessage(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!adminView || !form.employeeCode) {
      return;
    }

    const selectedEmployee = employeeList.find(
      (employee) => (employee.empcode || employee.empCode || employee.employeeCode || "") === form.employeeCode
    );

    if (selectedEmployee && !form.employeeName) {
      setForm((prev) => ({
        ...prev,
          employeeName: selectedEmployee.empname || selectedEmployee.EmpName || selectedEmployee.employeeName || selectedEmployee.name || prev.employeeName || "",
      }));
    }
  }, [adminView, employeeList, form.employeeCode, form.employeeName]);

  const fetchRecentFieldExecutiveHistory = async (employeeCode) => {
    const code = String(employeeCode || "").trim();
    if (!code) {
      setRecentFieldExecutive([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/field-executive/employee/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setRecentFieldExecutive([]);
        return;
      }

      const data = await response.json();
      const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      const sortedRecords = [...records].sort((a, b) => {
        const timeA = new Date(a?.visitDateTime || a?.createdAt || a?.created_at || 0).getTime();
        const timeB = new Date(b?.visitDateTime || b?.createdAt || b?.created_at || 0).getTime();
        return timeB - timeA;
      });
      setRecentFieldExecutive(sortedRecords.slice(0, 5));
    } catch (err) {
      console.error("Fetch recent field executive history failed:", err);
      setRecentFieldExecutive([]);
    }
  };

  const formatFieldExecutiveTime = (record) => {
    const rawValue = record?.visitDateTime || record?.createdAt || record?.created_at;
    if (!rawValue) return "Unknown time";

    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) return String(rawValue);

    const day = String(parsedDate.getDate()).padStart(2, "0");
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const year = parsedDate.getFullYear();
    const hours = String(parsedDate.getHours()).padStart(2, "0");
    const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Field Executive Onsite</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Geofence check-in and attendance with selfie, document, and client visit details
              </Typography>
            </Box>
            <Chip label={adminView ? "Admin / Manager" : "Employee / Field Ops"} sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
          </Stack>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Alert severity={severity} sx={{ mb: 3, borderRadius: 2 }}>
            {statusMessage || "Mark field visit with location, selfies and client details."}
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", background: "#f8fffe", height: "100%" }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <PhotoCamera color="success" />
                      <Typography variant="h6" fontWeight={800}>Selfies</Typography>
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                      <Button variant="contained" color="success" startIcon={<PhotoCamera />} onClick={() => openCamera("employee")} fullWidth>
                        Employee Selfie
                      </Button>
                      <Button variant="contained" color="success" startIcon={<PhotoCamera />} onClick={() => openCamera("client")} fullWidth>
                        Client Selfie
                      </Button>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1.5 }}>
                      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.5, minHeight: 140, background: "#f8fafc" }}>
                        {employeeSelfie ? (
                          <img src={employeeSelfie} alt="Employee selfie" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }} />
                        ) : (
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#64748b" }}>
                            Employee preview
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.5, minHeight: 140, background: "#f8fafc" }}>
                        {clientSelfie ? (
                          <img src={clientSelfie} alt="Client selfie" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }} />
                        ) : (
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#64748b" }}>
                            Client preview
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {cameraMode === "client" && isMobileDevice && (
                      <Button variant="outlined" startIcon={<PhotoCamera />} onClick={toggleCameraFacingMode} fullWidth sx={{ mt: 1.5 }}>
                        {cameraFacingMode === "user" ? "Switch to Back Camera" : "Switch to Front Camera"}
                      </Button>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <UploadFile color="success" />
                      <Typography variant="h6" fontWeight={800}>Document</Typography>
                    </Stack>
                    <Button component="label" variant="outlined" startIcon={<UploadFile />} fullWidth>
                      Upload Client Document
                      <input type="file" hidden onChange={handleDocumentChange} />
                    </Button>
                    {documentPreview && (
                      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.5, mt: 1.5 }}>
                        <img src={documentPreview} alt="Client document" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }} />
                      </Box>
                    )}
                    {documentFile && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Selected: {documentFile.name}</Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", background: "#ffffff", height: "100%" }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                  <EventAvailable color="success" />
                  <Typography variant="h6" fontWeight={800}>Visit Details</Typography>
                </Stack>

                <Stack spacing={2.2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      {adminView ? (
                        <TextField
                          label="Employee Code"
                          name="employeeCode"
                          value={form.employeeCode || ""}
                          onChange={handleInputChange}
                          onBlur={() => fetchEmployeeNameByCode(form.employeeCode)}
                          fullWidth
                          placeholder="Search employee code"
                          size="small"
                        />
                      ) : (
                        <TextField
                          label="Employee Code"
                          name="employeeCode"
                          value={form.employeeCode || employeeCodeFromStorage || ""}
                          fullWidth
                          disabled
                          InputProps={{ readOnly: true }}
                          size="small"
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Employee Name"
                        name="employeeName"
                        value={form.employeeName || ""}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>

                  <Divider />

                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <LocationOn color="success" />
                      <Typography variant="subtitle1" fontWeight={700}>Geofence Location</Typography>
                    </Stack>
                    <Stack spacing={1.5}>
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<LocationOn />}
                        onClick={fetchCurrentLocation}
                        fullWidth
                        size="small"
                      >
                        Fetch My Location
                      </Button>

                      {form.latitude && form.longitude && (
                        <Box sx={{ border: "1px solid #bbf7d0", borderRadius: 2, background: "#ecfdf5", p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Latitude: {form.latitude}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">Longitude: {form.longitude}</Typography>
                          {locationAccuracy != null && (
                            <Typography variant="caption" color="text.secondary">Accuracy: {Math.round(locationAccuracy)}m</Typography>
                          )}
                        </Box>
                      )}

                      {geofenceList.length > 0 && (
                        <Box sx={{ border: "1px solid #dbeafe", borderRadius: 2, background: "#eff6ff", p: 1.5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ mb: 0.8, display: "block" }}>Available Geofence Zones</Typography>
                          <Stack spacing={1}>
                            {geofenceList.slice(0, 2).map((item) => (
                              <Box key={item.id || item.geofenceId || item.name} sx={{ p: 1, borderRadius: 1.5, border: "1px solid #bfdbfe", background: "#ffffff" }}>
                                <Typography fontWeight={600} variant="caption" display="block">{item.name || item.geofenceName || item.locationName || "Geofence"}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">{item.address || item.location || item.description || "No address"}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Box>

                  <Divider />

                  <TextField
                    label="Visit Date & Time"
                    name="visitDateTime"
                    type="datetime-local"
                    value={form.visitDateTime}
                    onChange={handleInputChange}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="Nature of Work"
                    name="natureOfWork"
                    value={form.natureOfWork}
                    onChange={handleInputChange}
                    fullWidth
                    placeholder="Example: client demo, sales meeting, product installation"
                    size="small"
                  />

                  <TextField
                    label="Client Name / Office"
                    name="clientName"
                    value={form.clientName}
                    onChange={handleInputChange}
                    fullWidth
                    size="small"
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Visit Type</InputLabel>
                    <Select
                      name="visitType"
                      value={form.visitType}
                      label="Visit Type"
                      onChange={handleInputChange}
                    >
                      {defaultVisitTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type === "checkin" ? "Check In" : "Check Out"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Remarks"
                    name="remarks"
                    value={form.remarks}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Add onsite remarks, issues, progress, or client feedback"
                    size="small"
                  />

                  <Button
                    variant="contained"
                    color="success"
                    onClick={submitFieldVisit}
                    disabled={loading}
                    sx={{ py: 1.5, fontWeight: 700 }}
                  >
                    {loading ? "Saving Onsite Visit..." : "Save Field Executive Visit"}
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!adminView && (
        <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Last 5 Operations</Typography>
                <Typography variant="body2" color="text.secondary">Your latest field executive entries</Typography>
              </Box>

              {recentFieldExecutive.length > 0 ? (
                <Stack spacing={1.5}>
                  {recentFieldExecutive.map((record, index) => (
                    <Box
                      key={`${record?.id || record?.fieldExecutiveId || index}`}
                      sx={{
                        borderTop: index > 0 ? "1px solid #e2e8f0" : "none",
                        pt: index > 0 ? 1.5 : 0,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {record?.clientName || "Client"} • {record?.visitType === "checkout" ? "✓ Check Out" : "↓ Check In"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Work: {record?.natureOfWork || "Not specified"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Location: {record?.latitude != null && record?.longitude != null ? `${Number(record.latitude).toFixed(4)}, ${Number(record.longitude).toFixed(4)}` : "Not captured"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Time: {formatFieldExecutiveTime(record)}
                          </Typography>
                          {record?.remarks && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: "italic" }}>
                              Remarks: {record.remarks}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No recent operations found.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={messageDialogOpen} onClose={handleCloseMessageDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, background: severity === "success" ? "#d1fae5" : severity === "error" ? "#fee2e2" : "#e0f2fe" }}>
          {severity === "success" ? "✓ Success" : severity === "error" ? "✕ Error" : "ℹ Information"}
        </DialogTitle>
        <DialogContent sx={{ py: 3, minHeight: 120, display: "flex", alignItems: "center" }}>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {statusMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseMessageDialog} variant="contained" sx={{ textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cameraOpen} onClose={() => { stopCamera(); setCameraOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{cameraMode === "employee" ? "Employee Selfie" : "Client Selfie"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", minHeight: 280 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: 320,
                borderRadius: 12,
                background: "#000",
                transform: isMobileDevice && cameraFacingMode === "user" ? "scaleX(-1)" : "none",
              }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { stopCamera(); setCameraOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={captureSelfie}>Capture</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
