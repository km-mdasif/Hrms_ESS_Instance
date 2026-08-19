import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  BarChart,
  EventAvailable,
  FilterAlt,
  Person,
  Search,
  Visibility,
  Map,
  PhotoCamera,
} from "@mui/icons-material";
import { API_BASE_URL } from "../config";

const reportTitles = {
  attendance: "Attendance Geo Fence List",
  fieldExecutive: "Field Executive",
  interview: "Interview",
  visitor: "Visitor",
  leave: "Leave Entries",
};

const formatDateValue = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const formatDateTimeValue = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const toDateOnly = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const matchesDateRange = (value, fromDate, toDate) => {
  if (!fromDate && !toDate) return true;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return true;

  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const end = toDate ? new Date(`${toDate}T23:59:59`) : null;

  if (start && target < start) return false;
  if (end && target > end) return false;
  return true;
};

const getFieldDate = (item) => item?.visitdatetime || item?.visitDateTime || item?.visitDate || item?.createdAt || item?.created_at || item?.date || "";

const getGoogleMapUrl = (item) => {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

const getEmployeeImage = (item) => {
  const image = item?.employeeselfie_base64 || item?.employeeSelfieBase64 || item?.employeeSelfie || "";
  if (!image) return "";
  return String(image).startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
};

export default function ReportsScreen({ type = "attendance" }) {
  const [records, setRecords] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const normalizeRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.records)) return payload.records;
    return [];
  };

  const fetchAttendance = async () => {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load attendance geofence entries");
    const data = await response.json();
    const list = normalizeRows(data);
    setRecords(list);

    const employeeCodes = [...new Set(list.map((item) => item?.empcode || item?.empCode).filter(Boolean))];
    const nameEntries = await Promise.all(employeeCodes.map(async (code) => {
      try {
        const employeeResponse = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(code)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!employeeResponse.ok) return [code, ""];
        const employeePayload = await employeeResponse.json();
        const employee = employeePayload?.data || employeePayload;
        return [code, employee?.empname || employee?.EmpName || employee?.employeeName || employee?.name || ""];
      } catch (error) {
        return [code, ""];
      }
    }));
    setEmployeeNames(Object.fromEntries(nameEntries));
  };

  const fetchFieldExecutive = async () => {
    const response = await fetch(`${API_BASE_URL}/field-executive/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load field executive entries");
    const data = await response.json();
    const list = normalizeRows(data);
    setRecords(list);
  };

  const fetchInterviews = async () => {
    const response = await fetch(`${API_BASE_URL}/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load interview entries");
    const data = await response.json();
    setRecords(normalizeRows(data));
  };

  const fetchVisitors = async () => {
    const response = await fetch(`${API_BASE_URL}/visitors`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load visitor entries");
    const data = await response.json();
    const rows = normalizeRows(data);
    setRecords(rows);
  };

  const fetchLeaveEntries = async () => {
    const response = await fetch(`${API_BASE_URL}/leave-entries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to load leave entries");
    const data = await response.json();
    setRecords(normalizeRows(data));
  };

  const loadData = async () => {
    if (!token) {
      setRecords([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      switch (type) {
        case "fieldExecutive":
          await fetchFieldExecutive();
          break;
        case "interview":
          await fetchInterviews();
          break;
        case "visitor":
          await fetchVisitors();
          break;
        case "leave":
          await fetchLeaveEntries();
          break;
        case "attendance":
        default:
          await fetchAttendance();
          break;
      }
    } catch (err) {
      setRecords([]);
      setError(err.message || "Unable to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getTodayDate();
    setFromDate(today);
    setToDate(today);
    loadData();
  }, [type, token]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      let dateValue = "";
      if (type === "attendance") {
        dateValue = item?.createdAt || item?.date || item?.created_at || item?.attendanceDate || item?.attendancedate || "";
      }
      if (type === "fieldExecutive") {
        dateValue = getFieldDate(item);
      }
      if (type === "interview") {
        dateValue = item?.InterviewDate || item?.interviewDate || item?.CreatedAt || item?.createdAt || "";
      }
      if (type === "visitor") {
        dateValue = item?.VisitDate || item?.visitDate || item?.createdAt || item?.CreatedAt || "";
      }
      if (type === "leave") {
        dateValue = item?.FromDate || item?.fromDate || item?.ToDate || item?.toDate || item?.createdAt || "";
      }

      const dateMatches = matchesDateRange(dateValue, fromDate, toDate);
      return dateMatches;
    });
  }, [records, fromDate, toDate, type]);

  const renderItem = (item, index) => {
    if (type === "attendance") {
      const employeeCode = item?.empcode || item?.empCode || "-";
      const selfie = item?.selfieimage_base64 || item?.selfieImageBase64 || item?.selfieBase64 || "";
      const imageUrl = selfie ? (String(selfie).startsWith("data:") ? selfie : `data:image/jpeg;base64,${selfie}`) : "";
      return (
        <Box key={`${item?.id || item?.attendanceId || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2}>
              {imageUrl ? <img src={imageUrl} alt={`Attendance ${employeeCode}`} style={{ width: "100%", height: 92, objectFit: "cover", borderRadius: 8 }} /> : <Box sx={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", borderRadius: 2 }}><PhotoCamera color="disabled" /></Box>}
            </Grid>
            <Grid item xs={12} sm={10}>
              <Typography variant="body2" fontWeight={700}>Employee Code: {employeeCode}</Typography>
              <Typography variant="body2">Employee Name: {employeeNames[employeeCode] || item?.empname || item?.empName || "-"}</Typography>
              <Typography variant="body2">Location: {item?.latitude ?? "-"}, {item?.longitude ?? "-"}</Typography>
              {getGoogleMapUrl(item) && <Button href={getGoogleMapUrl(item)} target="_blank" rel="noreferrer" size="small" startIcon={<Map />} sx={{ mt: 0.5, pl: 0 }}>Google Location • 100 m radius</Button>}
              <Typography variant="caption" color="text.secondary" display="block">Date & Time: {formatDateTimeValue(item?.createdAt || item?.date || item?.attendancedate || item?.created_at)}</Typography>
            </Grid>
          </Grid>
        </Box>
      );
    }

    if (type === "fieldExecutive") {
      const imageUrl = getEmployeeImage(item);
      const mapUrl = getGoogleMapUrl(item);
      return (
        <Box key={`${item?.VisitID || item?.visitId || item?.id || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2}>
              {imageUrl ? <img src={imageUrl} alt="Employee visit" style={{ width: "100%", height: 92, objectFit: "cover", borderRadius: 8 }} /> : <Box sx={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", borderRadius: 2 }}><PhotoCamera color="disabled" /></Box>}
            </Grid>
            <Grid item xs={12} sm={10}>
              <Typography variant="caption" color="text.secondary" display="block">Date: {formatDateValue(getFieldDate(item))}</Typography>
              <Typography variant="body2" fontWeight={700}>Employee Code: {item?.empcode || item?.empCode || item?.employeeCode || "-"}</Typography>
              <Typography variant="body2">Employee Name: {item?.empname || item?.empName || item?.employeeName || "-"}</Typography>
              <Typography variant="body2">Visit Type: {item?.visittype || item?.visitType || "-"}</Typography>
              <Typography variant="body2">Client Name: {item?.clientname || item?.clientName || "-"}</Typography>
              <Typography variant="body2">Remarks: {item?.remarks || "-"}</Typography>
              <Typography variant="body2">Latitude: {item?.latitude ?? "-"}</Typography>
              {mapUrl && <Button href={mapUrl} target="_blank" rel="noreferrer" size="small" startIcon={<Map />} sx={{ mt: 0.5, pl: 0 }}>Google Location • 100 m radius</Button>}
            </Grid>
          </Grid>
        </Box>
      );
    }

    if (type === "interview") {
      return (
        <Box key={`${item?.InterviewID || item?.id || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item?.CandidateName || item?.candidateName || "Candidate"}</Typography>
          <Typography variant="body2" color="text.secondary">Interview Code: {item?.InterviewCode || item?.interviewCode || "-"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Status: {item?.InterviewStatus || item?.status || "-"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Date: {formatDateValue(item?.InterviewDate || item?.interviewDate || item?.CreatedAt)}</Typography>
        </Box>
      );
    }

    if (type === "visitor") {
      return (
        <Box key={`${item?.VisitorID || item?.id || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item?.VisitorName || item?.visitorName || "Visitor"}</Typography>
          <Typography variant="body2" color="text.secondary">{item?.VisitorCompanyName || item?.visitorCompany || "Company not specified"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Contact: {item?.ContactNumber || item?.contactNumber || "-"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Visit Date: {formatDateValue(item?.VisitDate || item?.visitDate || item?.createdAt)}</Typography>
        </Box>
      );
    }

    return (
      <Box key={`${item?.LeaveLogId || item?.id || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item?.empName || item?.EmpName || item?.empCode || item?.EmployeeCode || "Employee"}</Typography>
        <Typography variant="body2" color="text.secondary">{item?.information || item?.description || "Leave information"}</Typography>
        <Typography variant="caption" color="text.secondary" display="block">From: {formatDateValue(item?.FromDate || item?.fromDate)} | To: {formatDateValue(item?.ToDate || item?.toDate)}</Typography>
        <Typography variant="caption" color="text.secondary" display="block">Status: {item?.status || item?.Status || "Pending"}</Typography>
      </Box>
    );
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>{reportTitles[type] || "Reports"}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Search and filter records by date range</Typography>
            </Box>
            <Chip label={`${filteredRecords.length} result(s)`} sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
          </Stack>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={loadData}
                startIcon={<Search />}
                fullWidth
                sx={{ height: "100%", minHeight: 40, fontWeight: 700 }}
              >
                Search by Date
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0", minHeight: 280, background: "#fbfcfd" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <Typography color="text.secondary">Loading report data...</Typography>
              </Box>
            ) : filteredRecords.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <Typography color="text.secondary">No records found for the selected date range.</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredRecords.map((item, index) => renderItem(item, index))}
              </Stack>
            )}
          </Paper>
        </CardContent>
      </Card>
    </Stack>
  );
}
