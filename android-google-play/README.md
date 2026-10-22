# Google Play Android build

This independent Gradle project packages only the dedicated Google Play Web
build. It leaves the existing `android/`, Web, WeChat, and any external Douyin
projects unchanged. This project owns its Java Activity, manifest, dependencies
and outputs. Native resources alone are read from `android/` through
`sourceSets`, without modifying the shared resources.

Configuration: application ID `com.SlideJam.SweetPotato`, version `0.1.21` / code `22`, minimum
Android API `24`, compile/target API `36`, Android Gradle plugin `8.9.2`, Gradle
`8.11.1`, JDK `17`. The application label is `Slide Jam: Block Puzzle`. This is
an SDK test build using Google's official test advertising IDs. It contains
advertising SDKs and network permissions, retains the portrait/immersive
implementation, and is not ready for Google Play submission.

The native namespace and Java package remain `com.blockout.app`; the manifest
uses the full Activity class name so it is independent of the application ID.
The operator supplied for this channel is `Nanjing sweet potato network technology`.
Support is `hongshugame@gmail.com`; the supplied privacy-policy address is
`https://sweetpotato-net.web.app/privacy.html?bundle=com.SlideJam.SweetPotato`.

## SDK test boundary

Google Mobile Ads Next-Gen `1.5.0` and UMP `4.0.0` use a dedicated native
integration. UMP must report `canRequestAds()` before ad initialization or
requests are allowed; a timeout is never treated as consent. Signed Release
builds also use official test ad UNIT IDs. The user-provided AdMob APP ID is used
for UMP and SDK initialization so consent messages resolve to the correct app.
The supplied production ad UNIT IDs remain inactive in separate resources;
no Gradle switch selects live ad inventory.

The Google Play bridge supports app-open, interstitial and rewarded ads.
App-open is eligible from the second cold launch and only while the game is
loading; an unavailable ad does not delay gameplay. Mainline settlements from
level 6 can request an interstitial once per attempt. The shared cooldown
starts at 120 seconds, counts foreground gameplay time, and resets after a
completed interstitial or rewarded ad. Explicit rewarded requests are not
blocked by that cooldown. Rewards require the SDK's show, earned-reward and
dismissal callbacks, and are granted at most once. Cancellation, failure or
callback timeout does not grant a reward.

The supplied `Sdk_Mediation_v0.0.3.aar` is included unchanged but its mediation
wrapper is not activated. Inspection found that `SDKUtils` treats a UMP timeout
as permission to initialize advertising and SolarEngine even when
`canRequestAds()` is false. Its public ad classes also depend on that initializer.
This build does not invoke `SDKUtils.initSDK` or `SDKUtils.onCreate`, does not
modify private flags by reflection, and removes the vendor Application and
splash launcher from the merged manifest. The independent official Google
advertising implementation is the active test path. Vendor fixes and actual
mediation-source integration remain pending; see
`../release-assets/google-play/sdk-v003-review.txt`.

The supplied `google-services.json` matches this application ID and is processed
by the Google Services plugin. Firebase Analytics (BoM `34.11.0`) is included
but collection is deactivated. SolarEngine `1.3.4` is included but not
initialized; the supplied AppKey is retained separately and its runtime key is
empty. Both SDKs' automatic initialization providers are removed in this test
build. Mainline lifecycle messages are validated locally but analytics remain
disabled; this is not evidence of events appearing in Firebase or SolarEngine.

As confirmed on 2026-10-21, Google Play starts in English on first launch,
regardless of the phone language. Existing saved languages and later manual
selections are retained. Real-device ad callbacks, consent, background recovery
and SDK network behavior still require validation; desktop browser tests do
not establish successful Android or backend integration.

## External navigation policy

The WebView only permits the bundled HTTPS `appassets.androidplatform.net`
`/index.html` main document (including same-document fragments). It rejects
other navigation schemes/targets, including JavaScript, file and intent URLs,
and blocks resources from other origins. File/content access remains disabled.
The exact privacy-policy URL above opens using `ACTION_VIEW` in an external
browser; the exact `mailto:hongshugame@gmail.com` opens using `ACTION_SENDTO`.
Both WebView navigation callback signatures use this policy. Subframes cannot
launch external apps. An unavailable browser/mail app leaves the game in place
and displays an English toast.
External apps own their network access. The SDK test build separately permits
native SDK network access and adds a `WebMessageListener` bridge restricted to
the exact bundled HTTPS origin, main frame and current `/index.html` document.
It has no `addJavascriptInterface` fallback. Unsupported WebViews report ads
unavailable instead of simulating a watched video. Device testing of external-app
handoff remains required, and supplying a URL alone does not establish
privacy-policy compliance.

On API 30+, the dedicated Activity combines display-cutout and caption-bar
insets per edge. Android desktop windows retain their title-bar controls even
for immersive games; this prevents those controls covering the game's top UI.
Ordinary hidden status/navigation bars still add no padding. File access is
disabled because bundled resources use HTTPS `WebViewAssetLoader`, not file URLs.
Desktop-window and phone behavior still require Android device validation.

The local resource overlay also excludes every backup domain from Android 12+
cloud backups and device transfers, alongside `allowBackup=false` and
`fullBackupContent=false`. These rules implement this version's local-only save
behavior; they neither delete nor rewrite existing saves.

The current official [minimum AGP table](https://developer.android.com/build/releases/about-agp)
lists API 36 with AGP 8.9.1 or newer. The
[AGP 8.9 release notes](https://developer.android.com/build/releases/agp-8-9-0-release-notes)
specify Gradle 8.11.1 and JDK 17. The original 8.9.0 overview still says API 35;
the API 36 choice here follows the newer minimum-version table and uses 8.9.2.

## Asset boundary

Build the dedicated Google Play assets before running an Android packaging
task. `webAssetsDir`, when supplied, must be absolute. Its default is the
repository's `.codex-temp/google-play-overlays-20261021/web` directory.

Before compilation, `verifyGooglePlayAssets` requires `index.html` and a valid
`google-play-build.json` whose `target` equals `google-play`. Missing or incorrect
markers fail instead of falling back to another platform's assets. The marker
must be emitted by the dedicated Web build; do not add it to Web/WeChat or legacy
Android output to bypass this check.

For this version the marker also requires `applicationId: "com.SlideJam.SweetPotato"`,
`versionName: "0.1.21"`, `versionCode: 22`, `adsEnabled: true`,
`adsMode: "official-test"`, `analyticsEnabled: false`, and
`submissionReady: false`. The dedicated Web marker also records the vendor
wrapper as packaged but not integrated. These flags describe this SDK test
build; they do not declare store-account setup, privacy-policy review, required
device testing or mediation integration complete.

## Local commands

From the repository root, generate the isolated Web assets:

```powershell
node scripts/build-google-play-web.mjs
```

This uses `vite.google-play.config.ts` and `src/googlePlay/entry.ts`, adds the
in-app privacy notice and native SDK bridge only here, disables the optional
IP-region lookup, hides Android Release developer controls and excludes the
board editor. The Google Play lifecycle Vite plugin adds the mainline attempt
hooks to this build without changing shared game source. It does not write to
`dist` or `dist-wechat`.

Run from this directory, after the Google Play Web asset validation succeeds:

```powershell
$env:JAVA_HOME='X:\.codex-temp\android-toolchain\jdk-17'
$env:ANDROID_SDK_ROOT='X:\.codex-temp\android-toolchain\android-sdk'
.\gradlew.bat --no-daemon '-PwebAssetsDir=X:/.codex-temp/google-play-overlays-20261021/web' verifyGooglePlayAssets
.\gradlew.bat --no-daemon '-PwebAssetsDir=X:/.codex-temp/google-play-overlays-20261021/web' testReleaseUnitTest bundleRelease assembleRelease lintRelease
```

The example assumes `X:` maps to the repository. Install Android platform 36
in that SDK if needed. Output files are `app/build/outputs/bundle/release/app-release.aab`
and `app/build/outputs/apk/release/app-release.apk` inside this project. Building
does not upload or publish either output.

## Dedicated Google Play signing

Release signing uses `GOOGLE_PLAY_RELEASE_SIGNING_PROPERTIES`, when set, or
`%USERPROFILE%/.android/slidejam-google-play/signing.properties`. The external
properties file supplies `storeFile`, `storePassword`, `keyAlias` and
`keyPassword`. Keep the private key and passwords outside version control and
deliverables. Missing configuration fails the Release build; there is no
fallback to the legacy Android key or a Debug certificate.

The user-supplied Google Play key has alias `gp2026` and certificate SHA-256
`924681dde5a276afe36c0ec94f7dfe5cf83589fb63bfb1ed80eb031fbee037d5`.
The existing `android/` project continues using its own unchanged
`BLOCKOUT_RELEASE_SIGNING_PROPERTIES` / `blockout-release/signing.properties`
configuration. Do not overwrite that configuration when preparing the Google
Play signing file.

This certificate differs from the one used for the earlier Google Play test
packages. A user-signed APK cannot directly replace an installation bearing
that earlier certificate, even when the application ID matches. Preserve local
saves; building or checking the new package does not uninstall the old app.
Keep the previous signed artifacts and their checks as historical evidence,
and save the new same-version test artifacts separately with a `user-signed`
name. Verify both new APK and AAB against the independently checked certificate
above, rather than reusing the earlier certificate assertion. Google Play's
upload key and app-signing key roles still need to be confirmed in Play Console.

The dedicated manifest opts out of predictive back for now so the existing
`onBackPressed` WebView history handler still works on Android 16. This supports
closing the local privacy overlay through history without changing the native
implementation used by other channels. See the [Android 16 back behavior
change](https://developer.android.com/about/versions/16/behavior-changes-16).

See `../release-assets/google-play/` for the SDK audit and remaining Play
submission requirements. The `0.1.9` offline privacy draft is historical and
does not describe this network-enabled SDK test build. Neither a Release
signature nor a valid AAB means the remaining requirements have been completed.

The 0.1.11 / code12 patch fixes cold-start decor initialization: fullscreen is
applied after setContentView, uses the decor view controller and falls back to
legacy immersive flags until attachment. Resume/focus reapply fullscreen.
This native-only patch reuses the previously tested 0.1.10 game assets; only the
build marker version changes. The Google Play signing key remains gp2026.

The 0.1.12 / code13 patch fixes the two-stage text/flat-blue startup flash.
The Google Play HTML transform displays the existing title artwork before the
module executes, masking its baked sample progress and notice. Normal startup
copy is hidden; the original guard still displays diagnostics and retry on an
actual bootstrap failure. The Google Play game projection loads and owns the
startup background separately from the 38-image shell batch. It displays that
image immediately, keeps it through shell retries, and reveals the canvas only
after a painted loading/error frame or a completed game frame. Shared HTML,
startup guard, game source and other channel builds are unchanged. Real Android
device startup validation is still required.

Version 0.1.13 / code14 uses the user-confirmed official name, Slide Jam: Block
Puzzle, in all ten language title/accessibility entries, the HTML title, image
fallback and privacy notice. The dedicated ImageGen artwork lives in
`src/googlePlay/assets/` and replaces the shared loading JPEG only in this
distribution via `google-play-branding-plugin.mjs`. Both HTML and Canvas use the
same clean image; live progress is drawn in code (Chinese for zh, English for
other locales), with no baked percentage or health notice. The native label
was already correct. Internal namespaces and save keys remain stable. The old
0.1.9 privacy draft remains historical; it is not a current submission policy.

Version 0.1.14 / code15 limits the channel canvas backing scale to 1.5 and
paints only viewport margins in the redundant physical-backdrop pass. The
privacy UI reads a small presentation state instead of full game diagnostics.
Ad clicks now reach bounded native recovery and immediate localized feedback;
consent, initialization and load timeouts invalidate stale callbacks. Native
logs use `SlideJamAds`. The real AdMob app ID identifies this app's UMP messages,
while all ad unit IDs remain official test units. See
`../release-assets/google-play/performance-ads-fix-20261021.txt` for verification
and the remaining physical-device/network checks.

Version 0.1.15 / code16 replaces only this channel's launcher icon with the
user-supplied artwork retained in `../release-assets/google-play/icon/`.
The manifest uses `@mipmap/ic_slidejam_launcher` for icon; API 26+ launchers
apply their circular or rounded masks through the adaptive resource.
Five density variants cover legacy Android; API 26+ uses the adaptive foreground
and background layers. Rebuild those resources with
`node tools/build-google-play-icons.mjs` from the repository root. The source is
preserved unchanged; no new artwork is generated. The shared legacy icon is
still owned by the other Android project and is not modified.

The user has confirmed that the 0.1.14 test APK now plays an ad on the OPPO and
Google Play is reachable. This is user-reported playback, not a complete
all-formats, reward-delivery, performance or production-ad acceptance test.
The 0.1.15 Web scripts, HTML and game artwork are byte-identical to 0.1.14;
only the build marker version and projection input-key serialization order differ.
The projection JSON is deeply equal. Signing remains gp2026, test ad units and
analytics restrictions remain unchanged, and this build has not been published.

Version 0.1.16 / code17 renders each animated exit glow into a small reusable
Canvas2D surface before compositing it onto the game canvas. The original glow
formula, continuous intensity, colours, rays and animation timing are retained.
One scratch surface is held per game canvas, with a 2 MiB RGBA pixel budget;
unsupported contexts or failed allocations fall back to the original drawing.
The change is injected only by the Google Play performance plugin. Other
channels, the shared game source, levels, native advertising and save handling
are unchanged. See `../release-assets/google-play/exit-glow-optimization-20261021.txt`
for the measured desktop results and remaining physical-device validation.

Version 0.1.17 / code18 addresses continuous drag latency. Stationary main-board
sprites reuse their existing shadows in a bounded cache (8 MiB of RGBA pixels,
at most 128 entries per canvas). Selected/settling pieces, rotated artwork,
clipped spawns, lift transitions and moving mechanisms keep their original
drawing path. Cache entries include image identity, exact pixel alignment,
alpha, shadow and smoothing state; level, viewport and scale changes invalidate
the cache. Inner bodies, shells and ice retain their original painter order.

The dedicated input projection removes an unused portal-query result and
copies full model snapshots only when the corresponding exit query needs them.
Frames outside the journey screen skip journey scroll-bound calculations.
Pointer coordinates, all coalesced samples, continuous collision sweeping,
initial deadzone, release settling and natural-clock charging remain unchanged.
See `../release-assets/google-play/drag-latency-optimization-20261021.txt` for
the controlled comparison, functional checks and physical-device limitations.

Version 0.1.18 / code19 enables the life-refill popup's rewarded-ad action even
when lives are full or already above five. This is a Google Play-only build
projection: the centered ad button remains clickable and the old full-life
early rejection is removed. The existing durable one-life reward transaction
already supports overflow and reload recovery; it remains unchanged. Natural
regeneration still stops at five, and coin refill stays unavailable when full.
Welfare-station quotas, ad completion requirements, save retries and all other
channels remain unchanged. This version includes the 0.1.17 drag optimizations.

Version 0.1.19 / code20 starts new players in English regardless of their phone
locale. GooglePlayHost provides the English default, while saved and manually
selected game languages retain the existing persistence behavior. Startup
HTML/ES5 guard and native app-owned failure/ad feedback use English; third-party
ad/consent UI remains owned by its SDK. Shared channel files are unchanged.
See `../release-assets/google-play/english-default-20261021.txt` for the package
and validation details. Installing over an existing save does not reset its
stored language or progress.



## Fullscreen viewport correction (2026-10-21)

Version 0.1.20 / code21 paints the Google Play WebView edge-to-edge, forwards
physical display-cutout insets to CSS instead of padding the whole WebView, and
contains the complete authored home artwork plus its label margin inside the
safe rectangle. Drawing and hit testing share the same transform. The home
background and decorative header/navigation bands fill the screen; modal dim
covers the entire physical canvas. Desktop captions remain excluded natively.
The fixed-position canvas also avoids intrinsic CSS grid sizing.

Seven browser viewport/inset combinations passed (including 360x800 CSS at DPR2
with a 36px top cutout, matching the supplied 720x1600 screenshot dimensions).
Home, daily tasks and life refill, plus settings/language/gameplay/pause and live
resize were exercised with real browser touch input and isolated memory saves.
45 targeted tests, TypeScript, native unit tests, Gradle/lint and package checks
passed. No device was listed by ADB: this is not physical OEM certification.
The channel-only build projection preserves shared Web/WeChat/Douyin source.
See `../release-assets/google-play/viewport-20261021.txt`.


## Fullscreen spotlight and direct overlays (0.1.21 / code22)

The 0.1.20 fix missed the even-odd spotlight path used by feature unlock guides.
A channel-only overlay projection now makes its outer path cover the full
physical canvas in drawing coordinates, preserving the authored hole, glow,
hand and input targets. It also covers audited direct-fill overlays in journey
presentation/loading, collection details, mechanism introduction, win/failure,
profile/rename, league rules/detail, and the pulse dim viewport.

The old package's bright margins were reproduced. All five feature-guide
flows were checked using trusted browser touch, with leaderboard focus across
six viewport/inset combinations. Pixel sampling verifies dim color/alpha at
all four corners and both side edges, the focus remains open, outside touches
are ignored, and the intended entry opens/acknowledges. 57 targeted unit tests,
TypeScript, Gradle/lint and package/signature checks passed. Other direct-fill
branches were audited/projected; not every reward/failure branch was reached
through a complete gameplay run. ADB had no device; physical verification is
pending. See `../release-assets/google-play/overlays-20261021.txt`.
