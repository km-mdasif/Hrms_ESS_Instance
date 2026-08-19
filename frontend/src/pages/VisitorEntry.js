import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Add, CheckCircle, LogoutOutlined, Today } from "@mui/icons-material";
import { API_BASE_URL } from "../config";
import { getEmployeeName } from "../utils/employee";

const initialForm = {
  visitorCode: "",
  visitorName: "",
  visitorCompany: "",
  contactNumber: "",
  empCode: "",
  empName: "",
  purpose: "",
  checkInTime: new Date().toISOString().slice(0, 16),
  checkOutTime: "",
  visitType: "checkin",
  remarks: "",
};

export default function VisitorEntry({ userType = "employee", username = "" }) {
  const [form, setForm] = useState(initialForm);
  const [visitorList, setVisitorList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [filterBy, setFilterBy] = useState("all");
  const [recentVisitorEntries, setRecentVisitorEntries] = useState([]);
  const [searchEmpCode, setSearchEmpCode] = useState("");
  const [employeeValidated, setEmployeeValidated] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Search for an employee code to check-in visitors.");

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    fetchVisitorEntries();
  }, [token]);

  useEffect(() => {
    if (message.trim()) {
      setMessageDialogOpen(true);
    }
  }, [message]);

  useEffect(() => {
    if (userType === "employee" && searchEmpCode.trim()) {
      fetchRecentVisitorEntries(searchEmpCode);
    } else if (userType === "employee") {
      setRecentVisitorEntries([]);
    }
  }, [searchEmpCode, token, userType]);

  const handleCloseMessageDialog = () => {
    setMessageDialogOpen(false);
    setMessage("");
    setSeverity("info");
  };

  const getAuthHeaders = () => {
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEmployee = async (providedEmpCode) => {
    const empCode = String(providedEmpCode ?? form.empCode ?? "").trim();
    if (!empCode) {
      setSeverity("error");
      setMessage("Please enter an employee code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(empCode)}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setEmployeeValidated(false);
        setForm((prev) => ({ ...prev, empName: "" }));
        setSeverity("error");
        setMessage("Employee not found. Please check the employee code.");
        setStatusMessage("Employee not found.");
        return;
      }

      const data = await response.json();
      const empName = getEmployeeName(data);
      setEmployeeValidated(true);
      setForm((prev) => ({ ...prev, empName: empName || prev.empName || "" }));
      setStatusMessage("Employee verified. Ready to check-in visitors.");
      setSeverity("success");
      setMessage("");
    } catch (error) {
      console.error("Fetch employee failed:", error);
      setEmployeeValidated(false);
      setForm((prev) => ({ ...prev, empName: "" }));
      setSeverity("error");
      setMessage("Error validating employee.");
      setStatusMessage("Error validating employee.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentVisitorEntries = async (employeeCode) => {
    const code = String(employeeCode || "").trim();
    if (!code) {
      setRecentVisitorEntries([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setRecentVisitorEntries([]);
        return;
      }

      const data = await response.json();
      const records = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.result) ? data.result : [];
      const filtered = records.filter((entry) => {
        const empCode = entry?.Empcode || entry?.empCode || entry?.empcode || "";
        return String(empCode).trim() === code;
      });
      const sortedRecords = [...filtered].sort((a, b) => {
        const timeA = new Date(a?.checkInTime || a?.CheckInTime || a?.createdAt || a?.created_at || 0).getTime();
        const timeB = new Date(b?.checkInTime || b?.CheckInTime || b?.createdAt || b?.created_at || 0).getTime();
        return timeB - timeA;
      });
      setRecentVisitorEntries(sortedRecords.slice(0, 5));
    } catch (err) {
      console.error("Fetch recent visitor entries failed:", err);
      setRecentVisitorEntries([]);
    }
  };

  const formatVisitorTime = (record) => {
    const rawValue = record?.checkInTime || record?.createdAt || record?.created_at;
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

  const fetchVisitorEntries = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load visitor entries");
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.result) ? data.result : [];
      setVisitorList(rows);
    } catch (err) {
      console.error(err);
      setSeverity("error");
      setMessage("Unable to load visitor entries right now.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "empCode") {
      if (!value.trim()) {
        setEmployeeValidated(false);
        setForm((prev) => ({ ...prev, empName: "" }));
        setStatusMessage("Search for an employee code to check-in visitors.");
        return;
      }

      if (userType === "admin") {
        fetchEmployee(value);
      }
    }
  };

  const handleCheckIn = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSeverity("info");

    const payload = {
      companyCode: localStorage.getItem("companyCode") || "01",
      VisitorCode: form.visitorCode || `V${Date.now()}`,
      VisitorName: form.visitorName,
      VisitorCompanyName: form.visitorCompany,
      ContactNumber: form.contactNumber,
      Empcode: form.empCode,
      EmpName: form.empName,
      Purpose: form.purpose,
      PurposeRegarding: form.purpose,
      VisitDate: form.checkInTime ? form.checkInTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
      checkInTime: form.checkInTime || new Date().toISOString(),
      checkOutTime: null,
      visitType: "checkin",
      remarks: form.remarks,
      hostName: form.empName || form.empCode,
    };

    if (!payload.visitorName || !payload.empCode) {
      setSeverity("error");
      setMessage("Visitor name and employee code are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/visitors/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Unable to check in visitor");
      }

      setSeverity("success");
      setMessage(`Visitor checked in successfully.`);
      setForm({
        ...initialForm,
        checkInTime: new Date().toISOString().slice(0, 16),
      });
      setTimeout(() => {
        fetchVisitorEntries();
      }, 1000);
    } catch (err) {
      setSeverity("error");
      setMessage(err.message || "Unexpected error while checking in visitor.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (visitorId) => {
    setLoading(true);
    setMessage("");
    setSeverity("info");

    try {
      const response = await fetch(`${API_BASE_URL}/visitors/${visitorId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checkOutTime: new Date().toISOString() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Unable to check out visitor");
      }

      setSeverity("success");
      setMessage("Visitor checked out successfully.");
      fetchVisitorEntries();
    } catch (err) {
      setSeverity("error");
      setMessage(err.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  const filteredVisitors = visitorList.filter((v) => {
    if (filterBy === "checkedin") return !v.checkOutTime;
    if (filterBy === "checkedout") return v.checkOutTime;
    return true;
  });

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Visitor Entry</Typography>
              <Typography color="text.secondary">Check-in and check-out visitors on premises</Typography>
            </Box>
            <Chip icon={<Today />} label={`${visitorList.length} total visitors`} color="primary" />
          </Stack>
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

      {userType === "employee" && (
        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>🔍 Search Visitor Entries</Typography>
                <Typography variant="body2" color="text.secondary">View recent visitor entries for your employee code</Typography>
              </Box>

              <TextField
                label="Employee Code (Host)"
                placeholder="Enter your employee code to search"
                value={searchEmpCode}
                onChange={(e) => setSearchEmpCode(e.target.value)}
                fullWidth
                size="small"
                variant="outlined"
              />

              {recentVisitorEntries.length > 0 && (
                <Box sx={{ pt: 2 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                    👥 Recent Visitor Entries ({recentVisitorEntries.length})
                  </Typography>
                  <Stack spacing={1.5}>
                    {recentVisitorEntries.map((record, index) => {
                      const status = !record?.checkOutTime ? "Checked In" : "Checked Out";
                      const statusColor = !record?.checkOutTime ? "success" : "default";

                      return (
                        <Box
                          key={`${record?.visitorEntryId || record?.id || index}`}
                          sx={{
                            borderTop: index > 0 ? "1px solid #e2e8f0" : "none",
                            pt: index > 0 ? 1.5 : 0,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {record?.visitorName || "Visitor"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Company: {record?.visitorCompany || "Not specified"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Purpose: {record?.purpose || "Not specified"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Check-In: {formatVisitorTime(record)}
                              </Typography>
                              {record?.checkOutTime && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Check-Out: {formatVisitorTime({ ...record, checkInTime: record.checkOutTime })}
                                </Typography>
                              )}
                              {record?.remarks && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: "italic" }}>
                                  Remarks: {record.remarks}
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

              {searchEmpCode.trim() && recentVisitorEntries.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No visitor entries found for employee code: {searchEmpCode}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
              <Box sx={{ display: "grid", gap: 2, width: "100%" }}>
                <TextField
                  label="Employee Code (Host)"
                  value={form.empCode}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    handleChange({ target: { name: "empCode", value: nextValue } });
                  }}
                  onBlur={() => {
                    if (form.empCode.trim()) {
                      fetchEmployee();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      fetchEmployee();
                    }
                  }}
                  placeholder="Enter employee code to meet"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Employee Name (Host)"
                  value={form.empName}
                  size="small"
                  fullWidth
                  placeholder="Employee name will appear after search"
                  InputProps={{ readOnly: true }}
                />
              </Box>
              <Button variant="contained" onClick={fetchEmployee} disabled={loading || !form.empCode.trim()}>
                Search
              </Button>
            </Stack>

            <Chip label={statusMessage} color="primary" variant="outlined" />

            {!employeeValidated ? (
              <Box sx={{ p: 3, textAlign: "center", bgcolor: "#f0f9ff", borderRadius: 2, border: "2px dashed #0ea5e9" }}>
                <Typography variant="body1" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  🔍 Search First
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter an employee code and click Search to validate before checking in visitors.
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Visitor Check-In</Typography>
                <Box component="form" onSubmit={handleCheckIn}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Visitor Name"
                        name="visitorName"
                        value={form.visitorName}
                        onChange={handleChange}
                        fullWidth
                        required
                        size="small"
                        placeholder="Full name of visitor"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Visitor Company"
                        name="visitorCompany"
                        value={form.visitorCompany}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        placeholder="Company name"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Contact Number"
                        name="contactNumber"
                        value={form.contactNumber}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        placeholder="Phone number"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Purpose of Visit"
                        name="purpose"
                        value={form.purpose}
                        onChange={handleChange}
                        fullWidth
                        required
                        size="small"
                        placeholder="Meeting, Demo, Delivery, etc."
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Check-In Time"
                        name="checkInTime"
                        type="datetime-local"
                        value={form.checkInTime}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Remarks"
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        placeholder="Additional notes or instructions"
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button type="submit" variant="contained" startIcon={<Add />} disabled={loading} sx={{ textTransform: "none", fontWeight: 700 }}>
                      {loading ? "Checking In..." : "Check In Visitor"}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>Visitor Log</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter</InputLabel>
              <Select value={filterBy} label="Filter" onChange={(e) => setFilterBy(e.target.value)}>
                <MenuItem value="all">All Visitors</MenuItem>
                <MenuItem value="checkedin">Checked In</MenuItem>
                <MenuItem value="checkedout">Checked Out</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {filteredVisitors.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fbff" }}>
              <Typography color="text.secondary">No visitor entries found.</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {filteredVisitors.map((visitor) => (
                <Paper key={visitor.id || visitor.visitorCode} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography fontWeight={700}>{visitor.visitorName || "Visitor"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visitor.visitorCompany || "Company not specified"}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2">
                        <strong>Purpose:</strong> {visitor.purpose || "Not specified"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Meets: {visitor.empName || visitor.empCode || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2">
                        <strong>Check-In:</strong> {visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleTimeString() : "-"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Check-Out:</strong> {visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleTimeString() : "Not checked out"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      {!visitor.checkOutTime && (
                        <Button
                          variant="outlined"
                          startIcon={<LogoutOutlined />}
                          size="small"
                          onClick={() => handleCheckOut(visitor.id || visitor.visitorCode)}
                          disabled={loading}
                          sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                          Check Out
                        </Button>
                      )}
                      {visitor.checkOutTime && (
                        <Chip icon={<CheckCircle />} label="Checked Out" color="success" />
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
