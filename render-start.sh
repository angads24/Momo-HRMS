#!/bin/bash

echo "=== Starting Momo HRMS Backend Services ==="

# 1. Fallback security secrets
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-render-default-jwt-access-secret-32-chars-minimum-prod}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-${JWT_ACCESS_SECRET}__refresh_secret_32_chars_min}"
export GATEWAY_SHARED_SECRET="${GATEWAY_SHARED_SECRET:-render-default-gateway-shared-secret-32-chars-minimum}"

# 2. Configure dedicated database URLs for each microservice
if [ -n "$DATABASE_URL" ]; then
  # Strip any existing database name from end of DATABASE_URL (e.g. ...:12345/railway -> ...:12345)
  BASE_URL=$(echo "$DATABASE_URL" | sed -E 's|/[a-zA-Z0-9_\-]+(\?.*)?$||')
  # Capture any SSL / query parameters from URL
  QUERY_PARAMS=$(echo "$DATABASE_URL" | grep -o '\?.*' || true)

  export AUTH_DATABASE_URL="${AUTH_DATABASE_URL:-${BASE_URL}/auth_service${QUERY_PARAMS}}"
  export EMPLOYEE_DATABASE_URL="${EMPLOYEE_DATABASE_URL:-${BASE_URL}/employee_db${QUERY_PARAMS}}"
  export ATTENDANCE_DATABASE_URL="${ATTENDANCE_DATABASE_URL:-${BASE_URL}/attendance_service${QUERY_PARAMS}}"
  export GEOFENCE_DATABASE_URL="${GEOFENCE_DATABASE_URL:-${BASE_URL}/geofence_db${QUERY_PARAMS}}"
  export NOTIFICATION_DATABASE_URL="${NOTIFICATION_DATABASE_URL:-${BASE_URL}/notification_db${QUERY_PARAMS}}"

  echo "--> Deploying database schemas to all microservice databases..."

  # Push schemas to each individual database (with fallback to default DATABASE_URL if DB doesn't exist)
  echo "--> 1. Pushing auth_service schema..."
  DATABASE_URL="$AUTH_DATABASE_URL" npx --prefix backend/auth-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

  echo "--> 2. Pushing employee_db schema..."
  DATABASE_URL="$EMPLOYEE_DATABASE_URL" npx --prefix backend/employee-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/employee-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

  echo "--> 3. Pushing attendance_service schema..."
  DATABASE_URL="$ATTENDANCE_DATABASE_URL" npx --prefix backend/attendance-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/attendance-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

  echo "--> 4. Pushing geofence_db schema..."
  DATABASE_URL="$GEOFENCE_DATABASE_URL" npx --prefix backend/geofence-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/geofence-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

  echo "--> 5. Pushing notification_db schema..."
  DATABASE_URL="$NOTIFICATION_DATABASE_URL" npx --prefix backend/notification-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/notification-service prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

  echo "--> 6. Seeding initial admin credentials & system roles..."
  DATABASE_URL="$AUTH_DATABASE_URL" node backend/auth-service/dist/prisma/seed.js 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" node backend/auth-service/dist/prisma/seed.js 2>/dev/null || true

  DATABASE_URL="$EMPLOYEE_DATABASE_URL" node backend/employee-service/dist/prisma/seed.js 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" node backend/employee-service/dist/prisma/seed.js 2>/dev/null || true

  DATABASE_URL="$GEOFENCE_DATABASE_URL" node backend/geofence-service/dist/prisma/seed.js 2>/dev/null || \
  DATABASE_URL="$DATABASE_URL" node backend/geofence-service/dist/prisma/seed.js 2>/dev/null || true
fi

# 3. Launch internal microservices pointing to their respective databases
echo "--> Launching auth-service (:3001)..."
DATABASE_URL="${AUTH_DATABASE_URL:-$DATABASE_URL}" PORT=3001 node backend/auth-service/dist/src/main.js &

echo "--> Launching attendance-service (:3002)..."
DATABASE_URL="${ATTENDANCE_DATABASE_URL:-$DATABASE_URL}" PORT=3002 node backend/attendance-service/dist/src/main.js &

echo "--> Launching geofence-service (:3003)..."
DATABASE_URL="${GEOFENCE_DATABASE_URL:-$DATABASE_URL}" PORT=3003 node backend/geofence-service/dist/src/main.js &

echo "--> Launching employee-service (:3004)..."
DATABASE_URL="${EMPLOYEE_DATABASE_URL:-$DATABASE_URL}" PORT=3004 node backend/employee-service/dist/src/main.js &

echo "--> Launching notification-service (:3005)..."
DATABASE_URL="${NOTIFICATION_DATABASE_URL:-$DATABASE_URL}" PORT=3005 node backend/notification-service/dist/src/main.js &

# 4. Launch Face AI service (:3006)
if command -v uvicorn >/dev/null 2>&1; then
  echo "--> Launching Python Face AI service (:3006)..."
  (cd backend/face-ai-service && uvicorn app.main:app --host 0.0.0.0 --port 3006) &
else
  echo "--> Launching Node Face AI service (:3006)..."
  PORT=3006 node backend/face-ai-service/mock_server.js &
fi

# Wait 4 seconds for all services to bind
sleep 4

# 5. Launch API Gateway on public port
PUBLIC_PORT="${PORT:-8000}"
echo "--> Launching API Gateway on port $PUBLIC_PORT..."
PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
