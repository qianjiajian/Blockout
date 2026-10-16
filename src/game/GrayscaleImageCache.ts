const MAX_EDGE = 128;

/** Owns small derived bitmaps; the original image remains owned by its loader. */
export class GrayscaleImageCache {
  private readonly images = new Map<HTMLImageElement, HTMLCanvasElement | undefined>();

  constructor(private readonly createCanvas: () => HTMLCanvasElement | undefined) {}

  get(image: HTMLImageElement): HTMLCanvasElement | undefined {
    if (this.images.has(image)) return this.images.get(image);
    // Cache unavailable/failed conversions too, so painting never retries every frame.
    this.images.set(image, undefined);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;

    let canvas: HTMLCanvasElement | undefined;
    try {
      canvas = this.createCanvas();
      if (!canvas) return undefined;
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { this.release(canvas); return undefined; }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722);
        pixels.data[i] = gray;
        pixels.data[i + 1] = gray;
        pixels.data[i + 2] = gray;
      }
      ctx.putImageData(pixels, 0, 0);
      this.images.set(image, canvas);
      return canvas;
    } catch {
      if (canvas) this.release(canvas);
      return undefined;
    }
  }

  clear(): void {
    for (const canvas of this.images.values()) if (canvas) this.release(canvas);
    this.images.clear();
  }

  private release(canvas: HTMLCanvasElement): void {
    try { canvas.width = 0; } catch { /* Native canvas cleanup is best effort. */ }
    try { canvas.height = 0; } catch { /* Release the other axis even if width failed. */ }
  }
}
