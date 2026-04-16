# RefTools-Pro

An industrial-grade HVAC/R (Heating, Ventilation, Air Conditioning & Refrigeration) engineering platform inspired by Danfoss Refrigerant Slider and advanced refrigerant property calculators. RefTools-Pro provides real-time thermodynamic calculations, refrigerant management, and an intuitive admin interface for managing custom refrigerants.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [API Endpoints](#api-endpoints)
- [User Workflows](#user-workflows)
- [Data Persistence](#data-persistence)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🎯 Project Overview

RefTools-Pro is designed to serve both **HVAC technicians** and **advanced engineers** with a modern, feature-rich platform for:

- **Real-time dynamic Calculations**: Pressure-temperature conversions for 150+ refrigerants
- **Dual-Role Access**: Separate interfaces for admins and regular users
- **Refrigerant Management**: Full CRUD operations for custom refrigerants
- **Dark Theme UI**: Professional Danfoss-inspired dark interface
- **Responsive Design**: Desktop and mobile support
- **Secure Authentication**: JWT-based user and admin login

### Target Users

| Role | Capabilities |
|------|--------------|
| **Regular Users** | Calculate pressure/temperature, view refrigerant data, restricted data access |
| **Admins** | Full CRUD for refrigerants, manage properties, import/export data |

---

## 🏗️ Architecture

RefTools-Pro is built with a **modern full-stack architecture**:

```
┌─────────────────────┐
│  React Frontend     │ Port 3000
│  (Components, UI)   │
└──────────┬──────────┘
           │ API Calls
           ▼
┌─────────────────────┐
│ Node.js + Express   │ Port 5000
│ (REST API Server)   │
│ (Auth, Calculations)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Data Layer                 │
│ • MongoDB (Users/Admins)    │
│ • JSON Files (Refrigerants) │
│ • Thermo-engine (Physics)   │
└─────────────────────────────┘
```

### Key Components

1. **Frontend** - React SPA with responsive UI and real-time calculations
2. **Backend** - Express server with REST API and authentication
3. **Thermo-Engine** - Physics calculations and refrigerant property interpolation
4. **Data Storage** - MongoDB for users/admins, JSON for refrigerant data
5. **Authentication** - JWT tokens with separate user/admin workflows

---

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- MongoDB running locally or connection string
- Git

### Installation (5 minutes)

```bash
# Clone the repository
git clone https://github.com/your-repo/ref-tools-pro.git
cd ref-tools-pro

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Running the Project

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
# Backend running on http://localhost:5000
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
# Frontend running on http://localhost:3000
```

**Default Credentials:**
- **User**: username: `user` | password: `Test123!@#`
- **Admin**: username: `admin` | password: `Admin123!@#`

---

## ✨ Core Features

### 1. Refrigerant Calculator
- **Pressure ↔ Temperature Conversion**: Bidirectional saturation property calculations
- **150+ Refrigerants Supported**: R12, R22, R134a, R404A, R410A, R717 (Ammonia), R744 (CO₂), etc.
- **Multiple Units**: PSI/Bar for pressure, °C/°F for temperature
- **Real-time Sliders**: Interactive PT (Pressure-Temperature) diagrams
- **Phase Detection**: Automatic identification of subcooled, saturated, and superheat states

### 2. Dual Authentication System

#### User Workflow
- Register with username and password
- Login to access refrigerant calculations
- Restricted copy/paste for data security
- View-only access to refrigerant properties

#### Admin Workflow
- Secure admin login with backend verification
- Full refrigerant CRUD operations
- Import/export capabilities
- Backup and restore functions
- Manage chemical properties of existing refrigerants

### 3. Responsive UI
- **Dark Theme**: Professional Danfoss-inspired aesthetic
- **Desktop**: Full-featured admin dashboard
- **Mobile**: Dedicated mobile admin interface
- **Accessible**: ARIA labels, keyboard navigation
- **Theme Toggle**: Light/dark mode switching

### 4. Data Persistence
- **JSON File Storage**: Refrigerant data persisted to `frontend/refrigerant-data/refrigerant-properties.json`
- **MongoDB**: User and admin credentials with bcrypt hashing
- **Auto-sync**: Data automatically synced across frontend/backend
- **Backup Support**: Export/import capabilities for disaster recovery

---

## 📁 Project Structure

```
ref-tools-pro/
├── README.md                           # This file
├── package.json                        # Root package configuration
│
├── backend/                            # Node.js + Express Server
│   ├── server.js                       # Main server entry point
│   ├── package.json                    # Backend dependencies
│   │
│   ├── config/
│   │   ├── database.js                 # MongoDB connection
│   │   └── units.js                    # Unit conversion configs
│   │
│   ├── controllers/
│   │   └── refrigerantController.js    # Main request handlers
│   │
│   ├── models/
│   │   ├── User.js                     # User schema & bcrypt
│   │   └── Admin.js                    # Admin schema & bcrypt
│   │
│   ├── routes/
│   │   ├── authRoutes.js               # Auth endpoints
│   │   └── refrigerantRoutes.js        # Refrigerant endpoints
│   │
│   ├── services/
│   │   ├── calculationService.js       # Thermodynamic calculations
│   │   ├── jsonFileService.js          # JSON file CRUD
│   │   ├── rangeConversionService.js   # Temperature/pressure conversion
│   │   ├── refToolsDataService.js      # Refrigerant data operations
│   │   └── syncService.js              # Data synchronization
│   │
│   ├── middleware/
│   │   └── auth.js                     # JWT verification
│   │
│   └── data/
│       └── refrigerants.json           # Backup refrigerant database
│
├── frontend/                           # React Application
│   ├── package.json                    # Frontend dependencies
│   ├── public/                         # Static assets & data files
│   │
│   ├── src/
│   │   ├── index.js                    # React entry point
│   │   ├── App.jsx                     # Main app component with routing
│   │   ├── api.js                      # API client functions
│   │   ├── testUtils.js                # Testing utilities
│   │   │
│   │   ├── components/                 # Reusable React components
│   │   │   ├── Login/                  # Authentication UI
│   │   │   ├── Keypad/                 # Numeric input component
│   │   │   ├── ValueBox/               # Display component
│   │   │   ├── RefrigerantInfo/        # Data display
│   │   │   ├── RefrigerantDrawer/      # Refrigerant selection
│   │   │   ├── AdminDashboard/         # Admin interface
│   │   │   └── [other components]      # UI building blocks
│   │   │
│   │   ├── config/
│   │   │   ├── apiConfig.js            # API URL configuration
│   │   │   ├── pressureUnits.js        # Pressure unit definitions
│   │   │   └── temperatureUnits.js     # Temperature unit definitions
│   │   │
│   │   ├── context/
│   │   │   ├── GwpContext.jsx          # Global warming potential context
│   │   │   └── ThemeContext.jsx        # Theme (light/dark) context
│   │   │
│   │   ├── pages/
│   │   │   ├── RefrigerantSlider/      # Main calculator page
│   │   │   └── AdminDashboard/         # Admin pages
│   │   │
│   │   ├── services/
│   │   │   ├── refrigerantDataService.js # Refrigerant data operations
│   │   │   └── [other services]
│   │   │
│   │   ├── hooks/
│   │   │   └── useDeviceType.js        # Device detection hook
│   │   │
│   │   ├── graphs/
│   │   │   ├── PTChart.jsx             # Pressure-temperature graph
│   │   │   └── PhaseDiagram.jsx        # Phase diagram visualization
│   │   │
│   │   └── styles/
│   │       ├── theme.css               # CSS variables & theme
│   │       ├── layout.css              # Layout styles
│   │       └── [component styles]      # Component-specific CSS
│   │
│   └── refrigerant-data/
│       └── refrigerant-properties.json # Main refrigerant database
│
├── thermo-engine/                      # Thermodynamic Physics Engine
│   ├── thermoSolver.js                 # Main calculation engine
│   ├── equations/
│   │   ├── saturation.js               # Saturation properties
│   │   ├── subcool.js                  # Subcooled properties
│   │   └── superheat.js                # Superheat properties
│   ├── interpolators/
│   │   └── bilinear.js                 # Data interpolation
│   └── phase-detection/
│       └── phaseFinder.js              # State detection
│
├── refrigerant-data/                   # Refrigerant Property Tables
│   ├── CO2.json                        # Individual refrigerant data
│   ├── R134a.json
│   ├── R404A.json
│   ├── R407C.json
│   ├── R410A.json
│   └── refrigerant-properties.json     # Master database
│
├── scripts/
│   └── sync-refrigerant-data.js        # Data sync script
│
├── deployment/                         # Docker & deployment configs
│   ├── Dockerfile                      # Container definition
│   ├── docker-compose.yml              # Multi-container orchestration
│   ├── nginx.conf                      # Reverse proxy config
│   └── build.sh                        # Build automation script
│
└── docs/                               # Documentation
    ├── system-architecture.md          # Architecture details
    ├── refrigerant-model.md            # Data model documentation
    ├── UI-design.md                    # UI/UX design specs
    └── formulas.md                     # Physics formulas reference
```

---

## 🔧 Setup & Installation

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/reftools-pro
JWT_SECRET=your-secret-key-here
PORT=5000
EOF

# Run migrations (if needed)
npm run migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF

# Start development server
npm start

# Build for production
npm run build
```

### MongoDB Setup

```bash
# Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally and start the service
# See: https://docs.mongodb.com/manual/installation/
```

---

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | `{ username, password }` |
| POST | `/login` | User login | `{ username, password }` |
| POST | `/admin-login` | Admin login | `{ username, password }` |
| GET | `/verify` | Verify JWT token | Header: `Authorization: Bearer {token}` |

### Refrigerant Routes (`/api/refrigerant`)

| Method | Endpoint | Description | Query/Body |
|--------|----------|-------------|-----------|
| GET | `/list` | Get all available refrigerants | - |
| GET | `/metadata` | Get refrigerant limits & modes | `?refrigerant=R134a&pressureUnit=psi&temperatureUnit=celsius` |
| POST | `/pressure` | Calculate pressure from temp | `{ refrigerant, temperature, temperatureUnit, pressureUnit }` |
| POST | `/temperature` | Calculate temp from pressure | `{ refrigerant, pressure, pressureUnit, temperatureUnit }` |
| POST | `/slider` | Get slider data range | `{ refrigerant, pressureUnit, temperatureUnit }` |
| GET | `/admin/all` | Get all refrigerants (admin) | Header: `Authorization: Bearer {token}` |
| POST | `/admin/add` | Add new refrigerant (admin) | `{ name, rNumber, properties }` |
| PUT | `/admin/update/:id` | Update refrigerant (admin) | `{ name, properties }` |
| DELETE | `/admin/delete/:id` | Delete refrigerant (admin) | - |

---

## 👥 User Workflows

### Regular User Workflow

```
1. Navigate to http://localhost:3000
   ↓
2. Click "User" mode
   ↓
3. Register with username & password
   - Minimum 3 characters
   - Password requirements: 12 chars, uppercase, lowercase, number, special
   ↓
4. Login with credentials
   ↓
5. Access Refrigerant Slider
   - Select refrigerant from drawer
   - Enter temperature → Calculate pressure
   - Enter pressure → Calculate temperature
   - View saturation properties
   - Note: Copy/paste DISABLED for security
```

### Admin Workflow

```
1. Navigate to http://localhost:3000
   ↓
2. Click "Admin" mode (toggle to Admin tab)
   ↓
3. Login with admin credentials
   - Backend-verified authentication
   ↓
4. Access Admin Dashboard
   ├── Refrigerant CRUD Panel
   │  ├── Add new refrigerant
   │  ├── Edit existing refrigerant
   │  ├── Delete refrigerant
   │  └── Import/Export data
   ├── Data Sync & Management
   │  ├── Backup database
   │  ├── Restore backup
   │  └── View statistics
   └── Mobile Admin Interface (on mobile)
```

---

## 💾 Data Persistence

### JSON File Storage (Refrigerants)

**Location**: `frontend/refrigerant-data/refrigerant-properties.json`

**Structure**:
```json
{
  "refrigerants": [
    {
      "id": 1,
      "name": "R134a",
      "rNumber": "R134a",
      "chemicalName": "1,1,1,2-Tetrafluoroethane",
      "safetyGroup": "A1",
      "gwp": 1430,
      "properties": {
        "saturation": [
          {"temperature": -40, "pressure": 10.5},
          ...
        ]
      },
      "createdAt": "2026-01-29T00:00:00Z",
      "updatedAt": "2026-01-29T00:00:00Z"
    }
  ]
}
```

**Features**:
- ✅ Auto-created on first write
- ✅ Validated on read
- ✅ Backed up to `backend/data/refrigerants-backup.json`
- ✅ Synced across frontend/backend via API calls

### MongoDB Storage (Users & Admins)

**Collections**:
- `users` - Regular user accounts with hashed passwords
- `admins` - Admin accounts with elevated privileges

**User Schema**:
```javascript
{
  username: String (unique, 3+ chars),
  password: String (bcrypt hashed),
  role: String (enum: ['user', 'admin']),
  createdAt: Date
}
```

### Sync Mechanism

```
Frontend ─┐
          ├─→ Backend API ─→ JSON File Service ─→ Refrigerant Data
Backend ──┘
          └─→ localStorage (temporary cache)
```

---

## 👨‍💻 Development

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests (if configured)
cd ../backend
npm test
```

### Code Structure Guidelines

- **Components**: Functional components with hooks
- **Services**: Business logic, API calls
- **Styles**: CSS modules + theme variables
- **Utils**: Helper functions and constants

### Key Development Files

| File | Purpose |
|------|---------|
| `backend/services/calculationService.js` | All thermodynamic calculations |
| `backend/services/jsonFileService.js` | Refrigerant CRUD operations |
| `frontend/src/api.js` | Frontend API client |
| `thermo-engine/thermoSolver.js` | Physics engine core |
| `frontend/src/context/ThemeContext.jsx` | Theme management |

### Adding a New Refrigerant

1. **Via Admin UI**:
   - Login as admin
   - Click "Add Refrigerant"
   - Fill in properties
   - Submit → Auto-saved to JSON

2. **Via Import**:
   - Prepare JSON file with refrigerant data
   - Admin → Import → Select file
   - Data validated and saved

3. **Programmatically**:
   ```javascript
   const newRefrigerant = {
     name: "R290",
     rNumber: "R290",
     chemicalName: "Propane",
     safetyGroup: "A3",
     gwp: 20,
     properties: { /* saturation data */ }
   };
   await api.addNewRefrigerant(newRefrigerant);
   ```

---

## 🐳 Deployment

### Docker Deployment

```bash
# Build container
docker build -t reftools-pro .

# Run with docker-compose
docker-compose up -d

# Access at http://localhost
```

### Environment Variables

```bash
# Backend (.env)
MONGODB_URI=mongodb://mongo:27017/reftools-pro
JWT_SECRET=production-secret-key
NODE_ENV=production
PORT=5000

# Frontend (.env.production)
REACT_APP_API_URL=https://api.example.com/api
```

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm start
```

---

## 📚 Documentation

### Additional Resources

- [System Architecture](docs/system-architecture.md) - Detailed architecture diagrams
- [Refrigerant Model](docs/refrigerant-model.md) - Data structure documentation
- [UI Design](docs/UI-design.md) - Component and design specifications
- [Physics Formulas](docs/formulas.md) - Thermodynamic calculations reference

### Key Implemented Features

- ✅ Dual-mode authentication (User & Admin)
- ✅ JWT token-based security
- ✅ Bcrypt password hashing
- ✅ JSON file persistence with auto-sync
- ✅ Real-time pressure-temperature calculations
- ✅ 150+ refrigerant support
- ✅ Responsive dark/light theme
- ✅ Mobile-optimized admin interface
- ✅ Data import/export capabilities
- ✅ Backup and restore functions

### In Progress / Future

- [ ] Advanced phase diagrams with visualization
- [ ] Historical data tracking
- [ ] Batch refrigerant operations
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] WebSocket real-time updates

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review API endpoints above

---

**Last Updated**: January 29, 2026  
**Version**: 1.0.0  
**Status**: Active Development