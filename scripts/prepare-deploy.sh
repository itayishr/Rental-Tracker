#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f package.json || ! -f server.js ]]; then
  echo "Run this from the project root (package.json + server.js required)."
  exit 1
fi

cat > Dockerfile <<'EOF'
FROM mcr.microsoft.com/playwright:v1.50.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
EOF

cat > .dockerignore <<'EOF'
node_modules
dist
.git
.gitignore
npm-debug.log*
.DS_Store
Dockerfile*
EOF

cat > render.yaml <<'EOF'
services:
  - type: web
    name: apartment-hunter
    env: docker
    plan: free
    autoDeploy: true
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
      - key: APP_PASSWORD
        sync: false
EOF

echo "Created Dockerfile, .dockerignore, render.yaml"
echo "Next:"
echo "1) docker build -t apartment-hunter ."
echo "2) docker run --rm -p 10000:10000 -e APP_PASSWORD='your-password' apartment-hunter"
echo "3) Push repo and deploy on Render (Docker)."
