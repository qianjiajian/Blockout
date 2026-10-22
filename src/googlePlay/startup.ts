/** Called only after the game paints its loading artwork or retry state. */
export function googlePlayStartupFrameReady(): void {
  window.__BLOCK_OUT_STARTUP__?.ready();
}

/** The channel artwork is clean: draw live progress without painting over it. */
export function drawGooglePlayStartupProgress(
  ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number,
  scale: number, value: number, failed: boolean, language: string,
): void {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const offsetX = (width - sourceWidth * scale) / 2;
  const offsetY = (height - sourceHeight * scale) / 2;
  const bar = { x: offsetX + sourceWidth * .195 * scale, y: offsetY + sourceHeight * .765 * scale,
    width: sourceWidth * .61 * scale, height: sourceHeight * .027 * scale };
  const radius = bar.height / 2;
  const rounded = (): void => {
    ctx.beginPath();
    ctx.moveTo(bar.x + radius, bar.y);
    ctx.arcTo(bar.x + bar.width, bar.y, bar.x + bar.width, bar.y + bar.height, radius);
    ctx.arcTo(bar.x + bar.width, bar.y + bar.height, bar.x, bar.y + bar.height, radius);
    ctx.arcTo(bar.x, bar.y + bar.height, bar.x, bar.y, radius);
    ctx.arcTo(bar.x, bar.y, bar.x + bar.width, bar.y, radius);
    ctx.closePath();
  };
  const progress = Math.max(0, Math.min(1, value));
  ctx.save();
  rounded();
  ctx.fillStyle = "#294491";
  ctx.shadowColor = "#24d8ff";
  ctx.shadowBlur = 9 * scale;
  ctx.fill();
  ctx.strokeStyle = "#6de9ff";
  ctx.lineWidth = 4 * scale;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.height);
  gradient.addColorStop(0, failed ? "#ff8d98" : "#74efff");
  gradient.addColorStop(1, failed ? "#c43d63" : "#16b8e8");
  ctx.fillStyle = gradient;
  ctx.fillRect(bar.x, bar.y, bar.width * progress, bar.height);
  ctx.restore();

  const traditional = /^zh-(TW|HK|MO|Hant)/i.test(language);
  const chinese = /^zh/i.test(language);
  const caption = failed ? (chinese ? (traditional ? "資源載入失敗" : "资源加载失败") : "Loading failed")
    : (chinese ? (traditional ? "載入資源" : "加载资源") : "Loading");
  ctx.save();
  ctx.font = `800 ${Math.max(18, Math.round(44 * scale))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#211956";
  ctx.fillStyle = failed ? "#ffb7c0" : "#f8f6ff";
  ctx.lineWidth = Math.max(2, 3 * scale);
  const text = `${caption} ${Math.round(progress * 100)}%`;
  const x = width / 2, y = offsetY + sourceHeight * .826 * scale;
  ctx.strokeText(text, x, y, bar.width + 36 * scale);
  ctx.fillText(text, x, y, bar.width + 36 * scale);
  ctx.restore();
}
