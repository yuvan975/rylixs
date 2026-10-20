param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$localUrl='http://127.0.0.1:3100'
function Test-RylixsServer {
    try { $health=Invoke-RestMethod -Uri "http://127.0.0.1:3100/api/health" -TimeoutSec 2; return $health.app -eq 'RYLIXS' -and $health.status -eq 'ok' } catch { return $false }
}
if (-not (Test-RylixsServer)) {
    if (-not (Test-Path -LiteralPath '.next/BUILD_ID')) { throw 'Build is missing. Run pnpm install and pnpm build first.' }
    $bundledNode=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    $nodePath=if(Test-Path -LiteralPath $bundledNode){$bundledNode}else{(Get-Command node -ErrorAction Stop).Source}
    $nodeMajor=[int]((& $nodePath -p 'process.versions.node.split(".")[0]').Trim())
    if ($nodeMajor -lt 22) { throw 'Install Node.js 24 or later to run RYLIXS.' }
    $env:RYLIXS_INSECURE_LOCAL_HTTP='true'
    $env:RYLIXS_LOCAL_PREVIEW='true'
    $env:RYLIXS_SITE_URL='http://127.0.0.1:3100'
    $env:RYLIXS_DB_PATH=Join-Path $projectRoot 'data\preview.sqlite'
    & $nodePath scripts/seed-preview.mjs
    if($LASTEXITCODE -ne 0){throw 'Could not initialize preview database.'}
    $logFolder=Join-Path $projectRoot 'verification'
    New-Item -ItemType Directory -Force -Path $logFolder | Out-Null
    $server=Start-Process -FilePath $nodePath -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logFolder 'local-server.log') -RedirectStandardError (Join-Path $logFolder 'local-server-error.log')
    $server.Id | Set-Content -LiteralPath (Join-Path $logFolder 'local-server.pid')
    $ready=$false
    for($attempt=0;$attempt -lt 30;$attempt++) {
        if(Test-RylixsServer){$ready=$true;break}
        if($server.HasExited){throw 'Server stopped. Read verification/local-server-error.log.'}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'The server is still starting. Read verification/local-server.log.'}
}
if(-not $NoBrowser){Start-Process $localUrl}
Write-Output "RYLIXS is running at $localUrl"


