import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

const getCurrentDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const initialForm = {
  empCode: "",
  empName: "",
  fromDate: getCurrentDate(),
  toDate: getCurrentDate(),
  information: "",
  description: "",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function normalizeLeaveRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.result)) return payload.result;
  if (payload && Array.isArray(payload.records)) return payload.records;
  return [];
}

export default function LeaveEntry({ userType = "employee", username = "" }) {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [recentLeaveEntries, setRecentLeaveEntries] = useState([]);
  const [searchEmpCode, setSearchEmpCode] = useState("");

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    const defaultEmpCode = localStorage.getItem("attendanceEmpCode") || username || "";
    const defaultEmpName = localStorage.getItem("attendanceEmpName") || "";

    setForm((prev) => ({
      ...prev,
      empCode: userType === "admin" ? prev.empCode || "" : defaultEmpCode,
      empName: userType === "admin" ? prev.empName || "" : defaultEmpName || username || "",
    }));

    fetchEntries();
  }, [username, userType]);

  useEffect(() => {
    if (message.trim()) {
      setMessageDialogOpen(true);
    }
  }, [message]);

  useEffect(() => {
    if (searchEmpCode.trim()) {
      fetchRecentLeaveEntries(searchEmpCode);
    } else {
      setRecentLeaveEntries([]);
    }
  }, [searchEmpCode, token]);

  const handleCloseMessageDialog = () => {
    setMessageDialogOpen(false);
    setMessage("");
    setSeverity("info");
  };

  const getAuthHeaders = () => {
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEmployeeNameByCode = async (employeeCode) => {
    const code = String(employeeCode || "").trim();
    if (!code) {
      setForm((prev) => ({ ...prev, empName: "" }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setForm((prev) => ({ ...prev, empName: "" }));
        return;
      }
      const data = await response.json();
      const empName = data?.empname || data?.username || data?.name || "";
      setForm((prev) => ({
        ...prev,
        empName: empName || prev.empName || "",
      }));
    } catch (error) {
      console.error("Fetch employee name failed:", error);
      setForm((prev) => ({ ...prev, empName: prev.empName || "" }));
    }
  };

  const fetchRecentLeaveEntries = async (employeeCode) => {
    const code = String(employeeCode || "").trim();
    if (!code) {
      setRecentLeaveEntries([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/leave-entries?empcode=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setRecentLeaveEntries([]);
        return;
      }

      const data = await response.json();
      const records = normalizeLeaveRecords(data);
      const sortedRecords = [...records].sort((a, b) => {
        const dateA = new Date(a?.FromDate || a?.fromDate || 0).getTime();
        const dateB = new Date(b?.FromDate || b?.fromDate || 0).getTime();
        return dateB - dateA;
      });
      setRecentLeaveEntries(sortedRecords.slice(0, 5));
    } catch (err) {
      console.error("Fetch recent leave entries failed:", err);
      setRecentLeaveEntries([]);
    }
  };

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
      setEntries(normalizeLeaveRecords(data));
    } catch (err) {
      console.error(err);
      setSeverity("error");
      setMessage("Unable to load leave requests right now.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "empCode" && userType !== "admin") {
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "empCode" && value.trim()) {
      fetchEmployeeNameByCode(value);
    } else if (name === "empCode" && !value.trim()) {
      setForm((prev) => ({ ...prev, empName: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSeverity("info");

    const payload = {
      companyCode: localStorage.getItem("companyCode") || "01",
      empCode: form.empCode || localStorage.getItem("attendanceEmpCode") || username || "",
      empName: form.empName || "",
      fromDate: form.fromDate,
      toDate: form.toDate,
      information: form.information,
      description: form.description,
    };

    if (!payload.empCode || !payload.fromDate || !payload.toDate || !payload.information) {
      setSeverity("error");
      setMessage("Employee code, leave dates and information are required.");
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
        throw new Error(data?.message || data?.error || "Leave request could not be saved.");
      }

      setSeverity("success");
      setMessage("Leave request submitted successfully.");
      setForm((prev) => ({ ...prev, fromDate: "", toDate: "", information: "", description: "" }));
      setTimeout(() => {
        fetchEntries();
      }, 1000);
    } catch (err) {
      setSeverity("error");
      setMessage(err.message || "Unexpected error while saving leave.");
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
        throw new Error(data?.message || data?.error || "Unable to update leave approval.");
      }

      setSeverity("success");
      setMessage(`Leave request ${approved ? "approved" : "rejected"}.`);
      fetchEntries();
    } catch (err) {
      setSeverity("error");
      setMessage(err.message || "Approval update failed.");
    }
  };

  const pendingCount = entries.filter((entry) => !entry.isApproved && !entry.isCancel).length;

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Leave {userType === "admin" ? "Approval" : "Entry"}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>{userType === "admin" ? "Review employee leave requests and approve or reject them." : "Apply for planned leave and track the status of each request."}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip icon={<PendingActions />} label={`${pendingCount} pending`} sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
        </CardContent>
      </Card>

      <Dialog open={messageDialogOpen} onClose={handleCloseMessageDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, background: severity === "success" ? "#d1fae5" : severity === "error" ? "#fee2e2" : "#e0f2fe" }}>
          {severity === "success" ? "✓ Success" : severity === "error" ? "✗ Error" : "ℹ Information"}
        </DialogTitle>
        <DialogContent sx={{ py: 3, minHeight: 100, display: "flex", alignItems: "center" }}>
          <Typography variant="body1">{message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseMessageDialog} variant="contained" sx={{ textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 2.5 }}>
          <Stack spacing={1}>
            <Typography variant="h6" fontWeight={800}>🔍 Search Leave Records</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>View recent leave entries for a specific employee</Typography>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
              <TextField
                label="Employee Code"
                placeholder="Enter employee code to search"
                value={searchEmpCode}
                onChange={(e) => setSearchEmpCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchRecentLeaveEntries(searchEmpCode);
                  }
                }}
                fullWidth
                size="small"
                variant="outlined"
              />
              <Button
                variant="contained"
                onClick={() => fetchRecentLeaveEntries(searchEmpCode)}
                disabled={!searchEmpCode.trim()}
                sx={{ minWidth: 120 }}
              >
                Search
              </Button>
            </Stack>

            {recentLeaveEntries.length > 0 && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                  📋 Recent Leave Entries ({recentLeaveEntries.length})
                </Typography>
                <Stack spacing={1.5}>
                  {recentLeaveEntries.map((record, index) => {
                    const status = record?.isCancel ? "Cancelled" : record?.isApproved ? "Approved" : "Pending";
                    const statusColor = record?.isCancel ? "default" : record?.isApproved ? "success" : "warning";

                    return (
                      <Box
                        key={`${record?.leaveLogID || record?.LeaveLogID || index}`}
                        sx={{
                          borderTop: index > 0 ? "1px solid #e2e8f0" : "none",
                          pt: index > 0 ? 1.5 : 0,
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {record?.Information || record?.information || "Leave Request"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatDate(record?.FromDate || record?.fromDate)} to {formatDate(record?.ToDate || record?.toDate)}
                            </Typography>
                            {(record?.Description || record?.description) && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: "italic" }}>
                                {record?.Description || record?.description}
                              </Typography>
                            )}
                          </Box>
                          <Chip label={status} color={statusColor} size="small" />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {searchEmpCode.trim() && recentLeaveEntries.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                No leave entries found for employee code: {searchEmpCode}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {userType !== "admin" && (
        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>New Leave Request</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Employee Code"
                    name="empCode"
                    value={form.empCode}
                    onChange={handleChange}
                    fullWidth
                    required
                    size="small"
                    placeholder="Enter your employee code"
                    helperText={form.empCode && !form.empName ? "Loading employee details..." : ""}
                    disabled={userType !== "admin"}
                    InputProps={{ readOnly: userType !== "admin" }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Employee Name"
                    value={form.empName}
                    fullWidth
                    size="small"
                    placeholder="Name will auto-populate"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Leave Type / Information" name="information" value={form.information} onChange={handleChange} fullWidth required size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="From Date" name="fromDate" type="date" value={form.fromDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth required size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="To Date" name="toDate" type="date" value={form.toDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth required size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Description" name="description" value={form.description} onChange={handleChange} multiline minRows={4} fullWidth size="small" />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button type="submit" variant="contained" startIcon={<Add />} disabled={loading || !form.empName} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {loading ? "Submitting..." : "Submit Leave"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
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
