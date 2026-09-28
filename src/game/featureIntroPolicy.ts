import { MECHANISM_GUIDE } from "../core/mechanismCatalog";
import type { LevelSpec } from "../core/types";

// Keep historical kinds as the existing seen-intro save keys. New UI-only
// introductions do not require changing any authored LevelSpec metadata.
export type FeatureIntroKind = NonNullable<LevelSpec["featureIntro"]>["kind"]
  | "bomb" | "flip-door" | "colored-grid";

export type FeatureIntroPolicyEntry = {
  readonly id: string;
  readonly unlockLevel: number;
} & (
  | { readonly showUnlockPopup: true; readonly kind: FeatureIntroKind }
  | { readonly showUnlockPopup: false; readonly kind?: never }
);

/**
 * UI introduction schedule from 机制规则.xlsx, 元素规则说明!A1:F16.
 * Source SHA256: 00ca663dc16d015ce7391c72d1a5b08989be09935b4dcda9aba66f12c5754df8.
 * This controls popups only: it does not gate mechanics, change level data, or
 * redefine collection-guide unlocks. In particular, key-lock is scheduled at
 * 60 here independently of the guide's existing unlockLevel of 59.
 */
export const FEATURE_INTRO_POLICY: readonly FeatureIntroPolicyEntry[] = [
  { id: "color-exit", unlockLevel: 1, showUnlockPopup: false },
  { id: "irregular-block", unlockLevel: 5, showUnlockPopup: false },
  { id: "frozen-exit", unlockLevel: 6, showUnlockPopup: true, kind: "ice-door" },
  { id: "irregular-board", unlockLevel: 8, showUnlockPopup: false },
  { id: "numeric-ice", unlockLevel: 10, showUnlockPopup: true, kind: "ice-block" },
  { id: "multilayer-shell", unlockLevel: 15, showUnlockPopup: true, kind: "layer" },
  { id: "shutter", unlockLevel: 20, showUnlockPopup: true, kind: "shutter" },
  { id: "generator", unlockLevel: 35, showUnlockPopup: true, kind: "generator" },
  { id: "axis-block", unlockLevel: 50, showUnlockPopup: true, kind: "arrow-block" },
  { id: "key-lock", unlockLevel: 60, showUnlockPopup: true, kind: "key-lock" },
  { id: "layered-lift", unlockLevel: 65, showUnlockPopup: true, kind: "lift" },
  { id: "star", unlockLevel: 100, showUnlockPopup: true, kind: "star" },
  { id: "bomb", unlockLevel: 120, showUnlockPopup: true, kind: "bomb" },
  { id: "flip-door", unlockLevel: 150, showUnlockPopup: true, kind: "flip-door" },
  { id: "colored-grid", unlockLevel: 200, showUnlockPopup: true, kind: "colored-grid" },
];

export interface ScheduledFeatureIntro {
  kind: FeatureIntroKind;
  mechanismId: string;
  title: string;
  description: string;
}

/** Exact scheduled level only; existing seen-intro handling stays with the UI. */
export function getScheduledFeatureIntro(levelId: number): ScheduledFeatureIntro | undefined {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 200) return undefined;
  const policy = FEATURE_INTRO_POLICY.find((entry) => entry.unlockLevel === levelId);
  if (!policy?.showUnlockPopup) return undefined;
  const guide = MECHANISM_GUIDE.find(({ id }) => id === policy.id);
  if (!guide) throw new Error(`Missing mechanism guide text for introduction: ${policy.id}`);
  return {
    kind: policy.kind,
    mechanismId: policy.id,
    title: guide.title,
    description: guide.effect,
  };
}
