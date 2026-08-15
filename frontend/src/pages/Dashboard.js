import { useState, useEffect } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  AccountCircle,
  Business,
  CheckCircle,
  Dashboard as DashboardIcon,
  FilePresent,
  Logout,
  LocationOn,
  Person,
  TrendingUp,
  People,
  EventNote,
  Notifications,
  ArrowForward,
  KeyboardArrowDown,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { PhotoCamera, Draw } from "@mui/icons-material";
import { Menu as MuiMenu, MenuItem } from "@mui/material";
import { API_BASE_URL } from "../config";
import Attendance from "./Attendance";
import EmpImage from "./EmpImage";
import EmpDocument from "./EmpDocument";
import CompanyDocument from "./CompanyDocument";
import EmployeeSignature from "./EmployeeSignature";
import InterviewScreen from "./InterviewScreen";
import VisitorScreen from "./VisitorScreen";
import LeaveEntry from "./LeaveEntry";

function DashboardOverview({ stats }) {
  const metricCards = [
    { label: "Employee", value: String(stats.employeeLiveCount ?? stats.totalEmployees ?? 0), color: "#1fc7b5" },
    { label: "Candidate Visiting Today", value: String(stats.interviewTodayCount ?? 0), color: "#8c7af5" },
    { label: "GeoFence", value: String(stats.geofenceDetailsCount ?? stats.geofenceCheckins ?? 0), color: "#ffb248" },
    { label: "Field Executives", value: String(stats.fieldCount ?? stats.fieldVisits ?? 0), color: "#ff7d6b" },
    { label: "Visitor", value: String(stats.visitorCount ?? 0), color: "#46b5ff" },
    { label: "Leave", value: String(stats.leaveCount ?? 0), color: "#6bc06f" },
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(180px, 1fr))", xl: "repeat(6, minmax(150px, 1fr))" }, gap: 2 }}>
        {metricCards.map((card) => (
          <Card key={card.label} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fb 100%)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)" }}>
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ width: 30, height: 30, borderRadius: 2, background: card.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                  {card.label.charAt(0)}
                </Box>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", mb: 0.5, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>
                {card.value}
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>
                {card.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.5fr 1fr" }, gap: 3 }}>
        <Card sx={{ borderRadius: 3, border: "1px solid #edf2f7", background: "#ffffff", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)" }}>
          <CardContent sx={{ py: 3, px: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>Today Overview</Typography>
              <Chip label="Live" size="small" sx={{ background: "#e8f0ff", color: "#315fd4", fontWeight: 700 }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "end", justifyContent: "space-between", height: 180, gap: 1.2, px: 1, py: 1 }}>
              {[42, 66, 52, 84, 96, 70, 88].map((value, idx) => (
                <Box key={idx} sx={{ flex: 1, display: "flex", alignItems: "end", justifyContent: "center" }}>
                  <Box sx={{ width: "72%", height: `${value}%`, background: idx % 2 === 0 ? "#5f77ff" : "#99b3ff", borderRadius: "10px 10px 0 0" }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Stack spacing={3}>
          <Card sx={{ borderRadius: 3, border: "1px solid #edf2f7", background: "#ffffff", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)" }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>Employee Live</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#111827", mt: 1, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>
                {stats.employeeLiveCount ?? stats.totalEmployees ?? 0}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, border: "1px solid #edf2f7", background: "#ffffff", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)" }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>Attendance Checkin</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#111827", mt: 1, fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>
                {stats.geofenceDetailsCount ?? stats.geofenceCheckins ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Stack>
  );
}


export default function Dashboard({ username, userType = "admin", onLogout }) {
  const navItems = userType === "employee"
    ? [
        { label: "Geofence", icon: <LocationOn /> },
        { label: "Leave Entry", icon: <FilePresent /> },
      ]
    : [
        { label: "Dashboard", icon: <DashboardIcon /> },
        { label: "Leave Approval", icon: <CheckCircle /> },
        { label: "Interview", icon: <Person /> },
        { label: "Visitor", icon: <Person /> },
        { label: "Geofence", icon: <LocationOn /> },
        { label: "Emp Image", icon: <PhotoCamera /> },
        { label: "Signature", icon: <Draw /> },
        { label: "Documents", icon: <FilePresent /> },
        { label: "Company Documents", icon: <FilePresent /> },
      ];
  const [activeSection, setActiveSection] = useState(userType === "employee" ? "Geofence" : "Dashboard");
  const [companyName, setCompanyName] = useState("Company");
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    leaveCount: 0,
    candidateCount: 0,
    documentsVerified: 0,
    geofenceCheckins: 0,
    geofenceDetailsCount: 0,
    fieldVisits: 0,
    fieldCount: 0,
    employeeLiveCount: 0,
    interviewTodayCount: 0,
    visitorCount: 0,
    joinedEmployees: 0,
    leftEmployees: 0,
    joinsToday: 0,
    leftsToday: 0,
  });

  useEffect(() => {
    fetchCompanyName();
    fetchDashboardSummary();
  }, []);

  const fetchCompanyName = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies`);
      if (response.ok) {
        const data = await response.json();
        const company = data[0] || {};
        const nameValue = company.companyname || company.CompanyName || company.COMPANYNAME || company.company_name;
        if (nameValue) setCompanyName(nameValue);
      }
    } catch (err) {
      console.error("Failed to fetch company name:", err);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-summary`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setDashboardStats({
        totalEmployees: Number(data?.totalEmployees || 0),
        leaveCount: Number(data?.leaveCount ?? data?.totalLeaves ?? data?.candidateCount ?? data?.documentsVerified ?? 0),
        candidateCount: Number(data?.candidateCount ?? data?.leaveCount ?? data?.totalLeaves ?? data?.documentsVerified ?? 0),
        documentsVerified: Number(data?.documentsVerified ?? data?.candidateCount ?? data?.leaveCount ?? 0),
        geofenceCheckins: Number(data?.geofenceCheckins || 0),
        geofenceDetailsCount: Number(data?.geofenceDetailsCount ?? (data?.geofenceCheckins || 0)),
        fieldVisits: Number(data?.fieldVisits || 0),
        fieldCount: Number(data?.fieldCount ?? (data?.fieldVisits || 0)),
        employeeLiveCount: Number(data?.employeeLiveCount ?? (data?.totalEmployees || 0)),
        interviewTodayCount: Number(data?.interviewTodayCount || 0),
        visitorCount: Number(data?.visitorCount || 0),
        joinedEmployees: Number(data?.joinsToday || data?.joinedEmployees || 0),
        leftEmployees: Number(data?.leftsToday || data?.leftEmployees || 0),
        joinsToday: Number(data?.joinsToday || 0),
        leftsToday: Number(data?.leftsToday || 0),
      });
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    }
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const handleNavSelect = (label) => {
    setActiveSection(label);
    setMobileNavOpen(false);
  };

  const renderSidebar = (isMobile = false) => (
    <Box sx={{
      background: isMobile ? "linear-gradient(180deg, #0c3d5a 0%, #0f8b94 100%)" : "linear-gradient(180deg, #0c3d5a 0%, #0f8b94 100%)",
      p: 2.5,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      width: isMobile ? 260 : "100%",
      minHeight: isMobile ? "100vh" : "auto",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "#fff", pb: 1 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 3, background: "linear-gradient(135deg, rgba(111, 255, 170, 0.35), rgba(18, 154, 95, 0.85))", border: "1px solid rgba(180,255,210,0.75)", boxShadow: "0 10px 24px rgba(16, 185, 129, 0.28)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.8, background: "linear-gradient(135deg, #f0fff6 0%, #d9fbe7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0c7a4c", fontWeight: 900, fontSize: 15 }}>
            {companyName?.charAt(0)?.toUpperCase() || "C"}
          </Box>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#edfdf4", fontFamily: '"Roboto", "Segoe UI", sans-serif', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.02em" }}>Divine HRMS</Typography>
        </Box>
      </Box>

      <List disablePadding sx={{ display: "grid", gap: 0.7, mt: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.label}
            selected={activeSection === item.label}
            onClick={() => handleNavSelect(item.label)}
            sx={{
              borderRadius: 2,
              px: 1.5,
              py: 1.1,
              color: activeSection === item.label ? "#1d4ed8" : "rgba(255,255,255,0.85)",
              background: activeSection === item.label ? "rgba(255,255,255,0.92)" : "transparent",
              "&.Mui-selected": { background: "rgba(255,255,255,0.92)" },
              "&:hover": { background: activeSection === item.label ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: '"Roboto", "Segoe UI", sans-serif', fontWeight: activeSection === item.label ? 700 : 500 }} />
          </ListItemButton>
        ))}
      </List>

    </Box>
  );

  const renderContent = () => {
    if (activeSection === "Dashboard") {
      return <DashboardOverview stats={dashboardStats} />;
    }

    if (activeSection === "Geofence") {
      return <Attendance />;
    }

    if (activeSection === "Leave Entry") {
      return <LeaveEntry userType="employee" username={username} />;
    }

    if (activeSection === "Leave Approval") {
      return <LeaveEntry userType="admin" username={username} />;
    }

    if (activeSection === "Interview") {
      return <InterviewScreen />;
    }

    if (activeSection === "Visitor") {
      return <VisitorScreen />;
    }

    if (activeSection === "Emp Image") {
      return <EmpImage />;
    }

    if (activeSection === "Signature") {
      return <EmployeeSignature />;
    }

    if (activeSection === "Documents") {
      return <EmpDocument />;
    }

    if (activeSection === "Company Documents") {
      return <CompanyDocument />;
    }

    return (
      <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
        <CardContent>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{activeSection}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            This section is ready for geofence operations.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f9fbff", borderRadius: 3 }}>
            <Typography variant="body1">• Geofence check-ins</Typography>
            <Typography variant="body1">• Location and selfie tracking</Typography>
          </Paper>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #ecf4f3 0%, #dfeef3 38%, #eef5f1 100%)", fontFamily: '"Roboto", "Segoe UI", sans-serif' }}>
      <Box sx={{ maxWidth: 1500, mx: "auto", px: { xs: 2, lg: 3 }, py: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "220px 1fr" }, borderRadius: "24px", overflow: "hidden", background: "#fafaf9", boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)" }}>
          <Box sx={{ display: { xs: "none", lg: "flex" }, width: "100%" }}>
            {renderSidebar(false)}
          </Box>

          <Box sx={{ background: "#f6f8f7", p: { xs: 2.2, lg: 3 }, minHeight: 760 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0, flex: 1 }}>
                  <IconButton
                    sx={{ display: { xs: "inline-flex", lg: "none" }, background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }}
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="open menu"
                  >
                    <MenuIcon />
                  </IconButton>
                  <Box sx={{ minWidth: 0 }}>
                    
                    <Typography variant="subtitle1" sx={{ color: "#0d8a55", fontWeight: 900, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: '"Roboto", "Segoe UI", sans-serif', fontSize: { xs: "1rem", sm: "1.15rem" } }}>
                      {companyName}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton sx={{ background: "#fff", border: "1px solid #e5e7eb", color: "#374151", width: 40, height: 40 }}><Notifications /></IconButton>
                  <Button
                    onClick={handleUserMenuOpen}
                    endIcon={<KeyboardArrowDown />}
                    sx={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      px: 1.1,
                      py: 0.7,
                      minWidth: 0,
                      color: "#1f2937",
                      textTransform: "none",
                      boxShadow: "none",
                      "&:hover": { background: "#fff" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ bgcolor: "#dfeaf7", color: "#1f2937", width: 28, height: 28, fontSize: 12 }}>{username?.charAt(0)?.toUpperCase() || "U"}</Avatar>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1f2937", fontFamily: '"Roboto", "Segoe UI", sans-serif', whiteSpace: "nowrap" }}>{username || "User"}</Typography>
                    </Box>
                  </Button>
                  <MuiMenu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <MenuItem onClick={handleLogout} sx={{ gap: 1 }}>
                      <Logout fontSize="small" />
                      Logout
                    </MenuItem>
                  </MuiMenu>
                </Stack>
              </Box>

              <Typography variant="h4" sx={{ color: "#111827", fontWeight: 900, letterSpacing: "0.02em", fontFamily: '"Roboto", "Segoe UI", sans-serif', fontSize: { xs: "1.7rem", sm: "2.2rem" } }}>
                {activeSection.toUpperCase()}
              </Typography>
            </Box>
            {renderContent()}
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { background: "transparent", boxShadow: "none" } }}
      >
        {renderSidebar(true)}
      </Drawer>
    </Box>
  );
}
