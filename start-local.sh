#!/usr/bin/env bash
set -Eeuo pipefail

RESET=false

usage() {
  cat <<'EOF'
Usage: ./start-local.sh [--reset]

Starts the local Docker environment safely.

Options:
  --reset    Stop containers and delete local Docker volumes before starting.
             This removes PostgreSQL, Redis, and MinIO local data.
  -h, --help Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset)
      RESET=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

info() {
  echo "==> $*"
}

success() {
  echo "OK: $*"
}

warn() {
  echo "WARN: $*" >&2
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
    return
  fi

  fail "Docker Compose is not available. Install Docker Compose v2 or docker-compose."
}

compose() {
  "${COMPOSE[@]}" "$@"
}

compose_output() {
  "${COMPOSE[@]}" "$@"
}

print_service_logs() {
  local service="$1"
  warn "Recent logs for service '$service':"
  compose logs --tail=80 "$service" >&2 || true
}

wait_for_compose_health() {
  local service="$1"
  local timeout_seconds="${2:-120}"
  local deadline=$((SECONDS + timeout_seconds))
  local container_id
  local status

  info "Waiting for $service to become healthy..."

  while (( SECONDS < deadline )); do
    container_id="$(compose_output ps -q "$service" | tr -d '\r')"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      case "$status" in
        healthy|running)
          success "$service is $status"
          return 0
          ;;
        unhealthy|exited|dead)
          print_service_logs "$service"
          fail "$service is $status"
          ;;
      esac
    fi
    sleep 2
  done

  print_service_logs "$service"
  fail "Timed out waiting for $service health"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local timeout_seconds="${3:-120}"
  local deadline=$((SECONDS + timeout_seconds))

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl is not installed; skipping HTTP check for $name ($url)"
    return 0
  fi

  info "Checking $name at $url..."

  while (( SECONDS < deadline )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      success "$name is reachable"
      return 0
    fi
    sleep 2
  done

  fail "Timed out waiting for $name at $url"
}

require_command docker
require_command curl
docker info >/dev/null 2>&1 || fail "Docker is not running or current user cannot access Docker."
detect_compose

info "Starting local development environment..."
info "Compose command: ${COMPOSE[*]}"

if [[ "$RESET" == true ]]; then
  warn "--reset selected: local PostgreSQL, Redis, and MinIO Docker volumes will be deleted."
  compose down -v --remove-orphans
else
  info "Safe mode: preserving existing Docker volumes. Use --reset to recreate local data."
fi

info "Validating compose configuration..."
compose config >/dev/null

info "Starting infrastructure services..."
compose up -d --remove-orphans db redis minio
wait_for_compose_health db 120
wait_for_compose_health redis 120
wait_for_compose_health minio 120

info "Building backend image..."
compose build backend

info "Running database migrations..."
compose run --rm backend npx prisma migrate deploy

info "Seeding initial data..."
compose run --rm backend npx prisma db seed

info "Starting backend service..."
compose up -d backend
wait_for_http "Backend health" "http://localhost:3001/health" 120

info "Building and starting frontend service..."
compose up -d --build frontend
wait_for_http "Frontend" "http://localhost:8080" 120

echo ""
success "All services are running."
echo "Frontend: http://localhost:8080"
echo "Backend:  http://localhost:3001"
echo "API Docs: http://localhost:3001/api/docs"
echo "MinIO:    http://localhost:9001"
