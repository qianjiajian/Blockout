// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";

type JsonRecord = Record<string, any>;

const AUDIT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/video-parity-v8/direct-data-build-audit.json",
  import.meta.url,
), "utf8")) as JsonRecord;
const CLUSTER_SWAP_BATCH_H = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.json",
  import.meta.url,
), "utf8")) as JsonRecord;
const CLUSTER_SWAP_BATCH_H_IDS = [22, 54, 59, 69, 74, 77, 84, 89] as const;
const CLUSTER_SWAP_BATCH_I = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.json",
  import.meta.url,
), "utf8")) as JsonRecord;
const CLUSTER_SWAP_BATCH_I_IDS = [72, 94] as const;
const CLUSTER_SWAP_BATCH_IDS = [...CLUSTER_SWAP_BATCH_H_IDS, ...CLUSTER_SWAP_BATCH_I_IDS] as const;
const CLUSTER_SWAP_BATCH_ID_SET = new Set<number>(CLUSTER_SWAP_BATCH_IDS);
const clusterSwapBatchById = new Map<number, JsonRecord>([
  ...(CLUSTER_SWAP_BATCH_H.records as JsonRecord[]),
  ...(CLUSTER_SWAP_BATCH_I.records as JsonRecord[]),
].map((record) => [record.level_id, record]));
const clusterSwapBatchContractById = new Map<number, JsonRecord>([
  ...CLUSTER_SWAP_BATCH_H_IDS.map((levelId) => [levelId, {
    schema: CLUSTER_SWAP_BATCH_H.schema,
    evidence: [
      {
        path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.json",
        sha256: "C9BEDD3374FE30B8E8A44A638894BA3E415AAC42B51931CB727ACC5D954855AA",
      },
      {
        path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.md",
        sha256: "D24A76E017CF0CD808A1267036FB3D4197FE15E8B37A9381AE2689159F5E10E5",
      },
    ],
  }] as const),
  ...CLUSTER_SWAP_BATCH_I_IDS.map((levelId) => [levelId, {
    schema: CLUSTER_SWAP_BATCH_I.schema,
    evidence: [
      {
        path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.json",
        sha256: "AC84C2255D248C777D784069EE1FF0D745C77E759DA3CA189CB23DC2A1C62B83",
      },
      {
        path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.md",
        sha256: "DEED4ABBB465F7193F786AE6D672861B896B43DCD72641B065009B83A32C0B2D",
      },
    ],
  }] as const),
]);

const REPAIR_IDS = [2, 3, 4, 6, 7, 9, 12, 13, 16, 21, 23, 33, 37, 44, 46, 53, 56, 58, 82, 85, 91, 99, 100, 36, 41, 43, 49, 55, 57, 62, 63, 66, 67, 78, 80, 88, 96, 98, 40, 27, 31, 52, 61, 22, 54, 59, 69, 74, 77, 84, 89, 72, 94] as const;
const EXPECTED = new Map<number, JsonRecord>([
  [2, { exit: [], blocks: ["cc-piece-05:orange->red", "cc-piece-15:green->orange"], exploredStates: 521, minimumDrags: 27, clearLoad: 20, repositionOverhead: 7, gridSteps: 84, turns: 12 }],
  [3, { exit: [], blocks: ["piece-07:cyan->green"], exploredStates: 125, minimumDrags: 17, clearLoad: 9, repositionOverhead: 8, gridSteps: 53, turns: 6 }],
  [4, { exit: [], blocks: ["strategy-guard-03:green->pink", "cc-piece-05:orange->pink"], exploredStates: 258, minimumDrags: 31, clearLoad: 18, repositionOverhead: 13, gridSteps: 92, turns: 21 }],
  [6, { exit: [], blocks: ["cc-piece-15:blue->pink"], exploredStates: 816, minimumDrags: 33, clearLoad: 21, repositionOverhead: 12, gridSteps: 109, turns: 21 }],
  [7, { exit: [], blocks: ["cc-piece-02:pink->yellow", "cc-piece-07:yellow->pink", "strategy-guard-12:yellow->red", "cc-piece-13:yellow->pink"], exploredStates: 3_842, minimumDrags: 33, clearLoad: 16, repositionOverhead: 17, gridSteps: 125, turns: 25 }],
  [9, { exit: [], blocks: ["strategy-guard-09:blue->purple"], exploredStates: 2_902, minimumDrags: 24, clearLoad: 10, repositionOverhead: 14, gridSteps: 81, turns: 13 }],
  [12, { exit: ["vp-012-gate-01:orange->blue"], blocks: ["cc-piece-01:orange->blue", "strategy-guard-02:pink->blue", "cc-piece-03:cyan->blue"], exploredStates: 1_352, minimumDrags: 22, clearLoad: 12, repositionOverhead: 10, gridSteps: 84, turns: 11 }],
  [13, { exit: ["vp-013-gate-06:red->cyan"], blocks: ["cc-piece-05:yellow->green", "cc-piece-08:green->yellow"], exploredStates: 3_254, minimumDrags: 26, clearLoad: 16, repositionOverhead: 10, gridSteps: 107, turns: 10 }],
  [16, { exit: [], blocks: ["cc-016-b1-02:green->orange", "cc-016-b1-04:purple->green", "cc-016-b1-11:blue->green", "cc-016-b1-13:orange->purple", "cc-016-b1-15:green->orange"], exploredStates: 1_352, minimumDrags: 35, clearLoad: 21, repositionOverhead: 14, gridSteps: 131, turns: 31 }],
  [21, { exit: [], blocks: ["cc-021-b1-03:purple->green", "cc-021-b1-06:red->green", "cc-021-b1-07:red->cyan", "cc-021-b1-14:cyan->orange", "cc-021-b2-03:cyan->green", "cc-021-b3-02:cyan->orange", "cc-021-b4-01:cyan->orange"], exploredStates: 28, minimumDrags: 27, clearLoad: 27, repositionOverhead: 0, gridSteps: 96, turns: 9 }],
  [23, { exit: [], blocks: ["cc-piece-s1-03:red->green", "cc-piece-s1-09:green->orange", "cc-piece-s2-03:red->green"], exploredStates: 3_530, minimumDrags: 40, clearLoad: 24, repositionOverhead: 16, gridSteps: 198, turns: 45 }],
  [33, { exit: ["vp-033-gate-03:orange->cyan"], blocks: ["cc-piece-08:yellow->cyan", "cc-piece-18:blue->orange"], exploredStates: 15_142, minimumDrags: 37, clearLoad: 23, repositionOverhead: 14, gridSteps: 256, turns: 55 }],
  [37, { exit: ["vp-037-gate-07:orange->pink"], blocks: [], exploredStates: 1_086, minimumDrags: 43, clearLoad: 19, repositionOverhead: 24, gridSteps: 105, turns: 12 }],
  [44, { exit: ["vp-044-gate-08:orange->green"], blocks: ["cc-044-b1-05:yellow->pink", "cc-044-b5-01:pink->yellow"], exploredStates: 68, minimumDrags: 21, clearLoad: 18, repositionOverhead: 3, gridSteps: 68, turns: 10 }],
  [46, { exit: ["vp-046-gate-08:yellow->red"], blocks: ["cc-046-b1-06:purple->red", "cc-046-b5-03:blue->cyan"], exploredStates: 56, minimumDrags: 34, clearLoad: 27, repositionOverhead: 7, gridSteps: 124, turns: 35 }],
  [53, { exit: ["vp-053-gate-05:orange->yellow"], blocks: ["cc-053-b1-05:pink->blue", "cc-053-b1-09:orange->yellow"], exploredStates: 454, minimumDrags: 32, clearLoad: 16, repositionOverhead: 16, gridSteps: 86, turns: 9 }],
  [56, { exit: ["vp-056-gate-08:cyan->pink"], blocks: ["strategy-guard-s1-04:green->purple", "cc-piece-s1-15:purple->green"], exploredStates: 66, minimumDrags: 24, clearLoad: 21, repositionOverhead: 3, gridSteps: 70, turns: 9 }],
  [58, { exit: ["vp-058-gate-07:cyan->blue", "vp-058-gate-08:green->purple"], blocks: ["cc-058-b1-02:pink->orange", "cc-058-b1-04:cyan->yellow", "cc-058-b1-10:yellow->pink", "cc-058-b1-11:orange->cyan"], exploredStates: 713, minimumDrags: 31, clearLoad: 23, repositionOverhead: 8, gridSteps: 106, turns: 19 }],
  [82, { exit: ["vp-082-gate-08:cyan->purple"], blocks: ["cc-piece-04:red->cyan", "cc-piece-05:cyan->red"], exploredStates: 100, minimumDrags: 25, clearLoad: 19, repositionOverhead: 6, gridSteps: 121, turns: 20 }],
  [85, { exit: ["vp-085-gate-06:purple->pink"], blocks: ["cc-085-b1-04:red->blue", "cc-085-b1-06:red->blue", "cc-085-b1-13:blue->pink"], exploredStates: 5_209, minimumDrags: 25, clearLoad: 18, repositionOverhead: 7, gridSteps: 129, turns: 19 }],
  [91, { exit: ["vp-091-gate-04:cyan->orange", "vp-091-gate-06:green->red"], blocks: ["cc-091-b1-04:green->blue", "cc-091-b1-06:green->purple", "cc-091-b1-07:green->blue", "cc-091-b1-10:green->cyan", "cc-091-b1-13:green->blue", "cc-091-b2-03:green->red", "cc-091-b3-01:green->orange", "cc-091-b3-03:green->orange", "cc-091-b3-05:green->cyan"], exploredStates: 28, minimumDrags: 27, clearLoad: 27, repositionOverhead: 0, gridSteps: 132, turns: 17 }],
  [99, { exit: ["vp-099-gate-06:red->orange"], blocks: ["cc-099-b1-03:green->blue", "cc-099-b1-05:purple->blue", "cc-099-b1-10:blue->purple", "cc-099-b1-12:blue->purple", "cc-099-b2-01:blue->purple", "cc-099-b4-02:purple->blue", "cc-099-b4-04:purple->green"], exploredStates: 30, minimumDrags: 27, clearLoad: 26, repositionOverhead: 1, gridSteps: 101, turns: 22 }],
  [100, { exit: ["vp-100-gate-01:cyan->blue", "vp-100-gate-02:pink->green"], blocks: ["cc-100-b1-01:cyan->blue", "cc-100-b1-02:cyan->blue", "cc-100-b1-05:cyan->pink", "cc-100-b1-06:cyan->pink", "cc-100-b1-09:pink->cyan", "cc-100-b1-10:pink->green"], counter: ["vp-100-gate-03.frozen:3->2"], exploredStates: 73, minimumDrags: 15, clearLoad: 12, repositionOverhead: 3, gridSteps: 54, turns: 12 }],
  [36, { exit: [], blocks: ["cc-036-b1-02:yellow->pink", "cc-036-b1-06:pink->red", "cc-036-b1-08:pink->red"], exploredStates: 15, minimumDrags: 14, clearLoad: 14, repositionOverhead: 0, gridSteps: 45, turns: 4 }],
  [41, { exit: [], blocks: ["cc-041-b1-01:yellow->orange", "cc-041-b1-02:yellow->blue", "cc-041-b1-06:yellow->pink"], exploredStates: 56, minimumDrags: 31, clearLoad: 26, repositionOverhead: 5, gridSteps: 147, turns: 30 }],
  [43, { exit: [], blocks: ["cc-043-b1-04:blue->cyan"], exploredStates: 39, minimumDrags: 15, clearLoad: 12, repositionOverhead: 3, gridSteps: 64, turns: 8 }],
  [49, { exit: [], blocks: ["cc-049-b1-04:yellow->blue", "cc-049-b1-05:purple->orange", "cc-049-b4-01:red->orange", "cc-049-b4-04:red->green", "cc-049-b4-05:green->purple", "cc-049-b4-08:orange->purple", "cc-049-b4-11:green->blue", "cc-049-b4-15:orange->blue"], exploredStates: 96, minimumDrags: 48, clearLoad: 42, repositionOverhead: 6, gridSteps: 216, turns: 40 }],
  [55, { exit: [], blocks: ["strategy-guard-s1-01:orange->cyan", "cc-piece-s1-06:yellow->green", "cc-piece-s1-15:yellow->red", "cc-piece-s2-01:yellow->pink"], exploredStates: 289, minimumDrags: 25, clearLoad: 19, repositionOverhead: 6, gridSteps: 94, turns: 13 }],
  [57, { exit: [], blocks: ["cc-057-b1-04:green->blue", "cc-057-b1-07:red->cyan", "cc-057-b4-01:pink->green", "cc-057-b4-04:pink->yellow", "cc-057-b4-06:pink->green"], exploredStates: 29, minimumDrags: 26, clearLoad: 24, repositionOverhead: 2, gridSteps: 133, turns: 22 }],
  [62, { exit: [], blocks: ["cc-piece-s1-02:pink->blue"], exploredStates: 25, minimumDrags: 24, clearLoad: 24, repositionOverhead: 0, gridSteps: 112, turns: 20 }],
  [63, { exit: [], blocks: ["cc-piece-08:red->blue", "strategy-guard-13:red->green"], exploredStates: 20, minimumDrags: 19, clearLoad: 19, repositionOverhead: 0, gridSteps: 51, turns: 8 }],
  [66, { exit: [], blocks: ["cc-066-b1-01:red->cyan", "cc-066-b1-03:red->cyan", "cc-066-b1-06:orange->green", "cc-066-b1-07:cyan->orange", "cc-066-b1-12:green->cyan", "cc-066-b1-13:cyan->green"], exploredStates: 28, minimumDrags: 27, clearLoad: 27, repositionOverhead: 0, gridSteps: 72, turns: 10 }],
  [67, { exit: [], blocks: ["cc-067-b1-03:pink->blue", "cc-067-b1-06:green->pink", "cc-067-b4-01:green->blue"], exploredStates: 28, minimumDrags: 22, clearLoad: 21, repositionOverhead: 1, gridSteps: 69, turns: 8 }],
  [78, { exit: [], blocks: ["cc-078-b1-03:yellow->blue", "cc-078-b1-04:purple->cyan", "cc-078-b1-05:yellow->green", "cc-078-b2-05:purple->blue"], exploredStates: 20, minimumDrags: 19, clearLoad: 19, repositionOverhead: 0, gridSteps: 50, turns: 3 }],
  [80, { exit: [], blocks: ["cc-piece-06:green->blue", "cc-piece-15:purple->blue"], exploredStates: 52, minimumDrags: 21, clearLoad: 16, repositionOverhead: 5, gridSteps: 80, turns: 14 }],
  [88, { exit: [], blocks: ["strategy-guard-s1-02:purple->blue", "cc-piece-s1-03:blue->cyan", "strategy-guard-s1-13:cyan->orange", "strategy-guard-s1-25:orange->purple"], exploredStates: 547, minimumDrags: 48, clearLoad: 34, repositionOverhead: 14, gridSteps: 185, turns: 31 }],
  [96, { exit: [], blocks: ["cc-piece-03:blue->cyan", "strategy-guard-04:blue->red", "cc-piece-05:blue->pink", "cc-piece-09:blue->yellow", "cc-piece-12:blue->orange", "strategy-guard-13:blue->yellow", "cc-piece-16:blue->red", "cc-piece-27:red->purple"], exploredStates: 319, minimumDrags: 36, clearLoad: 32, repositionOverhead: 4, gridSteps: 119, turns: 9 }],
  [98, { exit: [], blocks: ["cc-098-b1-03:pink->blue"], exploredStates: 23, minimumDrags: 22, clearLoad: 22, repositionOverhead: 0, gridSteps: 129, turns: 18 }],
  [40, { exit: ["vp-040-gate-03:blue->pink"], blocks: ["cc-040-b1-06:orange->pink", "cc-040-b2-02:green->cyan"], exploredStates: 6_605, minimumDrags: 33, clearLoad: 19, repositionOverhead: 14, gridSteps: 98, turns: 14 }],
  [27, { exit: [], blocks: ["cc-027-b1-03:blue->cyan", "cc-027-b1-07:cyan->blue"], exploredStates: 5_174, minimumDrags: 30, clearLoad: 18, repositionOverhead: 12, gridSteps: 178, turns: 39 }],
  [31, { exit: [], blocks: ["cc-031-b1-13:orange->red", "cc-031-b1-17:orange->pink"], exploredStates: 5_258, minimumDrags: 28, clearLoad: 18, repositionOverhead: 10, gridSteps: 92, turns: 19 }],
  [52, { exit: [], blocks: ["cc-052-b1-01:red->blue", "cc-052-b1-03:red->blue", "cc-052-b1-04:yellow->red", "cc-052-b1-16:pink->blue"], exploredStates: 4_045, minimumDrags: 35, clearLoad: 19, repositionOverhead: 16, gridSteps: 106, turns: 13 }],
  [61, { exit: [], blocks: ["cc-piece-s1-09:green->blue", "cc-piece-s1-11:green->cyan"], exploredStates: 51, minimumDrags: 21, clearLoad: 19, repositionOverhead: 2, gridSteps: 43, turns: 5 }],
  [22, { exit: [], blocks: ["cc-piece-s1-03:pink->blue", "cc-piece-s1-07:yellow->blue", "cc-piece-s1-09:blue->pink", "cc-piece-s1-10:blue->pink", "cc-piece-s1-15:pink->yellow"], exploredStates: 54, minimumDrags: 37, clearLoad: 29, repositionOverhead: 8, gridSteps: 140, turns: 23 }],
  [54, { exit: [], blocks: ["cc-054-b1-04:pink->blue", "cc-054-b1-06:blue->pink", "cc-054-b1-07:green->red", "cc-054-b1-09:red->green"], exploredStates: 62, minimumDrags: 28, clearLoad: 25, repositionOverhead: 3, gridSteps: 111, turns: 22 }],
  [59, { exit: [], blocks: ["cc-059-b1-01:green->blue", "cc-059-b1-02:red->blue", "cc-059-b1-05:red->blue", "cc-059-b1-09:blue->green", "cc-059-b1-10:blue->red", "cc-059-b1-15:blue->red"], exploredStates: 483, minimumDrags: 30, clearLoad: 25, repositionOverhead: 5, gridSteps: 107, turns: 15 }],
  [69, { exit: [], blocks: ["cc-069-b1-02:red->blue", "cc-069-b1-09:blue->red"], exploredStates: 570, minimumDrags: 34, clearLoad: 31, repositionOverhead: 3, gridSteps: 129, turns: 25 }],
  [74, { exit: [], blocks: ["cc-074-b1-05:red->cyan", "cc-074-b1-06:red->orange", "cc-074-b1-07:orange->red", "cc-074-b1-10:cyan->red"], exploredStates: 96, minimumDrags: 37, clearLoad: 31, repositionOverhead: 6, gridSteps: 143, turns: 25 }],
  [77, { exit: [], blocks: ["cc-077-b1-02:red->orange", "cc-077-b1-03:green->red", "cc-077-b1-06:red->cyan", "cc-077-b1-08:cyan->red", "cc-077-b1-12:red->green", "cc-077-b1-17:orange->red"], exploredStates: 236, minimumDrags: 34, clearLoad: 25, repositionOverhead: 9, gridSteps: 141, turns: 32 }],
  [84, { exit: [], blocks: ["cc-084-b1-02:pink->blue", "cc-084-b1-04:blue->orange", "cc-084-b1-06:blue->pink", "cc-084-b1-07:yellow->blue", "cc-084-b1-11:orange->blue", "cc-084-b1-12:blue->yellow"], exploredStates: 110, minimumDrags: 40, clearLoad: 35, repositionOverhead: 5, gridSteps: 207, turns: 55 }],
  [89, { exit: [], blocks: ["cc-089-b1-01:orange->blue", "cc-089-b1-09:blue->orange"], exploredStates: 47, minimumDrags: 30, clearLoad: 27, repositionOverhead: 3, gridSteps: 67, turns: 7 }],
  [72, { exit: [], blocks: ["cc-072-b1-04:orange->blue", "cc-072-b1-11:blue->orange"], exploredStates: 62, minimumDrags: 20, clearLoad: 19, repositionOverhead: 1, gridSteps: 60, turns: 6 }],
  [94, { exit: [], blocks: ["cc-094-b1-01:yellow->pink", "cc-094-b1-04:pink->cyan", "cc-094-b1-11:pink->yellow", "cc-094-b1-12:cyan->pink"], exploredStates: 35, minimumDrags: 32, clearLoad: 30, repositionOverhead: 2, gridSteps: 109, turns: 20 }],
]);
const TARGET_SHA256 = new Map<number, string>([
  [2, "AADFC288FBF5586A44667E1F88E9779AAAB6BEBABE8A4CE56826FBC1E19D3DF3"],
  [3, "85C1335DDC0C7C825415D0EEB2CD96CCE18B7AF4F4191B3745A2E7475E50526A"],
  [4, "428DC15F9CED75D6E50B50259CEA89912F4D1407CC09B9677DD31C48F6DB6620"],
  [6, "E6519AFA26843B9795E28444B12506C1DFAC66AE4D75FEDB664EFBA9BCF025F0"],
  [7, "BB5CB270EBBA523CC7BBE5E82672F3A88849233D7C35C512E594D7F388643726"],
  [9, "C73DC4E01CB74D965DA36B8AB9C94B56B5BF462816CC40621156F25098DF060C"],
  [12, "81A431D5759BBED71CFE8D440F30E31B1E2C094A948AC857C502CD777C21CCD6"],
  [16, "CE35685262EBB5231FF4A9E4F67C9A21D5D338F91BAE5EED9443CF6CD5870AB4"],
  [21, "2733B56A06DD1A2B5C785FA2B6A6B65EF35F07E5715D2E3AD92EF5FE653A4B07"],
  [23, "4ABC2009DBD5DE8B4B3DC1BB6B2407A8BD6B48E37B47DD72378C5CF8FD13BF5F"],
  [33, "6D65A78D7643105EAF0D6B04985E22F2C02D70B4523992951EF1506E5971D94B"],
  [46, "4D6BC6F3556911F2083986EFDF8B0823B8D0BB07A5855BCCF72A6A41C1F6E6CC"],
  [53, "64F9D39374C30089C307AF398CBFA833038640118726ADF88FFCCBDF2A5475DE"],
  [85, "AE3D85B2AC4A641E478700DCCF16F2495BFB0BDB15CA7BAE4BA30771856DFB0F"],
  [100, "6F84816877AA2B924E70D3BD8EDC4F8B4BF4CB53F325D66ACA3A65EA3BEFF646"],
  [36, "2CAB37E69BB39F34CF350E488571A3DB0BE5483762EF2134C6942584BD1BDE20"],
  [41, "8A2F4F3F41E5026C49D69571DE1A1C65D5D5ACD9A32A6BB66399000D0BC8D57F"],
  [43, "BB2FBA8E1E661F6BFEB2697F11F34A53FC9770454651E7A9C4DC62976228127B"],
  [49, "4842B659C248C77C25C45135F2274D3A37838128E361CD93189438C054243E25"],
  [55, "053E1CA49BB0C3D393F9C7643B6F825D3DFE3A641C0492ECFF1ADB9601048FC3"],
  [57, "89C9A86C7312C123F811E1E75EE10B84F045D5620F6955FAAB7FC8D0C9926E30"],
  [62, "0CB4A84A330FD7EF19EBE70030A92E3233385A0F41EECAF180301927070D56EF"],
  [63, "468891F026884B5B75711D57C8BFEDB8A9CF7EE23183F15B2B12383D3708F6C6"],
  [66, "A6A18D8862E0D859EB50694C1E1B1C9068E0EBB5D81701ECAC9F3F3FD4819B48"],
  [67, "9AC560F9E1950C3EF04F761050EB4E8DE79B7D5949ED055A6148FB1F8F67CD95"],
  [78, "E552DD30795D94C9D5A92AC16AAAA585E633748411EE07047FE2EB35090B2CBC"],
  [80, "B031E50D293730764DF9C7C33795962893A6840811E0BEC8F2A628A80859D780"],
  [88, "F185D72F69B510C6F1AA8EACC98ED12DC796A971BA247DBD9CA00C2EEC195110"],
  [96, "DEB7BC5930FD6F8E5F8E1D05214C7353D8329F993D22C84ED02611B20274303C"],
  [98, "FA3BA929663C1D93AF590DAD1530EC72E196B97B9163C49D26B6C99A31F05F95"],
  [40, "B334545EB829D7D4001DF709FE3753CFEB232A436622443091CA01AD6A37541D"],
  [27, "B14D06AF124CE37244F6725448FB7448DBC0C3B3146ACD7B9ADFD3152430ECC3"],
  [31, "C2C8DD0E74AC2E12ED650A562DC8D7A44C216E07087BBE067B5A4110DFCF0DEE"],
  [52, "CB12C8A6EC508ED23FA70ADA371EE2CF201804E918D78C5D7762A538394D4D0F"],
  [61, "6579EE6A03B4A90B9855C015A226668E3E4B890617904FA3C364ADE4188BADE6"],
  [22, "93DA6E5DF1E8C933988F8C0DCE8697EF2F61475A010658CE386230F7671ACD4E"],
  [54, "25AF8463FEB95D89E6DB7FC66ECB086CED0431E787DB2F1ABA4A67122355D818"],
  [59, "0444C693E8090FCE0E9D34EDDBF03C232E622B94CEC390063903EF32CFD889DE"],
  [69, "6AD12B4C4A7D8B0D467BF1FE536D82C7449FCF4BFCA6669A9938DC2AD5A94220"],
  [74, "ED5760ED71C410BA9F79B52333E80E0EA78D508AE50ECC1CE50F72337CFD7D7D"],
  [77, "F8BB23238867FCADF9502EE62455A255A02D5038A2A0C8EC80EE1787B65225EF"],
  [84, "4F17E9D6F4CD039D0605FE48CF6D27F3C931072E42CFC8689202D692A18E2098"],
  [89, "EB91F0DC377876F716DBDF659F7FE3CDC282F0C0DBD033609C2874C043C2169E"],
  [72, "1C189149CC853754819060EA1A47C25D704176F768A9B0DA1A85CD4FC7ABAB62"],
  [94, "C0A862CB754604D44E052BD5E23E7471515600FB1183BE90B58C53C9CF0040D5"],
]);
const EVIDENCE_TARGET_SHA256 = new Map<number, string>([
  [36, "D83EF3D76405FC599C673478440B56B46F43C5F6B95CD0FD3E777E2D6615CDC3"],
  [41, "5666F4BA1A7BE6C407D02DF2A4A3B54BAB65EC3AE705395A4DAAB6E13A19C19A"],
  [43, "DE919E8676807C251CC26DA80FBC90CCE74C0AE7842944B08380E7B67AAA60BB"],
  [49, "943EE11A357E6F1E6B3E8559A5ED3800A40D69F7B0968342FA76E48F2C0F90EC"],
  [57, "0FE6AB557882112B313123786E98FB002374FB42AE801F67152C7857AF6F95FC"],
  [62, "9C152323B9849AA04F4B41305F73BBE66A47DFC66A7AE88DE274C4F04BBA79D3"],
  [88, "BA8B9AC748293D9846F011FDB917C86939CB0A37E088B19990DCC3864550D840"],
  [27, "B14D06AF124CE37244F6725448FB7448DBC0C3B3146ACD7B9ADFD3152430ECC3"],
  [31, "C2C8DD0E74AC2E12ED650A562DC8D7A44C216E07087BBE067B5A4110DFCF0DEE"],
  [52, "CB12C8A6EC508ED23FA70ADA371EE2CF201804E918D78C5D7762A538394D4D0F"],
  [61, "6579EE6A03B4A90B9855C015A226668E3E4B890617904FA3C364ADE4188BADE6"],
  [22, "93DA6E5DF1E8C933988F8C0DCE8697EF2F61475A010658CE386230F7671ACD4E"],
  [54, "25AF8463FEB95D89E6DB7FC66ECB086CED0431E787DB2F1ABA4A67122355D818"],
  [59, "0444C693E8090FCE0E9D34EDDBF03C232E622B94CEC390063903EF32CFD889DE"],
  [69, "6AD12B4C4A7D8B0D467BF1FE536D82C7449FCF4BFCA6669A9938DC2AD5A94220"],
  [74, "ED5760ED71C410BA9F79B52333E80E0EA78D508AE50ECC1CE50F72337CFD7D7D"],
  [77, "A6398EAA841DDEBBBAA8FC303903F003A2045E44E8CDCC320DE79FD2953F6A07"],
  [84, "4F17E9D6F4CD039D0605FE48CF6D27F3C931072E42CFC8689202D692A18E2098"],
  [89, "B60BE577B7A4FBC7F9AD4770986B102A3031586DA6616FBE9051633B1595778D"],
  [72, "1C189149CC853754819060EA1A47C25D704176F768A9B0DA1A85CD4FC7ABAB62"],
  [94, "C0A862CB754604D44E052BD5E23E7471515600FB1183BE90B58C53C9CF0040D5"],
]);

const openingComponentMaximum = (level: NonNullable<(typeof LEVELS)[number]>): number => {
  const closedShutterIds = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  const hidden = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...level.blocks
      .filter((block) => block.shutterId && closedShutterIds.has(block.shutterId))
      .map((block) => block.id),
  ]);
  const blocks = level.blocks.filter((block) => !hidden.has(block.id));
  const cells = new Map(blocks.map((block) => [block.id, block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)]));
  const contacts = new Map(blocks.map(({ id }) => [id, new Set<string>()]));
  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const left = blocks[leftIndex];
      const right = blocks[rightIndex];
      if ((left.layers?.[0] ?? left.color) !== (right.layers?.[0] ?? right.color)) continue;
      const touches = cells.get(left.id)!.some(([leftX, leftY]) => cells.get(right.id)!.some(
        ([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1,
      ));
      if (!touches) continue;
      contacts.get(left.id)!.add(right.id);
      contacts.get(right.id)!.add(left.id);
    }
  }
  const unseen = new Set(blocks.map(({ id }) => id));
  let maximum = 0;
  while (unseen.size) {
    const first = unseen.values().next().value!;
    unseen.delete(first);
    const queue = [first];
    let size = 0;
    while (queue.length) {
      const id = queue.shift()!;
      size += 1;
      for (const next of contacts.get(id)!) if (unseen.delete(next)) queue.push(next);
    }
    maximum = Math.max(maximum, size);
  }
  return maximum;
};

const repairById = new Map<number, JsonRecord>((AUDIT.auto_recolor_runtime_repairs as JsonRecord[])
  .map((repair) => [repair.level_id, repair]));

describe("solver-certified exit auto-recolour and opening cluster repairs", () => {
  it("publishes only the declared colour patches with strict source/evidence preflights", () => {
    expect(AUDIT.summary.auto_recolor_runtime_repair_level_ids).toEqual(REPAIR_IDS);
    expect([...repairById.keys()]).toEqual(REPAIR_IDS);
    for (const levelId of REPAIR_IDS) {
      const level = LEVELS.find(({ id }) => id === levelId)!;
      const repair = repairById.get(levelId)!;
      const expected = EXPECTED.get(levelId)!;
      expect(() => validateLevel(level)).not.toThrow();
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(new Set(exits.map(({ color }) => color)).size).toBe(exits.length);
      expect(openingComponentMaximum(level)).toBeLessThanOrEqual(2);
      expect(repair).toMatchObject({
        level_id: levelId,
        source_record_preflight_passed: true,
        atomic_application_order: levelId === 100
          ? ["exit_colours", "opening_block_colour_swaps_or_cycles", "minimum_mechanism_counter_relaxation"]
          : ["exit_colours", "opening_block_colour_swaps_or_cycles"],
        exit_colors_unique: true,
        opening_same_color_component_maximum: 2,
        declared_only_mutation_check_passed: true,
        solver_and_replay: {
          termination: "solved",
          max_states: 20_000,
          explored_states: expected.exploredStates,
          minimum_drags: expected.minimumDrags,
        },
      });
      if (repair.opening_visible_color_counts_preserved) {
        expect(repair.opening_visible_color_counts_after).toEqual(repair.opening_visible_color_counts_before);
      } else {
        expect(repair.opening_visible_color_counts_after).not.toEqual(repair.opening_visible_color_counts_before);
      }
      if (repair.every_exit_color_represented_in_opening !== null) {
        expect(repair.every_exit_color_represented_in_opening).toBe(true);
      }
      expect(repair.multilayer_outer_inner_colors_differ).toBe(true);
      expect(repair.preserved_fields).toHaveLength(4);
      expect(repair.evidence).toHaveLength(
        levelId === 100 || CLUSTER_SWAP_BATCH_ID_SET.has(levelId) ? 2 : 1,
      );
      expect(repair.exit_patches.map((patch: JsonRecord) => `${patch.entityId}:${patch.sourceColor}->${patch.targetColor}`)).toEqual(expected.exit);
      expect(repair.block_color_patches.map((patch: JsonRecord) => `${patch.blockId}:${patch.sourceColor}->${patch.targetColor}`)).toEqual(expected.blocks);
      expect(repair.counter_patches.map((patch: JsonRecord) => `${patch.entityId}.${patch.field}:${patch.sourceValue}->${patch.targetValue}`)).toEqual(expected.counter ?? []);
      if (TARGET_SHA256.has(levelId)) {
        expect(repair.target_record_sha256_verified).toBe(true);
        expect(repair.target_level_spec_sha256).toBe(TARGET_SHA256.get(levelId));
      } else {
        expect(repair.target_record_sha256_verified).toBe(false);
      }
      if (EVIDENCE_TARGET_SHA256.has(levelId)) {
        expect(repair.evidence_target_semantic_sha256).toBe(EVIDENCE_TARGET_SHA256.get(levelId));
        expect(repair.evidence_target_semantic_sha256_verified).toBe(true);
      }
      if (levelId === 53) {
        const shell = level.blocks.find(({ id }) => id === "cc-053-b1-05")!;
        expect(shell.color).toBe("blue");
        expect(shell.layers).toEqual(["blue", "purple"]);
        expect(repair.block_color_patches[0]).toMatchObject({
          sourceLayers: ["pink", "purple"],
          targetLayers: ["blue", "purple"],
        });
      }
      if (levelId === 2) {
        expect(repair).toMatchObject({
          authored_source_level_id: 5,
          campaign_source_level_spec_sha256: "B1784568D094DCC62967B02254A8748C10220970A15925464068869312809944",
          campaign_target_level_spec_sha256: "C8189C227817D85BAB718C6530529D262D35A7DCC113B0A17CDDF7DCD1E4BD5E",
        });
      } else {
        expect(repair.authored_source_level_id).toBe(levelId);
      }
      const clusterSwapRecord = clusterSwapBatchById.get(levelId);
      if (clusterSwapRecord) {
        const batchContract = clusterSwapBatchContractById.get(levelId)!;
        expect(repair).toMatchObject({
          level_spec_sha256_normalization: "canonical-json",
          campaign_source_level_spec_sha256: clusterSwapRecord.source_level_spec_sha256,
          campaign_target_level_spec_sha256: clusterSwapRecord.target_level_spec_sha256,
          evidence_target_semantic_sha256: clusterSwapRecord.target_level_spec_sha256,
          evidence_target_semantic_sha256_verified: true,
          opening_visible_color_counts_before: clusterSwapRecord.opening_visible_color_counts_before,
          opening_visible_color_counts_after: clusterSwapRecord.opening_visible_color_counts_after,
          opening_visible_color_counts_preserved: true,
          evidence_record: {
            schema: batchContract.schema,
            source_level_spec_sha256: clusterSwapRecord.source_level_spec_sha256,
            target_level_spec_sha256: clusterSwapRecord.target_level_spec_sha256,
          },
          evidence: batchContract.evidence,
        });
        expect(repair.solver_and_replay.route).toEqual(clusterSwapRecord.route);
        expect(repair.block_color_patches).toHaveLength(clusterSwapRecord.changed_block_count);
        const targetBlocks = new Map<string, JsonRecord>((clusterSwapRecord.target_level.blocks as JsonRecord[])
          .map((block) => [block.id, block]));
        for (const patch of clusterSwapRecord.block_color_patches as JsonRecord[]) {
          const runtimeBlock = level.blocks.find(({ id }) => id === patch.id)!;
          const targetBlock = targetBlocks.get(patch.id)!;
          expect(runtimeBlock.color, `${levelId}/${patch.id} outer body`).toBe(patch.to);
          expect(runtimeBlock.layers?.[0] ?? runtimeBlock.color, `${levelId}/${patch.id} visible outer`).toBe(patch.to);
          expect(runtimeBlock.layers?.slice(1) ?? [], `${levelId}/${patch.id} inner layers`).toEqual(
            targetBlock.layers?.slice(1) ?? [],
          );
        }
      }
      if (levelId === 100) {
        expect(level.gates.find(({ id }) => id === "vp-100-gate-03")?.frozen).toBe(2);
        expect(repair.minimal_counter_relaxation).toMatchObject({
          kind: "single_frozen_counter_decrement",
          entity_id: "vp-100-gate-03",
          source_value: 3,
          target_value: 2,
          changed_counter_count: 1,
          absolute_delta: 1,
        });
        expect(repair.minimal_counter_relaxation.necessity).toHaveLength(4);
        expect(repair.minimal_counter_relaxation.minimality).toContain("one-step relaxation");
      } else {
        expect(repair.minimal_counter_relaxation).toBeNull();
      }
    }
  });

  it("fresh-solves and replays every repaired level through PuzzleModel", () => {
    for (const levelId of REPAIR_IDS) {
      const level = LEVELS.find(({ id }) => id === levelId)!;
      const expected = EXPECTED.get(levelId)!;
      const result = solveLevelForValidation(level, 20_000);
      expect(result).toMatchObject({
        solved: true,
        termination: "solved",
        unsupportedReasons: [],
        staticUnsatReasons: [],
        exploredStates: expected.exploredStates,
        minimumDrags: expected.minimumDrags,
        clearLoad: expected.clearLoad,
        repositionOverhead: expected.repositionOverhead,
        gridSteps: expected.gridSteps,
        turns: expected.turns,
      });
      const clusterSwapRecord = clusterSwapBatchById.get(levelId);
      if (clusterSwapRecord) {
        expect(result.drags).toEqual(clusterSwapRecord.route);
        expect(repairById.get(levelId)!.solver_and_replay.route).toEqual(clusterSwapRecord.route);
      }
      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [], moves: expected.minimumDrags });
    }
  }, 90_000);
});
