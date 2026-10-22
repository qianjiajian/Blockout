/** The visible physical canvas expressed in the current drawing coordinates.
 * Keep cutout margins in the dim, but keep spotlight holes in authored units. */
export function googlePlayOverlayBounds(ctx: CanvasRenderingContext2D) {
  const inverse = ctx.getTransform().inverse();
  const points = [[0, 0], [ctx.canvas.width, 0], [0, ctx.canvas.height],
    [ctx.canvas.width, ctx.canvas.height]].map(([x, y]) => ({
    x: inverse.a * x + inverse.c * y + inverse.e,
    y: inverse.b * x + inverse.d * y + inverse.f,
  }));
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x,
    height: Math.max(...points.map(p => p.y)) - y };
}

export function appendGooglePlayOverlayPath(ctx: CanvasRenderingContext2D): void {
  const r = googlePlayOverlayBounds(ctx);
  ctx.rect(r.x, r.y, r.width, r.height);
}

export function fillGooglePlayOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
