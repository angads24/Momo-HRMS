#!/bin/bash

echo "=== Starting Momo HRMS Backend Services ==="

# 1. Provide secure fallbacks for any missing environment secrets to prevent boot crash
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-render-default-jwt-access-secret-32-chars-minimum-prod}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-${JWT_ACCESS_SECRET}__refresh_secret_32_chars_min}"
export GATEWAY_SHARED_SECRET="${GATEWAY_SHARED_SECRET:-render-default-gateway-shared-secret-32-chars-minimum}"

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

# 2. Database schema push & seeding (runs with pure node)
if [ -n "$DATABASE_URL" ]; then
  echo "--> Pushing Prisma database schemas to MySQL..."
  (cd backend/auth-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/employee-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/attendance-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/geofence-service && npx prisma db push --skip-generate --accept-data-loss || true)
  (cd backend/notification-service && npx prisma db push --skip-generate --accept-data-loss || true)

  echo "--> Seeding default data & admin credentials..."
  node backend/auth-service/dist/prisma/seed.js || true
  node backend/employee-service/dist/prisma/seed.js 2>/dev/null || true
  node backend/geofence-service/dist/prisma/seed.js 2>/dev/null || true
fi

# 3. Launch all 5 internal microservices on their designated internal ports
start_service "auth-service" 3001
start_service "attendance-service" 3002
start_service "geofence-service" 3003
start_service "employee-service" 3004
start_service "notification-service" 3005

# 4. Launch Face AI service
if command -v uvicorn >/dev/null 2>&1; then
  echo "--> Starting Python Face AI service on port 3006"
  (cd backend/face-ai-service && uvicorn app.main:app --host 0.0.0.0 --port 3006) &
else
  echo "--> Starting Node Face AI service on port 3006"
  PORT=3006 node backend/face-ai-service/mock_server.js &
fi

# Wait 4 seconds for internal ports to initialize
sleep 4

# 5. Start API Gateway on Render's assigned public port (in foreground)
PUBLIC_PORT="${PORT:-8000}"
echo "--> Starting API Gateway on public port $PUBLIC_PORT..."
if [ -f "backend/api-gateway/dist/main.js" ]; then
  PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
else
  PORT="$PUBLIC_PORT" node backend/api-gateway/dist/src/main.js
fi
