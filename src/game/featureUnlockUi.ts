import type { FEATURE_UNLOCK_ART } from "./artManifest";

export type FeatureUnlockArt = { [Key in keyof typeof FEATURE_UNLOCK_ART]: HTMLImageElement };

// Supplied reference: 720 × 1584. Preserve every slice's native aspect ratio.
const scale = 496 / 720;
const offsetY = (1078 - 1584 * scale) / 2;
const rect = (x: number, y: number, width: number, height: number) => ({
  x: x * scale, y: y * scale + offsetY, width: width * scale, height: height * scale,
});
const text = (x: number, y: number, size: number, maxWidth: number) => ({
  x: x * scale, y: y * scale + offsetY, size: size * scale, maxWidth: maxWidth * scale,
});

export const FEATURE_UNLOCK_LAYOUT = {
  scale,
  panel: rect(63, 306, 594, 844),
  content: rect(124, 499, 472, 442),
  titleZh: rect(185, 328, 356, 94),
  titleEn: rect(170, 328, 381, 99),
  title: text(360, 376, 48, 412),
  glow: rect(166, 448, 372, 372),
  sparkles: rect(195, 507, 345, 273),
  rankIcon: rect(234, 539, 235, 211),
  icon: rect(230, 528, 260, 238),
  nameLeft: rect(244, 793, 54, 68),
  nameRight: rect(412, 793, 55, 68),
  wideNameLeft: rect(136, 793, 54, 68),
  wideNameRight: rect(529, 793, 55, 68),
  name: text(360, 826, 62, 128),
  wideName: text(360, 826, 52, 330),
  divider: rect(136, 859, 448, 26),
  description: text(360, 914, 23, 434),
  look: rect(207, 977, 305, 91),
  lookText: text(360, 1023, 41, 265),
  later: rect(282, 1224, 156, 70),
  laterText: text(360, 1258, 41, 156),
  laterLine: rect(100, 1257, 521, 5),
} as const;
