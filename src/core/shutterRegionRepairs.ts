import { isOrdinaryShutter } from "./shutterCoverage";
import type { BlockColor, BlockSpec, LevelSpec, Point, Side, ShutterSpec } from "./types";

export const SHUTTER_REGION_REPAIR_VERSION = "source-panel-staging-r1" as const;

type PackedRepair = readonly [blocks: string, gates: string, panels: string, axes?: string];

/** x,y,count(base36×2) per source block; gate chunks are color/side/offset/size/star. */
const REPAIRS: Readonly<Record<number, PackedRepair>> = {
  27: ["3000520038035204380052053006380752083009300a310b300c300d300e310f300g380h", "gt330br210cb330pr010ur110", "090039"],
  28: ["000b300c08003800300d0603000e08040600000f06050706300g000h060736080609300i080a", "ot030bt330rb030yb330pl620ul810", "030363070063"],
  40: ["2500450044030304050004052406030744082509550a040b540c030d030e240f050g550h240i", "ub220ob410bl310gb020pl410cb510", "040063"],
  41: ["000a0800290j280k300b0400290l080m5403300c6400000d6404300e0705270n300f000g4406270o280p300h040708084409000i", "ot030bb020yb220ut330pl420rr420", "0800740e1654"],
  44: ["00003000370b50030004570c070d00055000370e300650070008080f5009300a", "pt030yt320cb320bl020ot520ub520rb030", "060712061613062534065613066712"],
  46: ["000g500l500m380705000600500n2003000h08085809000i05042000000j500o390a080b580c500p390d080e000k390f05052006500q", "ut020yt520pb320bl510rl610ot230cb030gb520", "0407730900250e5025"],
  48: ["2000400000030200400400050006600720080209020a020b500c020d400e000f020g000h200i200j", "ut220ot420cl020gl220bt020rr020", "0d0574"],
  49: ["4800080067030500080465052906290748082809550a050b480c080d670e480f650g280h050i070j050k650l070m280n070o080p670q670r670s290t080u670v280w490x080y050z271007110512051365144915", "rb430ob020gr720bl520yr520ub220pl720", "0j00250j20330j5025"],
  54: ["24000005630e550f0303030000060007600g00080304500h0009500i530j600k000a000b000c450l650m0600500n530o000d", "ul030pl330rt020gr030yr320br520", "0500430807430d40370l4733"],
  55: ["0000030004030500300430050406000700080509000a050b030c000d040e030f000g050h400i", "ct030gl310rl410yl510ot330pl030ur010", "080672"],
  57: ["080e0000280f280g0003280h200803040005280i070j20090100470k0006270l0300270m400a400b0007400c280n400d", "bb020yt020gb220ct220rl310ul120ob420pt430", "0620530c0574"],
  61: ["0300080004030500270406054706030707080509270a070b040c040d050e030f030g270h480i", "rl310bb020ul410ol510cb220pl610gb420yl710", "040063"],
  62: ["000000013600400000020403370404054006370700080109400a070b070c370d400e000f050g000h000i010j", "pt040ob030bl010yl130cb330ut420gl420", "041342"],
  68: ["5003000400055206620703000208600900001200000a000b000c000d000e520f600g000h020i", "bl020or020pl220rr220yt020", "0a0674"],
  69: ["090m00070301500i4300090n00080009080o000a63020303000b03000304000c000d000e600j000f6305080p2300400k600l5306000g000h", "bl030or030ut030rb030cl320gr320", "0646340900330a30430i0644"],
  71: ["6307080000085009030a030b600m500c000n0500000d000e000o000f08040400500p400g500h000i44000905000j000k000l0806", "gl030or030pt030rb030yl330br310", "0c0074"],
  72: ["06035604000530000006530d0300530e0307400f0008430g00000b09000a530h030b000c500i", "bl030cr030gl330ur330ot020pb020rl620yr620", "074034"],
  74: ["3903030o09043905550c630609070908380d0909030p380e070j0900650f380g070k3900370h030q070l390a070m530b380r070n3500380i", "cr530pl730rb030yb330gl320or320", "0n00340i30430a0534063742"],
  79: ["0a0k000303040505600h0b0l05060007000805000a0m03090b0n000a000b090o730i0a0p850j000c35000b0q0b0r0a0s0b0t03000a0u0b0v0b0w030d000e030f0b0x0a0y000g", "bl030gr030pt030yb030ol320ur320rl520cr510", "0a50460k0894", "av"],
  84: ["50035004030509065000060750080309500n030a500o1800090b490c080l080d470m070e480f480g060h500p0600500i030j030k", "bt520ob030pl630ub430rl330yr820cr420", "0f00330o30230q5123064434"],
  89: ["00035004090j090k550l60055300090m00000006090n030f0200550o070p600760080009030g0300030h000a650q000b000c030i000d", "bl030gr030ot030ub030yl330pr320rr520", "0704720c0674", "ev"],
  91: ["0803000463050006600l030700086309000a500m080b000c0000000d030e030f000g0300060h6300600n000i300o000j300p000k500q", "bl030cr030gt030pb030ul330rr330ot320", "0a3043083434"],
  94: ["6303000h0308600q000i000j5309630009040905030a63060500530b000k0600030c530d000l000m500r030e0707000n000o530f400s000p530g500t", "bl030cr030gt030ub030yl330pr320", "0g00330k3043080362054534"],
  98: ["0303090400050006700f500g0a07630h00082909000a0300290b090c000d600i30000000000e", "bl030rr030yt030cb020gl320or320pb220", "0951350e5634"],
  99: ["6009030a000b0903000c200d500e000f630g0904000h04000905000i630j00000906000k530l030m630n0907000o0908500p0700", "bl030gr030ct020ub020rl320yr320pt210", "030113031054036113"],
  107: ["000000011000000200033000400452054006000700085009000a060b500c070d000e000f", "gl030cr020pt020ub020yr220", "070563"],
  116: ["000020000301400005027003000436050006030700082409340944095409030d700e030f060g300h000i", "bt030cb030gl030or030rt330pb320ul320", "092444"],
  117: ["200040006000210041006100710002001200220032004200520072000300000a200a300a500a700a510a", "gl010or010cr110rt020yl110ul220pr210", "0a0484"],
  127: ["050040016500350000020703000400050006600707080009000a600b000c", "bl030or030pt030rb030", "0e00350c3045"],
  130: ["000060000100000120020203270420050006200700080709200a270b000c700d200e000f070g020h", "bt020cb020gl020or020rt220ub210yl210", "0k2044"],
  158: ["030000000000030100026003630403050006600763080309000a030b630c600d630e600f630g030h", "cl030yr030pl310ur310", "062033072833"],
};

export const SHUTTER_REGION_REPAIR_LEVEL_IDS = Object.freeze(
  Object.keys(REPAIRS).map(Number),
);

const COLOR: Readonly<Record<string, BlockColor>> = {
  r: "red", o: "orange", y: "yellow", g: "green",
  b: "blue", u: "purple", p: "pink", c: "cyan",
};
const SIDE: Readonly<Record<string, Side>> = { t: "top", b: "bottom", l: "left", r: "right" };
const n = (value: string): number => Number.parseInt(value, 36);
const normalize = (shape: readonly Point[]): Point[] => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY] as const);
};

type Extra = readonly [id: string, x: number, y: number, shape: Point[], color: BlockColor, count: number];
const L: Point[][] = [
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]],
];
const CROSS: Point[] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
const EXTRAS: Readonly<Record<number, readonly Extra[]>> = {
  130: [
    ["sr130-a", 6, 0, L[0]!, "orange", 18], ["sr130-b", 0, 6, L[1]!, "cyan", 19],
    ["sr130-c", 2, 0, [[0, 0], [1, 0], [0, 1], [1, 1]], "red", 20],
    ["sr130-d", 0, 0, L[2]!, "green", 21], ["sr130-e", 0, 0, L[3]!, "blue", 22],
  ],
  158: [
    ["sr158-a", 2, 0, CROSS, "cyan", 6], ["sr158-b", 2, 8, CROSS, "yellow", 7],
  ],
};

// x,y per generator. These five source queues need a new spawn cell after the
// panel repair; every queue remains complete. Lv41 also needs a safe queue order.
const GENERATOR_SPAWNS: Readonly<Record<number, string>> = {
  41: "1405", 46: "2134", 49: "2323", 57: "02", 71: "26",
};
const LV41_GENERATOR_QUEUES = [
  ["cc-041-b2-02", "cc-041-b2-03", "cc-041-b2-01"],
  ["cc-041-b3-03", "cc-041-b3-01", "cc-041-b3-02"],
] as const;
// Bit 1=frozen, 2=lock, 4=axis. Only these exact source fields conflict with
// the repaired geometry; every other ice, lock and axis field is retained.
const BLOCK_METADATA_DROP: Readonly<Record<string, number>> = {
  "41:cc-041-b1-02": 1, "41:cc-041-b2-02": 1,
  "55:strategy-guard-s1-05": 1, "55:strategy-guard-s1-14": 4,
  "61:strategy-guard-s1-07": 4,
  "72:cc-072-b1-04": 1, "72:cc-072-b1-07": 1,
  "84:cc-084-b1-05": 2,
  "89:cc-089-b1-01": 1,
  "91:cc-091-b2-01": 4,
  "94:cc-094-b1-08": 2,
  "99:cc-099-b1-09": 4,
  "107:lv107-opening-b02": 2, "107:lv107-opening-b03": 2, "107:lv107-opening-b04": 2,
  "130:lv130-opening-b02": 2,
};

export const applyShutterRegionRepair = (level: LevelSpec): LevelSpec => {
  const packed = REPAIRS[level.id];
  if (!packed) return level;
  const [blockPlan, gatePlan, panelPlan, axisPlan = ""] = packed;
  if (blockPlan.length !== level.blocks.length * 4) {
    throw new Error(`Lv${level.id} shutter repair block order drifted`);
  }
  const axes = new Map<number, BlockSpec["movementAxis"]>();
  for (let index = 0; index < axisPlan.length; index += 2) {
    axes.set(n(axisPlan[index]!), axisPlan[index + 1] === "v" ? "vertical" : "horizontal");
  }
  const generatorQueueIds = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const stages: ShutterSpec[] = [];
  const blocks = level.blocks.map((block, index): BlockSpec => {
    const at = index * 4;
    const count = generatorQueueIds.has(block.id) ? 0 : n(blockPlan.slice(at + 2, at + 4));
    const stageId = `sr-${level.id}-${index}`;
    const metadataDrop = BLOCK_METADATA_DROP[`${level.id}:${block.id}`] ?? 0;
    const {
      frozen: _frozen, lockedBy: _lockedBy, lockCount: _lockCount,
      movementAxis: _movementAxis, shutterId: _shutterId, ...rest
    } = block;
    if (count > 0) stages.push({ id: stageId, x: 0, y: 0, width: 1, height: 1, count, skin: "staging" });
    return {
      ...rest,
      x: n(blockPlan[at]!),
      y: n(blockPlan[at + 1]!),
      shape: normalize(block.shape),
      ...(count > 0 ? { shutterId: stageId } : {}),
      ...(!(metadataDrop & 1) && _frozen ? { frozen: _frozen } : {}),
      ...(!(metadataDrop & 2) && _lockedBy ? { lockedBy: _lockedBy } : {}),
      ...(!(metadataDrop & 2) && _lockCount ? { lockCount: _lockCount } : {}),
      ...(axes.has(index)
        ? { movementAxis: axes.get(index) }
        : (!(metadataDrop & 4) && _movementAxis ? { movementAxis: _movementAxis } : {})),
    };
  });
  for (const [id, x, y, shape, color, count] of EXTRAS[level.id] ?? []) {
    const stageId = `sr-${level.id}-${id}`;
    blocks.push({ id, x, y, shape, color, shutterId: stageId });
    stages.push({ id: stageId, x: 0, y: 0, width: 1, height: 1, count, skin: "staging" });
  }

  const gates: LevelSpec["gates"] = [];
  for (let at = 0; at < gatePlan.length; at += 5) {
    const color = COLOR[gatePlan[at]!]!;
    gates.push({
      id: `sr-gate-${level.id}-${color}`,
      color,
      side: SIDE[gatePlan[at + 1]!]!,
      offset: n(gatePlan[at + 2]!),
      size: n(gatePlan[at + 3]!),
      ...(gatePlan[at + 4] === "1" ? { star: true } : {}),
    });
  }

  const ordinary = (level.shutters ?? []).filter(isOrdinaryShutter);
  if (panelPlan.length !== ordinary.length * 6) {
    throw new Error(`Lv${level.id} shutter repair panel order drifted`);
  }
  const panels = ordinary.map((shutter, index): ShutterSpec => {
    const at = index * 6;
    return {
      ...shutter,
      count: n(panelPlan.slice(at, at + 2)),
      x: n(panelPlan[at + 2]!), y: n(panelPlan[at + 3]!),
      width: n(panelPlan[at + 4]!), height: n(panelPlan[at + 5]!),
      skin: "shutter",
    };
  });
  const spawnPlan = GENERATOR_SPAWNS[level.id];
  if (spawnPlan && spawnPlan.length !== (level.generators?.length ?? 0) * 2) {
    throw new Error(`Lv${level.id} shutter repair generator order drifted`);
  }
  const generators = level.generators?.map((generator, index) => {
    const queueBlockIds = level.id === 41
      ? [...LV41_GENERATOR_QUEUES[index]!]
      : [...generator.queueBlockIds];
    const at = index * 2;
    return {
      ...generator,
      queueBlockIds,
      ...(spawnPlan ? { spawn: [n(spawnPlan[at]!), n(spawnPlan[at + 1]!)] as Point } : {}),
    };
  });
  const repairedPlayable = level.id === 158 || !level.playable?.length
    ? undefined
    : (() => {
      const cells = new Map(level.playable.map((point) => [`${point[0]},${point[1]}`, point]));
      const add = (x: number, y: number) => cells.set(`${x},${y}`, [x, y]);
      for (const block of blocks) for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy);
      for (const panel of panels) {
        for (let y = panel.y; y < panel.y + panel.height; y += 1) {
          for (let x = panel.x; x < panel.x + panel.width; x += 1) add(x, y);
        }
      }
      for (const gate of gates) for (let step = 0; step < gate.size; step += 1) {
        add(
          gate.side === "left" ? 0 : gate.side === "right" ? level.width - 1 : gate.offset + step,
          gate.side === "top" ? 0 : gate.side === "bottom" ? level.height - 1 : gate.offset + step,
        );
      }
      for (const generator of generators ?? []) for (const blockId of generator.queueBlockIds) {
        const block = blocks.find(({ id }) => id === blockId)!;
        for (const [dx, dy] of block.shape) add(generator.spawn[0] + dx, generator.spawn[1] + dy);
      }
      return [...cells.values()];
    })();
  return {
    ...level,
    playable: repairedPlayable,
    blocked: undefined,
    generators,
    gates,
    blocks,
    shutters: [...panels, ...stages],
  };
};
