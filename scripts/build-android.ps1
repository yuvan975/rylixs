param([string]$AndroidSdk='C:\Android',[string]$ServerUrl='http://127.0.0.1:3100')
$ErrorActionPreference='Stop'
$serverUri=[Uri]$ServerUrl
if(-not $serverUri.IsAbsoluteUri -or ($serverUri.Scheme -ne 'https' -and $ServerUrl -ne 'http://127.0.0.1:3100')) { throw 'Use an HTTPS app origin or the local preview address.' }
if($serverUri.UserInfo -or $serverUri.Query -or $serverUri.Fragment -or $serverUri.AbsolutePath -ne '/') { throw 'Use only the app origin.' }
$ServerUrl=$ServerUrl.TrimEnd('/')
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
$tools=Join-Path $AndroidSdk 'build-tools\36.0.0'
$platform=Join-Path $AndroidSdk 'platforms\android-35\android.jar'
$javaBin=Split-Path (Get-Command javac).Source
function Check {if($LASTEXITCODE -ne 0){throw "Android build command failed: $LASTEXITCODE"}}
New-Item -ItemType Directory -Force android/build/classes,android/build/dex,dist | Out-Null
('package com.rylixs.preview; final class BuildConfig { static final String SERVER_URL = "' + $ServerUrl + '"; }') | Set-Content -Encoding utf8 android/build/BuildConfig.java
& "$tools\aapt.exe" package -f -M android/AndroidManifest.xml -S android/res -I $platform -F android/build/resources.ap_ -J android/build
Check
& "$javaBin\javac.exe" -encoding UTF-8 -source 8 -target 8 -Xlint:-options -classpath $platform -d android/build/classes android/src/com/rylixs/preview/MainActivity.java android/build/BuildConfig.java
Check
& "$javaBin\jar.exe" cf android/build/classes.jar -C android/build/classes .
Check
& "$tools\d8.bat" --lib $platform --min-api 26 --output android/build/dex android/build/classes.jar
Check
Copy-Item android/build/resources.ap_ android/build/unsigned.apk -Force
Push-Location android/build/dex
& "$tools\aapt.exe" add ../unsigned.apk classes.dex
Check
Pop-Location
& "$tools\zipalign.exe" -f 4 android/build/unsigned.apk android/build/aligned.apk
Check
if(-not(Test-Path android/build/preview.keystore)) { & "$javaBin\keytool.exe" -genkeypair -keystore android/build/preview.keystore -storepass android -keypass android -alias preview -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=RYLIXS Local Preview';Check }
& "$tools\apksigner.bat" sign --ks android/build/preview.keystore --ks-pass pass:android --key-pass pass:android --out dist/RYLIXS-preview.apk android/build/aligned.apk
Check
& "$tools\apksigner.bat" verify --verbose dist/RYLIXS-preview.apk
Check
Get-FileHash dist/RYLIXS-preview.apk -Algorithm SHA256
