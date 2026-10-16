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
  timeout 30s npx --prefix backend/auth-service prisma db execute --stdin --url="$DATABASE_URL" < /dev/null 2>&1 || true

  echo "--> Deploying database schemas to all microservice databases..."

  # Helper to push schema: try dedicated database first; if it fails (e.g. database does not exist), fall back to primary DATABASE_URL
  push_schema() {
    local service_name="$1"
    local schema_path="$2"
    local env_var_name="$3"
    local dedicated_target="${!env_var_name}"

    echo "--> Pushing $service_name schema..."
    if ! DATABASE_URL="$dedicated_target" timeout 20s npx --prefix backend/auth-service prisma db push --schema "$schema_path" --skip-generate --accept-data-loss < /dev/null 2>&1; then
      echo "    [Notice] Push to $env_var_name failed or timed out. Falling back to primary DATABASE_URL..."
      if DATABASE_URL="$DATABASE_URL" timeout 20s npx --prefix backend/auth-service prisma db push --schema "$schema_path" --skip-generate --accept-data-loss < /dev/null 2>&1; then
        echo "    [OK] Successfully pushed $service_name schema to primary DATABASE_URL."
        export "$env_var_name"="$DATABASE_URL"
      else
        echo "    [Warning] Push to primary DATABASE_URL also failed or timed out. Continuing startup..."
      fi
    fi
  }

  push_schema "auth-service" "backend/auth-service/prisma/schema.prisma" "AUTH_DATABASE_URL"
  push_schema "employee-service" "backend/employee-service/prisma/schema.prisma" "EMPLOYEE_DATABASE_URL"
  push_schema "attendance-service" "backend/attendance-service/prisma/schema.prisma" "ATTENDANCE_DATABASE_URL"
  push_schema "geofence-service" "backend/geofence-service/prisma/schema.prisma" "GEOFENCE_DATABASE_URL"
  push_schema "notification-service" "backend/notification-service/prisma/schema.prisma" "NOTIFICATION_DATABASE_URL"
  push_schema "face-ai-service" "backend/face-ai-service/prisma/schema.prisma" "FACE_AI_DATABASE_URL"

  echo "--> Seeding initial admin credentials & system roles..."
  DATABASE_URL="${AUTH_DATABASE_URL:-$DATABASE_URL}" timeout 15s node backend/auth-service/dist/prisma/seed.js < /dev/null 2>&1 || true
  DATABASE_URL="${EMPLOYEE_DATABASE_URL:-$DATABASE_URL}" timeout 15s node backend/employee-service/dist/prisma/seed.js < /dev/null 2>&1 || true
  DATABASE_URL="${GEOFENCE_DATABASE_URL:-$DATABASE_URL}" timeout 15s node backend/geofence-service/dist/prisma/seed.js < /dev/null 2>&1 || true
  DATABASE_URL="${NOTIFICATION_DATABASE_URL:-$DATABASE_URL}" timeout 15s node backend/notification-service/dist/prisma/seed.js < /dev/null 2>&1 || true
fi

# Helper to start Node.js microservice with flexible entrypoint detection
start_node_service() {
  local service_name="$1"
  local port="$2"
  local db_url="$3"
  local entry="backend/$service_name/dist/src/main.js"

  if [ ! -f "$entry" ]; then
    entry="backend/$service_name/dist/main.js"
  fi

  echo "--> Launching $service_name (:$port) via $entry..."
  DATABASE_URL="$db_url" PORT="$port" node "$entry" &
}

# 3. Launch internal microservices pointing to their respective databases
start_node_service "auth-service" 3001 "${AUTH_DATABASE_URL:-$DATABASE_URL}"
start_node_service "attendance-service" 3002 "${ATTENDANCE_DATABASE_URL:-$DATABASE_URL}"
start_node_service "geofence-service" 3003 "${GEOFENCE_DATABASE_URL:-$DATABASE_URL}"
start_node_service "employee-service" 3004 "${EMPLOYEE_DATABASE_URL:-$DATABASE_URL}"
start_node_service "notification-service" 3005 "${NOTIFICATION_DATABASE_URL:-$DATABASE_URL}"

# 4. Launch Python Face AI service (:3006)
echo "--> Launching Python Face AI service (:3006)..."
FACE_AI_DB="${FACE_AI_DATABASE_URL:-$DATABASE_URL}"
PYTHON_DATABASE_URL=$(echo "$FACE_AI_DB" | sed 's|^mysql://|mysql+pymysql://|')

if [ -f "backend/face-ai-service/venv/bin/uvicorn" ]; then
  (cd backend/face-ai-service && DATABASE_URL="$PYTHON_DATABASE_URL" ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3006) &
elif command -v uvicorn >/dev/null 2>&1; then
  (cd backend/face-ai-service && DATABASE_URL="$PYTHON_DATABASE_URL" uvicorn app.main:app --host 0.0.0.0 --port 3006) &
else
  (cd backend/face-ai-service && DATABASE_URL="$PYTHON_DATABASE_URL" python3 -m uvicorn app.main:app --host 0.0.0.0 --port 3006) &
fi

# Wait 3 seconds for internal microservices to bind
sleep 3

# 5. Launch API Gateway on public port
PUBLIC_PORT="${PORT:-8000}"
GATEWAY_ENTRY="backend/api-gateway/dist/main.js"
if [ ! -f "$GATEWAY_ENTRY" ]; then
  GATEWAY_ENTRY="backend/api-gateway/dist/src/main.js"
fi

echo "--> Launching API Gateway on port $PUBLIC_PORT via $GATEWAY_ENTRY..."
PORT="$PUBLIC_PORT" exec node "$GATEWAY_ENTRY"