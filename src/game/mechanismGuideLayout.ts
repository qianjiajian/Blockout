import { HOME_ARTBOARD } from "./homeArtLayout";
import { FORMAL_COLLECTION_LAYOUT } from "./formalPageLayout";
import { expandInteractionTarget, type HitTargetRect } from "./hitTargets";

export interface MechanismGuideOptions {
  /** Scene dimensions in logical units, not CSS pixels. */
  width?: number;
  height?: number;
  logicalToCssScale?: number;
  /** Safe-area distances in the same logical units as width/height. */
  safeTop?: number;
  safeBottom?: number;
}

export interface MechanismGuideLayout {
  panel: HitTargetRect;
  close: { visual: HitTargetRect; hit: HitTargetRect };
  /** Supplied panel bounds in the existing 496×1078 logical coordinate space. */
  source: HitTargetRect;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const LEGACY_WIDTH = 496;
const LEGACY_HEIGHT = 1078;
const ART_SCALE = LEGACY_WIDTH / HOME_ARTBOARD.width;
const ART_OFFSET_Y = (LEGACY_HEIGHT - HOME_ARTBOARD.height * ART_SCALE) / 2;
const artRect = (rect: Readonly<HitTargetRect>): HitTargetRect => ({
  x: rect.x * ART_SCALE,
  y: ART_OFFSET_Y + rect.y * ART_SCALE,
  width: rect.width * ART_SCALE,
  height: rect.height * ART_SCALE,
});
const SOURCE = artRect(FORMAL_COLLECTION_LAYOUT.panel);
const CLOSE_SOURCE = artRect(FORMAL_COLLECTION_LAYOUT.close);
const CONTENT_SOURCE: Readonly<HitTargetRect> = {
  x: Math.min(SOURCE.x, CLOSE_SOURCE.x),
  y: Math.min(SOURCE.y, CLOSE_SOURCE.y),
  width: Math.max(SOURCE.x + SOURCE.width, CLOSE_SOURCE.x + CLOSE_SOURCE.width) - Math.min(SOURCE.x, CLOSE_SOURCE.x),
  height: Math.max(SOURCE.y + SOURCE.height, CLOSE_SOURCE.y + CLOSE_SOURCE.height) - Math.min(SOURCE.y, CLOSE_SOURCE.y),
};

const positive = (value: number | undefined, fallback: number): number => (
  Number.isFinite(value) && (value ?? 0) > 0 ? value! : fallback
);
const nonNegative = (value: number | undefined): number => (
  Number.isFinite(value) && (value ?? -1) >= 0 ? value! : 0
);

/** Preserves the supplied artboard geometry; fits only when the safe area needs it. */
export const createMechanismGuideLayout = (
  options: MechanismGuideOptions = {},
): MechanismGuideLayout => {
  const width = positive(options.width, LEGACY_WIDTH);
  const height = positive(options.height, LEGACY_HEIGHT);
  const logicalToCssScale = positive(options.logicalToCssScale, 1);
  const safeTop = Math.min(nonNegative(options.safeTop), height / 3);
  const safeBottom = Math.min(nonNegative(options.safeBottom), height / 3);
  const safeBounds: HitTargetRect = {
    x: 0,
    y: safeTop,
    width,
    height: height - safeTop - safeBottom,
  };
  const scale = Math.min(
    width / LEGACY_WIDTH,
    height / LEGACY_HEIGHT,
    safeBounds.width / CONTENT_SOURCE.width,
    safeBounds.height / CONTENT_SOURCE.height,
  );
  const offsetX = Math.max(
    safeBounds.x - CONTENT_SOURCE.x * scale,
    Math.min((width - LEGACY_WIDTH * scale) / 2, safeBounds.x + safeBounds.width - (CONTENT_SOURCE.x + CONTENT_SOURCE.width) * scale),
  );
  const offsetY = Math.max(
    safeBounds.y - CONTENT_SOURCE.y * scale,
    Math.min((height - LEGACY_HEIGHT * scale) / 2, safeBounds.y + safeBounds.height - (CONTENT_SOURCE.y + CONTENT_SOURCE.height) * scale),
  );
  const mapRect = (rect: Readonly<HitTargetRect>): HitTargetRect => ({
    x: offsetX + rect.x * scale,
    y: offsetY + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  });
  const panel = mapRect(SOURCE);
  const closeVisual = mapRect(CLOSE_SOURCE);
  return {
    panel,
    close: {
      visual: closeVisual,
      hit: expandInteractionTarget(closeVisual, logicalToCssScale, { bounds: safeBounds }),
    },
    source: { ...SOURCE },
    scale,
    offsetX,
    offsetY,
  };
};

/** Maps a legacy logical rectangle through the same transform as the full bitmap. */
export const mechanismGuideRect = (
  rect: Readonly<HitTargetRect>,
  layout: Readonly<MechanismGuideLayout>,
): HitTargetRect => ({
  x: layout.offsetX + rect.x * layout.scale,
  y: layout.offsetY + rect.y * layout.scale,
  width: rect.width * layout.scale,
  height: rect.height * layout.scale,
});

/** Inverse pointer transform; preserves pointer IDs and other sample metadata. */
export const mechanismGuidePoint = <Point extends { x: number; y: number }>(
  point: Point,
  layout: Readonly<MechanismGuideLayout>,
): Point => ({
  ...point,
  x: (point.x - layout.offsetX) / layout.scale,
  y: (point.y - layout.offsetY) / layout.scale,
});
