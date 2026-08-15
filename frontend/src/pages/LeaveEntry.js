import { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import { Add, CheckCircle, PendingActions, Today } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

const initialForm = {
  empCode: "",
  fromDate: "",
  toDate: "",
  information: "",
  description: "",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function LeaveEntry({ userType = "employee", username = "" }) {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    const defaultEmpCode = localStorage.getItem("attendanceEmpCode") || username || "";

    setForm((prev) => ({
      ...prev,
      empCode: defaultEmpCode,
    }));

    fetchEntries();
  }, [username]);

  const fetchEntries = async () => {
    if (!token) return;

    try {
      const query = userType === "admin" ? "" : `?empcode=${encodeURIComponent(form.empCode || localStorage.getItem("attendanceEmpCode") || username || "")}`;
      const response = await fetch(`${API_BASE_URL}/leave-entries${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load leave records");
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load leave requests right now.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const payload = {
      companyCode: localStorage.getItem("companyCode") || "01",
      empCode: form.empCode || localStorage.getItem("attendanceEmpCode") || username || "",
      fromDate: form.fromDate,
      toDate: form.toDate,
      information: form.information,
      description: form.description,
    };

    if (!payload.empCode || !payload.fromDate || !payload.toDate || !payload.information) {
      setError("Employee code, leave dates and information are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/leave-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Leave request could not be saved.");
      }

      setMessage("Leave request submitted successfully.");
      setForm((prev) => ({ ...prev, fromDate: "", toDate: "", information: "", description: "" }));
      fetchEntries();
    } catch (err) {
      setError(err.message || "Unexpected error while saving leave.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (leaveId, approved) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/leave-entries/${leaveId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: approved }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update leave approval.");
      }

      setMessage(`Leave request ${approved ? "approved" : "rejected"}.`);
      fetchEntries();
    } catch (err) {
      setError(err.message || "Approval update failed.");
    }
  };

  const pendingCount = entries.filter((entry) => !entry.isApproved && !entry.isCancel).length;

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Leave Entry</Typography>
              <Typography color="text.secondary">{userType === "admin" ? "Review employee leave requests and approve or reject them." : "Apply for planned leave and track the status of each request."}</Typography>
            </Box>
            <Chip icon={<PendingActions />} label={`${pendingCount} pending`} color="warning" variant="filled" />
          </Stack>
        </CardContent>
      </Card>

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {userType !== "admin" && (
        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>New Leave Request</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField label="Employee Code" name="empCode" value={form.empCode} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Leave Type / Information" name="information" value={form.information} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="From Date" name="fromDate" type="date" value={form.fromDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="To Date" name="toDate" type="date" value={form.toDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Description" name="description" value={form.description} onChange={handleChange} multiline minRows={4} fullWidth />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button type="submit" variant="contained" startIcon={<Add />} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Leave"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>{userType === "admin" ? "Leave Approval List" : "My Leave Requests"}</Typography>
            <Chip icon={<Today />} label={`${entries.length} records`} color="primary" />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {entries.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fbff" }}>
              <Typography color="text.secondary">No leave requests found.</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {entries.map((entry) => {
                const status = entry.isCancel
                  ? "Cancelled"
                  : entry.isApproved
                    ? "Approved"
                    : "Pending";

                const statusColor = entry.isCancel ? "default" : entry.isApproved ? "success" : "warning";

                return (
                  <Paper key={entry.leaveLogID || entry.LeaveLogID} variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "#f9fbff" }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800}>{entry.Information || entry.information || "Leave Request"}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {entry.EmpCode || entry.empCode} • {formatDate(entry.FromDate || entry.fromDate)} to {formatDate(entry.ToDate || entry.toDate)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                          {entry.Description || entry.description || "No additional details provided."}
                        </Typography>
                      </Box>

                      <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                        <Chip label={status} color={statusColor} />
                        {userType === "admin" && !entry.isCancel && (
                          <Stack direction="row" spacing={1}>
                            <Button variant="contained" color="success" onClick={() => handleApproval(entry.leaveLogID || entry.LeaveLogID, true)}>
                              Approve
                            </Button>
                            <Button variant="outlined" color="error" onClick={() => handleApproval(entry.leaveLogID || entry.LeaveLogID, false)}>
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
