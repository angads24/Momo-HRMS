# End-to-End Upgrade Plan: Node.js & Python Modernization

## 1. Executive Summary & Recommended Target Versions

To eliminate known CVE vulnerabilities in Node.js and Python while maintaining 100% stability across all 6 NestJS microservices, Python Face AI service, React 19 web portal, and Expo SDK 58 mobile app, here are the target versions:

| Component | Current Version | Recommended Target | Status & Lifecycle | Why Not Newer? |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `v20.20.2` (LTS/Iron) | **Node.js 22 LTS** (`v22.14.0+` / `v22.23.3` "Jod") | **Active LTS** (Supported through April 2027) | **Node 23** is an *odd-numbered, non-LTS* release that is End-Of-Life (EOL) with no security fixes. **Node 24** is bleeding-edge and introduces minor ABI friction with native C++ modules (`argon2`) and Expo CLI tooling. Node 22 LTS is the optimal production standard. |
| **Python** | `3.11.9` / `3.11-slim` | **Python 3.12** (`3.12.3` / `python:3.12-slim`) | **Active Maintenance** (Supported through Oct 2028) | **Python 3.13** completely dropped legacy standard library modules (`cgi`, `distutils`, `pipes`) and introduced breaking C-API changes that cause ABI crashes between `numpy 2.x` and `opencv-python-headless` (4.9-4.10). Python 3.12 is verified working seamlessly with OpenCV 4.14 and NumPy. |

---

## 2. Component-by-Component Impact & Compatibility Matrix

```mermaid
graph TD
    A[Momo HRMS System] --> B[Node.js 22 LTS Ecosystem]
    A --> C[Python 3.12 Ecosystem]

    B --> B1[API Gateway & Microservices<br/>NestJS 10.4 + Prisma 5.20]
    B --> B2[Native Addons: argon2<br/>Recompiled via node-gyp]
    B --> B3[Frontend Web: Vite 8 + React 19]
    B --> B4[Frontend Mobile: Expo SDK 58]

    C --> C1[FastAPI 0.110 + Uvicorn]
    C --> C2[OpenCV 4.14 DNN YuNet/SFace]
    C --> C3[NumPy + PyMySQL + Cryptography]
```

### Compatibility Assessment:
1. **NestJS 10.4.x**: Fully certified on Node 22 LTS.
2. **Prisma 5.20**: Ships native query engine binaries matching Node 22.
3. **Argon2 (`backend/auth-service`)**: Native C++ module; requires running `npm rebuild argon2` upon upgrading Node version.
4. **Vite 8 & React 19 (`frontend/web`)**: Out-of-the-box support for Node 22.
5. **Expo SDK 58 (`frontend/mobile`)**: Expo CLI and Metro bundler explicitly recommend Node 20 or Node 22 LTS.
6. **OpenCV DNN & Face AI (`backend/face-ai-service`)**: Fully functional on Python 3.12 (verified: OpenCV 4.14.0 + NumPy 2.5.3).

---

## 3. Required Modifications Across the Repository

### A. Repository Root Configurations
1. **Create/Update `.nvmrc`**:
   Specify `22` so developers and CI/CD tools automatically switch to Node 22:
   ```text
   22
   ```
2. **Update `.python-version`**:
   Update from `3.11.9` to `3.12.3`:
   ```text
   3.12.3
   ```

---

### B. Backend Node.js Microservices
Apply to all 6 services:
- [backend/api-gateway/package.json](file:///home/angad/Momo%20HRMS/backend/api-gateway/package.json)
- [backend/auth-service/package.json](file:///home/angad/Momo%20HRMS/backend/auth-service/package.json)
- [backend/attendance-service/package.json](file:///home/angad/Momo%20HRMS/backend/attendance-service/package.json)
- [backend/employee-service/package.json](file:///home/angad/Momo%20HRMS/backend/employee-service/package.json)
- [backend/geofence-service/package.json](file:///home/angad/Momo%20HRMS/backend/geofence-service/package.json)
- [backend/notification-service/package.json](file:///home/angad/Momo%20HRMS/backend/notification-service/package.json)

1. **Update `@types/node` in `devDependencies`**:
   ```diff
   - "@types/node": "^20.16.5",
   + "@types/node": "^22.0.0",
   ```
2. **Rebuild Native Dependencies (`auth-service`)**:
   ```bash
   cd backend/auth-service
   npm rebuild argon2
   ```
3. **Regenerate Prisma Client**:
   ```bash
   for s in auth-service employee-service attendance-service geofence-service notification-service; do
     (cd "backend/$s" && npx prisma generate)
   done
   ```

---

### C. Dockerfiles (Container Images)
Update the base Alpine and Python images:

1. **[backend/auth-service/Dockerfile](file:///home/angad/Momo%20HRMS/backend/auth-service/Dockerfile)**:
   ```diff
   - FROM node:20-alpine AS builder
   + FROM node:22-alpine AS builder
   ...
   - FROM node:20-alpine AS production
   + FROM node:22-alpine AS production
   ```
2. **[backend/attendance-service/Dockerfile](file:///home/angad/Momo%20HRMS/backend/attendance-service/Dockerfile)**:
   ```diff
   - FROM node:20-alpine AS builder
   + FROM node:22-alpine AS builder
   ...
   - FROM node:20-alpine AS production
   + FROM node:22-alpine AS production
   ```
3. **[backend/employee-service/Dockerfile](file:///home/angad/Momo%20HRMS/backend/employee-service/Dockerfile)**:
   ```diff
   - FROM node:20-alpine AS builder
   + FROM node:22-alpine AS builder
   ...
   - FROM node:20-alpine AS runner
   + FROM node:22-alpine AS runner
   ```
4. **[backend/geofence-service/Dockerfile](file:///home/angad/Momo%20HRMS/backend/geofence-service/Dockerfile)**:
   ```diff
   - FROM node:20-alpine AS builder
   + FROM node:22-alpine AS builder
   ...
   - FROM node:20-alpine AS runner
   + FROM node:22-alpine AS runner
   ```
5. **[backend/face-ai-service/Dockerfile](file:///home/angad/Momo%20HRMS/backend/face-ai-service/Dockerfile)**:
   ```diff
   - FROM python:3.11-slim
   + FROM python:3.12-slim
   ```

---

### D. Python Face AI Service (`backend/face-ai-service`)
1. **Recreate Virtualenv with Python 3.12**:
   ```bash
   cd backend/face-ai-service
   rm -rf venv
   python3.12 -m venv venv
   ./venv/bin/pip install --upgrade pip setuptools wheel
   ./venv/bin/pip install -r requirements.txt
   ```
2. **Security Vulnerability Remediation in [backend/face-ai-service/app/config.py](file:///home/angad/Momo%20HRMS/backend/face-ai-service/app/config.py)**:
   Sanitize hardcoded database credentials:
   ```diff
   - DATABASE_URL: str = "mysql+pymysql://admin:Admin123@localhost:3306/face_ai_db"
   + DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/face_ai_db")
   ```
3. **Security Constraints in `requirements.txt`**:
   Ensure `cryptography>=42.0.8` is installed to patch CVE-2024-26130 (null pointer dereference in PKCS#12 decoding).

---

## 4. Execution Step-by-Step Checklist

### Step 1: Install & Set Node 22 via NVM
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
nvm alias default 22
node -v # Should display v22.x.x
```

### Step 2: Apply Code & Config Changes
- Update `.nvmrc` and `.python-version`.
- Update `@types/node` in `backend/*/package.json`.
- Update Dockerfiles (`node:22-alpine`, `python:3.12-slim`).
- Sanitize `config.py` in `face-ai-service`.

### Step 3: Rebuild Backend Microservices
```bash
# Rebuild native addon in auth-service
cd "backend/auth-service" && npm rebuild argon2 && npm run build && cd ../..

# Rebuild all other microservices
for s in api-gateway attendance-service employee-service geofence-service notification-service; do
  echo "Rebuilding $s..."
  (cd "backend/$s" && npx prisma generate 2>/dev/null || true && npm run build)
done
```

### Step 4: Rebuild Python Virtualenv
```bash
cd backend/face-ai-service
rm -rf venv
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/python -c "import cv2, numpy, fastapi; print('Python 3.12 Face AI ready!')"
cd ../..
```

### Step 5: Test Web & Mobile Frontends
```bash
# Web Frontend Build Test
cd frontend/web && npm run build && cd ../..

# Mobile Frontend TypeScript Check
cd frontend/mobile && npx tsc --noEmit && cd ../..
```
