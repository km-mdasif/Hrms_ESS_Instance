import { useState, useEffect } from "react";
import {
  AppBar,
  Avatar,
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
  ExpandLess,
  ExpandMore,
  BarChart,
  Settings as SettingsIcon,
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
import VisitorEntry from "./VisitorEntry";
import LeaveEntry from "./LeaveEntry";
import FieldExecutive from "./FieldExecutive";
import ReportsScreen from "./ReportsScreen";
import Settings from "./Settings";

const safeGetItem = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    return false;
  }
};

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
        { label: "Field Executive", icon: <LocationOn /> },
        { label: "Attendance", icon: <LocationOn />, children: [{ label: "Attendance Geo Fence", value: "Geofence" }] },
        { label: "Leave Entry", icon: <FilePresent /> },
        { label: "Settings", icon: <SettingsIcon /> },
      ]
    : [
        { label: "Dashboard", icon: <DashboardIcon /> },
        { label: "Approval", icon: <CheckCircle />, children: [{ label: "Leave Approval", value: "Leave Approval" }] },
        { label: "Attendance", icon: <LocationOn />, children: [{ label: "Attendance Geo Fence", value: "Geofence" }] },
        { label: "Field Executives", icon: <LocationOn /> },
        { label: "Employee", icon: <Person />, children: [
          { label: "Documents", value: "Documents" },
          { label: "Emp Image", value: "Emp Image" },
          { label: "Signature", value: "Signature" },
        ] },
        { label: "Interview", icon: <EventNote /> },
        { label: "Visitor", icon: <People /> },
        { label: "Reports", icon: <BarChart />, children: [
          { label: "Attendance Geo Fence List", value: "ReportsAttendance" },
          { label: "Field Executive", value: "ReportsFieldExecutive" },
          { label: "Interview", value: "ReportsInterview" },
          { label: "Visitor", value: "ReportsVisitor" },
          { label: "Leave Entries", value: "ReportsLeave" },
        ] },
        { label: "Company", icon: <Business />, children: [{ label: "Company Document", value: "Company Documents" }] },
        { label: "Settings", icon: <SettingsIcon /> },
      ];
  const [activeSection, setActiveSection] = useState(userType === "employee" ? "Geofence" : "Dashboard");
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [companyName, setCompanyName] = useState(() => safeGetItem("companyName", window.COMPANY_NAME || "Company"));
  const [companyCode, setCompanyCode] = useState(() => safeGetItem("companyCode", window.COMPANY_CODE || "01"));
  const displayUserName = String(username || "User").trim() || "User";
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
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
    const token = safeGetItem("token");
    if (!token) {
      if (typeof onLogout === "function") {
        onLogout();
      }
      return;
    }

    fetchCompanyName();
    fetchDashboardSummary();
  }, [onLogout]);

  const fetchCompanyName = async () => {
    const storedCompanyName = safeGetItem("companyName", window.COMPANY_NAME || "");
    const storedCompanyCode = safeGetItem("companyCode", window.COMPANY_CODE || "01");
    if (storedCompanyName) {
      setCompanyName(storedCompanyName);
    }
    if (storedCompanyCode) {
      setCompanyCode(storedCompanyCode);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/companies`);
      if (response.ok) {
        const data = await response.json();
        const company = Array.isArray(data)
          ? (data.find((item) => String(item.companycode || item.CompanyCode || item.COMPANYCODE || "").trim() === String(storedCompanyCode).trim()) || data[0] || {})
          : {};

        const nameValue = company.companyname || company.CompanyName || company.COMPANYNAME || company.company_name || company.companyName;
        const codeValue = company.companycode || company.CompanyCode || company.COMPANYCODE || storedCompanyCode || "01";

        if (nameValue) {
          setCompanyName(nameValue);
          safeSetItem("companyName", nameValue);
          window.COMPANY_NAME = nameValue;
        }
        if (codeValue) {
          setCompanyCode(String(codeValue));
          safeSetItem("companyCode", String(codeValue));
          window.COMPANY_CODE = String(codeValue);
        }
      }
    } catch (err) {
      console.error("Failed to fetch company name:", err);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-summary`, {
        headers: {
          Authorization: `Bearer ${safeGetItem("token")}`,
        },
      });
      if (!response.ok) {
        return;
      }

      const responseData = await response.json();
      const data = responseData?.data || responseData;
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

  const handleProfileOpen = () => {
    handleUserMenuClose();
    setProfileDialogOpen(true);
  };

  const handleProfileClose = () => {
    setProfileDialogOpen(false);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    handleProfileClose();
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const handleNavSelect = (label) => {
    setActiveSection(label);
    setMobileNavOpen(false);
    setExpandedMenu(null);
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
        <Box sx={{ width: 46, height: 46, borderRadius: 3, background: "linear-gradient(135deg, rgba(145, 240, 175, 0.35), rgba(52, 211, 153, 0.7))", border: "1px solid rgba(209, 250, 229, 0.8)", boxShadow: "0 10px 24px rgba(16, 185, 129, 0.18)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.8, background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803d", fontWeight: 900, fontSize: 15 }}>
            D
          </Box>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#edfdf4", fontFamily: '"Roboto", "Segoe UI", sans-serif', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.02em" }}>Divine HRMS</Typography>
        </Box>
      </Box>

      <List disablePadding sx={{ display: "grid", gap: 0.7, mt: 1 }}>
        {navItems.map((item) => (
          <Box key={item.label}>
            <ListItemButton
              selected={activeSection === item.label}
              onClick={() => {
                if (item.children) {
                  setExpandedMenu(expandedMenu === item.label ? null : item.label);
                } else {
                  handleNavSelect(item.label);
                }
              }}
              sx={{
                borderRadius: 2,
                px: 1.5,
                py: 1.1,
                borderLeft: activeSection === item.label ? "4px solid #4ade80" : "4px solid transparent",
                color: activeSection === item.label ? "#0f172a" : "rgba(255,255,255,0.85)",
                background: activeSection === item.label
                  ? "linear-gradient(90deg, rgba(134, 239, 172, 0.16) 0%, rgba(255,255,255,0.96) 28%, rgba(255,255,255,0.96) 100%)"
                  : "transparent",
                boxShadow: activeSection === item.label ? "0 8px 20px rgba(74, 222, 128, 0.10)" : "none",
                "&.Mui-selected": {
                  background: "linear-gradient(90deg, rgba(134, 239, 172, 0.16) 0%, rgba(255,255,255,0.96) 28%, rgba(255,255,255,0.96) 100%)",
                },
                "&:hover": { background: activeSection === item.label ? "linear-gradient(90deg, rgba(134, 239, 172, 0.16) 0%, rgba(255,255,255,0.96) 28%, rgba(255,255,255,0.96) 100%)" : "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: '"Roboto", "Segoe UI", sans-serif', fontWeight: activeSection === item.label ? 700 : 500 }} />
              {item.children && (expandedMenu === item.label ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
            
            {item.children && expandedMenu === item.label && (
              <Box sx={{ pl: 2, display: "grid", gap: 0.5, mt: 0.5 }}>
                {item.children.map((child) => (
                  <ListItemButton
                    key={child.label}
                    selected={activeSection === (child.value || child.label)}
                    onClick={() => handleNavSelect(child.value || child.label)}
                    sx={{
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.9,
                      fontSize: 14,
                      borderLeft: activeSection === (child.value || child.label) ? "3px solid #86efac" : "3px solid transparent",
                      color: activeSection === (child.value || child.label) ? "#0f172a" : "rgba(255,255,255,0.75)",
                      background: activeSection === (child.value || child.label)
                        ? "linear-gradient(90deg, rgba(134, 239, 172, 0.14) 0%, rgba(255,255,255,0.94) 25%, rgba(255,255,255,0.96) 100%)"
                        : "transparent",
                      boxShadow: activeSection === (child.value || child.label) ? "0 6px 16px rgba(134, 239, 172, 0.08)" : "none",
                      "&.Mui-selected": {
                        background: "linear-gradient(90deg, rgba(134, 239, 172, 0.14) 0%, rgba(255,255,255,0.94) 25%, rgba(255,255,255,0.96) 100%)",
                      },
                      "&:hover": { background: activeSection === (child.value || child.label) ? "linear-gradient(90deg, rgba(134, 239, 172, 0.14) 0%, rgba(255,255,255,0.94) 25%, rgba(255,255,255,0.96) 100%)" : "rgba(255,255,255,0.06)" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: "inherit", fontSize: 18 }}>→</ListItemIcon>
                    <ListItemText primary={child.label} primaryTypographyProps={{ fontFamily: '"Roboto", "Segoe UI", sans-serif', fontWeight: activeSection === (child.value || child.label) ? 700 : 500, fontSize: 14 }} />
                  </ListItemButton>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </List>

    </Box>
  );

  const renderContent = () => {
    if (activeSection === "Dashboard") {
      return <DashboardOverview stats={dashboardStats} />;
    }

    if (activeSection === "Field Executive" || activeSection === "Field Executives") {
      return <FieldExecutive username={username} userType={userType} />;
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

    if (activeSection === "ReportsAttendance") {
      return <ReportsScreen type="attendance" />;
    }

    if (activeSection === "ReportsFieldExecutive") {
      return <ReportsScreen type="fieldExecutive" />;
    }

    if (activeSection === "ReportsInterview") {
      return <ReportsScreen type="interview" />;
    }

    if (activeSection === "ReportsVisitor") {
      return <ReportsScreen type="visitor" />;
    }

    if (activeSection === "ReportsLeave") {
      return <ReportsScreen type="leave" />;
    }

    if (activeSection === "Interview Entry" || activeSection === "Interview") {
      return <InterviewScreen />;
    }

    if (activeSection === "Visitor Entry") {
      return <VisitorEntry />;
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

    if (activeSection === "Settings") {
      return <Settings />;
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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "220px minmax(0, 1fr)" }, borderRadius: "24px", overflow: "hidden", background: "#fafaf9", boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)" }}>
          <Box sx={{ display: { xs: "none", lg: "flex" }, width: "100%", minHeight: "100%" }}>
            {renderSidebar(false)}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <AppBar
              position="static"
              color="transparent"
              elevation={0}
              sx={{
                background: "linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)",
                borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
                boxShadow: "none",
              }}
            >
              <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, px: { xs: 2, lg: 3 }, py: 0.5 }}>
                <IconButton
                  edge="start"
                  onClick={() => setMobileNavOpen(true)}
                  sx={{ display: { xs: "inline-flex", lg: "none" }, mr: 1, color: "#0f172a" }}
                  aria-label="Open navigation"
                >
                  <MenuIcon />
                </IconButton>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                    {companyName || "Company"}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    onClick={handleUserMenuOpen}
                    variant="contained"
                    sx={{
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                      color: "#0f172a",
                      px: 1.1,
                      py: 0.7,
                      textTransform: "none",
                      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
                      border: "1px solid rgba(148, 163, 184, 0.15)",
                      minWidth: 0,
                      "&:hover": { background: "linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)" },
                    }}
                    startIcon={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", display: { xs: "none", sm: "block" } }}>
                            {userType === "admin" ? "Admin" : "Employee"}
                          </Typography>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: "#dbeafe", color: "#0f172a" }}>
                            <AccountCircle sx={{ fontSize: 17 }} />
                          </Avatar>
                        </Box>
                      </Box>
                    }
                  >
                    <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, color: "#0f172a" }}>
                        {displayUserName.toUpperCase()}
                      </Typography>
                    </Box>
                  </Button>
                </Stack>
              </Toolbar>
            </AppBar>

            <Box sx={{ background: "#f6f8f7", p: { xs: 2.2, lg: 3 }, flex: 1 }}>
              {renderContent()}
            </Box>
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

      <MuiMenu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 180, borderRadius: 2, mt: 1, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" } }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 1.2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#1f2937" }}>{userType === "admin" ? "Admin" : "Employee"}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{displayUserName.toUpperCase()}</Typography>
          </Box>
        </Box>
        <MenuItem onClick={handleProfileOpen} sx={{ gap: 1 }}>
          <AccountCircle fontSize="small" />
          My Profile
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ gap: 1 }}>
          <Logout fontSize="small" />
          Logout
        </MenuItem>
      </MuiMenu>

      <Dialog open={profileDialogOpen} onClose={handleProfileClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>User Profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: "50%", background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                HR
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">{userType === "admin" ? "Admin" : "Employee"}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{displayUserName.toUpperCase()}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Company</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{companyName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Role</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{userType === "admin" ? "HR Admin" : "Employee User"}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProfileClose} variant="contained" sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
