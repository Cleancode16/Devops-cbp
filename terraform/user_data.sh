#!/bin/bash
# Rendered by Terraform templatefile(): template variables are substituted before boot;
# literal Compose variables are written with a doubled dollar sign to escape them.
set -euxo pipefail
exec > >(tee /var/log/eventpass-bootstrap.log) 2>&1

# ---- swap: a t2.micro has 1 GiB RAM, the stack needs more headroom ----
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---- Docker Engine + Compose plugin ----
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
usermod -aG docker ubuntu

# ---- app files ----
APP_DIR=/opt/eventpass
mkdir -p $APP_DIR/monitoring/grafana/provisioning/datasources \
         $APP_DIR/monitoring/grafana/provisioning/dashboards \
         $APP_DIR/monitoring/grafana/dashboards

cat > $APP_DIR/.env <<'ENVEOF'
PORT=5000
MONGO_URI=mongodb://mongo:27017/eventpass
QR_SIGNING_SECRET=${qr_signing_secret}
APP_BASE_URL=${app_base_url}
LOG_LEVEL=info
DOCKER_USERNAME=${docker_username}
IMAGE_TAG=${image_tag}
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=${grafana_admin_password}
ENVEOF
chmod 600 $APP_DIR/.env

# Production compose: pulls images from Docker Hub (no build sections).
cat > $APP_DIR/docker-compose.yml <<'COMPOSEEOF'
name: eventpass

services:
  mongo:
    image: mongo:7.0
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--quiet', '--eval', "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks: [eventpass]

  server:
    image: $${DOCKER_USERNAME}/eventpass-server:$${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: .env
    depends_on:
      mongo:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:5000/health > /dev/null || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    networks: [eventpass]

  client:
    image: $${DOCKER_USERNAME}/eventpass-client:$${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - '80:8080'
      - '8080:8080'
    depends_on:
      server:
        condition: service_healthy
    networks: [eventpass]

  prometheus:
    image: prom/prometheus:v2.53.0
    restart: unless-stopped
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=7d
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - '9090:9090'
    networks: [eventpass]

  grafana:
    image: grafana/grafana:11.1.0
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: $${GF_SECURITY_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: $${GF_SECURITY_ADMIN_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: 'false'
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    ports:
      - '3000:3000'
    networks: [eventpass]

volumes:
  mongo-data:
  prometheus-data:
  grafana-data:

networks:
  eventpass:
    driver: bridge
COMPOSEEOF

# Monitoring config (same files as the repo's monitoring/ folder).
cat > $APP_DIR/monitoring/prometheus.yml <<'PROMEOF'
${prometheus_yml}
PROMEOF

cat > $APP_DIR/monitoring/grafana/provisioning/datasources/prometheus.yml <<'DSEOF'
${datasource_yml}
DSEOF

cat > $APP_DIR/monitoring/grafana/provisioning/dashboards/dashboards.yml <<'DBEOF'
${dashboards_yml}
DBEOF

cat > $APP_DIR/monitoring/grafana/dashboards/eventpass.json <<'JSONEOF'
${dashboard_json}
JSONEOF

chown -R ubuntu:ubuntu $APP_DIR
chmod -R a+rX $APP_DIR/monitoring

# ---- start the stack (retry: images may not be on Docker Hub yet) ----
cd $APP_DIR
for attempt in $(seq 1 10); do
  if docker compose pull && docker compose up -d; then
    echo "EventPass stack started"
    exit 0
  fi
  echo "Attempt $attempt failed; retrying in 30s"
  sleep 30
done
echo "Could not start the stack - push images (CI on main) then run: cd $APP_DIR && docker compose up -d"
