import { describe, expect, it } from "vitest";
import { blockAvailabilityVisual, gateAvailabilityVisual, gateReadinessVisual } from "../src/game/availabilityVisuals";

describe("locked target visual hierarchy", () => {
  it("keeps available exits fully prominent", () => {
    expect(gateAvailabilityVisual(0)).toEqual({ baseAlpha: 1, overlayAlpha: 0, shadowBlur: 5 });
  });

  it("uses an opaque ice face while de-emphasizing the frozen gate frame", () => {
    const gate = gateAvailabilityVisual(3);
    const block = blockAvailabilityVisual(1);
    expect(gate.baseAlpha).toBeLessThan(block.baseAlpha);
    expect(gate.overlayAlpha).toBe(1);
    expect(gate.baseAlpha).toBeLessThan(0.5);
    expect(block.baseAlpha).toBeGreaterThanOrEqual(0.55);
  });

  it("uses the same locked treatment for every positive counter", () => {
    expect(gateAvailabilityVisual(1)).toEqual(gateAvailabilityVisual(5));
    expect(blockAvailabilityVisual(1)).toEqual(blockAvailabilityVisual(5));
  });

  it("keeps latent exits as bright as actionable exits while preserving frozen treatment", () => {
    const actionable = gateReadinessVisual("actionable");
    const latent = gateReadinessVisual("latent");
    const frozen = gateReadinessVisual("frozen");
    expect(latent).toEqual(actionable);
    expect(latent.baseAlpha).toBe(1);
    expect(latent.baseAlpha).toBeGreaterThan(frozen.baseAlpha);
    expect(latent.overlayAlpha).toBe(0);
  });
});
