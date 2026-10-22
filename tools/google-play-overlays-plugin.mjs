function replaceCount(code, anchor, replacement, count = 1) {
  if (code.split(anchor).length !== count + 1) throw new Error(`Google Play overlay anchor changed: ${anchor}`);
  return code.split(anchor).join(replacement);
}
const imports = 'import { fillGooglePlayOverlay as __gpFillOverlay, appendGooglePlayOverlayPath as __gpOverlayPath, googlePlayOverlayBounds as __gpOverlayBounds } from "../googlePlay/overlays";\n';

export function instrumentGooglePlayOverlays(source, name) {
  let code = source.replace(/\r\n/g, "\n");
  if (name === "ColorEscapeGame.ts") {
    // Audit by named method: do not extend scene backgrounds or board clips.
    for (const [method, receiver, count] of [
      ["drawJourneySceneReveal", "ctx", 1], ["drawJourneyPresentationOverlay", "this.ctx", 2],
      ["drawCollectionAlbumDetail", "ctx", 1], ["drawFeature", "ctx", 1],
      ["drawWin", "ctx", 1], ["drawFailed", "ctx", 1],
    ]) {
      const start = code.indexOf(`  private ${method}(`);
      const end = code.indexOf("\n  private ", start + 1);
      if (start < 0 || end <= start) throw new Error(`Missing overlay method ${method}`);
      const part = replaceCount(code.slice(start, end),
        `${receiver}.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);`, `__gpFillOverlay(${receiver});`, count);
      code = code.slice(0, start) + part + code.slice(end);
    }
    code = replaceCount(code, "ctx.beginPath(); ctx.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);",
      "ctx.beginPath(); __gpOverlayPath(ctx);");
    code = replaceCount(code,
      "drawPulseDim(this.ctx, sample.dimAlpha, { x: 0, y: 0, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },",
      "drawPulseDim(this.ctx, sample.dimAlpha, __gpOverlayBounds(this.ctx),");
  } else if (name === "playerProfileUi.ts") {
    code = replaceCount(code, "ctx.fillRect(0, 0, 496, 1078);", "__gpFillOverlay(ctx);", 2);
  } else if (name === "leagueIntroUi.ts") {
    code = replaceCount(code, "ctx.fillRect(0,0,496,1078);", "__gpFillOverlay(ctx);");
  } else if (name === "leagueUi.ts") {
    for (const color of ['"rgba(0,25,18,.9)"', '"rgba(0,0,0,.72)"']) {
      code = replaceCount(code, `ctx.fillStyle=${color};ctx.fillRect(0,0,496,1078);`,
        `ctx.fillStyle=${color};__gpFillOverlay(ctx);`);
    }
  } else return source;
  return imports + code;
}

export function googlePlayOverlaysPlugin() {
  return { name: "google-play-fullscreen-overlays", enforce: "pre",
    transform(source, id) {
      const path = id.replace(/\\/g, "/").split("?")[0];
      if (!path.includes("/src/game/")) return;
      const code = instrumentGooglePlayOverlays(source, path.split("/").at(-1));
      if (code !== source) return { code, map: null };
    },
  };
}
