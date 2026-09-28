/** Draw one physical aperture without repeating the bitmap's end caps. */
export const drawContinuousGateStrip = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  horizontal: boolean,
  x: number,
  y: number,
  destinationLength: number,
): void => {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (![width, height, x, y, destinationLength].every(Number.isFinite)
    || width <= 0 || height <= 0 || destinationLength <= 0) return;
  if (!Number.isFinite(x + (horizontal ? destinationLength : width))
    || !Number.isFinite(y + (horizontal ? height : destinationLength))) return;

  const sourceLength = horizontal ? width : height;
  const cap = Math.min(24, sourceLength / 3, destinationLength / 3);
  if (cap <= 0) return;
  const sourceCenter = sourceLength - cap * 2;
  const destinationCenter = destinationLength - cap * 2;
  if (horizontal) {
    ctx.drawImage(image, 0, 0, cap, height, x, y, cap, height);
    ctx.drawImage(image, cap, 0, sourceCenter, height, x + cap, y, destinationCenter, height);
    ctx.drawImage(image, sourceLength - cap, 0, cap, height, x + destinationLength - cap, y, cap, height);
  } else {
    ctx.drawImage(image, 0, 0, width, cap, x, y, width, cap);
    ctx.drawImage(image, 0, cap, width, sourceCenter, x, y + cap, width, destinationCenter);
    ctx.drawImage(image, 0, sourceLength - cap, width, cap, x, y + destinationLength - cap, width, cap);
  }
};
