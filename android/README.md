# Block Out Android wrapper

This is a small offline WebView wrapper around the Vite Web build. The bundled
HTML, JavaScript, JSON, images, and audio are served by `WebViewAssetLoader` at
`https://appassets.androidplatform.net/` without a network server.

To refresh the bundle and build a debug APK from a machine with Android SDK and
JDK 17+: 

From the repository root:

```powershell
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
