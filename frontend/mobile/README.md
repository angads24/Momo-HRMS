# Momo HRMS — Mobile Application (`frontend/mobile`)

> **React Native & Expo Application for Smart Employee Attendance, Geofenced Check-Ins, and Hands-Free Facial Biometrics**  
> Built with React Native, Expo SDK 52, Expo Camera (`CameraView`), Expo Location, React Native Paper, and Axios.

---

## 1. Overview & Architecture

The **Momo Mobile App** allows enterprise employees to manage daily attendance sessions, record check-ins/check-outs, register and verify facial biometrics, and review historical work logs.

### Key Workflows:
1. **Pre-Flight Geofence Pre-Verification**:
   - Before launching the camera or face model, the app retrieves high-accuracy GPS coordinates (`expo-location`) and validates them against the employee's assigned office geofence via the Geofence Microservice (`POST /geofence/verify`).
   - If outside the office boundary, check-in stops immediately with a distance indicator. The face verification modal **will not open** unless the user is physically inside the designated workplace perimeter.
2. **Zero-Click Hands-Free Facial Biometrics (`FaceVerifyModal`)**:
   - Zero manual shutter clicks required.
   - Background continuous preview loop (420ms interval) streams low-overhead snapshots (`quality: 0.22`, `skipProcessing: true`) to the AI microservice.
   - **Photo 1 (Neutral)**: Auto-detects frontal aligned face (`POST /api/v1/face/detect-neutral`) and auto-snaps.
   - **Photo 2 (Active Challenge)**: Pulsing UI prompts user with random challenge (`TURN_LEFT`, `TURN_RIGHT`, `SMILE`, `BLINK`). When user performs the motion, `POST /api/v1/face/detect-action` detects it and auto-snaps.
   - **Photo 3 (Hold & Submit)**: Auto-captures final verification frame and submits the 3-frame sequence to `POST /api/v1/face/verify`.
   - Attendance is approved only when the AI service issues a valid cryptographic verification token.

---

## 2. Environment Configuration

The mobile app configuration is managed in `.env` and [src/config/env.ts](file:///home/angad/Momo%20HRMS/frontend/mobile/src/config/env.ts).

### Sample `.env`:
```env
# Gateway URL: Point to your LAN IP or reverse proxy (e.g. port 8000)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

> **LAN vs Hotspot Switching**: When switching Wi-Fi or mobile hotspots, update `EXPO_PUBLIC_API_URL` to your machine's new IP address (`ip addr show` or `ifconfig`), and restart Expo with `npx expo start -c`.

---

## 3. Directory Structure & Key Files

```
frontend/mobile/
├── App.tsx                     # App entry point, PaperProvider, AuthProvider wrapper
├── app.json                    # Expo configuration & app permissions (Camera, Location)
├── package.json                # Dependencies & scripts
└── src/
    ├── api/
    │   ├── client.ts           # Axios instance with auth interceptors & timeout configs
    │   ├── authApi.ts          # Login, logout, refresh token endpoints
    │   ├── employeeApi.ts      # Profile, assignments, employee CRUD
    │   ├── attendanceApi.ts    # checkIn, checkOut, pause, resume, today's status
    │   ├── faceApi.ts          # challenge, verifyFace, enrollFace, detectNeutral, detectAction
    │   └── geofenceApi.ts      # verifyLocation against office polygon boundaries
    ├── context/
    │   └── AuthContext.tsx     # User auth state, tokens in AsyncStorage, role guards
    ├── screens/
    │   ├── LoginScreen.tsx     # Clean enterprise authentication screen
    │   └── EmployeeHomeScreen.tsx # Core employee dashboard:
    │                           #   - Real-time work session timer
    │                           #   - Geofence pre-verification flow
    │                           #   - Hands-free FaceVerifyModal
    │                           #   - One-time FaceEnrollModal
    │                           #   - Attendance history & daily logs
    └── theme/
        └── theme.ts            # Enterprise dark/light design system palette
```

---

## 4. Geofence & Face Biometric Verification Flow

```
[Employee Taps "Check In"]
           │
           ▼
[Check Mandatory Face Enrollment]
  ├── Not Enrolled? ──> Prompt to complete 1-time Face Biometric Registration
  └── Enrolled? ──────> Continue
           │
           ▼
[Get High-Accuracy GPS Location]
           │
           ▼
[Geofence Microservice Pre-Check] (POST /geofence/verify)
  ├── Outside Office? ──> ❌ Alert: "You are ~Xm outside the office perimeter." Stop.
  └── Inside Office?  ──> ✅ Continue to Face Scanner
           │
           ▼
[Face Verification Modal Opens]
           │
           ▼
[Photo 1: Continuous Neutral Pose Detector] (POST /detect-neutral)
  ├── Not Centered? ──> "Align face inside oval guide..."
  └── Centered Frontal Face? ──> 📸 Auto-Snap Photo 1! Flash Shutter.
           │
           ▼
[Photo 2: Continuous Challenge Action Detector] (POST /detect-action)
  ├── User instructed to SMILE / BLINK / TURN HEAD
  ├── Neutral frame compared with live stream every 420ms
  └── Activity threshold reached? ──> 📸 Auto-Snap Photo 2! Flash Shutter.
           │
           ▼
[Photo 3: Confirmation & Neural Verification] (POST /verify)
  ├── Auto-captures Photo 3
  ├── Deep SFace (128-D ArcFace) compares embedding against enrolled profile
  └── Cosine Similarity >= 0.40? ──> Issues Signed Verification Token
           │
           ▼
[Attendance Service] (POST /attendance/check-in)
  ├── Verifies JWT verification token
  └── Records check-in timestamp & starts work session timer!
```

---

## 5. Running the Application

### Development Server:
```bash
cd frontend/mobile
npm install
npx expo start -c
```

Scan the QR code with **Expo Go** on Android or iOS.
Ensure your mobile device is connected to the same local network as the backend server.
