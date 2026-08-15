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
} from "@mui/icons-material";
import { PhotoCamera, Draw } from "@mui/icons-material";
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
  const statCards = [
    { title: "Total Employees", value: String(stats.totalEmployees), subtitle: "Active staff" },
    { title: "Leave", value: String(stats.leaveCount ?? stats.candidateCount ?? stats.documentsVerified ?? 0), subtitle: "Requests" },
    { title: "Geofence Checkins", value: String(stats.geofenceCheckins), subtitle: "Today" },
    { title: "Field Visits", value: String(stats.fieldVisits), subtitle: "Today" },
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
        {statCards.map((card) => (
          <Card key={card.title} sx={{ borderRadius: 4, height: "100%", bgcolor: "#ffffff" }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">{card.title}</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>{card.value}</Typography>
              <Chip label={card.subtitle} size="small" color="primary" sx={{ mt: 1.5 }} />
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 2 }}>
        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Monthly Trend</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
              Payroll, attendance, and approval activity for the current month.
            </Typography>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#f7faff" }}>
              <svg viewBox="0 0 320 180" width="100%" height="220">
                <rect x="20" y="20" width="280" height="140" rx="12" fill="#ffffff" />
                {[40, 90, 140, 190, 240].map((x, index) => (
                  <rect
                    key={x}
                    x={x}
                    y={140 - [60, 95, 75, 110, 80][index]}
                    width="30"
                    height={[60, 95, 75, 110, 80][index]}
                    rx="6"
                    fill={index % 2 === 0 ? "#2d60ff" : "#8eb0ff"}
                  />
                ))}
              </svg>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, bgcolor: "#ffffff" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Today’s Snapshot</Typography>
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: "#f9fbff" }}>
                <Typography variant="body2" color="text.secondary">Joined today</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.joinedEmployees} employees</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: "#f9fbff" }}>
                <Typography variant="body2" color="text.secondary">Left today</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.leftEmployees} employees</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: "#f9fbff" }}>
                <Typography variant="body2" color="text.secondary">Leave</Typography>
                <Typography variant="h6" fontWeight={800}>{stats.leaveCount ?? stats.candidateCount ?? stats.documentsVerified ?? 0}</Typography>
              </Paper>
            </Stack>
          </CardContent>
        </Card>
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
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    leaveCount: 0,
    candidateCount: 0,
    documentsVerified: 0,
    geofenceCheckins: 0,
    fieldVisits: 0,
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
        candidateCount: Number(data?.leaveCount ?? data?.totalLeaves ?? data?.candidateCount ?? data?.documentsVerified ?? 0),
        documentsVerified: Number(data?.leaveCount ?? data?.totalLeaves ?? data?.candidateCount ?? data?.documentsVerified ?? 0),
        geofenceCheckins: Number(data?.geofenceCheckins || 0),
        fieldVisits: Number(data?.fieldVisits || 0),
        joinedEmployees: Number(data?.joinsToday || data?.joinedEmployees || 0),
        leftEmployees: Number(data?.leftsToday || data?.leftEmployees || 0),
        joinsToday: Number(data?.joinsToday || 0),
        leftsToday: Number(data?.leftsToday || 0),
      });
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    }
  };

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
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7fb" }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: "1px solid #e6ecf5", bgcolor: "rgba(255,255,255,0.92)" }}>
        <Toolbar sx={{ justifyContent: "space-between", py: 1, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Business color="primary" />
            <Typography variant="h6" fontWeight={800}>{companyName}</Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>{username}</Typography>
            <Avatar sx={{ bgcolor: "primary.main" }}><AccountCircle /></Avatar>
            <IconButton onClick={onLogout} aria-label="logout">
              <Logout />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: { xs: "block", md: "flex" }, minHeight: "calc(100vh - 64px)" }}>
        <Box sx={{ width: { xs: "100%", md: 260 }, bgcolor: "#ffffff", borderRight: { xs: "none", md: "1px solid #e6ecf5" }, borderBottom: { xs: "1px solid #e6ecf5", md: "none" }, p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, px: 1 }}>Navigation</Typography>
          <List disablePadding sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(auto-fit, minmax(140px, 1fr))", md: "1fr" }, gap: 0.5 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                selected={activeSection === item.label}
                onClick={() => setActiveSection(item.label)}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: "#f8fbff" }}>
            <Typography variant="subtitle2" fontWeight={700}>Quick Summary</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              4 key operations in one place for finance, HR, and document review.
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>{activeSection}</Typography>
              <Typography color="text.secondary">A focused geofence workspace for location and attendance tracking.</Typography>
            </Box>
          </Stack>
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
