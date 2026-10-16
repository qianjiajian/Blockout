import { gatePortalRailKeys, gatePortals } from "../core/gatePortals";
import type { GatePortalSpec, GateSpec, Point, PuzzleSnapshot } from "../core/types";
import { buildBoardRimLayout, type BoardRimLayout } from "./boardRim";
import type { GeneratorRimGeometry } from "./generatorRimGeometry";

type BoardGeometrySnapshot = Pick<PuzzleSnapshot,
  "width" | "height" | "playable" | "blocked" | "seams" | "gates" | "flipDoors" | "generators">;
type RimGate = Pick<GateSpec, "side" | "offset" | "size" | "portals">;
type ReadonlyRim = { readonly [K in keyof BoardRimLayout]: ReadonlyArray<Readonly<BoardRimLayout[K][number]>> };

const clonePortals = (portals: readonly GatePortalSpec[]): GatePortalSpec[] => portals.map(portal => ({
  ...portal, origin: [...portal.origin] as Point,
}));
const cloneRimGate = (gate: RimGate): RimGate => ({
  side: gate.side, offset: gate.offset, size: gate.size,
  ...(gate.portals ? { portals: clonePortals(gate.portals) } : {}),
});

/** Fixed exits retain their original rail priority over overlapping flip doors. */
export function visibleFlipDoorsOnRim(
  snapshot: Pick<PuzzleSnapshot, "width" | "height" | "gates" | "flipDoors">,
): PuzzleSnapshot["flipDoors"] {
  const fixedRails = new Set(snapshot.gates.flatMap(gate => gatePortalRailKeys(snapshot, gate)));
  return snapshot.flipDoors.flatMap(door => {
    const authoredPortals = door.portals?.length ? door.portals : undefined;
    const visiblePortals = gatePortals(snapshot, door).filter(portal => (
      gatePortalRailKeys(snapshot, { ...door, portals: [portal] }).every(rail => !fixedRails.has(rail))
    ));
    if (!visiblePortals.length) return [];
    if (!authoredPortals) return [door];
    return [{ ...door, portals: clonePortals(visiblePortals) }];
  });
}

interface GeometryEntry {
  owner: object;
  board: Pick<BoardGeometrySnapshot, "width" | "height" | "playable" | "blocked" | "seams">;
  isFloor: (x: number, y: number) => boolean;
  gates: RimGate[];
  visibleDoors: Map<string, GatePortalSpec[] | undefined>;
  generators: Array<{ index: number; rails: GeneratorRimGeometry["reservedRails"] }>;
  activeGenerators?: string;
  rim?: ReadonlyRim;
}

export interface BoardGeometryView {
  readonly isFloor: (x: number, y: number) => boolean;
  readonly visibleFlipDoors: readonly PuzzleSnapshot["flipDoors"][number][];
  readonly rim: ReadonlyRim;
}

/** One current board and one current rim variant; never retains run state or history. */
export class BoardGeometryCache {
  private entry?: GeometryEntry;

  /** Required if a tool replaces geometry while retaining the same owner object. */
  invalidate(): void { this.entry = undefined; }

  read(
    owner: object,
    snapshot: BoardGeometrySnapshot,
    hasSpawnAnimation: (generatorId: string) => boolean,
    generatorGeometry: (generator: PuzzleSnapshot["generators"][number]) => GeneratorRimGeometry,
  ): BoardGeometryView {
    let entry = this.entry;
    if (!entry || entry.owner !== owner) {
      const visibleDoors = visibleFlipDoorsOnRim(snapshot);
      const floor = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of snapshot.blocked) floor.delete(`${x},${y}`);
      entry = {
        owner,
        board: {
          width: snapshot.width, height: snapshot.height,
          playable: snapshot.playable.map(([x, y]) => [x, y] as Point),
          blocked: snapshot.blocked.map(([x, y]) => [x, y] as Point),
          seams: snapshot.seams.map(seam => ({ ...seam })),
        },
        isFloor: (x, y) => floor.has(`${x},${y}`),
        gates: [...snapshot.gates, ...visibleDoors].map(cloneRimGate),
        visibleDoors: new Map(visibleDoors.map(door => [
          door.id, door.portals?.length ? clonePortals(door.portals) : undefined,
        ])),
        generators: snapshot.generators.flatMap((generator, index) => (
          (generator.rimMount ?? "rim") === "rim"
            ? [{ index, rails: generatorGeometry(generator).reservedRails.map(rail => ({ ...rail })) }]
            : []
        )),
      };
      this.entry = entry;
    }

    // Exhaustion alone does not release the final spawn's occupied rails.
    // Match the renderer's original short-circuit check on every frame.
    let activeGenerators = "";
    for (const cached of entry.generators) {
      const generator = snapshot.generators[cached.index];
      activeGenerators += generator.remaining > 0 || hasSpawnAnimation(generator.id) ? "1" : "0";
    }
    if (!entry.rim || activeGenerators !== entry.activeGenerators) {
      const rails = entry.generators.flatMap((generator, index) => (
        activeGenerators[index] === "1" ? generator.rails : []
      ));
      const { playable, blocked, width, height, seams } = entry.board;
      entry.rim = buildBoardRimLayout(playable, blocked, width, height, entry.gates, rails, seams);
      entry.activeGenerators = activeGenerators;
    }

    // Always use this frame's open/frozen and other presentation state. Only
    // portal visibility is static, and projected portals remain detached.
    const visibleDoors = entry.visibleDoors;
    return {
      isFloor: entry.isFloor,
      rim: entry.rim,
      visibleFlipDoors: snapshot.flipDoors.flatMap(door => {
        if (!visibleDoors.has(door.id)) return [];
        const portals = visibleDoors.get(door.id);
        return [portals ? { ...door, portals: clonePortals(portals) } : door];
      }),
    };
  }
}
