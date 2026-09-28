import type {
  FlipDoorSpec,
  GateSpec,
  GeneratorSpec,
  LevelSpec,
  Point,
  ShutterSpec,
} from "./types";

export const COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_VERSION = "competitor-certified-exact-geometry-r1" as const;

export const COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS = [
  72, 77, 79, 82, 92, 93, 95, 97,
  104, 115, 121, 125, 141, 144, 145, 146, 147, 148, 152, 155, 157, 158, 159,
  166, 167, 168, 169, 170, 171, 173, 174, 177, 178, 182, 184, 185, 186, 188, 192, 194, 197,
] as const;

/**
 * Packed contract tuple:
 * [width, height, row-bitsets, blockXY, gate(side/offset[/size]), shutter(index/XYWH),
 * generator(index/side/offset/spawnXY/anchorXY*2/quarterTurns), flip(index/side/offset/size)].
 * All scalar geometry is one base-36 character; mask rows are dot-separated base-36 bitsets.
 */
type Contract = readonly [number, number, string, string, string, string?, string?, string?];

const CONTRACTS: Readonly<Record<number, Contract>> = {
  72: [7, 13, "3j.3j.3j.34.34.3j.3j.3j.7.7.3j.3j.3j", "0656263044542025462a0009000b5350434051", "03220013303b3616", "04034"],
  77: [7, 9, "1t.3j.3j.3j.3j.3j.3j.2r.2r", "1107005123605362133116330225450457552141060003", "123315361025", undefined, "03100033"],
  79: [9, 12, "dj.dj.dj.dj.dj.dj.dj.0.e7.e7.e7.e7", "230525026610055673051003000073000a201b72110000200003200010037303000072", "3005120033393521", "05046108942001130011400115001160011700118001190011a0011b0011c0011d0011e0011f0011g0011h0011i0011j0011k0011l0011m0011n0011o0011p0011q0011"],
  82: [7, 9, "2o.3j.3j.3j.3j.3j.3j.3j.3j", "24131425340305321202431126014506314753", "2434311022053616"],
  92: [7, 12, "3j.3j.3j.3j.0.0.3j.3j.3j.3j.3j.3j", "000103100303030636524a5738575730394a3b473b3a4b680a4a2a4a4a", "100323163a33", "00011100112001130011400115001160011700118001190011a0011b0011c0011"],
  93: [8, 9, "6f.6f.6f.6f.6f.6f.6f.6f.6f", "00121077037561010763276407050360705071757307606174", "303711330517201635", "01411124112661135611"],
  95: [8, 11, "73.73.73.73.0.0.0.73.73.73.73", "0001070307070709071a027749784a207973737272727272627a58476062", "013132371a273317200612242130", "00011100112001130011400115001160011700118001190011a0011b0011c0011"],
  97: [7, 10, "3j.3j.3j.3j.0.0.3j.3j.3j.3j", "3332615137100657304307664159406253585228030810384600480219", "01112320170032043626"],
  104: [7, 10, "3j.3j.3j.3j.1q.1q.3j.3j.3j.3j", "080129665310300347075906506200504909676861", "173362042302382112241"],
  115: [5, 8, "l.l.l.0.0.l.l.l", "250005402045", "221001201041021241"],
  121: [6, 8, "1r.1r.1r.0.1r.1r.1r.1r", "1747002027450120174501201756012037560130275501", "153213022302"],
  125: [6, 7, "x.x.x.x.x.19.1r", "52365653024616042603352554060555", "211151241361221321301"],
  141: [8, 14, "73.73.73.73.73.73.1k.1k.1k.1k.73.73.73.73", "604c033b204050736b2b7a4d300b00207a1b705b107a1b61", "1a3013103243213"],
  144: [8, 10, "7.7.7.1r.1r.1r.73.73.73.73", "59290068040801672900790407017749", "223173312002372342262"],
  145: [7, 9, "3i.3i.3i.1q.1q.1q.3j.3j.3j", "306050301046234020602006575627", "223043363163013", "010111101131043"],
  146: [7, 11, "3j.3j.37.37.3j.3j.3j.2v.2v.3j.3j", "005909206440035061664a023a0406021051", "043163113323003142"],
  147: [7, 11, "3j.f.f.3j.3j.3j.f.f.3j.3j.3j", "2009580002063018685802052018685802", "353203023323243183", "00013"],
  148: [7, 11, "s.s.s.3j.3j.3j.3j.3j.3j.3j.3j", "09072063050403325624055758592a2807300664581a07", "203173133352372022", "120112201132011420115201162011720118201192011"],
  152: [6, 8, "c.1r.1r.1r.1r.1r.1r.c", "26434504412006220124020325", "152022332222", undefined, undefined, "0112"],
  155: [5, 8, "e.v.v.v.v.v.v.e", "020516363344203010244134352346160114321222", "321311352133", undefined, undefined, "001211122212"],
  157: [6, 11, "1r.1r.1r.1r.u.u.u.1r.1r.1r.1r", "004a2a025750520107200a30495940021a085a", "192302322172212022"],
  158: [7, 11, "s.s.s.s.3j.3j.3j.s.s.s.s", "05553527234546043426332464361443440655540444", "14043423", "02033128332201132011"],
  159: [7, 10, "1q.1q.1q.3j.3j.3j.3j.3j.3j.3j", "105340490329635767646904261112050828104063", "223133332042012", "0101121011310114101151011"],
  166: [7, 10, "3b.3b.3b.3b.3j.3j.3j.3b.3b.3b", "00101201030524660940600520415104195060052066010329406106", "353103203043332302162012"],
  167: [7, 11, "f.f.f.f.v.3j.3g.3c.3c.3c.3c", "4a020065005a030065005a260065", "322302242001151"],
  168: [7, 9, "3j.3j.3j.3j.0.3j.3j.3j.3j", "00010330011040600220306000103061", "012241221331151351032102303"],
  169: [7, 10, "3j.3j.3j.3j.3j.1r.v.v.f.f", "02220313041461153003600009044001", "203003033313102341"],
  170: [8, 11, "1o.3i.73.73.73.3i.3i.73.73.73.73", "58422303565426452030081539573a02321107384137", "024373203323233183"],
  171: [8, 10, "1o.3i.73.73.73.73.73.73.3i.1o", "030120406122424363244464522006", "123023322152232342362", "0201112011"],
  173: [8, 12, "1o.3i.73.73.73.73.73.73.73.73.3i.1o", "0525456852072005402b6962072005403b7973793006402b79730730", "223373123182352022042", "02011120112201132011420115201162011720118201192011a2011b2011c2011d2011e2011f2011h2011i2011j2011k2011l2011m2011n2011o2011"],
  174: [7, 10, "v.3j.3j.3j.3j.3j.3j.3j.3j.v", "000162061930643958420467050739", "143303223352172122032"],
  177: [7, 11, "s.s.1q.1q.3j.3j.3j.3j.3b.3b.3b", "07120454521948333506255620375830173213005353", "374343183142212162"],
  178: [7, 10, "3j.3j.3b.3b.1i.1i.3j.3j.3j.3j", "0003143048300101106862583001106862594002206862", "033003182242313122"],
  182: [7, 11, "8.s.1q.3j.3j.3j.3j.3j.3j.3j.3j", "0535456615551708573928450904", "223153342192392372", "13011230113301143011"],
  184: [7, 10, "3j.3j.3j.v.v.v.v.3j.3j.3j", "50102967060804590069490801", "252312232182202012", "00011"],
  185: [7, 10, "3j.3j.3j.3j.3j.3j.3j.3j.3j.3j", "0020404161022242032343042444002035", "333303362112022052"],
  186: [7, 10, "3j.3j.3j.7.3b.3b.3j.3j.3j.3j", "00080703052724376530543255604644404700080803000040", "303103333223363173", undefined, "0021050011544eb1"],
  188: [7, 10, "3j.3j.3j.3j.3j.s.s.s.s.s", "5063291054034000382044044001291064", "013101111323302043223123"],
  192: [8, 10, "o.1o.3i.73.73.73.73.73.73.73", "0726772830043969035366544455565805577539067528", "143363333233203262172032", "130112301133011"],
  194: [8, 15, "73.73.73.73.73.73.3i.1o.o.o.o.73.73.73.73", "606c200001031e0c3e406b5e1d62104001036d5c1e62205001037c4d2d721040", "0432431b3013333212312122"],
  197: [6, 9, "1r.1r.1r.1r.u.u.1r.1r.1r", "0310271211185606151416483451004044", "033003313203233"],
};

const SIDES = ["top", "right", "bottom", "left"] as const;
const decode = (packed: string, index: number): number => Number.parseInt(packed[index]!, 36);
const samePoint = (a: Point | undefined, b: Point): boolean => a?.[0] === b[0] && a[1] === b[1];

const playableFrom = (width: number, height: number, rows: string): Point[] => {
  const packedRows = rows.split(".");
  if (packedRows.length !== height) throw new Error(`exact geometry mask row-count drift (${packedRows.length}/${height})`);
  const points: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    const bits = Number.parseInt(packedRows[y]!, 36);
    for (let x = 0; x < width; x += 1) if ((bits & (2 ** x)) !== 0) points.push([x, y]);
  }
  return points;
};

const patchShutters = (source: LevelSpec["shutters"], packed?: string): LevelSpec["shutters"] => {
  if (!packed) return source;
  if (packed.length % 5 !== 0 || !source) throw new Error("certified exact geometry shutter source drift");
  const patches = new Map<number, readonly [number, number, number, number]>();
  for (let cursor = 0; cursor < packed.length; cursor += 5) {
    patches.set(decode(packed, cursor), [
      decode(packed, cursor + 1), decode(packed, cursor + 2),
      decode(packed, cursor + 3), decode(packed, cursor + 4),
    ]);
  }
  if ([...patches].some(([index]) => !source[index])) throw new Error("certified exact geometry shutter-index drift");
  return source.map((shutter, index): ShutterSpec => {
    const geometry = patches.get(index);
    if (!geometry) return shutter;
    const [x, y, width, height] = geometry;
    return shutter.x === x && shutter.y === y && shutter.width === width && shutter.height === height
      ? shutter : { ...shutter, x, y, width, height };
  });
};

const patchGenerators = (source: LevelSpec["generators"], packed?: string): LevelSpec["generators"] => {
  if (!packed) return source;
  if (packed.length % 8 !== 0 || !source) throw new Error("certified exact geometry generator source drift");
  const patches = new Map<number, Omit<GeneratorSpec, "id" | "queueBlockIds">>();
  for (let cursor = 0; cursor < packed.length; cursor += 8) {
    const anchorX = decode(packed, cursor + 5);
    const anchorY = decode(packed, cursor + 6);
    patches.set(decode(packed, cursor), {
      side: SIDES[decode(packed, cursor + 1)]!,
      offset: decode(packed, cursor + 2),
      spawn: [decode(packed, cursor + 3), decode(packed, cursor + 4)],
      ...(anchorX === 35 || anchorY === 35 ? {} : {
        rimAnchor: {
          x: anchorX / 2,
          y: anchorY / 2,
          quarterTurns: decode(packed, cursor + 7) as 0 | 1 | 2 | 3,
        },
      }),
    });
  }
  if ([...patches].some(([index]) => !source[index])) throw new Error("certified exact geometry generator-index drift");
  return source.map((generator, index): GeneratorSpec => {
    const geometry = patches.get(index);
    if (!geometry) return generator;
    const anchor = geometry.rimAnchor;
    const same = generator.side === geometry.side
      && generator.offset === geometry.offset
      && samePoint(generator.spawn, geometry.spawn)
      && generator.rimAnchor?.x === anchor?.x
      && generator.rimAnchor?.y === anchor?.y
      && generator.rimAnchor?.quarterTurns === anchor?.quarterTurns;
    return same ? generator : {
      ...generator,
      side: geometry.side,
      offset: geometry.offset,
      spawn: geometry.spawn,
      ...(anchor ? { rimAnchor: anchor } : { rimAnchor: undefined }),
    };
  });
};

const patchFlipDoors = (source: LevelSpec["flipDoors"], packed?: string): LevelSpec["flipDoors"] => {
  if (!packed) return source;
  if (packed.length % 4 !== 0 || !source) throw new Error("certified exact geometry flip-door source drift");
  const patches = new Map<number, readonly [number, number, number]>();
  for (let cursor = 0; cursor < packed.length; cursor += 4) {
    patches.set(decode(packed, cursor), [
      decode(packed, cursor + 1), decode(packed, cursor + 2), decode(packed, cursor + 3),
    ]);
  }
  if ([...patches].some(([index]) => !source[index])) throw new Error("certified exact geometry flip-door-index drift");
  return source.map((door, index): FlipDoorSpec => {
    const geometry = patches.get(index);
    if (!geometry) return door;
    const [side, offset, size] = geometry;
    return door.side === SIDES[side] && door.offset === offset && door.size === size
      ? door : { ...door, side: SIDES[side]!, offset, size };
  });
};

const patchContract = (source: LevelSpec, contract: Contract): LevelSpec => {
  const [width, height, mask, blockXY, gateGeometry, shutterGeometry, generatorGeometry, flipGeometry] = contract;
  if (blockXY.length !== source.blocks.length * 2) throw new Error(`Lv${source.id} exact geometry block-count drift`);
  const gateStride = gateGeometry.length === source.gates.length * 3 ? 3
    : gateGeometry.length === source.gates.length * 2 ? 2 : 0;
  if (!gateStride) throw new Error(`Lv${source.id} exact geometry gate-count drift`);

  const playable = playableFrom(width, height, mask);
  const blocks = source.blocks.map((block, index) => {
    const x = decode(blockXY, index * 2);
    const y = decode(blockXY, index * 2 + 1);
    return block.x === x && block.y === y ? block : { ...block, x, y };
  });
  const gates = source.gates.map((gate, index): GateSpec => {
    const cursor = index * gateStride;
    const side = SIDES[decode(gateGeometry, cursor)]!;
    const offset = decode(gateGeometry, cursor + 1);
    const size = gateStride === 3 ? decode(gateGeometry, cursor + 2) : gate.size;
    return gate.side === side && gate.offset === offset && gate.size === size
      ? gate : { ...gate, side, offset, size };
  });
  const shutters = patchShutters(source.shutters, shutterGeometry);
  const generators = patchGenerators(source.generators, generatorGeometry);
  const flipDoors = patchFlipDoors(source.flipDoors, flipGeometry);
  const samePlayable = source.playable?.length === playable.length
    && source.playable.every((point, index) => samePoint(point, playable[index]!));
  const unchanged = source.width === width && source.height === height
    && source.blocked === undefined && samePlayable
    && blocks.every((block, index) => block === source.blocks[index])
    && gates.every((gate, index) => gate === source.gates[index])
    && shutters?.every((shutter, index) => shutter === source.shutters?.[index]) !== false
    && generators?.every((generator, index) => generator === source.generators?.[index]) !== false
    && flipDoors?.every((door, index) => door === source.flipDoors?.[index]) !== false;
  return unchanged ? source : {
    ...source,
    width,
    height,
    playable,
    blocked: undefined,
    blocks,
    gates,
    shutters,
    generators,
    flipDoors,
  };
};

/** Applies the 41 exact-mask layouts independently certified at a 20k-state bound. */
export const applyCompetitorCertifiedExactGeometryRepair = (source: LevelSpec): LevelSpec => {
  const contract = CONTRACTS[source.id];
  return contract ? patchContract(source, contract) : source;
};
