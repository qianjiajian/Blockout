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

type MechanismArtLevel = Pick<LevelSpec, "mechanismRules" | "shutters" | "flipDoors" | "coloredGrids">
  & Partial<Pick<LevelSpec, "blocks">>;

/** Include the entire authored inventory, including hidden/queued blocks, so
 * revealing a region never needs a new image request during its animation. */
export const requiredMechanismArtPaths = (level: MechanismArtLevel): readonly string[] => {
  const paths = new Set<string>();
  for (const region of level.shutters ?? []) {
    if (!usesReferenceRegionVisuals(level, region)) continue;
    const images = region.skin === "lift" ? Object.values(REVISED_MECHANISM_ART_URLS.lift) : SHUTTER_NINE_SLICE_PATHS;
    for (const path of images) paths.add(path);
  }
  if (usesRevisedMechanisms(level)) {
    for (const grid of level.coloredGrids ?? []) paths.add(REVISED_MECHANISM_ART_URLS.coloredGrids[grid.color]);
    for (const block of level.blocks ?? []) {
      if (block.movementAxis) paths.add(REVISED_MECHANISM_ART_URLS.axis[block.movementAxis]);
      if (block.timedBombSeconds !== undefined) paths.add(REVISED_MECHANISM_ART_URLS.bombFace);
    }
    for (const door of level.flipDoors ?? []) {
      // Match the renderer's native 3-cell strips and final remainder, using
      // every physical portal (which may differ from the compatibility side).
      for (const portal of door.portals?.length ? door.portals : [door]) {
        const orientation = portal.side === "top" || portal.side === "bottom" ? "horizontal" : "vertical";
        let remaining = Math.max(1, Math.round(portal.size));
        while (remaining > 0) {
          const span = Math.min(3, remaining) as RevisedFlipDoorLength;
          paths.add(REVISED_MECHANISM_ART_URLS.flipDoors[door.color][orientation][span]);
          remaining -= span;
        }
      }
    }
  }
  return [...paths];
};

/** A partial legacy cache must not prevent the next revised scene loading. */
export const missingMechanismArtPaths = (
  level: MechanismArtLevel,
  loaded: ReadonlyMap<string, unknown>,
): readonly string[] => requiredMechanismArtPaths(level).filter((path) => !loaded.has(path));
