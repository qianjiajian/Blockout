function replaceOnce(source, anchor, replacement, name) {
  if (source.split(anchor).length !== 2) throw new Error(`Google Play performance anchor changed: ${name}`);
  return source.replace(anchor, replacement);
}

// Keep shared Web/WeChat/Douyin rendering intact. Canvas display size and input
// coordinates stay unchanged; only this channel's backing-store scale is capped.
export function instrumentGooglePlayHostPerformance(source) {
  const anchor = "Math.min(window.devicePixelRatio || 1, 2)";
  if (source.split(anchor).length !== 3) throw new Error("Google Play DPR expected both resize and viewport anchors");
  return source.split(anchor).join("Math.min(window.devicePixelRatio || 1, 1.5)");
}

export function instrumentGooglePlayGamePerformance(source) {
  let code = source.replace(/\r\n/g, "\n");
  const draw = "ctx.drawImage(physicalBackdrop, (this.host.canvas.width - drawWidth) / 2, (this.host.canvas.height - drawHeight) / 2, drawWidth, drawHeight);";
  code = replaceOnce(code, draw, `if (!this.artReady) {
        ${draw}
      } else {
        __drawGooglePlayViewportGutters(ctx, this.host.canvas.width, this.host.canvas.height,
          { x: offsetX * pixelRatio, y: offsetY * pixelRatio,
            width: LOGICAL_WIDTH * scale * pixelRatio, height: LOGICAL_HEIGHT * scale * pixelRatio },
          () => { ${draw} });
      }`, "physical-backdrop-gutters");
  const flashStart = code.indexOf("  private drawGateExitFlash(\n");
  const flashEnd = code.indexOf("  private drawGateIceStrip(\n", flashStart);
  if (flashStart < 0 || flashEnd <= flashStart) throw new Error("Google Play gate flash boundary changed");
  let flash = code.slice(flashStart, flashEnd);
  flash = replaceOnce(flash, "    const ctx = this.ctx;\n", `    __drawGooglePlayGateExitGlow(this.ctx,
      { centerX, centerY, halfSpan, cell: board.cell, horizontal, intensity }, (ctx) => {
`, "gate-flash-small-surface-start");
  flash = replaceOnce(flash, "    ctx.restore();\n  }\n", "    ctx.restore();\n    });\n  }\n", "gate-flash-small-surface-end");
  code = code.slice(0, flashStart) + flash + code.slice(flashEnd);
  const blockDraw = `    const spawnProxyTranslations = new Map(spawnProxyEntries.map(({ block, translation }) => (
      [block.id, translation] as const
    )));`;
  code = replaceOnce(code, blockDraw, `${blockDraw}
    const __stableBlockSprites = this.directTransitionBoardOffset() === 0
      && !this.rocketImpact && !this.pulseAnimation.isVisible && this.boardShakeTime <= 0
      && !this.hasActiveMechanicMotion();`, "static-block-sprite-frame");
  const paintBlock = `      this.drawBlock(
        block,
        board,
        block.id === this.selectedId || block.id === this.dragVisual?.blockId,
        block.id === strategyNudge?.blockId,
      );`;
  code = replaceOnce(code, paintBlock, `      __withGooglePlayBlockSpriteCache(ctx, this.model.level,
        __stableBlockSprites && !liftTransition && !clippedSpawnProxy
          && block.id !== this.selectedId && block.id !== this.dragVisual?.blockId
          && block.id !== this.blockedBlockId && block.id !== strategyNudge?.blockId,
        () => {
${paintBlock}
        });`, "static-block-sprite-scope");
  const spriteStart = code.indexOf("  private drawFormalWholeBlockAt(\n");
  const spriteEnd = code.indexOf("  private formalSelectionBlockImage(\n", spriteStart);
  if (spriteStart < 0 || spriteEnd <= spriteStart) throw new Error("Google Play formal sprite boundary changed");
  const sprite = replaceOnce(code.slice(spriteStart, spriteEnd),
    "    ctx.drawImage(image, (sourceWidth - imageWidth) / 2, sourceY);",
    "    __drawGooglePlayBlockSprite(ctx, image, (sourceWidth - imageWidth) / 2, sourceY);", "static-block-sprite-raster");
  code = code.slice(0, spriteStart) + sprite + code.slice(spriteEnd);
  return 'import { drawGooglePlayViewportGutters as __drawGooglePlayViewportGutters } from "../googlePlay/rendering";\n'
    + 'import { drawGooglePlayGateExitGlow as __drawGooglePlayGateExitGlow } from "../googlePlay/gateExitGlow";\n'
    + 'import { withGooglePlayBlockSpriteCache as __withGooglePlayBlockSpriteCache, drawGooglePlayBlockSprite as __drawGooglePlayBlockSprite } from "../googlePlay/blockSpriteCache";\n' + code;
}

export function googlePlayPerformancePlugin() {
  return {
    name: "google-play-rendering-performance",
    enforce: "pre",
    transform(source, id) {
      const path = id.replace(/\\/g, "/").split("?")[0];
      if (path.endsWith("/src/platform/WebHost.ts")) return { code: instrumentGooglePlayHostPerformance(source), map: null };
      if (path.endsWith("/src/game/ColorEscapeGame.ts")) return { code: instrumentGooglePlayGamePerformance(source), map: null };
    },
  };
}
