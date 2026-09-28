import type { BlockColor, LevelSpec } from "../core/types";
import { usesRevisedMechanisms } from "../core/mechanismRules";
import { usesReferenceRegionVisuals } from "./revisedMechanismPresentation";
import { SHUTTER_NINE_SLICE_PATHS } from "./shutterNineSlice";

export type RevisedFlipDoorLength = 1 | 2 | 3;
export type RevisedFlipDoorOrientation = "horizontal" | "vertical";
export interface RevisedFlipDoorArtUrls {
  horizontal: Record<RevisedFlipDoorLength, string>;
  vertical: Record<RevisedFlipDoorLength, string>;
}
export interface RevisedMechanismArtUrls {
  shutterStrip: string;
  lift: { frame: string; left: string; right: string };
  bombFace: string;
  coloredGrids: Record<BlockColor, string>;
  axis: { horizontal: string; vertical: string };
  flipDoors: Record<BlockColor, RevisedFlipDoorArtUrls>;
}

const ROOT = "assets/art/gameplay/mechanics/revised-reference-v1";
const flipDoor = (color: BlockColor): RevisedFlipDoorArtUrls => ({
  horizontal: { 1: `${ROOT}/flip-${color}-horizontal-1.png`, 2: `${ROOT}/flip-${color}-horizontal-2.png`, 3: `${ROOT}/flip-${color}-horizontal-3.png` },
  vertical: { 1: `${ROOT}/flip-${color}-vertical-1.png`, 2: `${ROOT}/flip-${color}-vertical-2.png`, 3: `${ROOT}/flip-${color}-vertical-3.png` },
});

/** User-supplied originals, kept as independently replaceable PNG components. */
export const REVISED_MECHANISM_ART_URLS: RevisedMechanismArtUrls = {
  shutterStrip: `${ROOT}/shutter-strip.png`,
  lift: { frame: `${ROOT}/lift-frame.png`, left: `${ROOT}/lift-left.png`, right: `${ROOT}/lift-right.png` },
  bombFace: `${ROOT}/bomb-face.png`,
  coloredGrids: {
    red: `${ROOT}/grid-red.png`, blue: `${ROOT}/grid-blue.png`, green: `${ROOT}/grid-green.png`, yellow: `${ROOT}/grid-yellow.png`,
    purple: `${ROOT}/grid-purple.png`, orange: `${ROOT}/grid-orange.png`, pink: `${ROOT}/grid-pink.png`, cyan: `${ROOT}/grid-cyan.png`,
  },
  axis: { horizontal: `${ROOT}/axis-horizontal.png`, vertical: `${ROOT}/axis-vertical.png` },
  flipDoors: {
    red: flipDoor("red"), blue: flipDoor("blue"), green: flipDoor("green"), yellow: flipDoor("yellow"),
    purple: flipDoor("purple"), orange: flipDoor("orange"), pink: flipDoor("pink"), cyan: flipDoor("cyan"),
  },
};

/** Original v1 source inventory is preserved for byte/RGBA provenance checks. */
export const REVISED_MECHANISM_ART_PATHS: readonly string[] = [
  REVISED_MECHANISM_ART_URLS.shutterStrip,
  ...Object.values(REVISED_MECHANISM_ART_URLS.lift),
  REVISED_MECHANISM_ART_URLS.bombFace,
  ...Object.values(REVISED_MECHANISM_ART_URLS.coloredGrids),
  ...Object.values(REVISED_MECHANISM_ART_URLS.axis),
  ...Object.values(REVISED_MECHANISM_ART_URLS.flipDoors).flatMap((variants) => [
    ...Object.values(variants.horizontal), ...Object.values(variants.vertical),
  ]),
];

/** Current scenes replace the retired single slat with the user's nine pieces. */
export const ACTIVE_REVISED_MECHANISM_ART_PATHS: readonly string[] = [
  ...REVISED_MECHANISM_ART_PATHS.filter((path) => path !== REVISED_MECHANISM_ART_URLS.shutterStrip),
  ...SHUTTER_NINE_SLICE_PATHS,
];

export const requiredMechanismArtPaths = (
  level: Pick<LevelSpec, "mechanismRules" | "shutters">,
): readonly string[] => usesRevisedMechanisms(level)
  ? ACTIVE_REVISED_MECHANISM_ART_PATHS
  : level.shutters?.some((region) => usesReferenceRegionVisuals(level, region))
    ? SHUTTER_NINE_SLICE_PATHS
    : [];

/** A partial legacy cache must not prevent the next revised scene loading. */
export const missingMechanismArtPaths = (
  level: Pick<LevelSpec, "mechanismRules" | "shutters">,
  loaded: ReadonlyMap<string, unknown>,
): readonly string[] => requiredMechanismArtPaths(level).filter((path) => !loaded.has(path));
