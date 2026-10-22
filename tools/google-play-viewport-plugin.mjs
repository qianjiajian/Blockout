function replaceOnce(code, anchor, replacement) {
  if (code.split(anchor).length !== 2) throw new Error(`Google Play viewport anchor changed: ${anchor.slice(0, 100)}`);
  return code.replace(anchor, replacement);
}

export function instrumentGooglePlayViewport(source) {
  let code = source.replace(/\r\n/g, "\n");
  const start = code.indexOf("  private viewportTransform():");
  const end = code.indexOf("  private toLogical(", start);
  if (start < 0 || end <= start) throw new Error("Missing viewport transform");
  code = code.slice(0, start) + `  private viewportTransform(): { scale: number; offsetX: number; offsetY: number } {
    return __googlePlayViewportTransform(this.host.viewport(), LOGICAL_WIDTH, LOGICAL_HEIGHT, __googlePlaySafeSides());
  }

` + code.slice(end);
  const safeStart = code.indexOf("  private safeOffsets():");
  const safeEnd = code.indexOf("\n  private ", safeStart + 1);
  if (safeStart < 0 || safeEnd <= safeStart) throw new Error("Missing safe offsets");
  // Insets are applied once, in the shared render/input transform above.
  code = code.slice(0, safeStart) + `  private safeOffsets(): { top: number; bottom: number } {
    return { top: 0, bottom: 0 };
  }
` + code.slice(safeEnd);
  code = replaceOnce(code, "if (!this.artReady) {\n        ctx.drawImage(physicalBackdrop,", "if (!this.artReady || nativeHomeBackdrop) {\n        ctx.drawImage(physicalBackdrop,");
  code = replaceOnce(code, "    this.drawBackground();", "    if (!nativeHomeBackdrop) this.drawBackground();");
  code = replaceOnce(code, '|| this.screen === "settings" || this.screen === "musicLibrary" || this.screen === "resetConfirm"',
    '|| this.screen === "settings" || this.screen === "language" || this.screen === "musicLibrary" || this.screen === "resetConfirm"');
  code = replaceOnce(code, "if (this.journeyHomeThemeArt\n        && this.journeyHomeThemeIndex", "if (this.navigationTransition && this.journeyHomeThemeArt\n        && this.journeyHomeThemeIndex");
  code = replaceOnce(code, "      } else {\n        ctx.drawImage(this.art.home!, HOME_ART_LAYOUT.background.x, HOME_ART_LAYOUT.background.y);",
    "      } else if (this.navigationTransition) {\n        ctx.drawImage(this.art.home!, HOME_ART_LAYOUT.background.x, HOME_ART_LAYOUT.background.y);");
  for (const [image, layout] of [["topHeader", "header"], ["navigationBar", "navigationBar"]]) {
    code = replaceOnce(code, `ctx.drawImage(ui.${image}, HOME_ART_LAYOUT.${layout}.x, HOME_ART_LAYOUT.${layout}.y);`,
      `__drawGooglePlayFullWidthBand(ctx, ui.${image}, HOME_ART_LAYOUT.${layout}.x, HOME_ART_LAYOUT.${layout}.y, "${image === "topHeader" ? "top" : "bottom"}");`);
  }
  const dimStart = code.indexOf("  private drawDim(");
  const dimEnd = code.indexOf("  private drawModal(", dimStart);
  const dim = replaceOnce(code.slice(dimStart, dimEnd), "    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);",
    "    this.ctx.setTransform(1, 0, 0, 1, 0, 0);\n    this.ctx.fillRect(0, 0, this.host.canvas.width, this.host.canvas.height);");
  code = code.slice(0, dimStart) + dim + code.slice(dimEnd);
  return 'import { googlePlayViewportTransform as __googlePlayViewportTransform, googlePlaySafeSides as __googlePlaySafeSides, drawGooglePlayFullWidthBand as __drawGooglePlayFullWidthBand } from "../googlePlay/viewport";\n' + code;
}

export function googlePlayViewportPlugin() {
  return {
    name: "google-play-fullscreen-viewport", enforce: "pre",
    transform(source, id) {
      if (id.replace(/\\/g, "/").split("?")[0].endsWith("/src/game/ColorEscapeGame.ts")) {
        return { code: instrumentGooglePlayViewport(source), map: null };
      }
    },
    transformIndexHtml: { order: "post", handler(html) {
      return html.replace("</head>", `<style id="google-play-viewport">body{display:block}body>canvas{position:fixed;inset:0;width:100%;height:100%}</style></head>`);
    } },
  };
}
