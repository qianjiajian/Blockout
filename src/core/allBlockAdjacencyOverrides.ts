import type { BlockColor, BlockSpec, LevelSpec } from "./types";
import { forceSolvabilityRepair } from "./solvabilityRepairOverrides";
import { applyOpeningPreservingRepair } from "./singleBlockAdjacencyRepairs";

const COLOR_BY_CODE: Readonly<Record<string, BlockColor>> = {
  r: "red", o: "orange", y: "yellow", g: "green", c: "cyan", b: "blue", u: "purple", p: "pink",
};

const colorFromCode = (code: string): BlockColor => COLOR_BY_CODE[code]!;

const base36 = (value: string): number => parseInt(value, 36);

/*
 * Compact solver-certified table. Row shape identifies its repair mode:
 *   id|block colours|gate colours  direct/minimal recolour
 *   id|block colours               staged fallback
 *   id||positions                  minimal position edit
 * Block colours use index/colour pairs and positions use index/x/y triples.
 * All numeric fields are base-36 digits.
 */
const PACKED_PATCHES = "3|0b5b|cgbpu;5|5g|ocrgy;7|2y4p6r7yeyfp|pyr;a|cyerfyhrlpmy|yrypry;b|7u9g|goubo;c|4p9b|bopc;d|3y9bbbcydb|bgyruc;f|6p7r|prgyo;h|areujrlp|ubpyr;i|0b1b6b9rardb|bcgryp;j|3g5bbo|rbgo;k|1r6r8bbu|rbgoup;l|1c3r8cbr|crugo;o|co|gorbcu;s|4b|byrpuo;w|1b|bcug;y|fg|cgryop;z|1u|guc;10|3y4par|poyr;12|2b|bcgpuy;17|1g|bgcu;18|1y|poycrubg;1a|1y|uybpocgr;1b|9p|prgoy;1c|1o4o|orcubgbbb;1k|0r6gcg|grcgybuo;1l|2g3g4y|gyrbpcuo;1m|5p6cdy|pcpogybr;1q|9ccu|ucboygp;1r|2bbb|gbcupyro;1t|4o|obuypr;1w|3r4r7o8y|yrobporypb;1x|2c|cgrobu;1z|6o|oprgyobu;20|5u7u|bucgoryp;22|8yag|rygpco;24|5obygp|yrop;26|1y5y9uby|yupcgbo;27|5y|yoropgubpyrogcuupybo;28|0g2udc|ugcb;29|3u9bay|buyp;2a|1cgrir|crgybopu;2e|by|ygbcup;2g|0g4g6b|cgbour;2h|au|uogybrp;2j|eu|ucgobrp;2k|9b|boupyr;2m|9u|ubypcg;2q|3ydc|cgorypb;34|6g7u|ugycbrop;39|1o4y|gocryup;41|2o|bopuy;4w|6u|urybcgp;5d|3y|yguborp;p|0b1r2b4r6r7rbrdbeggb;v|5b6ragdbgrhb;1e|5r7r;1f|2r4r6r;1g|2r3b8rbbcrgghbig;1h|1r7r;1n|0r3g4reb;1u|0b5b8bcrfrgb;1v|6g7rabbr;23|6bbrfrhr;25|2b4b7b9rabdrebjb;2b|1b2r6r8b;2l|7bagdb;2s|0g3r4bbr;3g|0r4g5r;48|2b5g6r8rbr;57|3r5r9bbgcrfb;11|0b1r3u9o|;14|1o3b|;15|8r|ubrypo;19|3g4c7bdu|;1i||450703;1j|1g5o6rby|;1p|1b7r|;2d|1g8uebfr|;2o|0r8udymb|;2p|1p6u7r8ubbcpdbhujpkymr|;2r|0g7c|;2v||747807;2x||326;2z|1g3g5u8cfu|;30||446635c17;38|1u5o8b9uabbrcpgo|;3j||004;4c||009";

const PATCH_BY_LEVEL = new Map<number, string[]>(
  PACKED_PATCHES.split(";").map((row) => {
    const fields = row.split("|");
    const packedLevelId = base36(fields[0]!);
    // The packed table predates the correction that restored runtime Lv2 and
    // Lv5 to their same-numbered competitor sources. Its sole Lv5 row was
    // authored for what is now Lv2, so translate that row at decode time.
    return [packedLevelId === 5 ? 2 : packedLevelId, fields];
  }),
);

const recolorBlock = (block: BlockSpec, color: BlockColor): BlockSpec => ({
  ...block,
  color,
  ...(block.layers?.length ? { layers: [color, ...block.layers.slice(1)] } : {}),
});

const findPackedCode = (packed: string, stride: number, blockIndex: number): number => {
  for (let index = 0; index < packed.length; index += stride) {
    if (base36(packed[index]!) === blockIndex) return index;
  }
  return -1;
};

const applyBlockColors = (level: LevelSpec, packed: string): LevelSpec => ({
  ...level,
  blocks: level.blocks.map((block, blockIndex) => {
    const offset = findPackedCode(packed, 2, blockIndex);
    return offset < 0 ? block : recolorBlock(block, colorFromCode(packed[offset + 1]!));
  }),
});

const applyBlockPositions = (level: LevelSpec, packed: string): LevelSpec => ({
  ...level,
  blocks: level.blocks.map((block, blockIndex) => {
    const offset = findPackedCode(packed, 3, blockIndex);
    return offset < 0 ? block : {
      ...block,
      x: base36(packed[offset + 1]!),
      y: base36(packed[offset + 2]!),
    };
  }),
});

const applyGateColors = (level: LevelSpec, packed: string): LevelSpec => {
  if (!packed) return level;
  const gates = level.gates.map((gate, index) => ({
    ...gate,
    color: packed[index] ? colorFromCode(packed[index]!) : gate.color,
  }));
  const flipDoors = level.flipDoors?.map((door, index) => {
    const code = packed[level.gates.length + index];
    return { ...door, color: code ? colorFromCode(code) : door.color };
  });
  return { ...level, gates, flipDoors };
};

/**
 * The forced all-block recolour introduces one new outer colour in each of
 * these two dense openings. Keep the authored opening, shutter cohort and
 * exit inventory intact; only make an existing rim slot geometrically
 * compatible with the recoloured pieces.
 */
const retainForcedOpeningExitCompatibility = (level: LevelSpec): LevelSpec => {
  if (level.id === 93) {
    return {
      ...level,
      gates: level.gates.map((gate) => gate.id === "vp-093-gate-09"
        ? { ...gate, color: "blue", size: 2 }
        : gate),
    };
  }
  if (level.id === 124) {
    return {
      ...level,
      gates: level.gates.map((gate) => gate.id === "lv124-gate-05"
        ? { ...gate, size: 3 }
        : gate.id === "lv124-gate-06"
          ? { ...gate, offset: 0, size: 2 }
          : gate),
    };
  }
  return level;
};

export const ALL_BLOCK_ADJACENCY_DIRECT_LEVEL_IDS = [
  2, 3, 7, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 24, 28, 32, 34, 35, 36, 38, 43, 44, 46, 47, 48,
  56, 57, 58, 62, 63, 65, 68, 69, 71, 72, 74, 76, 78, 79, 80, 81, 82, 86, 88, 89, 91, 92, 94, 98, 112,
  117, 145, 176, 193,
] as const;

export const ALL_BLOCK_ADJACENCY_FORCED_LEVEL_IDS = [
  25, 31, 50, 51, 52, 53, 59, 66, 67, 75, 77, 83, 93, 100, 124, 152, 187,
] as const;

export const ALL_BLOCK_ADJACENCY_MINIMAL_LEVEL_IDS = [
  37, 40, 41, 45, 54, 55, 61, 85, 96, 97, 99, 103, 105, 107, 108, 116, 127, 156,
] as const;

export const ALL_BLOCK_ADJACENCY_REPAIRED_LEVEL_IDS = [
  2, 3, 7, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 24, 25, 28, 31, 32, 34, 35, 36, 37, 38, 40, 41, 43,
  44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 65, 66, 67, 68, 69, 71, 72, 74,
  75, 76, 77, 78, 79, 80, 81, 82, 83, 85, 86, 88, 89, 91, 92, 93, 94, 96, 97, 98, 99, 100, 103, 105, 107,
  108, 112, 116, 117, 124, 127, 145, 152, 156, 176, 187, 193,
] as const;

export const applyAllBlockAdjacencyRepair = (level: LevelSpec): LevelSpec => {
  // Lv20's dedicated dogbone regeneration is already adjacency-clean.  Its
  // historical packed patch targets the superseded 7×9 block order and must
  // not recolour the exact competitor-aligned layout.
  if (level.id === 20) return level;
  const fields = PATCH_BY_LEVEL.get(level.id);
  if (!fields) return level;

  if (fields.length === 2) {
    const recolored = applyBlockColors(level, fields[1] ?? "");
    // Lv93/Lv124 already have a certified opening-preserving route. Sending
    // them through the broad fallback here would hide their dense opening in
    // 20+ internal staging shutters merely to apply the larger-block colour
    // patch. Keep the same colour change and reuse the narrow repair instead.
    const repaired = level.id === 93 || level.id === 124
      ? applyOpeningPreservingRepair(retainForcedOpeningExitCompatibility(recolored))
      : forceSolvabilityRepair(recolored);
    if (level.id === 51) {
      return { ...repaired, blocks: repaired.blocks.map(({ movementAxis: _movementAxis, ...block }) => block) };
    }
    return repaired;
  }

  if (!fields[1]) return applyBlockPositions(level, fields[2] ?? "");

  return applyGateColors(applyBlockColors(level, fields[1] ?? ""), fields[2] ?? "");
};
