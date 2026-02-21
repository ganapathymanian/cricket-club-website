<#
.SYNOPSIS
    Cricket Club Website - Environment Setup Script

.DESCRIPTION
    Sets up the Cricket Club Website project in a new environment.
    Installs dependencies, configures environment, and starts servers.

.PARAMETER InstallOnly
    Install dependencies only, do not start servers.

.PARAMETER StartOnly
    Start servers only, skip dependency installation.

.PARAMETER StopAll
    Stop all running servers.

.PARAMETER Backup
    Create a timestamped backup of the project.

.PARAMETER Port
    Custom frontend port (default: 5173). Use -Port 80 for production.

.EXAMPLE
    .\setup.ps1                  # Full setup: install + start
    .\setup.ps1 -InstallOnly     # Install dependencies only
    .\setup.ps1 -StartOnly       # Start servers only
    .\setup.ps1 -Port 80         # Start on port 80 (run as Admin)
    .\setup.ps1 -StopAll         # Stop all running servers
    .\setup.ps1 -Backup          # Create a backup
#>

param(
    [switch]$InstallOnly,
    [switch]$StartOnly,
    [switch]$StopAll,
    [switch]$Backup,
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

# ---- Configuration ----
$ProjectRoot   = $PSScriptRoot
$ServerDir     = Join-Path $ProjectRoot "server"
$BackupBase    = Join-Path (Split-Path $ProjectRoot -Parent) "Backups"
$FrontendPort  = $Port
$BackendPort   = 3001

# ---- Helpers ----
function Write-Step   ($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK     ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn   ($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err    ($msg) { Write-Host "  [ERROR] $msg" -ForegroundColor Red }

function Write-Banner {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkRed
    Write-Host "    Cricket Club Website - Setup Script" -ForegroundColor DarkRed
    Write-Host "============================================================" -ForegroundColor DarkRed
    Write-Host ""
}

# ---- Ensure Node.js is available ----
function Ensure-Node {
    Write-Step "Checking Node.js..."

    # Try common install locations if not already in PATH
    $nodePaths = @(
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs",
        "$env:APPDATA\nvm\current",
        "$env:LOCALAPPDATA\Programs\nodejs"
    )
    foreach ($p in $nodePaths) {
        if ((Test-Path (Join-Path $p "node.exe")) -and ($env:Path -notlike "*$p*")) {
            $env:Path = "$p;$env:Path"
        }
    }

    try {
        $nodeVersion = & node --version 2>$null
        Write-OK "Node.js $nodeVersion found"
    }
    catch {
        Write-Err "Node.js not found! Please install Node.js (v18+) from https://nodejs.org"
        exit 1
    }

    try {
        $npmVersion = & npm --version 2>$null
        Write-OK "npm v$npmVersion found"
    }
    catch {
        Write-Err "npm not found!"
        exit 1
    }
}

# ---- Stop running servers ----
function Stop-Servers {
    Write-Step "Stopping any running servers..."

    $portsToCheck = @($FrontendPort, ($FrontendPort + 1), $BackendPort, 5173, 5174, 80) | Select-Object -Unique
    foreach ($port in $portsToCheck) {
        $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procs) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-OK "Stopped process $procId on port $port"
            } catch {}
        }
    }
    Start-Sleep -Seconds 2
}

# ---- Create .env if missing ----
function Ensure-Env {
    Write-Step "Checking server .env file..."
    $envFile = Join-Path $ServerDir ".env"

    if (Test-Path $envFile) {
        Write-OK ".env file exists"
        # Ensure ALLOWED_ORIGINS includes the current frontend port
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "ALLOWED_ORIGINS=" -and $envContent -notmatch "localhost:$FrontendPort") {
            $envContent = $envContent -replace "(ALLOWED_ORIGINS=.*)", "`$1,http://localhost:$FrontendPort"
            Set-Content -Path $envFile -Value $envContent -Encoding UTF8 -NoNewline
            Write-OK "Added http://localhost:$FrontendPort to ALLOWED_ORIGINS"
        }
    }
    else {
        Write-Warn ".env not found - creating with defaults..."
        $yearNow = (Get-Date).Year
        $envContent = @"
# Cricket Club Server - Environment Configuration

# Server Configuration
PORT=$BackendPort
NODE_ENV=development

# JWT Configuration
JWT_SECRET=cricket_club_dev_secret_key_$yearNow

# CORS - Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:$FrontendPort,http://localhost:$($FrontendPort+1),http://localhost:3000,capacitor://localhost

# Super Admin Emails - Comma-separated (change to your email)
SUPER_ADMIN_EMAILS=admin@example.com
"@
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Write-OK ".env created at $envFile"
        Write-Warn "UPDATE SUPER_ADMIN_EMAILS in server\.env with your admin email!"
    }
}

# ---- Install dependencies ----
function Install-Dependencies {
    Write-Step "Installing frontend dependencies (this may take a minute)..."

    # Remove existing node_modules to ensure native binaries match this platform
    $feModules = Join-Path $ProjectRoot "node_modules"
    if (Test-Path $feModules) {
        Write-Warn "Removing existing node_modules for clean install..."
        Remove-Item $feModules -Recurse -Force -ErrorAction SilentlyContinue
    }

    Push-Location $ProjectRoot
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & npm install 2>&1 | Out-Null
    $feExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    Pop-Location

    if ($feExit -ne 0) {
        Write-Err "npm install failed for frontend (exit code $feExit)"
        exit 1
    }
    Write-OK "Frontend dependencies installed"

    Write-Step "Installing server dependencies..."

    $beModules = Join-Path $ServerDir "node_modules"
    if (Test-Path $beModules) {
        Write-Warn "Removing existing server node_modules for clean install..."
        Remove-Item $beModules -Recurse -Force -ErrorAction SilentlyContinue
    }

    Push-Location $ServerDir
    $ErrorActionPreference = "Continue"
    & npm install 2>&1 | Out-Null
    $beExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    Pop-Location

    if ($beExit -ne 0) {
        Write-Err "npm install failed for server (exit code $beExit)"
        exit 1
    }
    Write-OK "Server dependencies installed"
}

# ---- Start backend server ----
function Start-Backend {
    Write-Step "Starting backend server (port $BackendPort)..."

    $existing = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Warn "Port $BackendPort already in use - skipping backend start"
        return
    }

    $serverScript = Join-Path $ServerDir "index-simple.js"
    if (-not (Test-Path $serverScript)) {
        Write-Err "Server file not found: $serverScript"
        return
    }

    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) {
        Write-Err "node executable not found in PATH"
        return
    }
    $nodeDir = Split-Path $nodePath -Parent
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c set PATH=$nodeDir;%PATH% && node `"$serverScript`"" `
        -WorkingDirectory $ServerDir -WindowStyle Minimized -PassThru | Out-Null

    $retries = 10
    while ($retries -gt 0) {
        Start-Sleep -Milliseconds 500
        $conn = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
        if ($conn) {
            Write-OK "Backend running at http://localhost:$BackendPort"
            return
        }
        $retries--
    }
    Write-Warn "Backend may still be starting - check http://localhost:$BackendPort/api/health"
}

# ---- Start frontend dev server ----
function Start-Frontend {
    Write-Step "Starting frontend dev server (port $FrontendPort)..."

    $existing = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Warn "Port $FrontendPort already in use - skipping frontend start"
        return
    }

    # Ensure Windows Firewall allows the frontend port
    $ruleName = "CricketClub-Frontend-Port-$FrontendPort"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        try {
            New-NetFirewallRule -DisplayName $ruleName `
                -Direction Inbound -Protocol TCP -LocalPort $FrontendPort `
                -Action Allow -Profile Any -ErrorAction Stop | Out-Null
            Write-OK "Firewall rule added for port $FrontendPort"
        } catch {
            Write-Warn "Could not add firewall rule (need Admin). Run as Administrator or manually allow port $FrontendPort"
        }
    } else {
        Write-OK "Firewall rule already exists for port $FrontendPort"
    }

    # Verify node_modules exist
    $viteScript = Join-Path $ProjectRoot (Join-Path "node_modules" (Join-Path "vite" (Join-Path "bin" "vite.js")))
    if (-not (Test-Path $viteScript)) {
        Write-Err "Vite not found at $viteScript"
        Write-Err "Run setup.ps1 without -StartOnly first to install dependencies"
        return
    }

    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) {
        Write-Err "node executable not found in PATH"
        return
    }
    $nodeDir = Split-Path $nodePath -Parent

    # Log file so we can diagnose startup failures
    $logFile = Join-Path $ProjectRoot "frontend-startup.log"

    # Use node directly to run vite - most reliable across environments
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c set PATH=$nodeDir;%PATH% && node `"$viteScript`" --host 0.0.0.0 --port $FrontendPort > `"$logFile`" 2>&1" `
        -WorkingDirectory $ProjectRoot -WindowStyle Minimized -PassThru | Out-Null

    $retries = 30
    $actualPort = $FrontendPort
    while ($retries -gt 0) {
        Start-Sleep -Seconds 1
        $conn = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue
        if ($conn) { $actualPort = $FrontendPort; break }
        $conn2 = Get-NetTCPConnection -LocalPort ($FrontendPort + 1) -ErrorAction SilentlyContinue
        if ($conn2) { $actualPort = $FrontendPort + 1; break }
        $retries--
    }

    if ($retries -gt 0) {
        Write-OK "Frontend running at http://localhost:$actualPort"
        # Clean up log on success
        Remove-Item $logFile -ErrorAction SilentlyContinue
    }
    else {
        Write-Warn "Frontend failed to start within 30 seconds"
        if (Test-Path $logFile) {
            Write-Warn "Startup log (last 15 lines):"
            Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        }
    }
}

# ---- Create backup ----
function New-ProjectBackup {
    Write-Step "Creating backup..."

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $BackupBase "CricketClub_Backup_$timestamp"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # Copy source directories
    foreach ($dir in @("src", "utils", "public", "guidelines")) {
        $src = Join-Path $ProjectRoot $dir
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $backupDir $dir) -Recurse
        }
    }

    # Copy server (excluding node_modules)
    $serverBackup = Join-Path $backupDir "server"
    New-Item -ItemType Directory -Path $serverBackup -Force | Out-Null
    Get-ChildItem $ServerDir -Exclude "node_modules" |
        Copy-Item -Destination $serverBackup -Recurse -ErrorAction SilentlyContinue

    # Copy root config files
    $configFiles = @(
        "package.json", "package-lock.json", "vite.config.ts", "index.html",
        "postcss.config.mjs", "capacitor.config.json", "README.md",
        "ATTRIBUTIONS.md", "FIXTURE_GENERATOR_GUIDE.md", "setup.ps1"
    )
    foreach ($f in $configFiles) {
        $src = Join-Path $ProjectRoot $f
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $backupDir $f)
        }
    }

    $totalFiles = (Get-ChildItem $backupDir -Recurse -File).Count
    $totalSize  = [math]::Round(((Get-ChildItem $backupDir -Recurse -File |
                    Measure-Object -Property Length -Sum).Sum / 1MB), 2)

    Write-OK "Backup created: $backupDir"
    Write-OK "$totalFiles files, $totalSize MB"
    Write-Host ""
    Get-ChildItem $backupDir | Format-Table Name, LastWriteTime, @{
        Name       = "Size"
        Expression = { if ($_.PSIsContainer) { "<DIR>" } else { "{0:N0} KB" -f ($_.Length / 1KB) } }
    } -AutoSize
}

# ---- Print final status ----
function Show-Status {
    Write-Host ""
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

    $beUp = $null -ne (Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue)
    $fePort = $null
    if (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue) {
        $fePort = $FrontendPort
    }
    elseif (Get-NetTCPConnection -LocalPort ($FrontendPort + 1) -ErrorAction SilentlyContinue) {
        $fePort = $FrontendPort + 1
    }

    if ($beUp) {
        Write-Host "  [RUNNING] Backend:  http://localhost:$BackendPort" -ForegroundColor Green
    } else {
        Write-Host "  [STOPPED] Backend:  not running" -ForegroundColor Red
    }

    if ($fePort) {
        Write-Host "  [RUNNING] Frontend: http://localhost:$fePort" -ForegroundColor Green
        # Show external IP for remote access
        try {
            $externalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress
            if (-not $externalIP) {
                $externalIP = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
            }
            if ($externalIP) {
                if ($fePort -eq 80) {
                    Write-Host "  [REMOTE]  External: http://$externalIP" -ForegroundColor Green
                } else {
                    Write-Host "  [REMOTE]  External: http://${externalIP}:$fePort" -ForegroundColor Green
                }
            }
        } catch {}
    } else {
        Write-Host "  [STOPPED] Frontend: not running" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "  Admin email: Check SUPER_ADMIN_EMAILS in server\.env" -ForegroundColor DarkGray
    Write-Host "  To stop:     .\setup.ps1 -StopAll" -ForegroundColor DarkGray
    Write-Host "  To backup:   .\setup.ps1 -Backup" -ForegroundColor DarkGray
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
# Main
# ============================================================
Write-Banner
Ensure-Node

if ($StopAll) {
    Stop-Servers
    Write-OK "All servers stopped."
    exit 0
}

if ($Backup) {
    New-ProjectBackup
    exit 0
}

if (-not $StartOnly) {
    Ensure-Env
    Install-Dependencies
}

if (-not $InstallOnly) {
    Stop-Servers
    Start-Backend
    Start-Frontend
}

Show-Status

if (-not $InstallOnly) {
    Write-Host "  Open your browser to the Frontend URL above to get started!" -ForegroundColor Cyan
    Write-Host ""
}
