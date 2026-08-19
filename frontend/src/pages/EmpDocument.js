import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  CheckCircle,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  RadioButtonUnchecked,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { API_BASE_URL } from "../config";

export default function EmpDocument() {
  const [searchEmpCode, setSearchEmpCode] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const getAuthHeaders = (headers = {}) => {
    const token = localStorage.getItem("token") || "";
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchDocumentTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/document-types`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        // Normalize response: handle both array and object responses
        const normalizedData = Array.isArray(data) ? data : (data?.data || data?.result || []);
        setDocumentTypes(normalizedData);
      }
    } catch (err) {
      console.error("Failed to fetch document types:", err);
      setDocumentTypes([]);
    }
  };

  const [pageMessage, setPageMessage] = useState("");
  const [pageSeverity, setPageSeverity] = useState("info");

  const fetchEmployeeDocuments = async () => {
    const employeeCode = searchEmpCode.trim();
    if (!employeeCode) {
      setPageMessage("Please enter an employee code.");
      setPageSeverity("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/emp-documents/${employeeCode}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        setEmpCode(employeeCode);
        await fetchEmployeeName(employeeCode);
        setPageMessage("");
      } else if (response.status === 404) {
        setDocuments([]);
        setEmpCode("");
        setEmployeeName("");
        setPageMessage("No documents found for this employee.");
        setPageSeverity("warning");
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setPageMessage("Error fetching documents.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeName = async (employeeCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(employeeCode)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setEmployeeName("");
        return;
      }
      const data = await response.json();
      setEmployeeName(data?.empname || data?.username || "");
    } catch (err) {
      console.error("Failed to fetch employee name:", err);
      setEmployeeName("");
    }
  };

  const handleUpload = async () => {
    let companyCode = String(localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCode)) companyCode = companyCode.padStart(2, "0");

    if (!empCode.trim() || !selectedDocType || !selectedFile || !companyCode.trim()) {
      setPageMessage("Please fill all fields, select a file, and sign in with a company code.");
      setPageSeverity("error");
    }

    const formData = new FormData();
    formData.append("empcode", empCode);
    formData.append("companycode", companyCode.trim());
    formData.append("documentname", selectedDocType);
    formData.append("file", selectedFile);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/upload-document`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setPageMessage("Document uploaded successfully.");
        setPageSeverity("success");
        setOpenUpload(false);
        setSelectedDocType("");
        setSelectedFile(null);
        fetchEmployeeDocuments();
      } else {
        const error = await response.json();
        setPageMessage("Upload failed: " + error.message);
        setPageSeverity("error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setPageMessage("Error uploading document.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setLoading(true);
    let companyCode = String(localStorage.getItem("companyCode") || window.COMPANY_CODE || "01").trim();
    if (/^\d$/.test(companyCode)) companyCode = companyCode.padStart(2, "0");

    try {
      const response = await fetch(`${API_BASE_URL}/delete-document`, {
        method: "DELETE",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          empcode: deleteItem.empcode,
          companycode: companyCode.trim(),
          documentname: deleteItem.documentname,
        }),
      });

      if (response.ok) {
        setPageMessage("Document deleted successfully.");
        setPageSeverity("success");
        setOpenDelete(false);
        setDeleteItem(null);
        fetchEmployeeDocuments();
      } else {
        const error = await response.json();
        setPageMessage("Delete failed: " + error.message);
        setPageSeverity("error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setPageMessage("Error deleting document.");
      setPageSeverity("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (doc) => {
    if (!doc?.empcode || !doc?.documentname) return;
    const token = localStorage.getItem("token") || "";
    const url = `${API_BASE_URL}/download-document/${encodeURIComponent(doc.empcode)}/${encodeURIComponent(doc.documentname)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Employee Document Checklist</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Upload and verify required employee documents</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label="Documents" sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Box>
      </Card>

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
              <Box sx={{ display: "grid", gap: 2, width: "100%", maxWidth: 520 }}>
            <TextField
              label="Employee Code"
              value={searchEmpCode}
              onChange={(e) => setSearchEmpCode(e.target.value)}
              placeholder="Enter employee code"
              size="small"
              sx={{ minWidth: 240 }}
            />
            <TextField
              label="Employee Name"
              value={employeeName}
              placeholder="Employee name will appear after search"
              size="small"
              InputProps={{ readOnly: true }}
            />
          </Box>
            <Button variant="contained" onClick={fetchEmployeeDocuments} disabled={loading}>
              Search
            </Button>
            <Button
              variant="outlined"
              onClick={() => setOpenUpload(true)}
              disabled={!empCode.trim() || loading}
            >
              <UploadIcon sx={{ mr: 1 }} /> Upload / Update Document
            </Button>
          </Stack>
            </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Typography variant="h6" fontWeight={800}>Required Documents</Typography>
            <Chip
              label={documents.length ? `${documents.filter((doc) => doc.isuploaded).length} / ${documents.length} uploaded` : "Pending review"}
              sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
            />
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ backgroundColor: "#eef4ff" }}>
                <TableRow>
                  <TableCell><strong>Document Name</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Uploaded Date</strong></TableCell>
                  <TableCell align="center"><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <TableRow key={doc.documentname} hover>
                      <TableCell>{doc.documentname}</TableCell>
                      <TableCell>
                        {doc.isuploaded ? (
                          <Stack direction="row" spacing={1} alignItems="center" color="success.main">
                            <CheckCircle fontSize="small" />
                            <Typography variant="body2" fontWeight={700}>Avilable</Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                            <RadioButtonUnchecked fontSize="small" />
                            <Typography variant="body2" fontWeight={700}>Not Available</Typography>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.uploaddate ? new Date(doc.uploaddate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {doc.isuploaded ? (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleDownload(doc)}
                            >
                              Download
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => {
                                setDeleteItem(doc);
                                setOpenDelete(true);
                              }}
                            >
                              Delete
                            </Button>
                          </Stack>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<UploadIcon />}
                            onClick={() => {
                              setSelectedDocType(doc.documentname);
                              setOpenUpload(true);
                            }}
                          >
                            Upload
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      {searchEmpCode ? "No document checklist found for this employee" : "Search for an employee code to view the checklist"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload / Update Employee Document</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Employee Code"
              value={empCode}
              placeholder="Search an employee first"
              InputProps={{ readOnly: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                label="Document Type"
              >
                {documentTypes.map((doc) => (
                  <MenuItem key={doc.documentname} value={doc.documentname}>
                    {doc.documentname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
              Choose File
              <input hidden type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
            </Button>
            {selectedFile && (
              <Typography variant="body2" color="success.main">
                ✓ Selected: {selectedFile.name}
              </Typography>
            )}
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
          <Typography>
            Are you sure you want to delete the document <strong>{deleteItem?.documentname}</strong> for employee <strong>{deleteItem?.empcode}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
