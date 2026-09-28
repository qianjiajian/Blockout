import type { GateReadiness } from "./gateReadiness";

export interface LockedTargetVisualTreatment {
  baseAlpha: number;
  overlayAlpha: number;
  shadowBlur: number;
}

const ACTIVE_TARGET: LockedTargetVisualTreatment = {
  baseAlpha: 1,
  overlayAlpha: 0,
  shadowBlur: 5,
};

const FROZEN_GATE: LockedTargetVisualTreatment = {
  baseAlpha: 0.38,
  // Frozen exits use an opaque ice treatment so the underlying gate colour
  // cannot bleed through and make adjacent frozen exits look like different
  // lock states. The gate frame remains dimmed while the ice face is solid.
  overlayAlpha: 1,
  shadowBlur: 4,
};

const FROZEN_BLOCK: LockedTargetVisualTreatment = {
  baseAlpha: 0.58,
  overlayAlpha: 0.64,
  shadowBlur: 5,
};

export const gateAvailabilityVisual = (frozen: number): LockedTargetVisualTreatment => (
  frozen > 0 ? FROZEN_GATE : ACTIVE_TARGET
);

export const gateReadinessVisual = (readiness: GateReadiness): LockedTargetVisualTreatment => (
  // Missing or currently unavailable matching blocks do not dim an exit.
  readiness === "frozen" ? FROZEN_GATE : ACTIVE_TARGET
);

export const blockAvailabilityVisual = (frozen: number): LockedTargetVisualTreatment => (
  frozen > 0 ? FROZEN_BLOCK : ACTIVE_TARGET
);
