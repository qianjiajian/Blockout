# Block Out Android wrapper

This is a small offline WebView wrapper around the Vite Web build. The bundled
HTML, JavaScript, JSON, images, and audio are served by `WebViewAssetLoader` at
`https://appassets.androidplatform.net/` without a network server.

To refresh the bundle and build a debug APK from a machine with Android SDK and
JDK 17+: 

From the repository root:

```powershell
$env:VITE_BUILD_TARGET='android'
$env:VITE_ANDROID_RELEASE=$null
pnpm run build:web
node tools/playtest-android-compat.mjs --assets=dist
```

After both commands pass, build directly from that `dist` tree:

```powershell
cd android
.\gradlew.bat --no-daemon assembleDebug
```

The debug artifact is `android/app/build/outputs/apk/debug/app-debug.apk`.
For an isolated Web build, pass its absolute directory with
`-PwebAssetsDir=X:/path/to/web-build`. Gradle packages that directory directly;
the older copied `app/src/main/assets` directory is not used.
Set `JAVA_HOME` and `ANDROID_SDK_ROOT` to your JDK and Android SDK if needed.
On Windows, use a `subst` drive if batch tools cannot handle spaces or `!` in
the workspace path.

The compatibility check disables `Array.prototype.at` in isolated Chromium
contexts and checks startup, the first tutorial drag, three-star completion,
entry to level 2, and saved tutorial progress at two viewport sizes. It reproduces the API failure seen
on the Xiaomi 8; it does not replace a test on the actual phone.

Version `0.1.1` / code `2` removes `.at()` calls from the game code. Version
`0.1.2` / code `3` adds an ES5 startup error page, native system-bar/cutout padding,
and manual recovery after a WebView renderer exit or main-page loading failure.
Use the same
debug signing key and package name when rebuilding to permit an in-place
upgrade that retains the existing app data.

The Android installer requires API 23 (Android 6) or later. The Web game also
requires Chromium/WebView 80-era capabilities, including optional chaining and
nullish coalescing; the Android OS version alone does not guarantee these.
The entry page checks required features and offers update/retry guidance when
they are unavailable. It never clears saved data. Audio and vibration are optional.

Run `node tools/playtest-android-device-matrix.mjs --assets=<web-build>` for touch,
viewport/DPR, CPU/audio degradation, and startup-fault checks. These are desktop
Chromium simulations, not tests of manufacturer ROMs, GPUs, system WebViews,
16 KB devices, or real low-memory renderer exits. Android compilation/lint and
APK inspection complement them; physical-device checks are still required.

## Signed Release APK

Release version 0.1.7 (code 8) uses a dedicated release certificate, disables
Android/WebView debugging, hides the temporary level selector and clear-progress
controls, and excludes the board editor entry. The diagnostic bridge exposes
only detached `getDebugState()` snapshots. Android builds hide the startup notice;
ordinary Web and WeChat builds retain it. Web and Android Debug keep their QA controls.

Build a fresh, isolated Android Release asset directory from the repository root:

```powershell
$env:VITE_BUILD_TARGET='android'
$env:VITE_ANDROID_RELEASE='true'
pnpm run typecheck
pnpm run build:web --outDir .codex-temp/android-release-web
node tools/playtest-android-device-matrix.mjs --assets=.codex-temp/android-release-web
cd android
.\gradlew.bat --no-daemon '-PwebAssetsDir=X:/.codex-temp/android-release-web' assembleRelease lintRelease
```

The example assumes `X:` maps to the repository. Set `JAVA_HOME` and
`ANDROID_SDK_ROOT` as above. Use the same asset directory for testing and packaging.
The signed output is `android/app/build/outputs/apk/release/app-release.apk`.
Android Studio's `assembleRelease` uses the same Gradle configuration; pass the
same `webAssetsDir` project property and build the Android Release assets first.

Signing configuration is read from
`%USERPROFILE%/.android/blockout-release/signing.properties`, or the file named
by `BLOCKOUT_RELEASE_SIGNING_PROPERTIES`. It contains `storeFile`,
`storePassword`, `keyAlias`, and `keyPassword`. Keep the keystore and passwords
outside Git; the initial local folder grants access only to the current Windows
user and SYSTEM. Back up this folder privately and reuse the same key for future
updates. Missing signing configuration fails the Release build, with no Debug
key fallback. Do not distribute the signing folder with the APK.

The Release certificate differs from the earlier Debug certificate, so it cannot
replace the installed Debug app in place. Uninstalling the old app removes local
progress; preserve any needed save before doing so. Building a Release APK does
not upload it to a store or add an advertising SDK.
