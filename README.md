# 🌟 Divine HRMS - Employee Self-Service Portal

A modern, responsive HR management system built with React and Express.js, supporting desktop and mobile access across all devices.

**Status:** ✅ Production-Ready | ✅ Multi-Device Compatible | ✅ Cross-Platform Mobile Support

---

## 📱 Supported Devices & Platforms

- ✅ **Windows** - Chrome, Firefox, Edge
- ✅ **Linux** - Chrome, Firefox  
- ✅ **macOS** - Safari, Chrome, Firefox
- ✅ **iPhone / iPad** - Safari, Chrome
- ✅ **Android** - Chrome, Firefox
- ✅ **Tablets** - Any browser

---

## 🚀 Quick Start

### 1️⃣ Single Machine (Dev Mode)

```bash
# Backend
cd backend
npm install
npm start

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

**Access:** http://localhost:3000

### 2️⃣ Multi-Device / Mobile Testing (LAN Mode) ⭐ Recommended

See **[DEVICE_SETUP_GUIDE.md](DEVICE_SETUP_GUIDE.md)** for detailed instructions.

**Quick Steps:**
```bash
# 1. Find your PC IP: ipconfig (Windows)
# 2. Update backend/.env: ALLOWED_ORIGINS=http://192.168.x.x:3000
# 3. Update frontend/.env: REACT_APP_API_BASE_URL=http://192.168.x.x:5000
# 4. Start services
# 5. Access from mobile: http://192.168.x.x:3000
```

Or run the helper script:
```bash
node get-network-config.js
```

---

## 🔐 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | 123456 |
| Employee | [Employee ID] | [Setup Required] |

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DEVICE_SETUP_GUIDE.md](DEVICE_SETUP_GUIDE.md) | ⭐ **START HERE** - Complete guide for all devices and modes |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Initial setup and configuration |
| [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) | System architecture and components |
| [.env.modes](backend/.env.modes) | Backend configuration templates |
| [.env.modes](frontend/.env.modes) | Frontend configuration templates |

---

## 🏗️ Project Structure

```
Divine HRMS/
├── backend/                    # Express.js REST API
│   ├── src/
│   │   ├── database/          # MSSQL connection & queries
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, error handling
│   │   └── utils/             # Utilities
│   └── package.json
│
├── frontend/                   # React 18 + Material-UI
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   ├── context/           # Auth context
│   │   └── config.js          # Multi-mode configuration
│   └── package.json
│
├── certs/                      # SSL certificates
├── scripts/                    # Utility scripts
├── DEVICE_SETUP_GUIDE.md       # 📱 Device access guide
├── README.md                   # This file
└── package.json
```

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Material-UI (MUI) Components
- Axios HTTP Client
- Context API for State Management

**Backend:**
- Node.js + Express.js
- MSSQL Server Database
- JWT Authentication
- CORS Support for Multi-Device Access

---

## 🌍 Connection Modes

### Mode 1: Local Development
- Single machine only
- `http://localhost:3000`
- Best for: Quick development

### Mode 2: LAN Network (Recommended for Mobile) ⭐
- Multiple devices on same Wi-Fi
- `http://192.168.x.x:3000`
- Best for: Testing on iPhone/Android/tablets

### Mode 3: Docker Container
- Containerized deployment
- Automatic service discovery
- Best for: Production environments

### Mode 4: Production HTTPS
- Live domain with SSL
- `https://yourdomain.com`
- Best for: Public internet access

See [DEVICE_SETUP_GUIDE.md](DEVICE_SETUP_GUIDE.md) for detailed setup for each mode.

---

## 📋 Features

### Employee Features
- ✅ Dashboard Overview
- ✅ Attendance Check-in (Geofence)
- ✅ Leave Request & Tracking
- ✅ Interview Schedules
- ✅ Visitor Management
- ✅ Document Upload
- ✅ Profile Management

### Admin Features
- ✅ Employee Management
- ✅ Leave Approval
- ✅ Reports & Analytics
- ✅ Field Executive Tracking
- ✅ Attendance Monitoring
- ✅ Interview Management
- ✅ Settings & Configuration

---

## 🔧 API Documentation

**Swagger UI:** http://localhost:5000/api-docs

**Key Endpoints:**
- `POST /login` - User authentication
- `GET /dashboard-summary` - Dashboard data
- `GET /attendance` - Attendance records
- `GET /leave-entries` - Leave requests
- `PATCH /leave-entries/:id/approve` - Leave approval

---

## ✅ Verification Checklist

After setup:

- [ ] Backend running: `http://localhost:5000/health`
- [ ] Frontend running: `http://localhost:3000`
- [ ] Can login with credentials
- [ ] Dashboard loads all widgets
- [ ] Settings page shows connection info
- [ ] Mobile access works (LAN mode)

---

## 🐛 Troubleshooting

**Frontend won't load?**
- Clear browser cache
- Rebuild: `npm run build`
- Check REACT_APP_API_BASE_URL is correct

**Backend API errors?**
- Verify MSSQL connection in backend/.env
- Check ALLOWED_ORIGINS includes frontend origin
- Restart backend service

**Mobile/LAN access not working?**
- See [DEVICE_SETUP_GUIDE.md](DEVICE_SETUP_GUIDE.md) troubleshooting section
- Check Windows Firewall allows ports 3000 & 5000
- Verify IP address is correct

---

## 🆘 Support

For detailed setup and troubleshooting:
1. Check [DEVICE_SETUP_GUIDE.md](DEVICE_SETUP_GUIDE.md) first
2. Run `node get-network-config.js` for IP auto-detection
3. Visit Settings page in app for connection diagnostics

---

## 📝 License

Divine HRMS - All Rights Reserved

**Version:** 2.0 (Multi-Device Ready)  
**Last Updated:** August 18, 2024
