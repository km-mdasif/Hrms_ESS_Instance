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
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete, Person, Save } from "@mui/icons-material";
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
    />
  );
}

export default function InterviewScreen() {
  const [interview, setInterview] = useState(initialInterview);
  const [skills, setSkills] = useState([defaultSkill]);
  const [relations, setRelations] = useState([defaultRelation]);
  const [timeSlots, setTimeSlots] = useState([defaultTimeSlot]);
  const [finalEntry, setFinalEntry] = useState(initialFinal);
  const [records, setRecords] = useState([]);
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
      fetchInterviews();
    } catch (err) {
      setError(err.message || "Unable to save interview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Interview Management</Typography>
              <Typography color="text.secondary">Create and manage interview details for candidates.</Typography>
            </Box>
            <Chip icon={<Person />} label="Admin" color="primary" />
          </Stack>
        </CardContent>
      </Card>

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Basic Candidate Details</Typography>
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
                  <Grid item xs={12} sm={6} md={4}><RowField label="Total Experience" name="TotalExperience" type="number" value={interview.TotalExperience} onChange={handleInterviewChange} /></Grid>
                  <Grid item xs={12} sm={6} md={4}><RowField label="Current CTC" name="CurrentCTC" type="number" value={interview.CurrentCTC} onChange={handleInterviewChange} /></Grid>
                  <Grid item xs={12} sm={6} md={4}><RowField label="Expected CTC" name="ExpectedCTC" type="number" value={interview.ExpectedCTC} onChange={handleInterviewChange} /></Grid>
                  <Grid item xs={12} sm={6} md={4}><RowField label="Notice Period" name="NoticePeriod" type="number" value={interview.NoticePeriod} onChange={handleInterviewChange} /></Grid>
                  <Grid item xs={12} sm={6} md={4}><RowField label="Expected Joining Date" name="ExpectedJoiningDate" type="date" value={interview.ExpectedJoiningDate} onChange={handleInterviewChange} /></Grid>
                  <Grid item xs={12}><RowField label="Address" name="Address" value={interview.Address} onChange={handleInterviewChange} multiline minRows={3} /></Grid>
                  <Grid item xs={12}><RowField label="Reason to Relieve" name="ReasontoReleave" value={interview.ReasontoReleave} onChange={handleInterviewChange} multiline minRows={3} /></Grid>
                  <Grid item xs={12}><RowField label="Remarks" name="Remarks" value={interview.Remarks} onChange={handleInterviewChange} multiline minRows={3} /></Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={800}>Skills</Typography>
                  <Button variant="outlined" onClick={addSkill} startIcon={<Add />}>Add Skill</Button>
                </Stack>
                <Stack spacing={2}>
                  {skills.map((row, index) => (
                    <Paper key={`skill-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={7}><TextField label="Skill Name" value={row.SkillName} onChange={(e) => updateSkill(index, "SkillName", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={4}><TextField label="Experience" type="number" value={row.Experience} onChange={(e) => updateSkill(index, "Experience", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={1} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <IconButton color="error" onClick={() => removeSkill(index)} disabled={skills.length === 1}><Delete /></IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={800}>Family / Relations</Typography>
                  <Button variant="outlined" onClick={addRelation} startIcon={<Add />}>Add Relation</Button>
                </Stack>
                <Stack spacing={2}>
                  {relations.map((row, index) => (
                    <Paper key={`relation-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}><TextField label="Relation Name" value={row.RelationName} onChange={(e) => updateRelation(index, "RelationName", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={4}><TextField label="Relationship" value={row.Relationship} onChange={(e) => updateRelation(index, "Relationship", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={3}><TextField label="Age" type="number" value={row.Age} onChange={(e) => updateRelation(index, "Age", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={1} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <IconButton color="error" onClick={() => removeRelation(index)} disabled={relations.length === 1}><Delete /></IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={800}>Interview Time Entry</Typography>
                  <Button variant="outlined" onClick={addTimeSlot} startIcon={<Add />}>Add Slot</Button>
                </Stack>
                <Stack spacing={2}>
                  {timeSlots.map((row, index) => (
                    <Paper key={`slot-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={5}><TextField label="Interview Date & Time" type="datetime-local" value={row.InterviewDateTime} onChange={(e) => updateTimeSlot(index, "InterviewDateTime", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={12} sm={6}><TextField label="Notes" value={row.notes} onChange={(e) => updateTimeSlot(index, "notes", e.target.value)} fullWidth /></Grid>
                        <Grid item xs={12} sm={1} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <IconButton color="error" onClick={() => removeTimeSlot(index)} disabled={timeSlots.length === 1}><Delete /></IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Final Interview Entry</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}><TextField label="ID Proof" name="IDProof" value={finalEntry.IDProof} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField label="ID Proof Number" name="IDProofNumber" value={finalEntry.IDProofNumber} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField label="Final Round Status" name="FinalRoundStatus" value={finalEntry.FinalRoundStatus} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField label="Final Round Score" name="FinalRoundScore" type="number" value={finalEntry.FinalRoundScore} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField label="Interview Status" name="InterviewStatus" value={finalEntry.InterviewStatus} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6} md={4}><TextField label="Fixed CTC" name="FixedCTC" type="number" value={finalEntry.FixedCTC} onChange={handleFinalChange} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Joining Date" name="JoiningDate" type="date" value={finalEntry.JoiningDate} onChange={handleFinalChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12}><TextField label="Notes" name="Notes" value={finalEntry.Notes} onChange={handleFinalChange} multiline minRows={3} fullWidth /></Grid>
                </Grid>
              </Box>

              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" startIcon={<Save />} disabled={loading}>
                  {loading ? "Saving..." : "Save Interview"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Recent Interviews</Typography>
            <Stack spacing={1.5}>
              {records.slice(0, 5).map((item) => (
                <Paper key={item.InterviewID} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{item.CandidateName || "Candidate"}</Typography>
                  <Typography variant="body2" color="text.secondary">Code: {item.InterviewCode} • Date: {item.InterviewDate ? new Date(item.InterviewDate).toLocaleDateString() : "-"}</Typography>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
