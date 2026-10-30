# Momo HRMS Microservices Startup Script for Windows (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Momo HRMS Microservices (Windows)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Environment Variables
$env:NODE_ENV = "development"
$env:GATEWAY_SHARED_SECRET = "dev-gateway-secret"
$env:JWT_ACCESS_SECRET = "PQFkhhuqw2koPRwe3O4mogz5Hy8wk24WGvu2LvHDq3f"
$env:JWT_REFRESH_SECRET = "|j2Q{A4xLhw)a7vUXP>ds-|kBVnyJ7/Nn&-/HEt_S9b"

$rootDir = $PSScriptRoot

# 2. Terminate any previous processes holding these ports
Write-Host "--> Checking and freeing ports 3001-3006, 8000..." -ForegroundColor Yellow
$ports = @(3001, 3002, 3003, 3004, 3005, 3006, 8000)
foreach ($port in $ports) {
    try {
        $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -gt 0) {
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# 3. Helper to start Node service
function Start-NodeService {
    param(
        [string]$ServiceName,
        [int]$Port
    )
    $serviceDir = Join-Path $rootDir "backend\$ServiceName"
    $entry = Join-Path $serviceDir "dist\src\main.js"
    if (-not (Test-Path $entry)) {
        $entry = Join-Path $serviceDir "dist\main.js"
    }

    Write-Host "--> Launching $ServiceName (:$Port)..." -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$serviceDir`" && set PORT=$Port && node `"$entry`"" -WorkingDirectory $serviceDir
}

# 4. Start Node microservices
Start-NodeService -ServiceName "auth-service" -Port 3001
Start-NodeService -ServiceName "attendance-service" -Port 3002
Start-NodeService -ServiceName "geofence-service" -Port 3003
Start-NodeService -ServiceName "employee-service" -Port 3004
Start-NodeService -ServiceName "notification-service" -Port 3005

# 5. Start Python Face AI service
Write-Host "--> Launching face-ai-service (:3006)..." -ForegroundColor Green
$faceDir = Join-Path $rootDir "backend\face-ai-service"
$venvPy = Join-Path $faceDir "venv\Scripts\python.exe"

if (Test-Path $venvPy) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$faceDir`" && `"$venvPy`" -m uvicorn app.main:app --host 0.0.0.0 --port 3006" -WorkingDirectory $faceDir
} else {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$faceDir`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 3006" -WorkingDirectory $faceDir
}

# 6. Wait 3 seconds for services to bind
Write-Host "--> Waiting for microservices to bind..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 7. Launch API Gateway in current foreground window
Write-Host "--> Launching API Gateway (:8000)..." -ForegroundColor Cyan
$gatewayDir = Join-Path $rootDir "backend\api-gateway"
$gatewayEntry = Join-Path $gatewayDir "dist\main.js"
if (-not (Test-Path $gatewayEntry)) {
    $gatewayEntry = Join-Path $gatewayDir "dist\src\main.js"
}

$env:PORT = 8000
Set-Location $gatewayDir
node $gatewayEntry
