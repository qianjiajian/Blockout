import type { Point, PuzzleSnapshot, ShutterSpec } from "./types";

export type MechanicEventKind = "ice" | "shutter" | "layer" | "conveyor";
export type MechanicTarget = "gate" | "block" | "shutter";

export interface MechanicEvent {
  kind: MechanicEventKind;
  target: MechanicTarget;
  id: string;
  previous: number;
  remaining: number;
  unlocked: boolean;
  skin?: ShutterSpec["skin"];
  deviceId?: string;
  from?: Point;
  to?: Point;
}

export const detectMechanicEvents = (before: PuzzleSnapshot, after: PuzzleSnapshot): MechanicEvent[] => {
  const events: MechanicEvent[] = [];

  for (const gate of after.gates) {
    const previous = before.gates.find((item) => item.id === gate.id)?.frozen ?? gate.frozen;
    if (gate.frozen < previous) {
      events.push({ kind: "ice", target: "gate", id: gate.id, previous, remaining: gate.frozen, unlocked: gate.frozen === 0 });
    }
  }

  for (const block of after.blocks) {
    const previousBlock = before.blocks.find((item) => item.id === block.id);
    if (!previousBlock) continue;
    if (block.frozen < previousBlock.frozen) {
      events.push({
        kind: "ice",
        target: "block",
        id: block.id,
        previous: previousBlock.frozen,
        remaining: block.frozen,
        unlocked: block.frozen === 0,
      });
    }
    if (block.layers.length < previousBlock.layers.length) {
      events.push({
        kind: "layer",
        target: "block",
        id: block.id,
        previous: previousBlock.layers.length,
        remaining: block.layers.length,
        unlocked: true,
      });
    }
  }

  for (const shutter of after.shutters) {
    const previous = before.shutters.find((item) => item.id === shutter.id)?.count ?? shutter.count;
    if (shutter.count < previous) {
      events.push({
        kind: "shutter",
        target: "shutter",
        id: shutter.id,
        previous,
        remaining: shutter.count,
        unlocked: shutter.count === 0,
        skin: shutter.skin,
      });
    }
  }

  for (const conveyor of after.conveyors) {
    const beforeBlock = before.blocks.find((item) => item.id === conveyor.blockId);
    const afterBlock = after.blocks.find((item) => item.id === conveyor.blockId);
    if (!beforeBlock || !afterBlock || (beforeBlock.x === afterBlock.x && beforeBlock.y === afterBlock.y)) continue;
    events.push({
      kind: "conveyor",
      target: "block",
      id: conveyor.blockId,
      previous: 0,
      remaining: 0,
      unlocked: true,
      deviceId: conveyor.id,
      from: [beforeBlock.x, beforeBlock.y],
      to: [afterBlock.x, afterBlock.y],
    });
  }

  return events;
};
