Google Play launcher icon — supplied by the user on 2026-10-21

Original: C:/Users/Administrator/Downloads/微信图片_20261019150816_1662_374.png
Repository master: user-supplied-20261021.png (original bytes, 2048 x 2048 RGB)
Scope: Google Play native launcher icon only. No shared artwork is replaced.

Regenerate density assets from the repository root:
  node tools/build-google-play-icons.mjs

Legacy icon sizes: 48, 72, 96, 144, 192 pixels (mdpi through xxxhdpi).
Adaptive layers: 108dp canvas, 84dp artwork, 12dp transparent margin on each side;
purple background #39316F, standard 72dp masked viewport. The central yellow
block and white arrow remain the visual focus. Decorative outer edges follow
the device launcher's mask; the supplied full square is retained for legacy use.
The manifest icon resolves to the dedicated mipmap resource. Adaptive icons
use the launcher's shape automatically; no separate roundIcon is forced on
legacy Android, where the full supplied image remains the fallback.

This is deterministic size/density conversion for packaging. The supplied
artwork has not been regenerated or retouched. Resource hashes are recorded
in resource-manifest.json. The original image has baked white rounded corners;
the adaptive viewport excludes those corners without changing the source.

Android adaptive icon guidance:
https://developer.android.com/develop/ui/compose/system/icon_design_adaptive

0.1.15/code16 uses the same package ID and gp2026 signing certificate as 0.1.14.
It remains a test-ad build. APK/AAB checks are in
artifacts/google-play/SlideJam-0.1.15-googleplay-icon-checks.json.
Static icon-mask previews are geometric simulations, not physical device tests.
