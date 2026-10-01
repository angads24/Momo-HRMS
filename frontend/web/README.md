# Momo HRMS — Enterprise Web Portal

The **Momo HRMS Web Portal** is an enterprise single-page application built with **React 19**, **Vite**, **TypeScript**, and **Material UI (MUI)**. It provides administrative controls, interactive geofence perimeter drafting, employee provisioning, attendance telemetry, exception approvals, and employee self-service.

---

## 🎨 Design System & Theme: White & Orange Aesthetic

The web portal adheres to a curated **White & Orange Palette** with sunset gradients, providing high contrast and clarity.

| Token | Hex Value | Usage / Description |
| :--- | :--- | :--- |
| **Primary Orange** | `#FF6B35` | Main brand color, primary action buttons, active navigation indicators |
| **Primary Light** | `#FFA06B` | Accents, chips, hover states |
| **Primary Dark** | `#E8551E` | Contained button hover background, active press states |
| **Accent Orange** | `#FF8A00` | Secondary badges, warm alerts |
| **Sunset Gradient** | `linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)` | Branding panels, hero buttons, logo banners |
| **Warm White Background** | `#FDFCFB` | Base body and page background |
| **Pure White Surface** | `#FFFFFF` | Cards, dialog modals, tables, text inputs |
| **Elevated Tint Surface** | `#FFF7ED` | Active menu tabs, employee ID chips, selection callouts |
| **Warm Border** | `#FED7AA` | Card and modal borders, dividers |
| **High-Contrast Text** | `#0F172A` / `#1E293B` | Headers, body text, data labels |

---

## 🏗️ Portal Structure & Navigation

### 1. Authentication (`/login`)
- **Visual Design**: Split-screen with sunset gradient brand showcase on left and elevated white login card with orange focus rings on right.
- **Quick-Fill Demo Credentials**:
  - **Super Administrator**: `admin@company.com` / `Admin123!`
  - **HR Administrator**: `hr@company.com` / `HrAdmin123!`
- **Security**: JWT Access Token (15 min) + Refresh Token (7 days) stored with automatic token refresh on `401 Unauthorized`.

### 2. Administrator & HR Workspace (`/admin`, `/hr`)
Managed inside [DashboardLayout.tsx](src/components/DashboardLayout.tsx) with a responsive sidebar, active orange indicators, user profile pill, and dynamic tabs:
- **Live Attendance Tab**: Real-time staff presence feed, punch status, work duration timer, and manual override dialog.
- **Geofence & Polygon Studio Tab**: Interactive canvas for visualizing and dragging multi-vertex polygon office perimeters with real-time GPS ray-casting simulator.
- **Employee Directory Tab**: Workforce rosters, HR admin provisioning modal, multi-office branch assignments, and secure initial credential generation.
- **Exception Approvals Tab**: Approve or reject out-of-polygon field exceptions, client-site visits, and re-check-in requests.
- **Workforce Analytics Tab**: Attendance rate KPIs, on-time punctuality percentages, department-level telemetry, and CSV report export.
- **Security Audit Trail Tab**: Immutable cryptographic audit logs of administrative changes and authentication events.

### 3. Employee Self-Service Portal (`/portal` or `/`)
Built inside [EmployeeHomePage.tsx](src/pages/EmployeeHomePage.tsx) for general staff members:
- **Today's Punch Summary**: Real-time working duration counter, status badge (`CHECKED_IN`, `CHECKED_OUT`, `ON_BREAK`), and last punch timestamps.
- **Assigned Office Geofence**: Displays the employee's authorized physical workplace name, coordinates, and polygon boundary status.
- **Face AI Biometric Status**: Displays SFace-128 verification status and mobile app requirement for biometric scanning.
- **Attendance History Log**: Session-by-session check-in and check-out logs with duration calculations.
- **Request Regularization Dialog**: Submits exception requests (`CLIENT_SITE`, `MISSED_PUNCH`, `GEOFENCE_DEVIATION`) directly to `POST /api/v1/attendance/exceptions`.

---

## 🔌 API Client Architecture

All backend communications route through the API Gateway at `http://localhost:8000`:
- **Base Client**: [src/api/client.ts](src/api/client.ts) handles Authorization headers, Axios response interception, and automatic JWT refresh.
- **Auth API**: [src/api/authApi.ts](src/api/authApi.ts) (`/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/me`).
- **Employee API**: [src/api/employeeApi.ts](src/api/employeeApi.ts) (`/api/v1/employees`, `/api/v1/organization/departments`, `/api/v1/organization/designations`).
- **Geofence API**: [src/api/geofenceApi.ts](src/api/geofenceApi.ts) (`/api/v1/offices`, `/api/v1/geofence/verify`).
- **Attendance API**: [src/api/attendanceApi.ts](src/api/attendanceApi.ts) (`/api/v1/attendance/today`, `/api/v1/attendance/history`, `/api/v1/attendance/exceptions`).

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server on port 5173
npm run dev

# Build production bundle
npm run build
```
