import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Visibility as ViewIcon, CheckCircle, PendingActions } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

function VisitorScreen() {
  const [visitorList, setVisitorList] = useState([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    VisitorCode: "",
    VisitDate: new Date().toISOString().split("T")[0],
    VisitorName: "",
    VisitorCompanyName: "",
    ContactNumber: "",
    Empcode: "",
    EmpName: "",
    Department: "",
    Purpose: false,
    PurposeRegarding: "",
    AppointmentType: false,
    AppointmentDate: "",
    VechileNumber: "",
    EmailID: "",
    ConformationRequired: false,
    CoVisitor1: "",
    CoVisitor2: "",
    IdProof: "Aadhar",
    IDProofNumber: "",
    MaterialsCarrying: "",
    IsReturnableMaterial: false,
    ReturnableMaterialDescription: "",
  });

  const normalizeVisitorsResponse = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.result)) return payload.result;
    return [];
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load visitors");
      }

      const data = await response.json();
      setVisitorList(normalizeVisitorsResponse(data));
    } catch (err) {
      console.error("Failed to fetch visitors:", err);
      setVisitorList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    if (message.trim()) {
      setMessageDialogOpen(true);
    }
  }, [message]);

  const handleCloseMessageDialog = () => {
    setMessageDialogOpen(false);
    setMessage("");
    setSeverity("info");
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      VisitorCode: "",
      VisitDate: new Date().toISOString().split("T")[0],
      VisitorName: "",
      VisitorCompanyName: "",
      ContactNumber: "",
      Empcode: "",
      EmpName: "",
      Department: "",
      Purpose: false,
      PurposeRegarding: "",
      AppointmentType: false,
      AppointmentDate: "",
      VechileNumber: "",
      EmailID: "",
      ConformationRequired: false,
      CoVisitor1: "",
      CoVisitor2: "",
      IdProof: "Aadhar",
      IDProofNumber: "",
      MaterialsCarrying: "",
      IsReturnableMaterial: false,
      ReturnableMaterialDescription: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSeverity("info");

    try {
      if (!formData.VisitorCode.trim() || !formData.VisitorName.trim()) {
        setSeverity("error");
        setMessage("Visitor code and name are required.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/visitors/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to save visitor.");
      }

      setSeverity("success");
      setMessage("Visitor registered successfully!");
      setShowRegisterForm(false);
      resetForm();
      fetchVisitors();
    } catch (err) {
      console.error("Failed to save visitor:", err);
      setSeverity("error");
      setMessage(err.message || "Failed to save visitor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Visitor Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Register and track visitor check-ins</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label={`${visitorList.length} visitor(s)`} sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowRegisterForm((prev) => !prev)}
                sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", fontWeight: 700 }}
              >
                {showRegisterForm ? "Close" : "New Entry"}
              </Button>
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

      {showRegisterForm && (
        <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: "#0d9488" }}>
              Register New Visitor
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Visitor Code"
                    name="VisitorCode"
                    value={formData.VisitorCode}
                    onChange={handleFormChange}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Visitor Name"
                    name="VisitorName"
                    value={formData.VisitorName}
                    onChange={handleFormChange}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Company Name"
                    name="VisitorCompanyName"
                    value={formData.VisitorCompanyName}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Contact Number"
                    name="ContactNumber"
                    value={formData.ContactNumber}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email ID"
                    name="EmailID"
                    type="email"
                    value={formData.EmailID}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Employee Code"
                    name="Empcode"
                    value={formData.Empcode}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Employee Name"
                    name="EmpName"
                    value={formData.EmpName}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Department"
                    name="Department"
                    value={formData.Department}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Visit Date"
                    name="VisitDate"
                    type="date"
                    value={formData.VisitDate}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Appointment Date"
                    name="AppointmentDate"
                    type="date"
                    value={formData.AppointmentDate}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>ID Proof Type</InputLabel>
                    <Select
                      name="IdProof"
                      value={formData.IdProof}
                      onChange={handleFormChange}
                      label="ID Proof Type"
                    >
                      <MenuItem value="Aadhar">Aadhar</MenuItem>
                      <MenuItem value="DrivingLicense">Driving License</MenuItem>
                      <MenuItem value="Passport">Passport</MenuItem>
                      <MenuItem value="PAN">PAN</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="ID Proof Number"
                    name="IDProofNumber"
                    value={formData.IDProofNumber}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Vehicle Number"
                    name="VechileNumber"
                    value={formData.VechileNumber}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Purpose of Visit"
                    name="PurposeRegarding"
                    value={formData.PurposeRegarding}
                    onChange={handleFormChange}
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Materials Carrying"
                    name="MaterialsCarrying"
                    value={formData.MaterialsCarrying}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Co-Visitor 1"
                    name="CoVisitor1"
                    value={formData.CoVisitor1}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Co-Visitor 2"
                    name="CoVisitor2"
                    value={formData.CoVisitor2}
                    onChange={handleFormChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={<Checkbox name="Purpose" checked={formData.Purpose} onChange={handleFormChange} />}
                      label="Business Purpose"
                    />
                    <FormControlLabel
                      control={<Checkbox name="AppointmentType" checked={formData.AppointmentType} onChange={handleFormChange} />}
                      label="Scheduled Appointment"
                    />
                    <FormControlLabel
                      control={<Checkbox name="ConformationRequired" checked={formData.ConformationRequired} onChange={handleFormChange} />}
                      label="Confirmation Required"
                    />
                    <FormControlLabel
                      control={<Checkbox name="IsReturnableMaterial" checked={formData.IsReturnableMaterial} onChange={handleFormChange} />}
                      label="Has Returnable Material"
                    />
                  </Stack>
                </Grid>
                {formData.IsReturnableMaterial && (
                  <Grid item xs={12}>
                    <TextField
                      label="Returnable Material Description"
                      name="ReturnableMaterialDescription"
                      value={formData.ReturnableMaterialDescription}
                      onChange={handleFormChange}
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Grid>
                )}
              </Grid>
              <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: "flex-end" }}>
                <Button onClick={() => { setShowRegisterForm(false); resetForm(); }} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
                <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={loading} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {loading ? "Saving..." : "Save Visitor"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 2.5 }}>
          <Typography variant="h6" fontWeight={800}>Registered Visitors</Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          {visitorList.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fbff", textAlign: "center" }}>
              <Typography color="text.secondary">No visitors registered yet.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell><strong>Visitor Code</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Company</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Employee</strong></TableCell>
                    <TableCell><strong>Visit Date</strong></TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visitorList.map((visitor) => (
                    <TableRow key={visitor.VisitorID} hover>
                      <TableCell>{visitor.VisitorCode}</TableCell>
                      <TableCell>{visitor.VisitorName}</TableCell>
                      <TableCell>{visitor.VisitorCompanyName || "-"}</TableCell>
                      <TableCell>{visitor.ContactNumber || "-"}</TableCell>
                      <TableCell>{visitor.EmpName || "-"}</TableCell>
                      <TableCell>
                        {visitor.VisitDate
                          ? new Date(visitor.VisitDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => setSelectedVisitor(visitor)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {selectedVisitor && (
        <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
          <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>Visitor Details</Typography>
              <Button size="small" onClick={() => setSelectedVisitor(null)} sx={{ color: "#fff", fontWeight: 700 }}>Close</Button>
            </Stack>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Visitor Code</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.VisitorCode}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.VisitorName}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Company</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.VisitorCompanyName || "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.ContactNumber || "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.EmailID || "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Employee Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.EmpName || "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Visit Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.VisitDate ? new Date(selectedVisitor.VisitDate).toLocaleDateString() : "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Purpose</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.PurposeRegarding || "-"}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>ID Proof</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.IdProof} - {selectedVisitor.IDProofNumber || "-"}</Typography>
              </Box>
              {selectedVisitor.VechileNumber && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Vehicle Number</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.VechileNumber}</Typography>
                  </Box>
                </>
              )}
              {selectedVisitor.MaterialsCarrying && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Materials Carrying</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedVisitor.MaterialsCarrying}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default VisitorScreen;
