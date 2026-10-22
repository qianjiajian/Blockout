import { readFileSync } from "node:fs";
import { GOOGLE_PLAY_STARTUP_ART } from "./google-play-branding-plugin.mjs";

function replaceOnce(source, anchor, replacement, name) {
  if (source.split(anchor).length !== 2) throw new Error(`Google Play startup anchor changed: ${name}`);
  return source.replace(anchor, replacement);
}

// Channel-only projection. Shared Web/WeChat/Douyin source remains unchanged.
export function instrumentGooglePlayStartup(source) {
  let code = source.replace(/\r\n/g, "\n");
  code = replaceOnce(code, "      this.art = {};\n      void this.loadArt();",
    "      this.art = this.art.startupBackground ? { startupBackground: this.art.startupBackground } : {};\n      void this.loadArt();", "retry-retains-owned-background");
  code = replaceOnce(code, "      const [startupBackground, home, homeTopHeader,",
    `      // Own the loading image independently of the shell batch so a failed
      // shell image cannot release the background still being drawn.
      if (!this.art.startupBackground) {
        this.art.startupBackground = await this.host.createImage(GAME_ART.backgrounds.startup);
        this.artLoadedImageCount += 1;
      }
      const startupBackground = this.art.startupBackground;
      this.dirty = true;
      this.scheduleFrame();
      const [home, homeTopHeader,`, "background-first");
  code = replaceOnce(code, "        GAME_ART.backgrounds.startup,\n        GAME_ART.backgrounds.home,",
    "        GAME_ART.backgrounds.home,", "remove-background-from-shell-batch");
  code = replaceOnce(code, '(loaded, total) => this.updateStartupProgress("shell", loaded, total)',
    '(loaded, total) => this.updateStartupProgress("shell", loaded + 1, total + 1)', "count-background");
  code = replaceOnce(code, "        shellReady: this.shellArtReady,",
    "        startupBackgroundReady: Boolean(this.art.startupBackground),\n        shellReady: this.shellArtReady,", "diagnostics");
  code = replaceOnce(code, "      this.drawStartupStatus();\n      this.popupEntrance.endFrame();",
    `      this.drawStartupStatus();
      // Reveal only a painted formal loading frame or an actionable error.
      if (this.art.startupBackground || this.artLoadError) __googlePlayStartupFrameReady();
      this.popupEntrance.endFrame();`, "first-painted-frame");
  code = replaceOnce(code, "    if (this.buttonHints?.length) this.drawButtonHints();\n    this.popupEntrance.endFrame();",
    `    if (this.buttonHints?.length) this.drawButtonHints();
    this.popupEntrance.endFrame();
    // A backgrounded/slow device can finish loading before its first RAF.
    __googlePlayStartupFrameReady();`, "first-frame-already-ready");
  const progressStart = "  private drawStartupPhysicalProgress(image: HTMLImageElement, coverScale: number): void {";
  const progressEnd = "\n  private drawBackground(): void {";
  if (code.split(progressStart).length !== 2 || code.split(progressEnd).length !== 2) throw new Error("Review Google Play progress renderer boundary");
  const start = code.indexOf(progressStart), end = code.indexOf(progressEnd, start);
  if (end <= start) throw new Error("Review Google Play progress renderer order");
  code = code.slice(0, start) + `${progressStart}
    __drawGooglePlayStartupProgress(this.ctx, image, this.host.canvas.width, this.host.canvas.height,
      coverScale, this.startupProgressValue, Boolean(this.artLoadError), this.save.language);
  }
` + code.slice(end);
  return 'import { googlePlayStartupFrameReady as __googlePlayStartupFrameReady, drawGooglePlayStartupProgress as __drawGooglePlayStartupProgress } from "../googlePlay/startup";\n' + code;
}

export function googlePlayStartupPlugin() {
  return {
    name: "google-play-startup-art",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith("/src/game/ColorEscapeGame.ts")) return;
      return { code: instrumentGooglePlayStartup(source), map: null };
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        // The dedicated art contains only the official title and background.
        // No baked progress value, loading caption or notice needs masking.
        const image = readFileSync(GOOGLE_PLAY_STARTUP_ART).toString("base64");
        const style = `<style>
          #startup-status { overflow:hidden; padding:0; background:linear-gradient(#2a25c4,#1e2bb5 58%,#29239f); }
          #startup-status:not([role="alert"]) section { display:none; }
          #startup-status[role="alert"] { padding:24px; background:#100b37; }
          #startup-status[role="alert"] .gp-boot-art { display:none; }
          .gp-boot-art { position:absolute; height:100%; width:auto; max-width:none; left:50%; top:0; transform:translateX(-50%); pointer-events:none; }
        </style>`;
        const art = `<svg class="gp-boot-art" viewBox="0 0 941 1671" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <image width="941" height="1671" href="data:image/jpeg;base64,${image}"/>
        </svg>`;
        html = replaceOnce(html, "</head>", style + "</head>", "html-style");
        return replaceOnce(html, '<div id="startup-status" role="status">', '<div id="startup-status" role="status">' + art, "html-initial-art");
      },
    },
  };
}
