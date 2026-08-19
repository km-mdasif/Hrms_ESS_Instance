import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Grid,
  Alert,
  Paper,
} from '@mui/material';
import { API_BASE_URL } from '../config';

const safeGetItem = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const Settings = () => {
  const [clientInfo, setClientInfo] = useState({
    userAgent: '',
    hostname: '',
    protocol: '',
    url: '',
    currentMode: 'UNKNOWN',
  });
  const [empCode, setEmpCode] = useState('N/A');

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent || 'Unknown',
      hostname: window.location.hostname || 'localhost',
      protocol: window.location.protocol || 'http:',
      url: window.location.origin || 'http://localhost',
      currentMode: detectMode(),
    };
    setClientInfo(info);
    
    const storedEmpCode = safeGetItem('empCode', 'N/A');
    setEmpCode(storedEmpCode);
  }, []);

  const detectMode = () => {
    const hostname = window.location.hostname || '';
    const protocol = window.location.protocol || 'http:';

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'LOCAL_DEVELOPMENT';
    }

    if (/^192\.168\.|^10\.|^172\./.test(hostname)) {
      return 'LAN_NETWORK_ACCESS';
    }

    if (hostname.includes('localhost') || hostname === '0.0.0.0') {
      return 'LOCAL_DEVELOPMENT';
    }

    if (protocol === 'https:') {
      return 'PRODUCTION_HTTPS';
    }

    return 'UNKNOWN';
  };

  const getModeDescription = () => {
    switch (clientInfo.currentMode) {
      case 'LOCAL_DEVELOPMENT':
        return 'Single machine development. Only works on this PC/Mac.';
      case 'LAN_NETWORK_ACCESS':
        return 'Network access. Works on any device connected to the same Wi-Fi.';
      case 'PRODUCTION_HTTPS':
        return 'Production mode. Uses HTTPS with valid certificates.';
      default:
        return 'Unknown mode. Check your connection configuration.';
    }
  };

  const getModeColor = () => {
    switch (clientInfo.currentMode) {
      case 'LOCAL_DEVELOPMENT':
        return 'warning';
      case 'LAN_NETWORK_ACCESS':
        return 'success';
      case 'PRODUCTION_HTTPS':
        return 'info';
      default:
        return 'error';
    }
  };

  const getDeviceType = () => {
    const ua = clientInfo.userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android')) return 'Mobile (Android/iPhone)';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet (iPad/Android Tablet)';
    if (ua.includes('chrome')) return 'Desktop (Chrome)';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Desktop/Mobile (Safari)';
    if (ua.includes('firefox')) return 'Desktop (Firefox)';
    if (ua.includes('edge')) return 'Desktop (Edge)';
    return 'Unknown Device';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        ⚙️ Settings & Connection Info
      </Typography>

      {/* Current Connection Mode */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📡 Current Connection Mode
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Chip
              label={clientInfo.currentMode}
              color={getModeColor()}
              variant="filled"
              size="large"
            />
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {getModeDescription()}
          </Typography>

          {clientInfo.currentMode === 'LOCAL_DEVELOPMENT' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>To access from mobile/another device:</strong> Use MODE 2 (LAN) instead.
              This requires both frontend and backend to use your PC's network IP (e.g., 192.168.x.x),
              not localhost.
            </Alert>
          )}

          {clientInfo.currentMode === 'LAN_NETWORK_ACCESS' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>✓ Perfect for mobile testing!</strong> This mode allows access from any
              device on the same Wi-Fi network.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connection Details */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                🖥️ Frontend Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ '& .setting-row': { display: 'flex', justifyContent: 'space-between', mb: 1.5 } }}>
                <Box className="setting-row">
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    URL:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                    {clientInfo.url}
                  </Typography>
                </Box>
                <Box className="setting-row">
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Hostname:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {clientInfo.hostname}
                  </Typography>
                </Box>
                <Box className="setting-row">
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Protocol:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {clientInfo.protocol}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                🔌 Backend Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ '& .setting-row': { display: 'flex', justifyContent: 'space-between', mb: 1.5 } }}>
                <Box className="setting-row">
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    API Base URL:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                    {API_BASE_URL}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📱 Device Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box className="setting-row">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Device Type:
                </Typography>
                <Typography variant="body2">{getDeviceType()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                👤 User Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box className="setting-row">
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Logged In As:
                </Typography>
                <Typography variant="body2">{empCode}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Mode Setup Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ✅ Setup Instructions for All Devices
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Step 1: Find Your PC IP Address
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace' }}>
              <Typography variant="caption">
                Windows: Open Command Prompt, type: <strong>ipconfig</strong>
                <br />
                Look for "IPv4 Address" like: <strong>192.168.1.25</strong>
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Step 2: Update Backend .env (MODE 2 - LAN)
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption">
                HOST=0.0.0.0
                <br />
                PORT=5000
                <br />
                ALLOWED_ORIGINS=http://192.168.1.25:3000,http://192.168.1.25:5000
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Step 3: Update Frontend .env (MODE 2 - LAN)
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption">
                HTTPS=false
                <br />
                HOST=0.0.0.0
                <br />
                REACT_APP_API_BASE_URL=http://192.168.1.25:5000
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Step 4: Start Both Services
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption">
                Backend: npm start
                <br />
                Frontend: npm start
              </Typography>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Step 5: Open from Mobile/Tablet
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'success.light', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption">
                On iPhone/iPad/Android: Open browser and go to:
                <br />
                <strong>http://192.168.1.25:3000</strong>
                <br />
                (Replace 192.168.1.25 with your actual PC IP)
              </Typography>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🔧 Troubleshooting
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              ❌ Still getting "Cannot reach backend" on mobile?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Check that PC and mobile are on the <strong>same Wi-Fi network</strong>
              <br />
              • Verify the IP address is correct (run ipconfig on PC again)
              <br />
              • Disable firewall or allow port 3000 & 5000 through Windows Defender
              <br />
              • Restart both backend and frontend services
              <br />
              • Clear mobile browser cache and try again
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              ❌ Works on iPhone but not Android?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Android usually works fine if iPhone works
              <br />
              • Check Android device is on same Wi-Fi
              <br />
              • Use Chrome or Firefox on Android (not stock browser)
              <br />
              • Check backend ALLOWED_ORIGINS includes Android origins
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
