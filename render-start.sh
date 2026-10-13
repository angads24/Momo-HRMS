#!/bin/bash
set -e

echo "=== Starting Momo HRMS Backend Services ==="

# 1. Build any missing service dist/main.js automatically
for s in auth-service attendance-service geofence-service employee-service notification-service api-gateway; do
  if [ ! -f "backend/$s/dist/main.js" ]; then
    echo "--> [Warning] backend/$s/dist/main.js not found. Compiling now..."
    (cd "backend/$s" && npm install --include=dev && npx prisma generate 2>/dev/null || true && npm run build)
  fi
done

# 2. Run Prisma database schema push if DATABASE_URL is reachable
if [ -n "$DATABASE_URL" ]; then
  echo "--> Checking Prisma database connectivity..."
  (cd backend/auth-service && npx prisma db push --skip-generate --accept-data-loss || echo "Prisma push skipped or failed, continuing...")
  (cd backend/employee-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/attendance-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/geofence-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/notification-service && npx prisma db push --skip-generate --accept-data-loss || true)
fi

# Capture Render's assigned public PORT for API Gateway (Render provides PORT, e.g. 10000)
PUBLIC_PORT="${PORT:-8000}"

# 3. Start internal microservices on their designated fixed ports in background
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

# Give internal services 5 seconds to bind ports
echo "--> Waiting for internal microservices to initialize..."
sleep 5

# 4. Start API Gateway on the public port in foreground
echo "--> Starting API Gateway on port $PUBLIC_PORT..."
PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
