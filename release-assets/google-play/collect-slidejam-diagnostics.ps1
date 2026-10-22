$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$bundledAdb = Join-Path $projectRoot '.codex-temp/android-toolchain/android-sdk/platform-tools/adb.exe'
$adbPath = if (Test-Path -LiteralPath $bundledAdb) { $bundledAdb } else {
    $command = Get-Command adb -ErrorAction SilentlyContinue
    if (!$command) { throw 'ADB was not found. Run this script from the project or add Android platform-tools to PATH.' }
    $command.Source
}
$connected = @(& $adbPath devices | Where-Object { $_ -match '^\S+\s+device$' })
if ($connected.Count -ne 1) { throw 'Connect exactly one phone with USB debugging enabled and accept its authorization dialog.' }
$serial = ($connected[0] -split '\s+')[0]
$outputDir = Join-Path ([Environment]::GetFolderPath('Desktop')) ('SlideJam-diagnostics-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $outputDir | Out-Null
# Read-only collection: does not install, uninstall, stop the game, or clear logs/data.
& $adbPath -s $serial shell getprop ro.product.model | Out-File -LiteralPath (Join-Path $outputDir 'model.txt') -Encoding utf8
& $adbPath -s $serial shell getprop ro.build.version.release | Out-File -LiteralPath (Join-Path $outputDir 'android-version.txt') -Encoding utf8
& $adbPath -s $serial shell dumpsys package com.SlideJam.SweetPotato |
    Select-String -Pattern 'versionCode=|versionName=' |
    Out-File -LiteralPath (Join-Path $outputDir 'app-version.txt') -Encoding utf8
& $adbPath -s $serial shell dumpsys webviewupdate | Out-File -LiteralPath (Join-Path $outputDir 'webview.txt') -Encoding utf8
& $adbPath -s $serial shell dumpsys gfxinfo com.SlideJam.SweetPotato | Out-File -LiteralPath (Join-Path $outputDir 'graphics.txt') -Encoding utf8
& $adbPath -s $serial logcat -d -v threadtime -t 5000 'SlideJamAds:V' 'BlockOut:I' 'AndroidRuntime:E' 'chromium:W' '*:S' |
    Out-File -LiteralPath (Join-Path $outputDir 'logcat.txt') -Encoding utf8
Write-Host ('Saved read-only diagnostics to: ' + $outputDir)
