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

export default function ReportsScreen({ type = "attendance" }) {
  const [records, setRecords] = useState([]);
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
        dateValue = item?.createdAt || item?.date || item?.visitDate || item?.visitDateTime || item?.checkinTime || item?.checkoutTime || "";
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
      return (
        <Box key={`${item?.id || item?.attendanceId || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item?.name || item?.geofenceName || item?.locationName || "Attendance Entry"}</Typography>
          <Typography variant="body2" color="text.secondary">{item?.address || item?.location || item?.remarks || "No location details"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Lat: {item?.latitude ?? "-"} | Lng: {item?.longitude ?? "-"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Date: {formatDateValue(item?.createdAt || item?.date || item?.attendancedate || item?.created_at)}</Typography>
        </Box>
      );
    }

    if (type === "fieldExecutive") {
      return (
        <Box key={`${item?.id || item?.fieldExecutiveId || index}`} sx={{ p: 1.8, borderRadius: 2, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item?.employeeName || item?.employeeCode || item?.empName || "Employee"}</Typography>
          <Typography variant="body2" color="text.secondary">{item?.natureOfWork || item?.workNature || "Nature of work not provided"}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{item?.visitType === "checkout" ? "Check Out" : "Check In"} | {item?.clientName || "Client"} | {formatDateValue(item?.date || item?.visitDate || item?.createdAt)}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Lat: {item?.latitude ?? "-"} | Lng: {item?.longitude ?? "-"}</Typography>
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
