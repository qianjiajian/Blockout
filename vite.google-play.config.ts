import { resolve } from "node:path";
import { defineConfig } from "vite";
import { webRuntimeLevelProjectionPlugin } from "./tools/web-runtime-level-projection.mjs";
import { googlePlayLifecyclePlugin } from "./tools/google-play-lifecycle-plugin.mjs";
import { googlePlayStartupPlugin } from "./tools/google-play-startup-plugin.mjs";
import { googlePlayBrandingPlugin } from "./tools/google-play-branding-plugin.mjs";
import { googlePlayPrivacyStatePlugin } from "./tools/google-play-privacy-state-plugin.mjs";
import { googlePlayPerformancePlugin } from "./tools/google-play-performance-plugin.mjs";
import { googlePlayInputPerformancePlugin } from "./tools/google-play-input-performance-plugin.mjs";
import { googlePlayLifeRewardPlugin } from "./tools/google-play-life-reward-plugin.mjs";
import { googlePlayOverlaysPlugin } from "./tools/google-play-overlays-plugin.mjs";
import { googlePlayViewportPlugin } from "./tools/google-play-viewport-plugin.mjs";
import { googlePlayLanguagePlugin } from "./tools/google-play-language-plugin.mjs";

// An independent entry/config keeps all channel-specific code out of the
// ordinary Web, Android, WeChat and Douyin build graphs.
export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_BUILD_TARGET": JSON.stringify("android"),
    "import.meta.env.VITE_ANDROID_RELEASE": "\"true\"",
  },
  plugins: [
    googlePlayBrandingPlugin(),
    googlePlayPrivacyStatePlugin(),
    googlePlayPerformancePlugin(),
    googlePlayViewportPlugin(),
    googlePlayOverlaysPlugin(),
    googlePlayInputPerformancePlugin(),
    googlePlayLifeRewardPlugin(),
    googlePlayLanguagePlugin(),
    googlePlayStartupPlugin(),
    googlePlayLifecyclePlugin(),
    {
      name: "google-play-only-entry",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          const entry = 'src="/src/web.ts"';
          if (html.split(entry).length !== 2) {
            throw new Error("Expected exactly one Web entry in index.html; review the Google Play entry mapping.");
          }
          return html.replace(entry, 'src="/src/googlePlay/entry.ts"');
        },
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "google-play-build.json",
          source: JSON.stringify({
            target: "google-play", versionName: "0.1.22", versionCode: 23,
            applicationId: "com.SlideJam.SweetPotato",
            adsEnabled: true, adsMode: "official-test", analyticsEnabled: false,
            mediationWrapperIntegrated: false,
            mediationWrapperPackaged: true,
            mediationWrapperStatus: "blocked-unsafe-consent-fallback",
            privacyPolicyComplete: false, submissionReady: false,
            privacyPolicyStatus: "remote-content-review-required",
          }, null, 2) + "\n",
        });
      },
    },
    webRuntimeLevelProjectionPlugin(),
  ],
  worker: { plugins: () => [webRuntimeLevelProjectionPlugin()] },
  build: {
    target: "es2020",
    sourcemap: false,
    outDir: ".codex-temp/google-play-review-20261022/web",
    rollupOptions: { input: { game: resolve("index.html") } },
  },
});
