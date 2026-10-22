import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const GOOGLE_PLAY_TITLE = "Slide Jam: Block Puzzle";
export const GOOGLE_PLAY_STARTUP_ART = new URL("../src/googlePlay/assets/slide-jam-startup-v1.jpg", import.meta.url);

// Project names, native namespace and save keys are identities, not UI copy.
// Only these player-facing sources are projected for this channel.
export function googlePlayBrandingPlugin() {
  return {
    name: "google-play-branding",
    enforce: "pre",
    transform(source, id) {
      const file = id.replace(/\\/g, "/").split("?")[0];
      if (!["/src/game/localization.ts", "/src/platform/WebHost.ts", "/src/game/ColorEscapeGame.ts"].some(path => file.endsWith(path))) return;
      if (!source.includes("脑王的诞生")) throw new Error(`Review Google Play brand mapping: ${file}`);
      let code = source.replaceAll("脑王的诞生", GOOGLE_PLAY_TITLE);
      if (file.endsWith("/src/game/ColorEscapeGame.ts")) {
        const anchor = `this.label("${GOOGLE_PLAY_TITLE}", LOGICAL_WIDTH / 2, 300, 42,`;
        if (code.split(anchor).length !== 2) throw new Error("Review Google Play fallback title layout");
        code = code.replace(anchor, `this.label("${GOOGLE_PLAY_TITLE}", LOGICAL_WIDTH / 2, 300, 25,`);
      }
      return { code, map: null };
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (html.split("脑王的诞生").length !== 3) throw new Error("Review Google Play HTML brand mapping");
        return html.replaceAll("脑王的诞生", GOOGLE_PLAY_TITLE);
      },
    },
    async writeBundle(options) {
      if (!options.dir) throw new Error("Google Play branding requires a directory build");
      // Overlay only the isolated distribution. Never replace the public asset
      // used by Web/WeChat/Douyin or the legacy Android build.
      await writeFile(resolve(options.dir, "assets/art/ui/startup-v1/loading-background.jpg"),
        await readFile(GOOGLE_PLAY_STARTUP_ART));
    },
  };
}
