param(
  [switch]$Reset,
  [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Usage {
  Write-Host @"
Usage: .\start-local.ps1 [-Reset]

Starts the local Docker environment safely.

Options:
  -Reset    Stop containers and delete local Docker volumes before starting.
            This removes PostgreSQL, Redis, and MinIO local data.
  -Help     Show this help.
"@
}

if ($Help) {
  Show-Usage
  exit 0
}

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Success {
  param([string]$Message)
  Write-Host "OK: $Message" -ForegroundColor Green
}

function Write-WarningMessage {
  param([string]$Message)
  Write-Host "WARN: $Message" -ForegroundColor Yellow
}

function Fail {
  param([string]$Message)
  throw "ERROR: $Message"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Missing required command: docker"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "Docker is not running or current user cannot access Docker."
}

$script:ComposeMode = $null
docker compose version *> $null
if ($LASTEXITCODE -eq 0) {
  $script:ComposeMode = "plugin"
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
  $script:ComposeMode = "legacy"
} else {
  Fail "Docker Compose is not available. Install Docker Compose v2 or docker-compose."
}

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $ComposeArgs)

  # Use long Docker flags at call sites; PowerShell can consume short flags
  # such as -d/-v as common parameters before this wrapper receives them.
  if ($script:ComposeMode -eq "plugin") {
    & docker compose @ComposeArgs
  } else {
    & docker-compose @ComposeArgs
  }

  if ($LASTEXITCODE -ne 0) {
    Fail "docker compose command failed: $($ComposeArgs -join ' ')"
  }
}

function Get-ComposeOutput {
  param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $ComposeArgs)

  $output = if ($script:ComposeMode -eq "plugin") {
    & docker compose @ComposeArgs
  } else {
    & docker-compose @ComposeArgs
  }

  if ($LASTEXITCODE -ne 0) {
    Fail "docker compose command failed: $($ComposeArgs -join ' ')"
  }

  return $output
}

function Show-ServiceLogs {
  param([string]$Service)

  Write-WarningMessage "Recent logs for service '$Service':"
  try {
    Invoke-Compose logs --tail 80 $Service
  } catch {
    Write-WarningMessage "Unable to read logs for $Service"
  }
}

function Wait-ComposeHealth {
  param(
    [string]$Service,
    [int]$TimeoutSeconds = 120
  )

  Write-Step "Waiting for $Service to become healthy..."
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)

  while ([DateTime]::UtcNow -lt $deadline) {
    $containerIdLine = Get-ComposeOutput ps --quiet $Service | Select-Object -First 1
    $containerId = if ($null -eq $containerIdLine) { "" } else { $containerIdLine.ToString().Trim() }

    if ($containerId) {
      $status = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId 2>$null)
      if ($LASTEXITCODE -eq 0) {
        switch ($status) {
          "healthy" {
            Write-Success "$Service is healthy"
            return
          }
          "running" {
            Write-Success "$Service is running"
            return
          }
          "unhealthy" {
            Show-ServiceLogs $Service
            Fail "$Service is unhealthy"
          }
          "exited" {
            Show-ServiceLogs $Service
            Fail "$Service exited"
          }
          "dead" {
            Show-ServiceLogs $Service
            Fail "$Service is dead"
          }
        }
      }
    }

    Start-Sleep -Seconds 2
  }

  Show-ServiceLogs $Service
  Fail "Timed out waiting for $Service health"
}

function Wait-Http {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds = 120
  )

  Write-Step "Checking $Name at $Url..."
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)

  while ([DateTime]::UtcNow -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 *> $null
      Write-Success "$Name is reachable"
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  Fail "Timed out waiting for $Name at $Url"
}

Write-Step "Starting local development environment..."
Write-Step "Compose mode: $script:ComposeMode"

if ($Reset) {
  Write-WarningMessage "-Reset selected: local PostgreSQL, Redis, and MinIO Docker volumes will be deleted."
  Invoke-Compose down --volumes --remove-orphans
} else {
  Write-Step "Safe mode: preserving existing Docker volumes. Use -Reset to recreate local data."
}

Write-Step "Validating compose configuration..."
Invoke-Compose config *> $null

Write-Step "Starting infrastructure services..."
Invoke-Compose up --detach --remove-orphans db redis minio
Wait-ComposeHealth -Service db -TimeoutSeconds 120
Wait-ComposeHealth -Service redis -TimeoutSeconds 120
Wait-ComposeHealth -Service minio -TimeoutSeconds 120

Write-Step "Building backend image..."
Invoke-Compose build backend

Write-Step "Running database migrations..."
Invoke-Compose run --rm backend npx prisma migrate deploy

Write-Step "Seeding initial data..."
Invoke-Compose run --rm backend npx prisma db seed

Write-Step "Starting backend service..."
Invoke-Compose up --detach backend
Wait-Http -Name "Backend health" -Url "http://localhost:13001/health" -TimeoutSeconds 120

Write-Step "Building and starting frontend service..."
Invoke-Compose up --detach --build frontend
Wait-Http -Name "Frontend" -Url "http://localhost:18080" -TimeoutSeconds 120

Write-Host ""
Write-Success "All services are running."
Write-Host "Frontend: http://localhost:18080"
Write-Host "Backend:  http://localhost:13001"
Write-Host "API Docs: http://localhost:13001/api/docs"
Write-Host "Agent:    http://localhost:18000/agent/health"
Write-Host "MinIO:    http://localhost:19001"
