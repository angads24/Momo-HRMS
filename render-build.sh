#!/bin/bash
set -e

echo "=== Building Momo HRMS Backend Services ==="

# 1. Build all Node.js microservices
for s in auth-service employee-service attendance-service geofence-service notification-service api-gateway; do
  echo "--> Building $s..."
  (
    cd "backend/$s"
    npm install --include=dev
    (npx prisma generate 2>/dev/null || true)
    npm run build
    # Ensure dist/main.js exists if compiled to dist/src/main.js
    if [ -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then
      cp dist/src/main.js dist/main.js 2>/dev/null || true
    fi
  )
done

# 2. Build Python Face AI service (pure OpenCV & FastAPI - lightweight)
if [ "$SKIP_LOCAL_FACE_BUILD" != "true" ]; then
  echo "--> Setting up Python Face AI service..."
  python3 -m venv backend/face-ai-service/venv
  ./backend/face-ai-service/venv/bin/pip install --upgrade pip
  ./backend/face-ai-service/venv/bin/pip install --no-cache-dir -r backend/face-ai-service/requirements.txt
else
  echo "--> SKIP_LOCAL_FACE_BUILD is true. Skipping local Python venv build to speed up deployment."
fi

echo "=== All services built successfully! ==="
