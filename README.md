# Momo HRMS — Enterprise Microservices Architecture & Frontends

**Momo HRMS** is an enterprise-grade Human Resource & Attendance Management System featuring autonomous AI face verification, GPS polygon geofencing, real-time telemetry, and multi-role web and mobile clients.

---

## 🏛️ System Architecture Overview

The system consists of **6 NestJS / Python microservices** fronted by an **API Gateway**, connected to two modern frontends:

```
                                  ┌───────────────────────────┐
                                  │   Web Portal (React 19)   │ (Port 5173)
                                  │   Mobile App (Expo / RN)  │ (Port 8081)
                                  └─────────────┬─────────────┘
                                                │ HTTP / REST
                                                ▼
                                  ┌───────────────────────────┐
                                  │        API Gateway        │ (Port 8000)
                                  └─────────────┬─────────────┘
                                                │ HMAC Signed Proxy
         ┌───────────────┬──────────────────────┼──────────────────────┬────────────────┐
         │               │                      │                      │                │
         ▼               ▼                      ▼                      ▼                ▼
   Auth Service   Employee Service      Geofence Service       Attendance Svc     Face AI Svc
   (Port 3001)      (Port 3004)            (Port 3003)          (Port 3002)       (Port 3006)
   MySQL (3306)     MySQL (3306)           MySQL (3306)         MySQL (3306)      PyTorch / OpenCV
```

### Microservices Port Matrix

| Service | Technology | Port | DB / Storage | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | NestJS | `8000` | In-memory / Redis | HMAC proxying, rate limiting, SSL termination, CORS |
| **Auth Service** | NestJS + Prisma | `3001` | MySQL (`auth_service`) | JWT authentication, RBAC, password policies, session revocation |
| **Attendance Service** | NestJS + Prisma | `3002` | MySQL (`attendance_service`) | Punch sessions, breaks, exceptions, auto-checkout scheduler |
| **Geofence Service** | NestJS + Prisma | `3003` | MySQL (`geofence_service`) | Multi-vertex polygon geofencing, ray-casting containment algorithm |
| **Employee Service** | NestJS + Prisma | `3004` | MySQL (`employee_service`) | Rosters, employee profiles, multi-office branch assignments, depts |
| **Notification Service** | NestJS + Prisma | `3005` | MySQL (`notification_service`) | Push notifications, alerts, SMS/Email queue |
| **Face AI Service** | Python + FastAPI | `3006` | SFace-128 / MediaPipe | Dynamic challenge generation, anti-spoofing liveness, embeddings |

---

## 🎨 Design Theme: White & Orange Aesthetic

Both **Web** and **Mobile** frontends feature a cohesive **White & Orange / Sunset Gradient** theme.

- **Primary Brand Color**: `#FF6B35` (Vibrant Tangerine Orange)
- **Primary Gradient**: `linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)`
- **Surface / Background**: Warm White `#FDFCFB`, Pure White `#FFFFFF`, Soft Peach `#FFF7ED`
- **Borders & Dividers**: Warm Orange Tint `#FED7AA`
- **Typography & High Contrast**: Charcoal `#0F172A` / `#1F2937` on white

---

## 💻 Frontends

### 1. Web Portal (`frontend/web`)
Built with **React 19 + TypeScript + Vite + Material UI**:
- **Login Page (`/login`)**: Quick-fill demo credentials, clean white card with orange focus rings.
- **Admin Workspace (`/admin`)**:
  - Live attendance monitoring & manual check-in override.
  - Interactive polygon studio for dragging geofence vertices on canvas.
  - Employee directory with HR admin provisioning and office assignments.
  - Exception & leave approval management.
  - Workforce punctuality analytics & CSV export.
  - Cryptographic security audit log viewer.
- **HR Workspace (`/hr`)**: Focused employee management, geofence assignment, and exception review.
- **Employee Self-Service Portal (`/portal` / `/`)**: Live duration timer, today's punch card, assigned office polygon details, Face AI status, attendance history table, and an interactive "Request Attendance Regularization" dialog.

### 2. Mobile App (`frontend/mobile`)
Built with **React Native + Expo + React Native Paper**:
- Autonomous Face AI camera scanner (automatic capture upon dynamic challenge detection — smile, blink, turn head).
- Real-time GPS ray-casting perimeter verification.
- Auto-reset / freeze of work timer at 12:00 AM midnight.
- Offline event synchronization queue.

---

## 🔑 Default Credentials for Development

| Role | Username / Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@company.com` | `Admin123!` |
| **HR Administrator** | `hr@company.com` | `HrAdmin123!` |
| **Standard Employee** | `john.doe@company.com` | `Emp1001!` |

---

## 🧪 Testing System Connections

To verify all microservices and frontend connections through the API Gateway, run:

```bash
node scratch/test_all_connections.js
```

This automated suite tests:
1. API Gateway health & all 6 downstream microservices status (`GET /health`)
2. Super Admin login & JWT generation (`POST /api/v1/auth/login`)
3. HR Admin login & RBAC permissions (`POST /api/v1/auth/login`)
4. Employee directory query (`GET /api/v1/employees`)
5. Department and designation metadata (`GET /api/v1/organization/departments`)
6. Active geofence polygons (`GET /api/v1/offices`)
7. GPS coordinate ray-casting algorithm (`POST /api/v1/geofence/verify`)
8. Dynamic Face AI liveness challenge generation (`GET /api/v1/face/challenge`)
9. Real-time daily attendance feed (`GET /api/v1/attendance/today`)
10. Historical session logs (`GET /api/v1/attendance/history`)
11. Attendance exceptions and regularizations (`GET /api/v1/attendance/exceptions`)
12. Web frontend dev server (`http://localhost:5173`)
