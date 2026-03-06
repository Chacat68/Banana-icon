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

Write-Host ""
Write-Host "Banana Icon 本地启动" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "未检测到 Node.js，请先安装: https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "未检测到 npm，请确认 Node.js 安装完整。" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Info "首次运行，安装依赖..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install 执行失败。"
    }
    Write-Ok "依赖安装完成"
} else {
    Write-Ok "node_modules 已存在"
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Warn "已从 .env.example 复制 .env，请填入 Nano Banana API 配置"
} elseif (Test-Path ".env") {
    Write-Ok ".env 已存在"
}

if (-not (Test-Path "public\uploads")) {
    New-Item -ItemType Directory -Path "public\uploads" | Out-Null
    Write-Ok "已创建 public/uploads 目录"
} else {
    Write-Ok "public/uploads 目录已存在"
}

Write-Info "执行本地数据库迁移..."
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    throw "数据库迁移失败。"
}
Write-Ok "本地数据库已就绪"

$port = if ($env:PORT) { $env:PORT } else { "3000" }
Write-Info "启动开发服务器 http://localhost:$port"
Write-Info "按 Ctrl+C 停止"
$env:NODE_OPTIONS = ""

npm run dev -- --port $port
exit $LASTEXITCODE