type Rect = { x: number; y: number; width: number; height: number };

export interface CollectionRewardProgressOptions {
  bounds: Rect;
  previous: number;
  current: number;
  total: number;
  age: number;
  reducedMotion: boolean;
  title: string;
  subtitle: string;
  targetTitle: string;
  status: "progress" | "ready" | "complete";
  drawTargetArtwork: (rect: Rect) => void;
}

export const COLLECTION_REWARD_PROGRESS_DURATION = 0.6;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** Presentation only: the caller supplies progress from the confirmed settlement. */
export function sampleCollectionRewardProgress(options: Pick<CollectionRewardProgressOptions,
  "bounds" | "previous" | "current" | "total" | "age" | "reducedMotion">) {
  const { bounds } = options;
  const total = Math.floor(Math.max(0, Number.isFinite(options.total) ? options.total : 0));
  const current = clamp(options.current, 0, total);
  const previous = clamp(options.previous, 0, current);
  const time = options.reducedMotion ? 1 : clamp(options.age / COLLECTION_REWARD_PROGRESS_DURATION, 0, 1);
  const value = previous + (current - previous) * (1 - (1 - time) ** 3);
  const bar: Rect = {
    x: bounds.x + bounds.width * 0.048,
    y: bounds.y + bounds.height * 0.405,
    width: Math.max(0, bounds.width * 0.71),
    height: Math.max(0, bounds.height * 0.20),
  };
  const unit = Math.max(0, Math.min(bounds.width / 650, bounds.height / 210));
  const inset = Math.min(5 * unit, bar.height / 4);
  const innerWidth = Math.max(0, bar.width - inset * 2);
  const gap = total > 1 ? Math.min(5 * unit, innerWidth / (total * 3)) : 0;
  const segmentWidth = total ? Math.max(0, (innerWidth - gap * (total - 1)) / total) : 0;
  const segments = Array.from({ length: total }, (_, index) => ({
    x: bar.x + inset + index * (segmentWidth + gap),
    y: bar.y + inset,
    width: segmentWidth,
    height: Math.max(0, bar.height - inset * 2),
    fill: clamp(value - index, 0, 1),
  }));
  return { total, current, previous, value, bar, segments, unit };
}

// Use the same portable path primitives as the main Canvas UI (also supported by WeChat).
function roundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  const { x, y, width, height } = rect;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawCollectionRewardProgress(ctx: CanvasRenderingContext2D,
  options: CollectionRewardProgressOptions): void {
  const { bounds, title, subtitle, targetTitle, status } = options;
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const { bar, segments, unit } = sampleCollectionRewardProgress(options);
  const textX = bar.x;
  const frame: Rect = {
    x: bounds.x + bounds.width * 0.802,
    y: bounds.y + bounds.height * 0.105,
    width: bounds.width * 0.155,
    height: bounds.height * 0.665,
  };
  ctx.save();
  try {
    roundedRect(ctx, bounds, 24 * unit);
    ctx.clip();
    const panel = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.height);
    panel.addColorStop(0, "#725191");
    panel.addColorStop(1, "#493063");
    ctx.fillStyle = panel;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    roundedRect(ctx, {
      x: bounds.x + 1.5 * unit, y: bounds.y + 1.5 * unit,
      width: bounds.width - 3 * unit, height: bounds.height - 3 * unit,
    }, 23 * unit);
    ctx.lineWidth = 3 * unit;
    ctx.strokeStyle = "#d5b178";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${30 * unit}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = status === "progress" ? "#fff0d2" : "#ffe59e";
    ctx.fillText(title, textX, bounds.y + bounds.height * 0.245, bar.width);

    roundedRect(ctx, bar, 10 * unit);
    ctx.fillStyle = "#372446";
    ctx.fill();
    ctx.lineWidth = 2 * unit;
    ctx.strokeStyle = "#ad8a65";
    ctx.stroke();
    for (const segment of segments) {
      roundedRect(ctx, segment, 3 * unit);
      ctx.fillStyle = "#65437b";
      ctx.fill();
      if (segment.fill <= 0) continue;
      ctx.save();
      ctx.clip();
      const green = ctx.createLinearGradient(0, segment.y, 0, segment.y + segment.height);
      green.addColorStop(0, "#b5e477");
      green.addColorStop(0.4, "#83c44f");
      green.addColorStop(1, "#57a134");
      ctx.fillStyle = green;
      ctx.fillRect(segment.x, segment.y, segment.width * segment.fill, segment.height);
      ctx.restore();
    }
    // No artificial fraction or segments when the catalogue has no next target.
    if (!segments.length) {
      roundedRect(ctx, { x: bar.x + 5 * unit, y: bar.y + 5 * unit,
        width: bar.width - 10 * unit, height: bar.height - 10 * unit }, 5 * unit);
      ctx.fillStyle = "#b49455";
      ctx.fill();
    }
    ctx.font = `${23 * unit}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = "#f2dec3";
    ctx.fillText(subtitle, textX, bounds.y + bounds.height * 0.80, bar.width);

    roundedRect(ctx, frame, 10 * unit);
    ctx.fillStyle = "#ebc777";
    ctx.fill();
    ctx.lineWidth = 2 * unit;
    ctx.strokeStyle = "#fff0b9";
    ctx.stroke();
    const inset = 7 * unit;
    const artwork = { x: frame.x + inset, y: frame.y + inset,
      width: frame.width - inset * 2, height: frame.height - inset * 2 };
    ctx.save();
    try {
      roundedRect(ctx, artwork, 4 * unit);
      ctx.clip();
      ctx.fillStyle = "#382846";
      ctx.fill();
      options.drawTargetArtwork(artwork);
    } finally { ctx.restore(); }
    ctx.font = `${18 * unit}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = "#fff0d2";
    ctx.textAlign = "center";
    ctx.fillText(targetTitle, frame.x + frame.width / 2,
      bounds.y + bounds.height * 0.885, frame.width + 12 * unit);
  } finally { ctx.restore(); }
}
