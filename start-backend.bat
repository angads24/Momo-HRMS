@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Starting Momo HRMS Microservices (Windows)
echo ===================================================

:: 1. Export Environment Variables
set NODE_ENV=development
set GATEWAY_SHARED_SECRET=dev-gateway-secret
set JWT_ACCESS_SECRET=PQFkhhuqw2koPRwe3O4mogz5Hy8wk24WGvu2LvHDq3f
set JWT_REFRESH_SECRET=^|j2Q{A4xLhw)a7vUXP^>ds-^|kBVnyJ7/Nn^-/HEt_S9b

:: 2. Terminate any previous processes holding these ports
echo --> Checking and freeing ports 3001-3006, 8000...
for %%P in (3001 3002 3003 3004 3005 3006 8000) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%P "') do (
        if not "%%a"=="" if not "%%a"=="0" (
            taskkill /f /pid %%a >nul 2>&1
        )
    )
)

:: Helper to resolve entrypoint (dist\src\main.js or dist\main.js)
:: 3. Launch internal microservices in dedicated terminal windows
echo --> Launching auth-service (:3001)...
start "Momo HRMS: Auth Service (Port 3001)" cmd /k "cd /d "%~dp0backend\auth-service" && set PORT=3001 && if exist dist\src\main.js (node dist\src\main.js) else (node dist\main.js)"

echo --> Launching attendance-service (:3002)...
start "Momo HRMS: Attendance Service (Port 3002)" cmd /k "cd /d "%~dp0backend\attendance-service" && set PORT=3002 && if exist dist\src\main.js (node dist\src\main.js) else (node dist\main.js)"

echo --> Launching geofence-service (:3003)...
start "Momo HRMS: Geofence Service (Port 3003)" cmd /k "cd /d "%~dp0backend\geofence-service" && set PORT=3003 && if exist dist\src\main.js (node dist\src\main.js) else (node dist\main.js)"

echo --> Launching employee-service (:3004)...
start "Momo HRMS: Employee Service (Port 3004)" cmd /k "cd /d "%~dp0backend\employee-service" && set PORT=3004 && if exist dist\src\main.js (node dist\src\main.js) else (node dist\main.js)"

echo --> Launching notification-service (:3005)...
start "Momo HRMS: Notification Service (Port 3005)" cmd /k "cd /d "%~dp0backend\notification-service" && set PORT=3005 && if exist dist\src\main.js (node dist\src\main.js) else (node dist\main.js)"

:: 4. Launch Face AI service
echo --> Launching face-ai-service (:3006)...
if exist "%~dp0backend\face-ai-service\venv\Scripts\python.exe" (
    start "Momo HRMS: Face AI Service (Port 3006)" cmd /k "cd /d "%~dp0backend\face-ai-service" && venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 3006"
) else (
    start "Momo HRMS: Face AI Service (Port 3006)" cmd /k "cd /d "%~dp0backend\face-ai-service" && python -m uvicorn app.main:app --host 0.0.0.0 --port 3006"
)

:: 5. Wait 3 seconds for services to initialize
echo --> Waiting for microservices to bind...
timeout /t 3 /nobreak >nul

:: 6. Launch API Gateway in current foreground window
echo --> Launching API Gateway (:8000)...
cd /d "%~dp0backend\api-gateway"
set PORT=8000
if exist dist\main.js (
    node dist\main.js
) else (
    node dist\src\main.js
)
