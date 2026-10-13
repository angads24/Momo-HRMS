#!/bin/bash

echo "=== Starting Momo HRMS Backend Services ==="

# Helper to run a service prioritizing dist/src/main.js
start_service() {
  local service_name="$1"
  local port="$2"
  local s_dir="backend/$service_name"

  if [ -f "$s_dir/dist/src/main.js" ]; then
    echo "--> Starting $service_name on port $port (dist/src/main.js)"
    PORT="$port" node "$s_dir/dist/src/main.js" &
  elif [ -f "$s_dir/dist/main.js" ]; then
    echo "--> Starting $service_name on port $port (dist/main.js)"
    PORT="$port" node "$s_dir/dist/main.js" &
  else
    echo "--> [Warning] main.js not found for $service_name"
  fi
}

# 1. Non-blocking Prisma schema sync & initial user seed
if [ -n "$DATABASE_URL" ]; then
  echo "--> Syncing database schemas & seeding initial data..."
  (cd backend/auth-service && timeout 10s npx prisma db push --skip-generate --accept-data-loss 2>/dev/null && timeout 10s npx ts-node prisma/seed.ts 2>/dev/null || true)
  (cd backend/employee-service && timeout 5s npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true)
  (cd backend/attendance-service && timeout 5s npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true)
  (cd backend/geofence-service && timeout 5s npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true)
  (cd backend/notification-service && timeout 5s npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true)
fi

# 2. Launch all 5 internal microservices on their designated internal ports
start_service "auth-service" 3001
start_service "attendance-service" 3002
start_service "geofence-service" 3003
start_service "employee-service" 3004
start_service "notification-service" 3005

# Optional Face AI service
if command -v uvicorn >/dev/null 2>&1; then
  echo "--> Starting Face AI service on port 3006"
  (cd backend/face-ai-service && uvicorn app.main:app --host 0.0.0.0 --port 3006) &
fi

# Wait 4 seconds for internal ports to initialize
sleep 4

# 3. Start API Gateway on Render's assigned public port (in foreground)
PUBLIC_PORT="${PORT:-8000}"
echo "--> Starting API Gateway on public port $PUBLIC_PORT..."
if [ -f "backend/api-gateway/dist/main.js" ]; then
  PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
else
  PORT="$PUBLIC_PORT" node backend/api-gateway/dist/src/main.js
fi
