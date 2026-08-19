import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { API_BASE_URL } from "../config";

export default function CompanyDocument() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [status, setStatus] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");
  const [remainderOn, setRemainderOn] = useState("");
  const [openDelete, setOpenDelete] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [pageMessage, setPageMessage] = useState("");
  const [pageSeverity, setPageSeverity] = useState("info");

  useEffect(() => {
    fetchCompanyDocuments();
  }, []);

  const getAuthHeaders = (headers = {}) => {
    const token = localStorage.getItem("token") || "";
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchCompanyDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/company-documents`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch company documents");
      }

      const data = await response.json();
      setDocuments(data || []);
      setPageMessage("");
    } catch (err) {
      console.error("Failed to fetch company documents:", err);
      setPageMessage("Unable to load company documents.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!documentName.trim() || !selectedFile) {
      setPageMessage("Please enter a document name and select a file.");
      setPageSeverity("error");
      return;
    }

    let companyCodeValue = String(documentCode.trim() || localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCodeValue)) companyCodeValue = companyCodeValue.padStart(2, "0");
    const formData = new FormData();
    formData.append("documentname", documentName.trim());
    formData.append("documentcode", companyCodeValue);
    formData.append("companycode", companyCodeValue);
    formData.append("status", String(status));
    formData.append("expirydate", expiryDate || "");
    formData.append("remainderon", remainderOn || "");
    formData.append("file", selectedFile);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/company-documents`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      setPageMessage("Company document uploaded successfully.");
      setPageSeverity("success");
      setOpenUpload(false);
      setDocumentName("");
      setDocumentCode("");
      setStatus(true);
      setExpiryDate("");
      setRemainderOn("");
      setSelectedFile(null);
      fetchCompanyDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      setPageMessage(err.message || "Error uploading company document.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (doc) => {
    setDocumentToDelete(doc);
    setOpenDelete(true);
  };

  const handleDelete = async (doc) => {
    if (!doc?.DocumentID) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/company-documents/${doc.DocumentID}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Delete failed");
      }

      setPageMessage("Company document deleted successfully.");
      setPageSeverity("success");
      fetchCompanyDocuments();
    } catch (err) {
      console.error("Delete error:", err);
      setPageMessage(err.message || "Error deleting company document.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (doc) => {
    if (!doc?.DocumentID) return;
    const token = localStorage.getItem("token") || "";
    const url = `${API_BASE_URL}/download-company-document/${doc.DocumentID}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Company Documents</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Manage and store company-wide documents</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="Company" sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
              <Button 
                variant="outlined"
                startIcon={<UploadIcon />} 
                onClick={() => setOpenUpload(true)} 
                disabled={loading}
                sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", fontWeight: 700 }}
              >
                Upload
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Card>

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Stored Company Documents
            </Typography>
            <Chip label={documents.length ? `${documents.length} document(s)` : "No documents yet"} sx={{ background: "#f0f9ff", color: "#0c7a4c", fontWeight: 700 }} />
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ backgroundColor: "#eef4ff" }}>
                <TableRow>
                  <TableCell><strong>Document Name</strong></TableCell>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Extension</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Expiry Date</strong></TableCell>
                  <TableCell><strong>Reminder On</strong></TableCell>
                  <TableCell align="center"><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length > 0 ? documents.map((doc) => (
                  <TableRow key={doc.DocumentID} hover>
                    <TableCell>{doc.DocumentName || "-"}</TableCell>
                    <TableCell>{doc.DocumentCode || "-"}</TableCell>
                    <TableCell>{doc.DocumentExtension || "-"}</TableCell>
                    <TableCell>{doc.Status ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{doc.ExpiryDate ? new Date(doc.ExpiryDate).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{doc.RemainderOn ? new Date(doc.RemainderOn).toLocaleDateString() : "-"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(doc)}>
                          Download
                        </Button>
                        <Button variant="outlined" color="error" size="small" startIcon={<DeleteIcon />} onClick={() => requestDelete(doc)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No company documents uploaded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Company Document</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Document Name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Document Code"
              value={documentCode}
              onChange={(e) => setDocumentCode(e.target.value)}
              placeholder="Optional"
            />
            <FormControlLabel
              control={<Checkbox checked={status} onChange={(e) => setStatus(e.target.checked)} />}
              label="Active / Valid"
            />
            <TextField
              fullWidth
              type="date"
              label="Expiry Date"
              InputLabelProps={{ shrink: true }}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
            <TextField
              fullWidth
              type="date"
              label="Reminder Date"
              InputLabelProps={{ shrink: true }}
              value={remainderOn}
              onChange={(e) => setRemainderOn(e.target.value)}
            />
            <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
              Choose File
              <input hidden type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </Button>
            {selectedFile ? (
              <Typography variant="body2" color="success.main">
                ✓ Selected: {selectedFile.name}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
          <Button onClick={handleUpload} variant="contained" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this company document?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpenDelete(false);
              handleDelete(documentToDelete);
            }}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
