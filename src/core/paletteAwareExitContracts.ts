import { COLORS, type GateSpec, type LevelSpec, type Side } from "./types";

export const PALETTE_AWARE_EXIT_CONTRACT_VERSION = "truth-palette-aware-exits-r1" as const;
export const PALETTE_AWARE_EXIT_EXCLUDED_LEVEL_IDS = [20] as const;
export const PALETTE_AWARE_EXIT_SOURCE_MISSING_LEVEL_IDS = [190, 191] as const;
export const PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS = [
  26, 28, 29, 30, 39, 44, 49, 50, 70, 83, 87, 90, 95, 96, 99, 101, 108,
  112, 117, 129, 130, 132, 135, 155, 158, 168, 175, 178, 179, 188, 193, 196, 198,
] as const;

/** Fixed-width base36 records: side, offset, size, color, frozen, star/door/open flags. */
export const PALETTE_AWARE_EXIT_PACKED_PATCHES: Readonly<Partial<Record<number, string>>> = {
  26: "0023000214e0031200041390051450102500122600141700201100303200332000",
  28: "003500033100203000233300362600381420",
  29: "0032a01037k01310002034k03031003315k0",
  30: "001100011090021200103300201600303400",
  39: "0027b00220900711u01026001214s01315001416n01517m01610j02022202223503025f0",
  44: "003600032300052500131200203000232700252400302100",
  49: "152320172200202500222400243000352100372630",
  50: "003300031100103200133000202100222500303700333600362400",
  70: "002410102600202310302110",
  83: "0024000211000312000413000514a0061500071600102700122600141500151280161360171420202000302100322200342300",
  87: "0033001036502022h0303500332000",
  90: "1032601320a0303700333500",
  95: "0022000211e0031290041300051400061500071600103000131600141100202400303500331700341300",
  96: "0251000717c01132301624802120002326e02523a02715g0",
  99: "002730021630031530103210132310202400303110332030",
  101: "0027000213100311l00413f00514301030001314e0202201303500331690",
  108: "0012e00115c00212a0103400131740141330203600301110311570321020331250",
  112: "003400031160041530153300201700211620221610301200311100321000",
  117: "0020301015001117001216e03012003113503224e0",
  129: "002600022300102100122020141240202400303500",
  130: "002100022000041670051300061400071500102500151700202760221400302200321330",
  132: "003600103530203400303130",
  135: "003000103500202230303100332600",
  155: "002406021050031150102702122650202302303201",
  158: "103300131400303700331640",
  168: "0022000211p00314l00415k00516j0061550102700202320303000",
  175: "0021200220201033a01325102027a0303600332240",
  178: "003370103500132000202710303100332200",
  179: "002100021000031500041300103200133300202600303700333400",
  188: "003530031340041740103240132610203400303120333040",
  193: "0022901024501221701435b0203300303020333640",
  196: "003600032400051220061320103520132220203320232020303120332720",
  198: "0033000311400412c00513f01034001325402021d02226003037003322d0352040",
};

const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

/** Applies only solver/replay-certified packed exit replacements. */
export const applyPaletteAwareExitContracts = (source: LevelSpec): LevelSpec => {
  const packed = PALETTE_AWARE_EXIT_PACKED_PATCHES[source.id];
  if (!packed) return source;
  if (packed.length % 6 !== 0) throw new Error(`Lv${source.id}: invalid packed exit contract`);
  const gates: GateSpec[] = [];
  const flipDoors: NonNullable<LevelSpec["flipDoors"]> = [];
  for (let cursor = 0, exitIndex = 0; cursor < packed.length; cursor += 6, exitIndex += 1) {
    const digit = (offset: number): number => Number.parseInt(packed[cursor + offset]!, 36);
    const side = SIDES[digit(0)];
    const color = COLORS[digit(3)];
    if (!side || !color) throw new Error(`Lv${source.id}: invalid packed exit enum`);
    const flags = digit(5);
    const door = (flags & 2) !== 0;
    const exit = {
      id: `palette-exit-lv${String(source.id).padStart(3, "0")}-${door ? "d" : "g"}-${String(exitIndex + 1).padStart(2, "0")}`,
      side,
      offset: digit(1),
      size: digit(2),
      color,
      ...(digit(4) > 0 ? { frozen: digit(4) } : {}),
      ...((flags & 1) !== 0 ? { star: true } : {}),
    };
    if (door) flipDoors.push({ ...exit, initiallyOpen: (flags & 4) !== 0 });
    else gates.push(exit);
  }
  return { ...source, gates, ...(flipDoors.length ? { flipDoors } : { flipDoors: undefined }) };
};
