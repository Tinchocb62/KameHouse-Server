<#
.SYNOPSIS
    Builds, signs, and optionally installs the KameHouseTV Tizen widget.
.DESCRIPTION
    Packages the KameHouseTV app as a .wgt file using the Tizen CLI,
    signs it with the configured certificate profile, and optionally
    installs it on a Samsung TV via SDB.
#>

param(
    [string]$Profile = "KameHouseSamsung",
    [string]$TvIp = "",
    [string]$OutputDir = "",
    [switch]$NoSign
)

$ErrorActionPreference = "Stop"

# --- Paths ---
$TizenCLI = "C:\tizen-studio\tools\ide\bin\tizen.bat"
$SDB = "C:\tizen-studio\tools\sdb.exe"
$ProjectDir = Split-Path -Parent $PSCommandPath
if (-not $OutputDir) { $OutputDir = $ProjectDir }

# --- Ensure Tizen CLI exists ---
if (-not (Test-Path $TizenCLI)) {
    Write-Error "Tizen CLI no encontrado en $TizenCLI. Verificá que Tizen Studio esté instalado."
    exit 1
}

Write-Host "=== KameHouseTV Build Script ===" -ForegroundColor Cyan

# --- Step 0: Run Rsbuild to bundle the React App ---
Write-Host "[0/4] Compilando aplicación React con Rsbuild..." -ForegroundColor Yellow
Set-Location -Path $ProjectDir
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al compilar la aplicación React."
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# --- Step 1: Clean previous build artifacts ---
Write-Host "[1/4] Limpiando builds anteriores..." -ForegroundColor Yellow
Remove-Item -Path "$ProjectDir\*.wgt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$ProjectDir\.manifest.tmp" -Force -ErrorAction SilentlyContinue
Write-Host "  OK" -ForegroundColor Green

# --- Step 2: Package the widget ---
Write-Host "[2/4] Empaquetando widget..." -ForegroundColor Yellow

$StagingDir = Join-Path $ProjectDir ".staging"
if (Test-Path $StagingDir) {
    Remove-Item -Path $StagingDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Copy the bundled output from dist
Copy-Item -Path (Join-Path $ProjectDir "dist\*") -Destination $StagingDir -Recurse -Force

# Copy TV specific configs
Copy-Item -Path (Join-Path $ProjectDir "icon.png") -Destination $StagingDir -Force
Copy-Item -Path (Join-Path $ProjectDir "config.xml") -Destination $StagingDir -Force

$pkgArgs = @(
    "package"
    "-t", "wgt"
    "--", $StagingDir
)
if (-not $NoSign) {
    $pkgArgs = @(
        "package"
        "-t", "wgt"
        "-s", $Profile
        "--", $StagingDir
    )
}

& $TizenCLI $pkgArgs 2>&1
$buildExitCode = $LASTEXITCODE

# Find the generated .wgt file
$wgtFile = Get-ChildItem -Path $ProjectDir -Filter "*.wgt" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if ($wgtFile) {
    if ($wgtFile.DirectoryName -ne $ProjectDir) {
        $destPath = Join-Path $ProjectDir $wgtFile.Name
        Move-Item -Path $wgtFile.FullName -Destination $destPath -Force
        $wgtFile = Get-Item $destPath
    }
}

Remove-Item -Path $StagingDir -Recurse -Force -ErrorAction SilentlyContinue

if ($buildExitCode -ne 0) {
    Write-Error "Error al empaquetar el widget."
    exit 1
}

Write-Host "  OK" -ForegroundColor Green

# --- Normalize .wgt filename ---
if (-not $wgtFile) {
    Write-Error "No se generó el archivo .wgt."
    exit 1
}
$expectedName = "KameHouseTV.wgt"
if ($wgtFile.Name -ne $expectedName) {
    $normalized = Join-Path $wgtFile.DirectoryName $expectedName
    Move-Item -Path $wgtFile.FullName -Destination $normalized -Force
    $wgtFile = Get-Item $normalized
    Write-Host "  Normalizado: $expectedName" -ForegroundColor Gray
}
if ($OutputDir -ne $ProjectDir) {
    $dest = Join-Path $OutputDir $expectedName
    Move-Item -Path $wgtFile.FullName -Destination $dest -Force
    $wgtFile = Get-Item $dest
    Write-Host "  Movido a: $dest" -ForegroundColor Gray
}

Write-Host "  Widget generado: $($wgtFile.FullName)" -ForegroundColor Green

# --- Step 3: Install on TV (optional) ---
if ($TvIp) {
    Write-Host "[4/4] Instalando en TV ($TvIp)..." -ForegroundColor Yellow
    & $SDB connect $TvIp 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "No se pudo conectar a la TV en $TvIp."
        exit 1
    }
    & $SDB install $wgtFile.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error al instalar el widget en la TV."
        & $SDB disconnect 2>&1 | Out-Null
        exit 1
    }
    & $SDB disconnect 2>&1 | Out-Null
    Write-Host "  App instalada correctamente en $TvIp" -ForegroundColor Green
} else {
    Write-Host "[4/4] Saltando instalación (usá -TvIp para instalar automáticamente)." -ForegroundColor Gray
}

Write-Host "=== Build completado ===" -ForegroundColor Cyan
