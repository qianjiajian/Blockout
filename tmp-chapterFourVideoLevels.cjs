"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAPTER_FOUR_VIDEO_LEVELS = void 0;
const campaignDifficultyTargets_1 = require("./campaignDifficultyTargets");
const chapterFourCertifiedLevels_generated_1 = require("./chapterFourCertifiedLevels.generated");
const competitorConstrainedLevels_generated_1 = require("./competitorConstrainedLevels.generated");
const SINGLE = [[0, 0]];
const H2 = [[0, 0], [1, 0]];
const V2 = [[0, 0], [0, 1]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const L3 = [[0, 0], [1, 0], [0, 1]];
const L4 = [[0, 0], [0, 1], [0, 2], [1, 2]];
const L4_WIDE = [[0, 0], [1, 0], [2, 0], [0, 1]];
const T4 = [[0, 0], [1, 0], [2, 0], [1, 1]];
const S4 = [[1, 0], [2, 0], [0, 1], [1, 1]];
const CROSS5 = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
const cloneShape = (shape) => shape.map(([x, y]) => [x, y]);
const piece = (id, x, y, shape, color, extra = {}) => ({ id, x, y, shape: cloneShape(shape), color, ...extra });
const pieces = (inputs) => inputs.map(([id, x, y, shape, color, extra]) => piece(id, x, y, shape, color, extra));
const fullMask = (width, height, removed = []) => {
    const removedKeys = new Set(removed.map(([x, y]) => `${x},${y}`));
    return Array.from({ length: height }, (_, y) => (Array.from({ length: width }, (__, x) => [x, y]))).flat().filter(([x, y]) => !removedKeys.has(`${x},${y}`));
};
const maskFromRows = (rows) => rows.flatMap((row, y) => ([...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : [])));
const cloneLevel = (source) => {
    return {
        ...source,
        playable: source.playable?.map(([x, y]) => [x, y]),
        blocked: source.blocked?.map(([x, y]) => [x, y]),
        gates: source.gates.map((gate) => ({ ...gate })),
        blocks: source.blocks.map((block) => ({
            ...block,
            shape: cloneShape(block.shape),
            layers: block.layers ? [...block.layers] : undefined,
        })),
        shutters: source.shutters?.map((shutter) => ({
            ...shutter,
            triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
        })),
        generators: source.generators?.map((generator) => ({
            ...generator,
            spawn: [...generator.spawn],
            queueBlockIds: [...generator.queueBlockIds],
        })),
    };
};
const candidate = (id) => {
    const source = competitorConstrainedLevels_generated_1.COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES.find((level) => level.id === id);
    if (!source)
        throw new Error(`Missing video-layout seed for Lv${id}`);
    return cloneLevel(source);
};
const certifiedCandidate = (id) => cloneLevel(chapterFourCertifiedLevels_generated_1.CHAPTER_FOUR_CERTIFIED_LEVELS[id]);
const finish = (level, certifiedRoute) => ({
    ...level,
    parMoves: certifiedRoute?.parMoves,
    designTargets: {
        formulaVersion: "blockout-d1",
        calibratedDifficulty: (0, campaignDifficultyTargets_1.campaignTargetD1)(level.id),
        minimumRepositionOverhead: certifiedRoute?.minimumRepositionOverhead ?? null,
    },
});
const level31 = () => {
    const seed = candidate(31);
    return finish({
        ...seed,
        name: "冰值交错 · 对向门阵",
        timeSeconds: 90,
        playable: fullMask(6, 8),
        gates: [
            { id: "vp-031-gate-01", side: "top", offset: 0, size: 3, color: "yellow", frozen: 2 },
            { id: "vp-031-gate-02", side: "right", offset: 3, size: 3, color: "pink" },
            { id: "vp-031-gate-03", side: "top", offset: 3, size: 3, color: "orange", frozen: 10 },
            { id: "vp-031-gate-04", side: "right", offset: 0, size: 3, color: "red", frozen: 13 },
        ],
        blocks: pieces([
            ["cc-031-b1-01", 0, 2, V2, "orange"],
            ["cc-031-b1-02", 1, 2, V2, "pink"],
            ["cc-031-b1-03", 2, 0, V2, "pink"],
            ["cc-031-b1-04", 1, 0, V2, "yellow"],
            ["cc-031-b1-05", 2, 2, V2, "yellow"],
            ["cc-031-b1-06", 5, 2, V2, "red"],
            ["cc-031-b1-07", 4, 2, V2, "pink"],
            ["cc-031-b1-08", 3, 2, V2, "pink"],
            ["cc-031-b1-09", 5, 4, V2, "pink"],
            ["cc-031-b1-10", 3, 0, V2, "yellow"],
            ["cc-031-b1-11", 4, 0, SQ2, "red", { frozen: 5 }],
            ["cc-031-b1-12", 4, 4, V2, "orange"],
            ["cc-031-b1-13", 2, 4, SQ2, "orange", { frozen: 13 }],
            ["cc-031-b1-14", 0, 4, SQ2, "pink", { frozen: 9 }],
            ["cc-031-b1-15", 0, 0, V2, "pink"],
            ["cc-031-b1-16", 3, 6, V2, "orange"],
            ["cc-031-b1-17", 4, 6, SQ2, "orange", { frozen: 10 }],
            ["cc-031-b1-18", 2, 6, V2, "orange"],
        ]),
    }, { parMoves: 27, minimumRepositionOverhead: 7 });
};
const level32 = () => {
    const seed = candidate(32);
    return finish({
        ...seed,
        name: "冰壳回路",
        timeSeconds: 90,
        playable: fullMask(6, 9),
        gates: [
            { id: "vp-032-gate-01", side: "top", offset: 0, size: 3, color: "purple" },
            { id: "vp-032-gate-02", side: "bottom", offset: 0, size: 3, color: "cyan", frozen: 8 },
            { id: "vp-032-gate-03", side: "left", offset: 3, size: 3, color: "green", frozen: 8 },
            { id: "vp-032-gate-04", side: "right", offset: 3, size: 3, color: "blue", frozen: 8 },
        ],
        blocks: pieces([
            ["cc-032-b1-01", 0, 0, V3, "purple"],
            ["cc-032-b1-02", 1, 0, V3, "purple"],
            ["cc-032-b1-03", 2, 0, V3, "purple"],
            ["cc-032-b1-04", 0, 6, V3, "purple"],
            ["cc-032-b1-06", 1, 6, V3, "cyan"],
            ["cc-032-b1-14", 2, 6, V3, "cyan"],
            ["cc-032-b1-08", 4, 7, H2, "green"],
            ["cc-032-b1-13", 3, 8, H2, "green"],
            ["cc-032-b1-05", 1, 4, L4_WIDE, "purple", { frozen: 4, layers: ["purple", "blue"] }],
            ["cc-032-b1-07", 3, 0, [[0, 0], [1, 0], [1, 1], [1, 2]], "purple", { frozen: 4, layers: ["purple", "blue"] }],
            ["cc-032-b1-09", 3, 6, L4_WIDE, "purple", { frozen: 4, layers: ["purple", "blue"] }],
            ["cc-032-b1-10", 1, 2, [[2, 0], [0, 1], [1, 1], [2, 1]], "cyan", { frozen: 4, layers: ["cyan", "blue"] }],
            ["cc-032-b1-11", 4, 3, [[0, 0], [1, 0], [1, 1], [1, 2]], "cyan", { frozen: 4, layers: ["cyan", "blue"] }],
            ["cc-032-b1-12", 2, 4, [[2, 0], [0, 1], [1, 1], [2, 1]], "purple", { frozen: 4, layers: ["purple", "blue"] }],
        ]),
    }, { parMoves: 124, minimumRepositionOverhead: 8 });
};
const level33 = () => {
    const seed = candidate(33);
    return finish({
        ...seed,
        name: "阶梯锁阵",
        timeSeconds: 90,
        playable: maskFromRows([
            "#######",
            ".#..#.#",
            "#..#..#",
            "#######",
            "#.#.#.#",
            "#..#...",
            "#####.#",
            "#.#.###",
            "....#.#",
        ]),
        gates: [
            { id: "vp-033-gate-01", side: "top", offset: 0, size: 3, color: "red" },
            { id: "vp-033-gate-02", side: "right", offset: 6, size: 3, color: "yellow" },
            { id: "vp-033-gate-03", side: "top", offset: 3, size: 1, color: "orange", frozen: 10 },
            { id: "vp-033-gate-04", side: "bottom", offset: 4, size: 1, color: "purple", frozen: 18 },
            { id: "vp-033-gate-05", side: "left", offset: 6, size: 1, color: "pink", frozen: 16 },
            { id: "vp-033-gate-06", side: "left", offset: 3, size: 1, color: "orange", frozen: 10 },
            { id: "vp-033-gate-07", side: "top", offset: 4, size: 1, color: "blue", frozen: 5 },
        ],
        blocks: pieces([
            ["strategy-guard-01", 0, 3, SINGLE, "blue"],
            ["cc-piece-02", 3, 0, SINGLE, "yellow"],
            ["strategy-guard-03", 0, 4, SINGLE, "yellow"],
            ["cc-piece-04", 4, 0, SINGLE, "red"],
            ["cc-piece-05", 5, 0, SINGLE, "yellow"],
            ["strategy-guard-06", 0, 5, SINGLE, "yellow"],
            ["strategy-guard-07", 0, 6, SINGLE, "red"],
            ["cc-piece-08", 6, 0, SINGLE, "yellow"],
            ["cc-piece-09", 6, 1, SINGLE, "yellow"],
            ["cc-piece-10", 6, 2, SINGLE, "yellow"],
            ["cc-piece-11", 6, 3, SINGLE, "blue"],
            ["strategy-guard-12", 1, 6, SINGLE, "purple"],
            ["cc-piece-13", 5, 3, SINGLE, "orange"],
            ["cc-piece-14", 4, 3, SINGLE, "blue"],
            ["strategy-guard-15", 2, 6, SINGLE, "red"],
            ["strategy-guard-16", 3, 6, SINGLE, "pink"],
            ["cc-piece-17", 3, 3, SINGLE, "blue"],
            ["cc-piece-18", 2, 3, SINGLE, "blue"],
            ["cc-piece-19", 1, 3, SINGLE, "yellow"],
            ["strategy-guard-20", 4, 6, SINGLE, "yellow"],
            ["cc-piece-21", 0, 0, T4, "red"],
            ["strategy-guard-22", 5, 6, [[1, 0], [0, 1], [1, 1], [1, 2]], "yellow"],
            ["strategy-guard-23", 4, 7, SINGLE, "red"],
        ]),
    }, { parMoves: 35, minimumRepositionOverhead: 10 });
};
const level34 = () => {
    const seed = candidate(34);
    return finish({
        ...seed,
        name: "双舱开闸",
        timeSeconds: 120,
        width: 7,
        height: 9,
        playable: fullMask(7, 9),
        gates: [
            { id: "vp-034-gate-01", side: "left", offset: 8, size: 1, color: "orange" },
            { id: "vp-034-gate-02", side: "right", offset: 8, size: 1, color: "pink", frozen: 7 },
            { id: "vp-034-gate-03", side: "bottom", offset: 2, size: 1, color: "cyan", frozen: 13 },
            { id: "vp-034-gate-04", side: "top", offset: 3, size: 1, color: "green", frozen: 14 },
            { id: "vp-034-gate-05", side: "top", offset: 0, size: 1, color: "red", frozen: 22 },
            { id: "vp-034-gate-06", side: "top", offset: 6, size: 1, color: "yellow", frozen: 22 },
        ],
        shutters: [
            { id: "vp-034-cover-1", x: 0, y: 0, width: 4, height: 6, count: 12, skin: "shutter" },
            { id: "vp-034-cover-2", x: 4, y: 0, width: 3, height: 5, count: 22, skin: "shutter" },
        ],
        generators: undefined,
        featureIntro: {
            kind: "shutter",
            title: "计数遮罩！",
            description: "每次有效消除都会降低遮罩计数；归零后整批固定色块同时出现。",
        },
        blocks: pieces([
            ["cc-034-b1-01", 5, 6, SINGLE, "orange"],
            ["cc-034-b1-02", 6, 6, SINGLE, "orange"],
            ["cc-034-b1-03", 3, 7, SINGLE, "pink"],
            ["cc-034-b1-04", 4, 7, SINGLE, "pink"],
            ["cc-034-b1-05", 5, 7, SINGLE, "orange"],
            ["cc-034-b1-06", 6, 7, SINGLE, "orange"],
            ["cc-034-b1-07", 0, 8, SINGLE, "pink"],
            ["cc-034-b1-08", 1, 8, SINGLE, "pink"],
            ["cc-034-b1-09", 2, 8, SINGLE, "pink"],
            ["cc-034-b1-10", 3, 8, SINGLE, "pink"],
            ["cc-034-b1-11", 4, 8, SINGLE, "pink"],
            ["cc-034-b1-12", 5, 8, SINGLE, "orange"],
            ["cc-034-b1-13", 6, 8, SINGLE, "orange"],
            ["cc-034-b1-14", 3, 6, H2, "orange"],
            ["cc-034-b1-15", 0, 6, V2, "cyan"],
            ["cc-034-b1-16", 1, 6, V2, "cyan"],
            ["cc-034-b1-17", 2, 6, V2, "cyan"],
            ["cc-034-b2-01", 0, 0, V3, "red", { layers: ["red", "green"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-02", 1, 0, V3, "red", { layers: ["red", "green"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-03", 2, 0, V3, "yellow", { layers: ["yellow", "green"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-04", 3, 0, V3, "green", { layers: ["green", "cyan"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-05", 0, 3, V3, "cyan", { layers: ["cyan", "yellow"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-06", 1, 3, V3, "cyan", { layers: ["cyan", "green"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-07", 2, 3, V3, "cyan", { layers: ["cyan", "red"], shutterId: "vp-034-cover-1" }],
            ["cc-034-b2-08", 3, 3, V3, "cyan", { shutterId: "vp-034-cover-1" }],
            ["cc-034-b3-01", 4, 0, V3, "green", { shutterId: "vp-034-cover-2" }],
            ["cc-034-b3-02", 5, 0, V3, "yellow", { shutterId: "vp-034-cover-2" }],
            ["cc-034-b3-03", 6, 0, V3, "yellow", { shutterId: "vp-034-cover-2" }],
            ["cc-034-b3-04", 4, 3, V3, "green", { shutterId: "vp-034-cover-2" }],
            ["cc-034-b3-05", 5, 3, V3, "yellow", { shutterId: "vp-034-cover-2" }],
        ]),
    }, { parMoves: 68, minimumRepositionOverhead: 11 });
};
const level35 = () => finish(certifiedCandidate(35), {
    parMoves: 26,
    minimumRepositionOverhead: 8,
});
const level36 = () => {
    const seed = candidate(36);
    return finish({
        ...seed,
        name: "三向补给",
        timeSeconds: 90,
        width: 6,
        height: 9,
        playable: fullMask(6, 9),
        gates: [
            { id: "vp-036-gate-01", side: "right", offset: 0, size: 2, color: "red" },
            { id: "vp-036-gate-02", side: "right", offset: 2, size: 2, color: "orange" },
            { id: "vp-036-gate-03", side: "left", offset: 0, size: 2, color: "yellow" },
            { id: "vp-036-gate-04", side: "left", offset: 2, size: 2, color: "pink" },
        ],
        shutters: undefined,
        generators: [
            { id: "vp-036-generator-1", side: "bottom", offset: 0, spawn: [2, 0], queueBlockIds: ["cc-036-b2-01"], trigger: "move" },
            { id: "vp-036-generator-2", side: "bottom", offset: 0, spawn: [2, 0], queueBlockIds: ["cc-036-b3-01"], trigger: "move" },
            { id: "vp-036-generator-3", side: "bottom", offset: 3, spawn: [2, 0], queueBlockIds: ["cc-036-b4-01"], trigger: "move" },
        ],
        blocks: pieces([
            ["cc-036-b1-01", 0, 0, H2, "red", { layers: ["red"] }],
            ["cc-036-b1-02", 1, 2, H2, "red", { layers: ["red"] }],
            ["cc-036-b1-03", 5, 1, V2, "yellow", { layers: ["yellow"] }],
            ["cc-036-b1-04", 4, 2, V2, "yellow", { layers: ["yellow"] }],
            ["cc-036-b1-05", 3, 1, V2, "yellow", { layers: ["yellow"] }],
            ["cc-036-b1-06", 0, 3, SQ2, "orange", { layers: ["orange"] }],
            ["cc-036-b1-07", 2, 0, L3, "pink", { layers: ["pink"] }],
            ["cc-036-b1-08", 2, 3, L3, "pink", { layers: ["pink"] }],
            ["cc-036-b1-09", 0, 1, L3, "pink", { layers: ["pink"] }],
            ["cc-036-b1-10", 4, 0, L3, "pink", { layers: ["pink"] }],
            ["cc-036-b1-11", 3, 3, [[2, 0], [0, 1], [1, 1], [2, 1]], "orange", { layers: ["orange"] }],
            ["cc-036-b2-01", 2, 0, H2, "yellow", { layers: ["yellow"] }],
            ["cc-036-b3-01", 2, 0, L3, "red", { layers: ["red"] }],
            ["cc-036-b4-01", 2, 0, [[2, 0], [0, 1], [1, 1], [2, 1]], "orange", { layers: ["orange"] }],
        ]),
    }, { parMoves: 24, minimumRepositionOverhead: 5 });
};
const level37 = () => {
    const seed = candidate(37);
    return finish({
        ...seed,
        name: "四机联锁",
        timeSeconds: 90,
        gates: [
            { id: "vp-037-gate-01", side: "top", offset: 0, size: 3, color: "red" },
            { id: "vp-037-gate-02", side: "left", offset: 5, size: 1, color: "green" },
            { id: "vp-037-gate-03", side: "left", offset: 4, size: 1, color: "cyan" },
            { id: "vp-037-gate-04", side: "bottom", offset: 2, size: 3, color: "purple", frozen: 7 },
            { id: "vp-037-gate-05", side: "top", offset: 4, size: 2, color: "blue", frozen: 15 },
            { id: "vp-037-gate-06", side: "left", offset: 0, size: 2, color: "orange", frozen: 2 },
            { id: "vp-037-gate-07", side: "right", offset: 2, size: 2, color: "orange", frozen: 11 },
        ],
        shutters: [{ id: "vp-037-cover-1", x: 4, y: 0, width: 2, height: 5, count: 9, skin: "shutter" }],
        generators: [{
                id: "vp-037-generator-1",
                side: "top",
                offset: 0,
                spawn: [0, 0],
                queueBlockIds: ["cc-037-b2-03", "cc-037-b2-02", "cc-037-b2-04", "cc-037-b2-01"],
                trigger: "move",
            }],
        blocks: pieces([
            ["cc-037-b1-01", 2, 0, V2, "purple"],
            ["cc-037-b1-02", 0, 4, V2, "orange"],
            ["cc-037-b1-03", 1, 0, V2, "purple"],
            ["cc-037-b1-04", 3, 1, V2, "blue"],
            ["cc-037-b1-05", 2, 6, V2, "orange"],
            ["cc-037-b1-06", 3, 6, V2, "purple"],
            ["cc-037-b1-07", 0, 2, H3, "red"],
            ["cc-037-b1-08", 4, 5, V2, "blue"],
            ["cc-037-b1-09", 2, 5, H2, "green", { frozen: 3 }],
            ["cc-037-b1-10", 0, 3, H3, "red"],
            ["cc-037-b1-11", 6, 2, V2, "orange"],
            ["cc-037-b1-12", 2, 4, H2, "cyan", { frozen: 3 }],
            ["cc-037-b2-01", 2, 1, SQ2, "blue"],
            ["cc-037-b2-02", 1, 1, V2, "orange"],
            ["cc-037-b2-03", 1, 3, L3, "orange"],
            ["cc-037-b2-04", 2, 3, [[1, 0], [0, 1], [1, 1]], "orange"],
            ["cc-037-b3-01", 4, 3, V2, "orange", { shutterId: "vp-037-cover-1" }],
            ["cc-037-b3-02", 4, 1, [[1, 0], [0, 1], [1, 1], [1, 2]], "blue", { shutterId: "vp-037-cover-1" }],
            ["cc-037-b3-03", 4, 0, L3, "purple", { shutterId: "vp-037-cover-1" }],
        ]),
    }, { parMoves: 63, minimumRepositionOverhead: 12 });
};
const level38 = () => finish(certifiedCandidate(38), {
    parMoves: 59,
    minimumRepositionOverhead: 5,
});
const level39 = () => finish(certifiedCandidate(39), {
    parMoves: 48,
    minimumRepositionOverhead: 5,
});
const level40 = () => {
    const seed = candidate(40);
    return finish({
        ...seed,
        name: "紧凑收束",
        timeSeconds: 90,
        width: 6,
        height: 6,
        playable: fullMask(6, 6),
        gates: [
            { id: "vp-040-gate-01", side: "right", offset: 0, size: 3, color: "blue", frozen: 3 },
            { id: "vp-040-gate-02", side: "right", offset: 3, size: 3, color: "purple", frozen: 2 },
            { id: "vp-040-gate-03", side: "left", offset: 4, size: 1, color: "blue" },
            { id: "vp-040-gate-04", side: "top", offset: 0, size: 3, color: "cyan", frozen: 6 },
            { id: "vp-040-gate-05", side: "top", offset: 3, size: 3, color: "green", frozen: 4 },
            { id: "vp-040-gate-06", side: "bottom", offset: 0, size: 3, color: "orange", frozen: 1 },
        ],
        shutters: [{ id: "vp-040-cover-1", x: 1, y: 0, width: 5, height: 3, count: 4, skin: "shutter" }],
        generators: undefined,
        blocks: pieces([
            ["cc-040-b1-01", 1, 5, H2, "purple"],
            ["cc-040-b1-02", 0, 5, SINGLE, "purple"],
            ["cc-040-b1-03", 0, 0, V2, "orange"],
            ["cc-040-b1-04", 4, 5, H2, "orange"],
            ["cc-040-b1-05", 2, 4, SINGLE, "green"],
            ["cc-040-b1-06", 2, 3, H2, "orange"],
            ["cc-040-b1-07", 0, 2, V2, "purple"],
            ["cc-040-b1-08", 4, 3, SINGLE, "blue"],
            ["cc-040-b1-09", 3, 4, V2, "orange"],
            ["cc-040-b1-10", 4, 4, H2, "purple"],
            ["cc-040-b1-11", 1, 4, SINGLE, "cyan"],
            ["cc-040-b2-01", 5, 3, V2, "green", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-02", 4, 3, V2, "green", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-03", 3, 4, SINGLE, "blue", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-04", 3, 1, V3, "green", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-05", 4, 1, V2, "purple", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-06", 3, 5, H2, "green", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-07", 5, 2, SINGLE, "cyan", { shutterId: "vp-040-cover-1" }],
            ["cc-040-b2-08", 4, 0, [[0, 0], [1, 0], [1, 1]], "purple", { shutterId: "vp-040-cover-1" }],
        ]),
    }, { parMoves: 227, minimumRepositionOverhead: 15 });
};
exports.CHAPTER_FOUR_VIDEO_LEVELS = [
    level31(), level32(), level33(), level34(), level35(),
    level36(), level37(), level38(), level39(), level40(),
];
