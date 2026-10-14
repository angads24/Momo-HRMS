#!/bin/bash
# Force Node.js runtime to use IPv4 DNS resolution first to prevent ENETUNREACH in Render cloud containers
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"


echo "=== Starting Momo HRMS Backend Services ==="

# 1. Fallback security secrets
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-render-default-jwt-access-secret-32-chars-minimum-prod}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-${JWT_ACCESS_SECRET}__refresh_secret_32_chars_min}"
export GATEWAY_SHARED_SECRET="${GATEWAY_SHARED_SECRET:-render-default-gateway-shared-secret-32-chars-minimum}"

# 2. Configure dedicated database URLs for each microservice
if [ -n "$DATABASE_URL" ]; then
  if echo "$DATABASE_URL" | grep -q "railway.internal"; then
    echo "⚠️  WARNING: DATABASE_URL contains 'railway.internal'. This internal hostname only works within Railway's private network and CANNOT be accessed from Render. Please use Railway's public TCP Proxy URL (e.g., mysql://...proxy.rlwy.net:PORT/dbname) in Render environment variables."
  fi

  # Strip any existing database name from end of DATABASE_URL (e.g. ...:12345/railway -> ...:12345)
  BASE_URL=$(echo "$DATABASE_URL" | sed -E 's|/[a-zA-Z0-9_\-]+(\?.*)?$||')
  # Capture any SSL / query parameters from URL
  QUERY_PARAMS=$(echo "$DATABASE_URL" | grep -o '\?.*' || true)

  export AUTH_DATABASE_URL="${AUTH_DATABASE_URL:-${BASE_URL}/auth_service${QUERY_PARAMS}}"
  export EMPLOYEE_DATABASE_URL="${EMPLOYEE_DATABASE_URL:-${BASE_URL}/employee_db${QUERY_PARAMS}}"
  export ATTENDANCE_DATABASE_URL="${ATTENDANCE_DATABASE_URL:-${BASE_URL}/attendance_service${QUERY_PARAMS}}"
  export GEOFENCE_DATABASE_URL="${GEOFENCE_DATABASE_URL:-${BASE_URL}/geofence_db${QUERY_PARAMS}}"
  export NOTIFICATION_DATABASE_URL="${NOTIFICATION_DATABASE_URL:-${BASE_URL}/notification_db${QUERY_PARAMS}}"
  export FACE_AI_DATABASE_URL="${FACE_AI_DATABASE_URL:-${BASE_URL}/face_ai_db${QUERY_PARAMS}}"

  echo "--> Ensuring all microservice databases exist on MySQL server..."
  echo "CREATE DATABASE IF NOT EXISTS auth_service; CREATE DATABASE IF NOT EXISTS employee_db; CREATE DATABASE IF NOT EXISTS attendance_service; CREATE DATABASE IF NOT EXISTS geofence_db; CREATE DATABASE IF NOT EXISTS notification_db; CREATE DATABASE IF NOT EXISTS face_ai_db;" | \
  npx --prefix backend/auth-service prisma db execute --stdin --url="$DATABASE_URL" 2>&1 || true

  echo "--> Deploying database schemas to all microservice databases..."

  echo "--> 1. Pushing auth_service schema..."
  DATABASE_URL="$AUTH_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/auth-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/auth-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 2. Pushing employee_db schema..."
  DATABASE_URL="$EMPLOYEE_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/employee-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/employee-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 3. Pushing attendance_service schema..."
  DATABASE_URL="$ATTENDANCE_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/attendance-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/attendance-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 4. Pushing geofence_db schema..."
  DATABASE_URL="$GEOFENCE_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/geofence-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/geofence-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 5. Pushing notification_db schema..."
  DATABASE_URL="$NOTIFICATION_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/notification-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/notification-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 6. Pushing face_ai_db schema..."
  DATABASE_URL="$FACE_AI_DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/face-ai-service/prisma/schema.prisma --skip-generate --accept-data-loss || \
  DATABASE_URL="$DATABASE_URL" npx --prefix backend/auth-service prisma db push --schema backend/face-ai-service/prisma/schema.prisma --skip-generate --accept-data-loss || true

  echo "--> 7. Seeding initial admin credentials & system roles..."
  DATABASE_URL="$AUTH_DATABASE_URL" node backend/auth-service/dist/prisma/seed.js || \
  DATABASE_URL="$DATABASE_URL" node backend/auth-service/dist/prisma/seed.js || true

  DATABASE_URL="$EMPLOYEE_DATABASE_URL" node backend/employee-service/dist/prisma/seed.js || \
  DATABASE_URL="$DATABASE_URL" node backend/employee-service/dist/prisma/seed.js || true

  DATABASE_URL="$GEOFENCE_DATABASE_URL" node backend/geofence-service/dist/prisma/seed.js || \
  DATABASE_URL="$DATABASE_URL" node backend/geofence-service/dist/prisma/seed.js || true

  DATABASE_URL="$NOTIFICATION_DATABASE_URL" node backend/notification-service/dist/prisma/seed.js || \
  DATABASE_URL="$DATABASE_URL" node backend/notification-service/dist/prisma/seed.js || true
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

# 4. Launch Python Face AI service (:3006)
echo "--> Launching Python Face AI service (:3006)..."
if [ -f "backend/face-ai-service/venv/bin/uvicorn" ]; then
  (cd backend/face-ai-service && DATABASE_URL="${FACE_AI_DATABASE_URL:-$DATABASE_URL}" ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3006) &
elif command -v uvicorn >/dev/null 2>&1; then
  (cd backend/face-ai-service && DATABASE_URL="${FACE_AI_DATABASE_URL:-$DATABASE_URL}" uvicorn app.main:app --host 0.0.0.0 --port 3006) &
else
  (cd backend/face-ai-service && DATABASE_URL="${FACE_AI_DATABASE_URL:-$DATABASE_URL}" python3 -m uvicorn app.main:app --host 0.0.0.0 --port 3006) &
fi

# Wait 4 seconds for all services to bind
sleep 4

# 5. Launch API Gateway on public port
PUBLIC_PORT="${PORT:-8000}"
echo "--> Launching API Gateway on port $PUBLIC_PORT..."
PORT="$PUBLIC_PORT" node backend/api-gateway/dist/main.js
