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
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete, Person, Save, ArrowBack } from "@mui/icons-material";
import { API_BASE_URL } from "../config";

const defaultSkill = { SkillName: "", Experience: "" };
const defaultRelation = { RelationName: "", Relationship: "", Age: "" };
const defaultTimeSlot = { InterviewDateTime: "", notes: "" };

const initialInterview = {
  InterviewCode: "",
  CompanyCode: "01",
  InterviewDate: "",
  CandidateName: "",
  Gender: "",
  Age: "",
  MaritialStatus: "",
  ContactNumber: "",
  ContactNumber1: "",
  EmailID: "",
  Address: "",
  PermanentLocation: "",
  PresentLocation: "",
  HighestQualification: "",
  PreviousDesignation: "",
  PostingApplyingFor: "",
  Category: "",
  RefferedBy: "",
  ReasontoReleave: "",
  Remarks: "",
  TotalExperience: "",
  CurrentCTC: "",
  ExpectedCTC: "",
  ExpectedCTCNegotiable: false,
  NoticePeriod: "",
  NoticePeriodNegotiable: false,
  ExpectedJoiningDate: "",
};

const initialFinal = {
  IDProof: "",
  IDProofNumber: "",
  FinalRoundStatus: "",
  FinalRoundScore: "",
  InterviewStatus: "",
  Notes: "",
  JoiningDate: "",
  FixedCTC: "",
};

function RowField({ label, value, onChange, type = "text", multiline = false, minRows = 1, required = false }) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      fullWidth
      required={required}
      multiline={multiline}
      minRows={minRows}
      InputLabelProps={type === "date" ? { shrink: true } : undefined}
      size="small"
    />
  );
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function InterviewScreen() {
  const [currentTab, setCurrentTab] = useState(0);
  const [formTab, setFormTab] = useState(0);
  const [interview, setInterview] = useState(initialInterview);
  const [skills, setSkills] = useState([defaultSkill]);
  const [relations, setRelations] = useState([defaultRelation]);
  const [timeSlots, setTimeSlots] = useState([defaultTimeSlot]);
  const [finalEntry, setFinalEntry] = useState(initialFinal);
  const [records, setRecords] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    setInterview((prev) => ({
      ...prev,
      CompanyCode: localStorage.getItem("companyCode") || "01",
    }));
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load interviews");
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInterviewChange = (event) => {
    const { name, value } = event.target;
    setInterview((prev) => ({ ...prev, [name]: value }));
  };

  const handleFinalChange = (event) => {
    const { name, value } = event.target;
    setFinalEntry((prev) => ({ ...prev, [name]: value }));
  };

  const addSkill = () => setSkills((prev) => [...prev, { ...defaultSkill }]);
  const removeSkill = (index) => setSkills((prev) => prev.filter((_, i) => i !== index));
  const updateSkill = (index, field, value) => {
    setSkills((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRelation = () => setRelations((prev) => [...prev, { ...defaultRelation }]);
  const removeRelation = (index) => setRelations((prev) => prev.filter((_, i) => i !== index));
  const updateRelation = (index, field, value) => {
    setRelations((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addTimeSlot = () => setTimeSlots((prev) => [...prev, { ...defaultTimeSlot }]);
  const removeTimeSlot = (index) => setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  const updateTimeSlot = (index, field, value) => {
    setTimeSlots((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...interview,
        CompanyCode: localStorage.getItem("companyCode") || "01",
        InterviewDate: interview.InterviewDate || new Date().toISOString(),
        skills: skills.filter((row) => row.SkillName || row.Experience),
        relations: relations.filter((row) => row.RelationName || row.Relationship || row.Age),
        timeSlots: timeSlots.filter((row) => row.InterviewDateTime || row.notes),
        finalEntry,
      };

      if (!payload.InterviewCode || !payload.CandidateName) {
        throw new Error("Interview code and candidate name are required.");
      }

      const response = await fetch(`${API_BASE_URL}/interviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Interview could not be saved.");
      }

      setMessage(`Interview saved successfully${data?.interviewId ? ` (ID: ${data.interviewId})` : ""}.`);
      setInterview({ ...initialInterview, CompanyCode: localStorage.getItem("companyCode") || "01" });
      setSkills([defaultSkill]);
      setRelations([defaultRelation]);
      setTimeSlots([defaultTimeSlot]);
      setFinalEntry(initialFinal);
      setTimeout(() => {
        setMessage("");
        setCurrentTab(1);
        fetchInterviews();
      }, 2000);
    } catch (err) {
      setError(err.message || "Unable to save interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item) => {
    setSelectedInterview(item);
    setCurrentTab(2);
  };

  const handleBackToList = () => {
    setSelectedInterview(null);
    setCurrentTab(1);
  };

  return (
    <Stack spacing={0}>
      {/* Header Card */}
      <Card sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #dfe7e5" }}>
        <Box sx={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)", color: "#fff", p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Interview Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Create, manage and review candidate interviews</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip icon={<Person />} label="Recruitment" sx={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Box>
      </Card>

      {/* Alerts */}
      {message && <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb", mt: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ 
            "& .MuiTab-root": { 
              textTransform: "none", 
              fontWeight: 600,
              fontSize: "1rem",
              color: "#6b7280",
              "&.Mui-selected": { color: "#6366f1" }
            },
            "& .MuiTabs-indicator": { backgroundColor: "#6366f1" }
          }}
        >
          <Tab label="New Interview" id="tab-0" />
          <Tab label="Interview List" id="tab-1" />
          {selectedInterview && <Tab label="Interview Details" id="tab-2" />}
        </Tabs>
      </Box>

      {/* Tab 1: New Interview Form */}
      <TabPanel value={currentTab} index={0}>
        <Card sx={{ borderRadius: 3, bgcolor: "#ffffff", border: "1px solid #f3f4f6" }}>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb" }}>
                  <Tabs value={formTab} onChange={(event, newValue) => setFormTab(newValue)} variant="scrollable" scrollButtons="auto">
                    <Tab label="Candidate Details" />
                    <Tab label="Family Details" />
                    <Tab label="Skills" />
                    <Tab label="Interview Time" />
                    <Tab label="Final Review" />
                  </Tabs>
                </Box>

                {formTab === 0 && (
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: "#1f2937" }}>Basic Candidate Details</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Interview Code" name="InterviewCode" value={interview.InterviewCode} onChange={handleInterviewChange} required /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Interview Date" name="InterviewDate" type="date" value={interview.InterviewDate} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Candidate Name" name="CandidateName" value={interview.CandidateName} onChange={handleInterviewChange} required /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Gender" name="Gender" value={interview.Gender} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Age" name="Age" type="number" value={interview.Age} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Marital Status" name="MaritialStatus" value={interview.MaritialStatus} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Contact Number" name="ContactNumber" value={interview.ContactNumber} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Alternate Contact" name="ContactNumber1" value={interview.ContactNumber1} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Email" name="EmailID" value={interview.EmailID} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Permanent Location" name="PermanentLocation" value={interview.PermanentLocation} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Present Location" name="PresentLocation" value={interview.PresentLocation} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Highest Qualification" name="HighestQualification" value={interview.HighestQualification} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Previous Designation" name="PreviousDesignation" value={interview.PreviousDesignation} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Posting Applying For" name="PostingApplyingFor" value={interview.PostingApplyingFor} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Category" name="Category" value={interview.Category} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Referred By" name="RefferedBy" value={interview.RefferedBy} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Total Experience (Years)" name="TotalExperience" type="number" value={interview.TotalExperience} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Current CTC" name="CurrentCTC" type="number" value={interview.CurrentCTC} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Expected CTC" name="ExpectedCTC" type="number" value={interview.ExpectedCTC} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Notice Period (Days)" name="NoticePeriod" type="number" value={interview.NoticePeriod} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Expected Joining Date" name="ExpectedJoiningDate" type="date" value={interview.ExpectedJoiningDate} onChange={handleInterviewChange} /></Grid>
                      <Grid item xs={12}><RowField label="Address" name="Address" value={interview.Address} onChange={handleInterviewChange} multiline minRows={2} /></Grid>
                      <Grid item xs={12}><RowField label="Reason to Relieve" name="ReasontoReleave" value={interview.ReasontoReleave} onChange={handleInterviewChange} multiline minRows={2} /></Grid>
                      <Grid item xs={12}><RowField label="Remarks" name="Remarks" value={interview.Remarks} onChange={handleInterviewChange} multiline minRows={2} /></Grid>
                    </Grid>

                  </Box>
                )}

                {formTab === 1 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: "#1f2937" }}>Family & Relations</Typography>
                      <Button variant="outlined" onClick={addRelation} startIcon={<Add />} size="small">Add Relation</Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {relations.map((row, index) => (
                        <Paper key={`relation-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#f9fafb" }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}><TextField label="Name" value={row.RelationName} onChange={(e) => updateRelation(index, "RelationName", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={4}><TextField label="Relationship" value={row.Relationship} onChange={(e) => updateRelation(index, "Relationship", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={3}><TextField label="Age" type="number" value={row.Age} onChange={(e) => updateRelation(index, "Age", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={1}><IconButton color="error" onClick={() => removeRelation(index)} disabled={relations.length === 1} size="small"><Delete /></IconButton></Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {formTab === 2 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: "#1f2937" }}>Skills</Typography>
                      <Button variant="outlined" onClick={addSkill} startIcon={<Add />} size="small">Add Skill</Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {skills.map((row, index) => (
                        <Paper key={`skill-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#f9fafb" }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={7}><TextField label="Skill Name" value={row.SkillName} onChange={(e) => updateSkill(index, "SkillName", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={4}><TextField label="Years" type="number" value={row.Experience} onChange={(e) => updateSkill(index, "Experience", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={1}><IconButton color="error" onClick={() => removeSkill(index)} disabled={skills.length === 1} size="small"><Delete /></IconButton></Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {formTab === 3 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: "#1f2937" }}>Interview Schedule</Typography>
                      <Button variant="outlined" onClick={addTimeSlot} startIcon={<Add />} size="small">Add Time Slot</Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {timeSlots.map((row, index) => (
                        <Paper key={`slot-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#f9fafb" }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={5}><TextField label="Date & Time" type="datetime-local" value={row.InterviewDateTime} onChange={(e) => updateTimeSlot(index, "InterviewDateTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} size="small" /></Grid>
                            <Grid item xs={12} sm={6}><TextField label="Notes" value={row.notes} onChange={(e) => updateTimeSlot(index, "notes", e.target.value)} fullWidth size="small" /></Grid>
                            <Grid item xs={12} sm={1}><IconButton color="error" onClick={() => removeTimeSlot(index)} disabled={timeSlots.length === 1} size="small"><Delete /></IconButton></Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {formTab === 4 && (
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: "#1f2937" }}>Final Interview Result</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}><RowField label="ID Proof Type" name="IDProof" value={finalEntry.IDProof} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="ID Proof Number" name="IDProofNumber" value={finalEntry.IDProofNumber} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Final Round Status" name="FinalRoundStatus" value={finalEntry.FinalRoundStatus} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Final Round Score" name="FinalRoundScore" type="number" value={finalEntry.FinalRoundScore} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Interview Status" name="InterviewStatus" value={finalEntry.InterviewStatus} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6} md={4}><RowField label="Fixed CTC" name="FixedCTC" type="number" value={finalEntry.FixedCTC} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12} sm={6}><RowField label="Joining Date" name="JoiningDate" type="date" value={finalEntry.JoiningDate} onChange={handleFinalChange} /></Grid>
                      <Grid item xs={12}><RowField label="Final Notes" name="Notes" value={finalEntry.Notes} onChange={handleFinalChange} multiline minRows={2} /></Grid>
                    </Grid>
                  </Box>
                )}

                <Button type="submit" variant="contained" startIcon={<Save />} disabled={loading} size="large" sx={{ mt: 2 }}>
                  {loading ? "Saving..." : "Save Interview"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: Interview List */}
      <TabPanel value={currentTab} index={1}>
        <Card sx={{ borderRadius: 3, bgcolor: "#ffffff", border: "1px solid #f3f4f6" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: "#1f2937" }}>All Interviews</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f9fafb" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }}>Interview Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }}>Candidate Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#374151" }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: "#9ca3af" }}>
                        No interviews found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((item) => (
                      <TableRow key={item.InterviewID} hover sx={{ "&:hover": { bgcolor: "#f9fafb" } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.InterviewCode}</TableCell>
                        <TableCell>{item.CandidateName || "-"}</TableCell>
                        <TableCell>{item.PostingApplyingFor || "-"}</TableCell>
                        <TableCell>{item.ContactNumber || "-"}</TableCell>
                        <TableCell>{item.InterviewDate ? new Date(item.InterviewDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleViewDetails(item)}
                            sx={{ textTransform: "none", color: "#6366f1", borderColor: "#c7d2fe" }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Interview Details */}
      {selectedInterview && (
        <TabPanel value={currentTab} index={2}>
          <Stack spacing={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBackToList}
              sx={{ alignSelf: "flex-start", textTransform: "none" }}
            >
              Back to List
            </Button>

            <Card sx={{ borderRadius: 3, bgcolor: "#ffffff", border: "1px solid #f3f4f6" }}>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Header */}
                  <Grid item xs={12}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: "#1f2937", mb: 1 }}>
                      {selectedInterview.CandidateName}
                    </Typography>
                    <Chip label={selectedInterview.InterviewCode} variant="outlined" size="small" />
                  </Grid>

                  {/* Basic Info */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: "#1f2937", mb: 2 }}>Basic Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Position</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.PostingApplyingFor || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Interview Date</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.InterviewDate ? new Date(selectedInterview.InterviewDate).toLocaleDateString() : "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Gender</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.Gender || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Age</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.Age || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Contact</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.ContactNumber || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Email</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5, wordBreak: "break-all" }}>{selectedInterview.EmailID || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Experience</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{selectedInterview.TotalExperience ? `${selectedInterview.TotalExperience} years` : "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Current CTC</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>₹{selectedInterview.CurrentCTC || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Expected CTC</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>₹{selectedInterview.ExpectedCTC || "-"}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  {/* Address & Qualifications */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: "#1f2937", mb: 2 }}>Additional Details</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>Address</Typography>
                          <Typography variant="body2">{selectedInterview.Address || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>Previous Designation</Typography>
                          <Typography variant="body2">{selectedInterview.PreviousDesignation || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>Reason to Relieve</Typography>
                          <Typography variant="body2">{selectedInterview.ReasontoReleave || "-"}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>Remarks</Typography>
                          <Typography variant="body2">{selectedInterview.Remarks || "-"}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>
      )}
    </Stack>
  );
}
