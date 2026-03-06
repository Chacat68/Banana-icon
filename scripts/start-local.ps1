$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Info($message) {
    Write-Host "[Banana Icon] $message" -ForegroundColor Yellow
}

function Write-Ok($message) {
    Write-Host "  OK  $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "  !!  $message" -ForegroundColor DarkYellow
}

function Get-EnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) {
        return ""
    }

    $pattern = "^{0}=(.*)$" -f [regex]::Escape($Key)
    foreach ($line in Get-Content $Path) {
        if ($line -match $pattern) {
            return $Matches[1].Trim()
        }
    }

    return ""
}

function Test-PlaceholderValue([string]$Value, [string[]]$Placeholders) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $true
    }

    return $Placeholders -contains $Value.Trim()
}

Write-Host ""
Write-Host "Banana Icon local startup" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js was not found. Install it first: https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm was not found. Make sure Node.js is installed correctly." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "node_modules already exists"
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Warn "Copied .env from .env.example. Fill in your Nano Banana settings."
} elseif (Test-Path ".env") {
    Write-Ok ".env already exists"
}

if (-not (Test-Path "public\uploads")) {
    New-Item -ItemType Directory -Path "public\uploads" | Out-Null
    Write-Ok "Created public/uploads"
} else {
    Write-Ok "public/uploads already exists"
}

$apiKey = Get-EnvValue ".env" "NANO_BANANA_API_KEY"
$apiUrl = Get-EnvValue ".env" "NANO_BANANA_API_URL"

if (Test-PlaceholderValue $apiKey @("your_api_key_here")) {
    Write-Warn "NANO_BANANA_API_KEY is missing or still using the placeholder value."
    Write-Host "      Update .env or fill it later on the /settings page." -ForegroundColor DarkYellow
}

if (Test-PlaceholderValue $apiUrl @("https://api.nano-banana.example.com")) {
    Write-Warn "NANO_BANANA_API_URL is missing or still using the placeholder value."
    Write-Host "      Update .env or fill it later on the /settings page." -ForegroundColor DarkYellow
}

Write-Info "Running local database migrations..."
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    throw "Database migration failed."
}
Write-Ok "Local database is ready"

$port = if ($env:PORT) { $env:PORT } else { "3000" }
Write-Info "Starting dev server at http://localhost:$port"
Write-Info "Press Ctrl+C to stop"
$env:NODE_OPTIONS = ""

npm run dev -- --port $port
exit $LASTEXITCODE