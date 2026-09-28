import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

interface CanvasProbe {
  fills: Array<[number, number, number, number]>;
  strokes: Array<[number, number, number, number]>;
  moves: Array<[number, number]>;
  lines: Array<[number, number]>;
  arcs: Array<[number, number, number, number, number]>;
  strokeCalls: number;
  fillCalls: number;
}

const canvasProbe = (): { ctx: CanvasRenderingContext2D; probe: CanvasProbe } => {
  const probe: CanvasProbe = {
    fills: [],
    strokes: [],
    moves: [],
    lines: [],
    arcs: [],
    strokeCalls: 0,
    fillCalls: 0,
  };
  const ctx = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    save() {},
    restore() {},
    beginPath() {},
    moveTo(x: number, y: number) { probe.moves.push([x, y]); },
    lineTo(x: number, y: number) { probe.lines.push([x, y]); },
    arc(x: number, y: number, radius: number, start: number, end: number) {
      probe.arcs.push([x, y, radius, start, end]);
    },
    fill() { probe.fillCalls += 1; },
    stroke() { probe.strokeCalls += 1; },
    fillRect(x: number, y: number, width: number, height: number) {
      probe.fills.push([x, y, width, height]);
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      probe.strokes.push([x, y, width, height]);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, probe };
};

const gameWithProbe = () => {
  const { ctx, probe } = canvasProbe();
  const labels: string[] = [];
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.ctx = ctx;
  game.art = {};
  game.label = (value: string) => { labels.push(value); };
  return { game, probe, labels };
};

describe("advanced Lv101-200 mechanism visuals", () => {
  it("keeps ordinary gates authoritative over overlapping flip-door rim spans", () => {
    const { game } = gameWithProbe();
    const fixedGate = { id: "fixed", side: "right", offset: 1, size: 2, color: "red", frozen: 0 };
    const overlappingDoor = {
      id: "overlap",
      side: "right",
      offset: 2,
      size: 2,
      color: "blue",
      initiallyOpen: true,
      open: true,
      frozen: 0,
    };
    const separateDoor = {
      id: "separate",
      side: "bottom",
      offset: 0,
      size: 2,
      color: "green",
      initiallyOpen: false,
      open: false,
      frozen: 0,
    };

    expect(game.visibleFlipDoorsOnRim({
      gates: [fixedGate],
      flipDoors: [overlappingDoor, separateDoor],
    })).toEqual([separateDoor]);
  });

  it("uses an open flip door as the exit-animation target without bypassing a fixed gate", () => {
    const { game } = gameWithProbe();
    game.model = { blockCells: () => [[5, 1], [5, 2]] };
    const block = { id: "piece" };
    const openDoor = {
      id: "door",
      side: "right",
      offset: 1,
      size: 2,
      color: "purple",
      initiallyOpen: true,
      open: true,
      frozen: 0,
    };
    const snapshot = { gates: [], flipDoors: [openDoor] };

    expect(game.exitGateForBlock(snapshot, block, "purple", "right")).toBe(openDoor);
    expect(game.exitGateForBlock({
      gates: [{ id: "fixed", side: "right", offset: 1, size: 2, color: "red", frozen: 0 }],
      flipDoors: [openDoor],
    }, block, "purple", "right")).toBeUndefined();
    expect(game.exitGateForBlock({
      gates: [],
      flipDoors: [{ ...openDoor, open: false }],
    }, block, "purple", "right")).toBeUndefined();
  });

  it("renders colored-grid cells at deterministic floor coordinates", () => {
    const { game, probe } = gameWithProbe();
    game.drawColoredGrid({
      id: "cyan-grid",
      color: "cyan",
      cells: [[1, 2], [2, 2]],
    }, { innerX: 20, innerY: 30, cell: 50 });

    expect(probe.fills).toEqual([
      [73.5, 133.5, 43, 43],
      [123.5, 133.5, 43, 43],
    ]);
    expect(probe.strokes).toEqual(probe.fills);
    expect(probe.lines).toHaveLength(8);
  });

  it("distinguishes closed flip doors from open outward chevrons", () => {
    const closed = gameWithProbe();
    closed.game.drawFlipDoorDecorations(
      "right", 1, 2, 0, false,
      { innerX: 20, innerY: 30, cell: 50, innerWidth: 300, innerHeight: 200 },
      false,
    );
    expect(closed.probe.fills).toHaveLength(1);
    expect(closed.probe.lines).toHaveLength(2);
    expect(closed.probe.strokeCalls).toBe(1);

    const open = gameWithProbe();
    open.game.drawFlipDoorDecorations(
      "top", 1, 2, 0, true,
      { innerX: 20, innerY: 30, cell: 50, innerWidth: 300, innerHeight: 200 },
      false,
    );
    expect(open.probe.fills).toHaveLength(0);
    expect(open.probe.lines).toHaveLength(4);
    expect(open.probe.strokeCalls).toBe(2);
  });

  it("draws a circular double-arrow badge and a ceiled bomb countdown", () => {
    const { game, probe, labels } = gameWithProbe();
    game.drawBlockMechanicMarkers({
      rotationBadge: true,
      timedBombSeconds: 4.01,
    }, [[1, 2]], { innerX: 20, innerY: 30, cell: 60 });

    expect(probe.arcs).toHaveLength(4);
    expect(probe.fillCalls).toBe(2);
    expect(probe.strokeCalls).toBe(6);
    expect(labels).toEqual(["5"]);
    expect(probe.arcs[0]?.[0]).toBeCloseTo(99.2, 5);
    expect(probe.arcs[0]?.[1]).toBe(180);
    expect(probe.arcs[3]?.[0]).toBeCloseTo(120.8, 5);
    expect(probe.arcs[3]?.[1]).toBe(180);
  });
});
