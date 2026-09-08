import type { BlockState, GateState, ShutterState } from "../core/types";
import { gateIsAvailableTarget } from "./gateFocus";

export type GateReadiness = "actionable" | "latent" | "frozen";

const readinessWithClosedShutters = (
  gate: GateState,
  blocks: readonly BlockState[],
  closedShutters: ReadonlySet<string>,
): GateReadiness => {
  if (gate.frozen > 0) return "frozen";
  const hasCandidate = blocks.some((block) => (
    block.frozen <= 0
    && (!block.shutterId || !closedShutters.has(block.shutterId))
    && gateIsAvailableTarget(block, gate)
  ));
  return hasCandidate ? "actionable" : "latent";
};

export const gateReadiness = (
  gate: GateState,
  blocks: readonly BlockState[],
  shutters: readonly ShutterState[],
): GateReadiness => readinessWithClosedShutters(
  gate,
  blocks,
  new Set(shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id)),
);

export const gateReadinessMap = (
  gates: readonly GateState[],
  blocks: readonly BlockState[],
  shutters: readonly ShutterState[],
): ReadonlyMap<string, GateReadiness> => {
  const closedShutters = new Set(
    shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id),
  );
  return new Map(gates.map((gate) => [
    gate.id,
    readinessWithClosedShutters(gate, blocks, closedShutters),
  ]));
};
