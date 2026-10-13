#!/bin/bash
set -e

echo "=== Starting Momo HRMS Backend Services ==="

# 1. Run Prisma database schema push if DATABASE_URL is provided
if [ -n "$DATABASE_URL" ]; then
  echo "--> Pushing Prisma database schemas..."
  (cd backend/auth-service && npx prisma db push --skip-generate || true)
  (cd backend/employee-service && npx prisma db push --skip-generate || true)
  (cd backend/attendance-service && npx prisma db push --skip-generate || true)
  (cd backend/geofence-service && npx prisma db push --skip-generate || true)
  (cd backend/notification-service && npx prisma db push --skip-generate || true)
fi

# Capture Render's assigned public PORT for API Gateway (Render typically gives 10000)
PUBLIC_PORT="${PORT:-8000}"

# 2. Start internal microservices on their designated fixed ports in background
echo "--> Starting internal services..."
PORT=3001 node backend/auth-service/dist/main.js &
PORT=3002 node backend/attendance-service/dist/main.js &
PORT=3003 node backend/geofence-service/dist/main.js &
PORT=3004 node backend/employee-service/dist/main.js &
PORT=3005 node backend/notification-service/dist/main.js &

# Optional: Start Face AI service if uvicorn is available
if command -v uvicorn >/dev/null 2>&1; then
  echo "--> Starting Face AI service..."
  (cd backend/face-ai-service && uvicorn app.main:app --host 0.0.0.0 --port 3006) &
fi

# Give internal services 4 seconds to bind ports
sleep 4

# 3. Start API Gateway on the public port in foreground
echo "--> Starting API Gateway on port $PUBLIC_PORT..."
PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
