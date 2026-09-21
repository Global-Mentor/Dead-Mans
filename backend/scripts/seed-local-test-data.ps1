param(
  [string]$DatabaseContainer = "deadmans-postgres",
  [string]$Database = "",
  [string]$User = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Import-DotEnvFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
      return
    }

    $parts = $line.Split("=", 2)
    if ($parts.Length -ne 2) {
      return
    }

    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
  }
}

function Assert-LastExitCode {
  param(
    [Parameter(Mandatory = $true)][string]$Step
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed with exit code $LASTEXITCODE."
  }
}

$scriptDir = Split-Path -Parent $PSCommandPath
$backendRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $backendRoot
$envFile = Join-Path $repoRoot ".env"
$seedSqlPath = Join-Path $scriptDir "seed-local-test-data.sql"

if (Test-Path $envFile) {
  Import-DotEnvFile -Path $envFile
}

$databaseName = if ([string]::IsNullOrWhiteSpace($Database)) {
  if ([string]::IsNullOrWhiteSpace($env:POSTGRES_DB)) { "deadmans" } else { $env:POSTGRES_DB }
} else {
  $Database
}

$databaseUser = if ([string]::IsNullOrWhiteSpace($User)) {
  if ([string]::IsNullOrWhiteSpace($env:POSTGRES_USER)) { "deadmans" } else { $env:POSTGRES_USER }
} else {
  $User
}

Push-Location $repoRoot
$containerSeedPath = "/tmp/deadmans-seed-local-test-data.sql"
try {
  # Avoid the Windows PowerShell native pipeline: it can replace non-ASCII SQL
  # text with question marks before Docker receives it, despite OutputEncoding.
  docker cp $seedSqlPath "${DatabaseContainer}:$containerSeedPath"
  Assert-LastExitCode -Step "copy seed-local-test-data"

  docker exec $DatabaseContainer psql `
    -U $databaseUser `
    -d $databaseName `
    -v ON_ERROR_STOP=1 `
    -f $containerSeedPath
  Assert-LastExitCode -Step "seed-local-test-data"
}
finally {
  docker exec $DatabaseContainer rm -f $containerSeedPath | Out-Null
  Pop-Location
}
