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
} from "@mui/material";
import { Add as AddIcon, Visibility as ViewIcon } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

function VisitorScreen() {
  const [visitorList, setVisitorList] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
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
  const [loading, setLoading] = useState(false);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setVisitorList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.VisitorCode.trim() || !formData.VisitorName.trim()) {
        alert("Visitor code and name are required.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(`Error: ${err.message}`);
        return;
      }

      alert("Visitor registered successfully!");
      setFormOpen(false);
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
      fetchVisitors();
    } catch (err) {
      console.error("Failed to save visitor:", err);
      alert("Failed to save visitor.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h4" fontWeight={800}>
            Visitor Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
          >
            New Visitor Entry
          </Button>
        </Box>

        <TableContainer component={Paper}>
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
              {visitorList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No visitors registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                visitorList.map((visitor) => (
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
                        onClick={() => {
                          setSelectedVisitor(visitor);
                          setViewOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register New Visitor</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            label="Visitor Code"
            name="VisitorCode"
            value={formData.VisitorCode}
            onChange={handleFormChange}
            fullWidth
            required
            size="small"
          />
          <TextField
            label="Visitor Name"
            name="VisitorName"
            value={formData.VisitorName}
            onChange={handleFormChange}
            fullWidth
            required
            size="small"
          />
          <TextField
            label="Company Name"
            name="VisitorCompanyName"
            value={formData.VisitorCompanyName}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Contact Number"
            name="ContactNumber"
            value={formData.ContactNumber}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Email ID"
            name="EmailID"
            type="email"
            value={formData.EmailID}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Employee Code"
            name="Empcode"
            value={formData.Empcode}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Employee Name"
            name="EmpName"
            value={formData.EmpName}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Department"
            name="Department"
            value={formData.Department}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
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
          <TextField
            label="ID Proof Number"
            name="IDProofNumber"
            value={formData.IDProofNumber}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Vehicle Number"
            name="VechileNumber"
            value={formData.VechileNumber}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
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
          <TextField
            label="Materials Carrying"
            name="MaterialsCarrying"
            value={formData.MaterialsCarrying}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Co-Visitor 1"
            name="CoVisitor1"
            value={formData.CoVisitor1}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Co-Visitor 2"
            name="CoVisitor2"
            value={formData.CoVisitor2}
            onChange={handleFormChange}
            fullWidth
            size="small"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="Purpose"
                checked={formData.Purpose}
                onChange={handleFormChange}
              />
            }
            label="Business Purpose"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="AppointmentType"
                checked={formData.AppointmentType}
                onChange={handleFormChange}
              />
            }
            label="Scheduled Appointment"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="ConformationRequired"
                checked={formData.ConformationRequired}
                onChange={handleFormChange}
              />
            }
            label="Confirmation Required"
          />
          <FormControlLabel
            control={
              <Checkbox
                name="IsReturnableMaterial"
                checked={formData.IsReturnableMaterial}
                onChange={handleFormChange}
              />
            }
            label="Has Returnable Material"
          />
          {formData.IsReturnableMaterial && (
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Save Visitor
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Visitor Details</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 2 }}>
          {selectedVisitor && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Visitor Code
                </Typography>
                <Typography variant="body1">{selectedVisitor.VisitorCode}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">{selectedVisitor.VisitorName}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Company
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.VisitorCompanyName || "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Contact Number
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.ContactNumber || "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.EmailID || "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Employee Name
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.EmpName || "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Visit Date
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.VisitDate
                    ? new Date(selectedVisitor.VisitDate).toLocaleDateString()
                    : "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Purpose
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.PurposeRegarding || "-"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  ID Proof
                </Typography>
                <Typography variant="body1">
                  {selectedVisitor.IdProof} - {selectedVisitor.IDProofNumber}
                </Typography>
              </Box>
              {selectedVisitor.VechileNumber && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Vehicle Number
                    </Typography>
                    <Typography variant="body1">{selectedVisitor.VechileNumber}</Typography>
                  </Box>
                </>
              )}
              {selectedVisitor.MaterialsCarrying && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Materials Carrying
                    </Typography>
                    <Typography variant="body1">{selectedVisitor.MaterialsCarrying}</Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VisitorScreen;
