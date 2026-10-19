#!/bin/bash
set -e

# Kill any existing node/python processes on these ports
fuser -k 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3005/tcp 3006/tcp 8000/tcp 2>/dev/null || true

export NODE_ENV=development
export GATEWAY_SHARED_SECRET="dev-gateway-secret"
export JWT_ACCESS_SECRET="PQFkhhuqw2koPRwe3O4mogz5Hy8wk24WGvu2LvHDq3f"
export JWT_REFRESH_SECRET="|j2Q{A4xLhw)a7vUXP>ds-|kBVnyJ7/Nn&-/HEt_S9b"

echo "--> Launching auth-service (:3001)..."
(cd backend/auth-service && PORT=3001 node dist/src/main.js) &

echo "--> Launching attendance-service (:3002)..."
(cd backend/attendance-service && PORT=3002 node dist/src/main.js) &

echo "--> Launching geofence-service (:3003)..."
(cd backend/geofence-service && PORT=3003 node dist/src/main.js) &

echo "--> Launching employee-service (:3004)..."
(cd backend/employee-service && PORT=3004 node dist/src/main.js) &

echo "--> Launching notification-service (:3005)..."
(cd backend/notification-service && PORT=3005 node dist/src/main.js) &

echo "--> Launching real Python face-ai-service (:3006)..."
(cd backend/face-ai-service && ./venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 3006) &

# Wait 3 seconds for microservices to bind
sleep 3

echo "--> Launching API Gateway (:8000)..."
(cd backend/api-gateway && PORT=8000 node dist/main.js)
