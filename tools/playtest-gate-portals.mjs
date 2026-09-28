import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "playtest-results/gate-portals");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 200,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.clock.install({ time: new Date("2026-09-21T12:00:00+08:00") });
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState()?.art?.ready === true,
    undefined,
    { timeout: 15_000 },
  );
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);

  const installPortalFixture = () => page.evaluate(async () => {
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const game = window.__COLOR_ESCAPE__;
    const playable = Array.from({ length: 5 }, (_, y) => (
      [[0, y], [1, y], [3, y], [4, y]]
    )).flat().filter(([x, y]) => !(x === 0 && y === 1) && !(x === 4 && y === 3));
    game.loadLevel(1, true);
    game.model = new PuzzleModel({
      id: 9_981,
      name: "Portal UI and Pointer fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      parMoves: 6,
      width: 5,
      height: 5,
      playable,
      blocked: [],
      gates: [
        {
          id: "red-frozen-independent",
          color: "red",
          side: "right",
          offset: 0,
          size: 1,
          portals: [{ side: "right", origin: [1, 0], size: 1 }],
          frozen: 3,
        },
        {
          id: "red-open-independent",
          color: "red",
          side: "left",
          offset: 0,
          size: 1,
          portals: [{ side: "left", origin: [3, 0], size: 1 }],
        },
        {
          id: "cyan-local-top",
          color: "cyan",
          side: "top",
          offset: 0,
          size: 1,
          portals: [{ side: "top", origin: [0, 2], size: 1 }],
        },
        {
          id: "orange-local-bottom",
          color: "orange",
          side: "bottom",
          offset: 4,
          size: 1,
          portals: [{ side: "bottom", origin: [4, 2], size: 1 }],
        },
        { id: "blue-legacy-bottom", color: "blue", side: "bottom", offset: 0, size: 1 },
      ],
      flipDoors: [{
        id: "purple-shared-local-door",
        color: "purple",
        side: "right",
        offset: 1,
        size: 3,
        portals: [
          { side: "right", origin: [1, 1], size: 3 },
          { side: "left", origin: [3, 2], size: 1 },
        ],
        initiallyOpen: true,
        frozen: 1,
        star: true,
      }],
      blocks: [
        { id: "red-left-remains", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "red-local-exit", x: 4, y: 0, shape: [[0, 0]], color: "red" },
        { id: "purple-left", x: 1, y: 2, shape: [[0, 0]], color: "purple", star: true },
        { id: "purple-right", x: 3, y: 2, shape: [[0, 0]], color: "purple", star: true },
        { id: "cyan-local", x: 0, y: 2, shape: [[0, 0]], color: "cyan" },
        { id: "orange-local", x: 4, y: 2, shape: [[0, 0]], color: "orange" },
        { id: "blue-remains", x: 0, y: 4, shape: [[0, 0]], color: "blue" },
      ],
    });
    game.screen = "playing";
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.particles = [];
    game.exitGhosts = [];
    game.exitPulses = [];
    game.mechanicPulses = [];
    game.pendingCelebration = 0;
    game.dirty = true;
    game.render();
  });

  const installSeamFixture = () => page.evaluate(async () => {
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const game = window.__COLOR_ESCAPE__;
    const playable = Array.from({ length: 6 }, (_, y) => (
      Array.from({ length: 6 }, (__, x) => [x, y])
    )).flat();
    game.model = new PuzzleModel({
      id: 9_983,
      name: "Board seam portal and Pointer fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      parMoves: 4,
      width: 6,
      height: 6,
      playable,
      blocked: [],
      seams: [
        { orientation: "horizontal", offset: 3, start: 0, size: 6 },
        { orientation: "vertical", offset: 3, start: 0, size: 2 },
      ],
      gates: [
        {
          id: "seam-upper-red",
          color: "red",
          side: "bottom",
          offset: 4,
          size: 1,
          portals: [{ side: "bottom", origin: [4, 2], size: 1 }],
        },
        {
          id: "seam-lower-blue",
          color: "blue",
          side: "top",
          offset: 4,
          size: 1,
          portals: [{ side: "top", origin: [4, 3], size: 1 }],
          frozen: 2,
        },
      ],
      shutters: [{ id: "seam-shutter", x: 0, y: 2, width: 2, height: 1, count: 4, skin: "shutter" }],
      blocks: [
        { id: "seam-red-exit", x: 4, y: 2, shape: [[0, 0]], color: "red" },
        { id: "seam-cross-block", x: 2, y: 1, shape: [[0, 0]], color: "orange" },
        { id: "seam-blue-remains", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
        { id: "seam-green-remains", x: 0, y: 4, shape: [[0, 0]], color: "green" },
      ],
    });
    game.screen = "playing";
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.particles = [];
    game.exitGhosts = [];
    game.exitPulses = [];
    game.mechanicPulses = [];
    game.pendingCelebration = 0;
    game.dirty = true;
    game.render();
  });

  const installLegacyFixture = () => page.evaluate(async () => {
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const game = window.__COLOR_ESCAPE__;
    const playable = Array.from({ length: 5 }, (_, y) => (
      Array.from({ length: 5 }, (__, x) => [x, y])
    )).flat();
    game.model = new PuzzleModel({
      id: 9_982,
      name: "Legacy four-side UI fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      parMoves: 4,
      width: 5,
      height: 5,
      playable,
      blocked: [],
      gates: [
        { id: "legacy-top", color: "red", side: "top", offset: 0, size: 1 },
        { id: "legacy-right", color: "blue", side: "right", offset: 0, size: 1 },
        { id: "legacy-bottom", color: "green", side: "bottom", offset: 4, size: 1 },
        { id: "legacy-left", color: "yellow", side: "left", offset: 4, size: 1 },
      ],
      blocks: [
        { id: "legacy-red", x: 2, y: 2, shape: [[0, 0]], color: "red" },
        { id: "legacy-blue", x: 3, y: 2, shape: [[0, 0]], color: "blue" },
        { id: "legacy-green", x: 2, y: 3, shape: [[0, 0]], color: "green" },
        { id: "legacy-yellow", x: 1, y: 2, shape: [[0, 0]], color: "yellow" },
      ],
    });
    game.screen = "playing";
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.particles = [];
    game.exitGhosts = [];
    game.exitPulses = [];
    game.mechanicPulses = [];
    game.pendingCelebration = 0;
    game.dirty = true;
    game.render();
  });

  const installRuntimeLevel = async (levelId) => {
    await page.evaluate((id) => {
      const game = window.__COLOR_ESCAPE__;
      game.loadLevel(id, true);
      game.screen = "playing";
      game.selectedId = undefined;
      game.activePointer = undefined;
      game.dragVisual = undefined;
      game.particles = [];
      game.exitGhosts = [];
      game.exitPulses = [];
      game.mechanicPulses = [];
      game.pendingCelebration = 0;
      game.dirty = true;
      game.render();
    }, levelId);
    await page.waitForFunction((id) => (
      window.__COLOR_ESCAPE__?.getDebugState()?.puzzle?.levelId === id
    ), levelId, { timeout: 10_000 });
    await page.waitForFunction(() => {
      const formal = window.__COLOR_ESCAPE__.getDebugState().art?.formalGameplay;
      return Boolean(formal
        && formal.requestedBlockSignature == null
        && formal.requestedIceSignature == null);
    }, undefined, { timeout: 15_000 });
    await page.waitForTimeout(50);
  };

  const captureFrame = () => page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const canvas = document.querySelector("canvas");
    const context = canvas.getContext("2d");
    const original = {
      drawImage: context.drawImage,
      beginPath: context.beginPath,
      moveTo: context.moveTo,
      lineTo: context.lineTo,
      stroke: context.stroke,
      rect: context.rect,
      clip: context.clip,
      save: context.save,
      restore: context.restore,
      fillText: context.fillText,
    };
    const rounded = (value) => Number(value.toFixed(4));
    const transformPoint = (x, y) => {
      const matrix = context.getTransform();
      return {
        x: rounded(matrix.a * x + matrix.c * y + matrix.e),
        y: rounded(matrix.b * x + matrix.d * y + matrix.f),
      };
    };
    const draws = [];
    const strokes = [];
    const labels = [];
    let path = [];
    let pathRects = [];
    let activeClips = [];
    const clipStack = [];
    context.drawImage = function instrumentedDrawImage(image, ...args) {
      const source = image?.currentSrc || image?.src || "";
      const matrix = context.getTransform();
      draws.push({
        index: draws.length,
        pathname: source ? new URL(source, window.location.href).pathname : "",
        naturalWidth: image?.naturalWidth || image?.width || 0,
        naturalHeight: image?.naturalHeight || image?.height || 0,
        args: args.map((value) => typeof value === "number" ? rounded(value) : `${value}`),
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map(rounded),
        alpha: rounded(context.globalAlpha),
        shadowBlur: rounded(context.shadowBlur),
        filter: context.filter,
        clips: activeClips.map((clip) => ({
          rects: clip.rects.map((rect) => ({ ...rect })),
        })),
      });
      return Reflect.apply(original.drawImage, this, [image, ...args]);
    };
    context.beginPath = function instrumentedBeginPath(...args) {
      path = [];
      pathRects = [];
      return Reflect.apply(original.beginPath, this, args);
    };
    context.moveTo = function instrumentedMoveTo(x, y) {
      path.push({ command: "move", ...transformPoint(x, y) });
      return Reflect.apply(original.moveTo, this, [x, y]);
    };
    context.lineTo = function instrumentedLineTo(x, y) {
      path.push({ command: "line", ...transformPoint(x, y) });
      return Reflect.apply(original.lineTo, this, [x, y]);
    };
    context.stroke = function instrumentedStroke(...args) {
      if (path.length) {
        strokes.push({
          style: `${context.strokeStyle}`,
          lineWidth: rounded(context.lineWidth),
          points: path.map((point) => ({ ...point })),
        });
      }
      return Reflect.apply(original.stroke, this, args);
    };
    context.rect = function instrumentedRect(x, y, width, height) {
      const topLeft = transformPoint(x, y);
      const bottomRight = transformPoint(x + width, y + height);
      pathRects.push({
        left: Math.min(topLeft.x, bottomRight.x),
        right: Math.max(topLeft.x, bottomRight.x),
        top: Math.min(topLeft.y, bottomRight.y),
        bottom: Math.max(topLeft.y, bottomRight.y),
      });
      return Reflect.apply(original.rect, this, [x, y, width, height]);
    };
    context.clip = function instrumentedClip(...args) {
      if (pathRects.length) activeClips = [...activeClips, { rects: pathRects.map((rect) => ({ ...rect })) }];
      return Reflect.apply(original.clip, this, args);
    };
    context.save = function instrumentedSave(...args) {
      clipStack.push(activeClips.map((clip) => ({ rects: clip.rects.map((rect) => ({ ...rect })) })));
      return Reflect.apply(original.save, this, args);
    };
    context.restore = function instrumentedRestore(...args) {
      const result = Reflect.apply(original.restore, this, args);
      activeClips = clipStack.pop() ?? [];
      return result;
    };
    context.fillText = function instrumentedFillText(value, x, y, ...args) {
      const point = transformPoint(x, y);
      labels.push({
        text: `${value}`,
        x: point.x,
        y: point.y,
        style: `${context.fillStyle}`,
        font: context.font,
        alpha: rounded(context.globalAlpha),
      });
      return Reflect.apply(original.fillText, this, [value, x, y, ...args]);
    };
    try {
      game.render();
    } finally {
      Object.assign(context, original);
    }
    return { draws, strokes, labels, state: game.getDebugState() };
  });

  const destinationBounds = (draw) => {
    const [a, b, c, d, e, f] = draw.matrix;
    let x;
    let y;
    let width;
    let height;
    if (draw.args.length === 2) {
      [x, y] = draw.args;
      width = draw.naturalWidth;
      height = draw.naturalHeight;
    } else if (draw.args.length === 4) {
      [x, y, width, height] = draw.args;
    } else if (draw.args.length === 8) {
      [, , , , x, y, width, height] = draw.args;
    } else {
      throw new Error(`Portal E2E: unsupported drawImage arity ${draw.args.length + 1}`);
    }
    const corners = [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ].map(([localX, localY]) => ({
      x: a * localX + c * localY + e,
      y: b * localX + d * localY + f,
    }));
    return {
      left: Math.min(...corners.map(({ x: value }) => value)),
      right: Math.max(...corners.map(({ x: value }) => value)),
      top: Math.min(...corners.map(({ y: value }) => value)),
      bottom: Math.max(...corners.map(({ y: value }) => value)),
    };
  };

  const namedDraws = (frame, name) => frame.draws
    .filter((draw) => draw.pathname.endsWith(`/${name}`))
    .map((draw) => ({ ...draw, bounds: destinationBounds(draw) }));

  const portalBoundary = (state, portal) => {
    const [x, y] = portal.origin;
    return portal.side === "top"
      ? { x: state.board.innerX + (x + portal.size / 2) * state.board.cell, y: state.board.innerY + y * state.board.cell }
      : portal.side === "bottom"
        ? { x: state.board.innerX + (x + portal.size / 2) * state.board.cell, y: state.board.innerY + (y + 1) * state.board.cell }
        : portal.side === "left"
          ? { x: state.board.innerX + x * state.board.cell, y: state.board.innerY + (y + portal.size / 2) * state.board.cell }
          : { x: state.board.innerX + (x + 1) * state.board.cell, y: state.board.innerY + (y + portal.size / 2) * state.board.cell };
  };

  const callFitsPortal = (state, draw, portal) => {
    const boundary = portalBoundary(state, portal);
    const tolerance = Math.max(2, state.board.cell * 0.045);
    const normalDelta = portal.side === "top"
      ? Math.abs(draw.bounds.bottom - boundary.y)
      : portal.side === "bottom"
        ? Math.abs(draw.bounds.top - boundary.y)
        : portal.side === "left"
          ? Math.abs(draw.bounds.right - boundary.x)
          : Math.abs(draw.bounds.left - boundary.x);
    const tangentCovered = portal.side === "top" || portal.side === "bottom"
      ? draw.bounds.left <= boundary.x && draw.bounds.right >= boundary.x
      : draw.bounds.top <= boundary.y && draw.bounds.bottom >= boundary.y;
    return normalDelta <= tolerance && tangentCovered;
  };

  const requirePortalDraw = (frame, name, portal, label) => {
    const matches = namedDraws(frame, name).filter((draw) => callFitsPortal(frame.state, draw, portal));
    if (!matches.length) {
      throw new Error(
        `Portal E2E: ${label} missing ${name} at ${JSON.stringify(portal)}; `
          + `calls=${JSON.stringify(namedDraws(frame, name).map(({ bounds }) => bounds))}`,
      );
    }
    return matches;
  };

  const portalSegments = (portal) => {
    const segments = [];
    let consumed = 0;
    while (consumed < portal.size) {
      const size = Math.min(3, portal.size - consumed);
      segments.push({
        ...portal,
        origin: portal.side === "top" || portal.side === "bottom"
          ? [portal.origin[0] + consumed, portal.origin[1]]
          : [portal.origin[0], portal.origin[1] + consumed],
        size,
      });
      consumed += size;
    }
    return segments;
  };

  const portalIceDraws = (frame, portal) => {
    const orientation = portal.side === "top" || portal.side === "bottom" ? "horizontal" : "vertical";
    return [1, 2, 3].flatMap((size) => namedDraws(frame, `ice-${orientation}-${size}.png`))
      .filter((draw) => callFitsPortal(frame.state, draw, portal));
  };

  const verifyRuntimePortalVisuals = (frame, levelId) => {
    const devices = [
      ...frame.state.puzzle.gates.map((gate) => ({ kind: "gate", ...gate })),
      ...frame.state.puzzle.flipDoors.map((gate) => ({ kind: "flipDoor", ...gate })),
    ];
    const verified = [];
    for (const device of devices) {
      const gateVisual = device.kind === "gate"
        ? frame.state.gateVisuals.find(({ id }) => id === device.id)
        : undefined;
      const runtimeRetired = device.kind === "gate" && gateVisual?.opacity <= 0;
      if (!device.portals?.length) {
        throw new Error(`Portal E2E: runtime Lv${levelId} ${device.id} lost its authored portals`);
      }
      for (let portalIndex = 0; portalIndex < device.portals.length; portalIndex += 1) {
        const portal = device.portals[portalIndex];
        const orientation = portal.side === "top" || portal.side === "bottom" ? "horizontal" : "vertical";
        if (runtimeRetired) {
          const leakedGate = portalSegments(portal).some((segment) => (
            namedDraws(frame, `gate-${device.color}-${orientation}-${segment.size}.png`)
              .some((draw) => callFitsPortal(frame.state, draw, segment))
          ));
          if (leakedGate || portalIceDraws(frame, portal).length) {
            throw new Error(
              `Portal E2E: runtime Lv${levelId} retired no-target gate ${device.id} leaked visual state`,
            );
          }
          verified.push({
            id: device.id,
            kind: device.kind,
            color: device.color,
            frozen: device.frozen,
            star: Boolean(device.star),
            portalIndex,
            portal,
            runtimeRetired: true,
          });
          continue;
        }
        for (const segment of portalSegments(portal)) {
          requirePortalDraw(
            frame,
            `gate-${device.color}-${orientation}-${segment.size}.png`,
            segment,
            `runtime Lv${levelId} ${device.kind} ${device.id} portal ${portalIndex}`,
          );
          if (device.frozen > 0) {
            requirePortalDraw(
              frame,
              `ice-${orientation}-${segment.size}.png`,
              segment,
              `runtime Lv${levelId} frozen ${device.kind} ${device.id} portal ${portalIndex}`,
            );
          }
          if (device.star) {
            requirePortalDraw(
              frame,
              `star-gate-${orientation}-${segment.size}.png`,
              segment,
              `runtime Lv${levelId} star ${device.kind} ${device.id} portal ${portalIndex}`,
            );
          }
        }
        const iceDraws = portalIceDraws(frame, portal);
        if (device.frozen > 0) {
          if (!iceDraws.length || !labelFitsPortal(frame, `${device.frozen}`, portal)) {
            throw new Error(
              `Portal E2E: runtime Lv${levelId} ${device.id} portal ${portalIndex} `
                + `lost its independent ice/count (${device.frozen})`,
            );
          }
        } else if (iceDraws.length) {
          throw new Error(
            `Portal E2E: runtime Lv${levelId} ${device.id} portal ${portalIndex} `
              + "inherited ice from another logical gate",
          );
        }
        if (device.kind === "flipDoor") {
          const markStyle = device.open ? /228\D+255\D+250/ : /255\D+222\D+120/;
          if (!frame.strokes.some((stroke) => markStyle.test(stroke.style) && strokeFitsPortal(frame.state, stroke, portal))) {
            throw new Error(
              `Portal E2E: runtime Lv${levelId} flip door ${device.id} portal ${portalIndex} `
                + `lost its ${device.open ? "open" : "closed"} decoration`,
            );
          }
        }
        verified.push({
          id: device.id,
          kind: device.kind,
          color: device.color,
          frozen: device.frozen,
          star: Boolean(device.star),
          open: device.kind === "flipDoor" ? device.open : undefined,
          portalIndex,
          portal,
          runtimeRetired: false,
        });
      }
    }

    const sameColorIndependent = Object.entries(Object.groupBy(devices, ({ color }) => color))
      .filter(([, group]) => group.length > 1)
      .map(([color, group]) => ({
        color,
        ids: group.map(({ id }) => id),
        frozenValues: group.map(({ frozen }) => frozen),
      }));
    return { verified, sameColorIndependent };
  };

  const strokeFitsPortal = (state, stroke, portal) => {
    if (!stroke.points.length) return false;
    const boundary = portalBoundary(state, portal);
    const center = {
      x: stroke.points.reduce((sum, point) => sum + point.x, 0) / stroke.points.length,
      y: stroke.points.reduce((sum, point) => sum + point.y, 0) / stroke.points.length,
    };
    return Math.hypot(center.x - boundary.x, center.y - boundary.y) <= state.board.cell * 0.55;
  };

  const pointFitsPortalBand = (state, point, portal, normalCells = 0.72) => {
    const boundary = portalBoundary(state, portal);
    const tangentRadius = state.board.cell * (portal.size / 2 + 0.16);
    const normalRadius = state.board.cell * normalCells;
    return portal.side === "top" || portal.side === "bottom"
      ? Math.abs(point.x - boundary.x) <= tangentRadius && Math.abs(point.y - boundary.y) <= normalRadius
      : Math.abs(point.y - boundary.y) <= tangentRadius && Math.abs(point.x - boundary.x) <= normalRadius;
  };

  const labelFitsPortal = (frame, text, portal) => frame.labels.some((label) => (
    label.text === text && pointFitsPortalBand(frame.state, label, portal, 0.5)
  ));

  const fractureStrokeFitsPortal = (frame, portal) => frame.strokes.some((stroke) => (
    /239\D+255\D+255|#efffff/i.test(stroke.style)
      && stroke.points.some((point) => pointFitsPortalBand(frame.state, point, portal))
  ));

  const fractureStrokeDensity = (frame, portal) => {
    const boundary = portalBoundary(frame.state, portal);
    return Array.from({ length: portal.size }, (_, index) => {
      const tangentCenter = portal.side === "top" || portal.side === "bottom"
        ? frame.state.board.innerX + (portal.origin[0] + index + 0.5) * frame.state.board.cell
        : frame.state.board.innerY + (portal.origin[1] + index + 0.5) * frame.state.board.cell;
      return frame.strokes.filter((stroke) => {
        if (!/239\D+255\D+255|#efffff/i.test(stroke.style) || !stroke.points.length) return false;
        const center = {
          x: stroke.points.reduce((sum, point) => sum + point.x, 0) / stroke.points.length,
          y: stroke.points.reduce((sum, point) => sum + point.y, 0) / stroke.points.length,
        };
        const normalDistance = portal.side === "top" || portal.side === "bottom"
          ? Math.abs(center.y - boundary.y)
          : Math.abs(center.x - boundary.x);
        const tangentDistance = portal.side === "top" || portal.side === "bottom"
          ? Math.abs(center.x - tangentCenter)
          : Math.abs(center.y - tangentCenter);
        return normalDistance <= frame.state.board.cell * 0.72
          && tangentDistance < frame.state.board.cell * 0.5;
      }).length;
    });
  };

  const redFrozenPortal = { side: "right", origin: [1, 0], size: 1 };
  const redOpenPortal = { side: "left", origin: [3, 0], size: 1 };
  const cyanTopPortal = { side: "top", origin: [0, 2], size: 1 };
  const orangeBottomPortal = { side: "bottom", origin: [4, 2], size: 1 };
  const sharedRightPortal = { side: "right", origin: [1, 1], size: 3 };
  const sharedLeftPortal = { side: "left", origin: [3, 2], size: 1 };

  await installPortalFixture();
  await page.waitForTimeout(100);
  const before = await captureFrame();
  const beforeDoor = before.state.puzzle.flipDoors.find(({ id }) => id === "purple-shared-local-door");
  if (!beforeDoor || beforeDoor.frozen !== 1 || !beforeDoor.open || !beforeDoor.star || beforeDoor.portals?.length !== 2) {
    throw new Error(`Portal E2E: shared flip-door fixture state diverged (${JSON.stringify(beforeDoor)})`);
  }
  const beforeFixed = new Map(before.state.puzzle.gates.map((gate) => [gate.id, gate]));
  if (beforeFixed.get("red-frozen-independent")?.frozen !== 3
    || beforeFixed.get("red-open-independent")?.frozen !== 0) {
    throw new Error(`Portal E2E: same-colour fixed gates lost independent state (${JSON.stringify([...beforeFixed])})`);
  }

  requirePortalDraw(before, "gate-red-vertical-1.png", redFrozenPortal, "independent frozen red gate");
  requirePortalDraw(before, "gate-red-vertical-1.png", redOpenPortal, "independent open red gate");
  requirePortalDraw(before, "gate-cyan-horizontal-1.png", cyanTopPortal, "local top-facing concave gate");
  requirePortalDraw(before, "gate-orange-horizontal-1.png", orangeBottomPortal, "local bottom-facing concave gate");
  requirePortalDraw(before, "ice-vertical-1.png", redFrozenPortal, "frozen red overlay");
  if (namedDraws(before, "ice-vertical-1.png").some((draw) => callFitsPortal(before.state, draw, redOpenPortal))) {
    throw new Error("Portal E2E: independent open red gate inherited its same-colour sibling's ice");
  }
  for (const [portal, label] of [[sharedRightPortal, "right"], [sharedLeftPortal, "left"]]) {
    requirePortalDraw(before, `gate-purple-vertical-${portal.size}.png`, portal, `shared flip door ${label} face`);
    requirePortalDraw(before, `ice-vertical-${portal.size}.png`, portal, `shared flip door ${label} frozen state`);
    requirePortalDraw(before, `star-gate-vertical-${portal.size}.png`, portal, `shared flip door ${label} star state`);
  }
  const openStrokes = before.strokes.filter(({ style }) => /228\D+255\D+250/.test(style));
  for (const [portal, label] of [[sharedRightPortal, "right"], [sharedLeftPortal, "left"]]) {
    if (!openStrokes.some((stroke) => strokeFitsPortal(before.state, stroke, portal))) {
      throw new Error(`Portal E2E: shared flip door ${label} portal did not render its open-state chevrons`);
    }
    if (!labelFitsPortal(before, "1", portal)) {
      throw new Error(`Portal E2E: shared flip door ${label} portal did not render the shared frozen counter`);
    }
  }
  await page.screenshot({ path: resolve(output, "portal-fixture-before.png") });

  const start = {
    x: before.state.board.innerX + 4.5 * before.state.board.cell,
    y: before.state.board.innerY + 0.5 * before.state.board.cell,
  };
  const localMouth = {
    x: before.state.board.innerX + 3.5 * before.state.board.cell,
    y: start.y,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(localMouth.x, localMouth.y, { steps: 6 });
  await page.waitForTimeout(80);
  const afterPointer = await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    return {
      debug: game.getDebugState(),
      ghost: game.exitGhosts[0] ? { ...game.exitGhosts[0], block: undefined } : undefined,
    };
  });
  await page.mouse.up();

  if (afterPointer.debug.puzzle.blocks.some(({ id }) => id === "red-local-exit")
    || !afterPointer.debug.puzzle.blocks.some(({ id }) => id === "red-left-remains")
    || afterPointer.debug.puzzle.moves !== 1
    || afterPointer.debug.selectedId
    || afterPointer.debug.activePointer !== undefined
    || afterPointer.ghost?.side !== "left") {
    throw new Error(`Portal E2E: real Pointer did not resolve the intended local left portal (${JSON.stringify(afterPointer)})`);
  }
  if (afterPointer.ghost.travelCells < 0.9 || afterPointer.ghost.travelCells > 1.2) {
    throw new Error(
      `Portal E2E: local exit ghost travelled toward the outer board instead of its adjacent void `
        + `(${afterPointer.ghost.travelCells} cells)`,
    );
  }
  const localBoundary = portalBoundary(before.state, redOpenPortal);
  const expectedSourceX = localBoundary.x - before.state.board.cell * 29 / 95;
  if (Math.abs(afterPointer.ghost.sourceX - expectedSourceX) > 2
    || Math.abs(afterPointer.ghost.sourceY - localBoundary.y) > 2) {
    throw new Error(
      `Portal E2E: exit FX source missed the actual local lane; source=`
        + `${afterPointer.ghost.sourceX},${afterPointer.ghost.sourceY} expected=${expectedSourceX},${localBoundary.y}`,
    );
  }

  const after = await captureFrame();
  const afterDoor = after.state.puzzle.flipDoors.find(({ id }) => id === "purple-shared-local-door");
  if (!afterDoor || afterDoor.frozen !== 0 || afterDoor.open) {
    throw new Error(`Portal E2E: logical multiportal door did not update as one shared device (${JSON.stringify(afterDoor)})`);
  }
  for (const [portal, label] of [[sharedRightPortal, "right"], [sharedLeftPortal, "left"]]) {
    requirePortalDraw(after, `gate-purple-vertical-${portal.size}.png`, portal, `updated shared flip door ${label} face`);
    requirePortalDraw(after, `star-gate-vertical-${portal.size}.png`, portal, `updated shared flip door ${label} star state`);
    if (namedDraws(after, `ice-vertical-${portal.size}.png`).some((draw) => callFitsPortal(after.state, draw, portal))) {
      throw new Error(`Portal E2E: shared flip door ${label} portal retained stale ice after one logical thaw`);
    }
  }
  const closedStrokes = after.strokes.filter(({ style }) => /255\D+222\D+120/.test(style));
  for (const [portal, label] of [[sharedRightPortal, "right"], [sharedLeftPortal, "left"]]) {
    if (!closedStrokes.some((stroke) => strokeFitsPortal(after.state, stroke, portal))) {
      throw new Error(`Portal E2E: shared flip door ${label} portal did not render its closed-state mark`);
    }
  }
  await page.screenshot({ path: resolve(output, "portal-fixture-after-pointer.png") });

  await page.clock.runFor(700);
  const fracture = await captureFrame();
  const fracturePulse = await page.evaluate(() => {
    const pulse = window.__COLOR_ESCAPE__.mechanicPulses
      .find((candidate) => candidate.targetId === "purple-shared-local-door" && candidate.iceFracture);
    return pulse ? {
      targetId: pulse.targetId,
      previous: pulse.previous,
      remaining: pulse.remaining,
      unlocked: pulse.unlocked,
      age: pulse.age,
      intensity: pulse.iceFracture?.intensity,
      portalSizes: pulse.gatePortals?.map(({ size }) => size),
    } : undefined;
  });
  if (!fracturePulse
    || fracturePulse.previous !== 1
    || fracturePulse.remaining !== 0
    || !fracturePulse.unlocked
    || fracturePulse.intensity !== "shatter"
    || JSON.stringify(fracturePulse.portalSizes) !== JSON.stringify([3, 1])) {
    throw new Error(`Portal E2E: multiportal terminal frozen delta was not captured once with both mouths (${JSON.stringify(fracturePulse)})`);
  }
  for (const [portal, label] of [[sharedRightPortal, "right-size-3"], [sharedLeftPortal, "left-size-1"]]) {
    if (labelFitsPortal(fracture, "1", portal)) {
      throw new Error(
        `Portal E2E: terminal shared counter remained visible at ${label} portal; `
          + `pulse=${JSON.stringify(fracturePulse)} labels=${JSON.stringify(fracture.labels.filter((item) => pointFitsPortalBand(fracture.state, item, portal, 0.5)))}`,
      );
    }
    if (!fractureStrokeFitsPortal(fracture, portal)) {
      throw new Error(
        `Portal E2E: terminal fracture did not reach ${label} portal; `
          + `styles=${JSON.stringify([...new Set(fracture.strokes.map(({ style }) => style))])}`,
      );
    }
  }
  const fractureDensity = {
    size3: fractureStrokeDensity(fracture, sharedRightPortal),
    size1: fractureStrokeDensity(fracture, sharedLeftPortal),
  };
  if (fractureDensity.size3.length !== 3
    || fractureDensity.size3.some((count) => count < 1)
    || fractureDensity.size1.length !== 1
    || fractureDensity.size1[0] < 1) {
    throw new Error(`Portal E2E: fracture density left an authored portal cell visually untouched (${JSON.stringify(fractureDensity)})`);
  }
  await page.screenshot({ path: resolve(output, "multiportal-terminal-fracture.png") });

  await installSeamFixture();
  const seamBefore = await captureFrame();
  const seamState = seamBefore.state;
  if (JSON.stringify(seamState.puzzle.seams) !== JSON.stringify([
    { orientation: "horizontal", offset: 3, start: 0, size: 6 },
    { orientation: "vertical", offset: 3, start: 0, size: 2 },
  ])) {
    throw new Error(`Portal E2E: BoardSeamSpec did not survive into the runtime snapshot (${JSON.stringify(seamState.puzzle.seams)})`);
  }
  const horizontalBoundaryY = seamState.board.innerY + 3 * seamState.board.cell;
  const horizontalProbeX = seamState.board.innerX + 1.5 * seamState.board.cell;
  const verticalBoundaryX = seamState.board.innerX + 3 * seamState.board.cell;
  const verticalProbeY = seamState.board.innerY + 0.5 * seamState.board.cell;
  const seamTolerance = Math.max(2, seamState.board.cell * 0.045);
  const horizontalRails = seamBefore.draws
    .filter(({ pathname }) => /\/neutral-horizontal-[123]\.png$/.test(pathname))
    .map((draw) => ({ ...draw, bounds: destinationBounds(draw) }))
    .filter(({ bounds }) => bounds.left <= horizontalProbeX && bounds.right >= horizontalProbeX);
  const upperChamberBottomRails = horizontalRails.filter(({ bounds }) => (
    Math.abs(bounds.top - horizontalBoundaryY) <= seamTolerance
  ));
  const lowerChamberTopRails = horizontalRails.filter(({ bounds }) => (
    Math.abs(bounds.bottom - horizontalBoundaryY) <= seamTolerance
  ));
  const verticalRails = seamBefore.draws
    .filter(({ pathname }) => /\/neutral-vertical-[123]\.png$/.test(pathname))
    .map((draw) => ({ ...draw, bounds: destinationBounds(draw) }))
    .filter(({ bounds }) => bounds.top <= verticalProbeY && bounds.bottom >= verticalProbeY);
  const leftChamberRightRails = verticalRails.filter(({ bounds }) => (
    Math.abs(bounds.left - verticalBoundaryX) <= seamTolerance
  ));
  const rightChamberLeftRails = verticalRails.filter(({ bounds }) => (
    Math.abs(bounds.right - verticalBoundaryX) <= seamTolerance
  ));
  if (!upperChamberBottomRails.length || !lowerChamberTopRails.length
    || !leftChamberRightRails.length || !rightChamberLeftRails.length) {
    throw new Error(
      `Portal E2E: horizontal/partial-vertical seam did not render two opposing neutral rails; `
        + `horizontal=${JSON.stringify(horizontalRails.map(({ bounds }) => bounds))} `
        + `vertical=${JSON.stringify(verticalRails.map(({ bounds }) => bounds))}`,
    );
  }
  const lastBlockDrawIndex = Math.max(-1, ...seamBefore.draws
    .filter(({ pathname }) => /\/blocks\/formal-v1\/(?:red|orange|blue|green)-single\.png$/.test(pathname))
    .map(({ index }) => index));
  const seamRailDraws = [
    ...upperChamberBottomRails,
    ...lowerChamberTopRails,
    ...leftChamberRightRails,
    ...rightChamberLeftRails,
  ];
  if (lastBlockDrawIndex < 0 || seamRailDraws.some(({ index }) => index <= lastBlockDrawIndex)) {
    throw new Error(
      `Portal E2E: seam rails were not deferred above floor/block content; `
        + `lastBlock=${lastBlockDrawIndex} rails=${seamRailDraws.map(({ index }) => index).join(",")}`,
      );
  }
  const shutterDrawIndices = namedDraws(seamBefore, "shutter-v1.png").map(({ index }) => index);
  const firstSeamRailDrawIndex = Math.min(...seamRailDraws.map(({ index }) => index));
  if (!shutterDrawIndices.length || Math.max(...shutterDrawIndices) >= firstSeamRailDrawIndex) {
    throw new Error(
      `Portal E2E: chamber shutter was not painted below the seam rim; `
        + `shutter=${shutterDrawIndices.join(",")} firstSeamRail=${firstSeamRailDrawIndex}`,
    );
  }

  const seamUpperPortal = { side: "bottom", origin: [4, 2], size: 1 };
  const seamLowerPortal = { side: "top", origin: [4, 3], size: 1 };
  const seamFixed = new Map(seamState.puzzle.gates.map((gate) => [gate.id, gate]));
  if (seamFixed.get("seam-upper-red")?.frozen !== 0
    || seamFixed.get("seam-lower-blue")?.frozen !== 2) {
    throw new Error(`Portal E2E: opposing seam portals lost independent logical state (${JSON.stringify([...seamFixed])})`);
  }
  const seamRedDraw = requirePortalDraw(seamBefore, "gate-red-horizontal-1.png", seamUpperPortal, "upper chamber directed seam portal")[0];
  const seamBlueDraw = requirePortalDraw(seamBefore, "gate-blue-horizontal-1.png", seamLowerPortal, "lower chamber directed seam portal")[0];
  requirePortalDraw(seamBefore, "ice-horizontal-1.png", seamLowerPortal, "independently frozen lower seam portal");
  if (Math.abs(seamRedDraw.bounds.top - horizontalBoundaryY) > seamTolerance
    || Math.abs(seamBlueDraw.bounds.bottom - horizontalBoundaryY) > seamTolerance) {
    throw new Error(
      `Portal E2E: opposing seam portals faced the wrong chambers; `
        + `upper=${JSON.stringify(seamRedDraw.bounds)} lower=${JSON.stringify(seamBlueDraw.bounds)}`,
      );
  }
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    game.selectedId = "seam-red-exit";
    game.dirty = true;
  });
  const seamSelected = await captureFrame();
  const selectionDrawIndices = namedDraws(seamSelected, "selection-frame.png").map(({ index }) => index);
  const seamSelectedRailIndices = seamSelected.draws
    .filter(({ pathname }) => /\/(?:neutral|gate-(?:red|blue))-(?:horizontal|vertical)-[123]\.png$/.test(pathname))
    .map(({ index }) => index);
  if (!selectionDrawIndices.length
    || !seamSelectedRailIndices.length
    || Math.min(...selectionDrawIndices) <= Math.max(...seamSelectedRailIndices)) {
    throw new Error(
      `Portal E2E: selection overlay did not remain above the seam rim; `
        + `selection=${selectionDrawIndices.join(",")} rim=${seamSelectedRailIndices.join(",")}`,
      );
  }
  await page.screenshot({ path: resolve(output, "board-seam-selection-overlay.png") });
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    game.selectedId = undefined;
    game.dirty = true;
    game.render();
  });
  await page.screenshot({ path: resolve(output, "board-seam-opposing-portals.png") });

  const blockedStart = {
    x: seamState.board.innerX + 2.5 * seamState.board.cell,
    y: seamState.board.innerY + 1.5 * seamState.board.cell,
  };
  const blockedEnd = {
    x: seamState.board.innerX + 3.55 * seamState.board.cell,
    y: blockedStart.y,
  };
  await page.mouse.move(blockedStart.x, blockedStart.y);
  await page.mouse.down();
  await page.mouse.move(blockedEnd.x, blockedEnd.y, { steps: 7 });
  await page.mouse.up();
  const blockedState = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const blockedBlock = blockedState.puzzle.blocks.find(({ id }) => id === "seam-cross-block");
  if (!blockedBlock || blockedBlock.x !== 2 || blockedBlock.y !== 1) {
    throw new Error(`Portal E2E: real Pointer crossed a partial vertical seam (${JSON.stringify(blockedBlock)})`);
  }

  await installSeamFixture();
  const seamExitStart = {
    x: seamState.board.innerX + 4.5 * seamState.board.cell,
    y: seamState.board.innerY + 2.5 * seamState.board.cell,
  };
  const seamExitEnd = {
    x: seamExitStart.x,
    y: seamState.board.innerY + 3.55 * seamState.board.cell,
  };
  await page.mouse.move(seamExitStart.x, seamExitStart.y);
  await page.mouse.down();
  await page.mouse.move(seamExitEnd.x, seamExitEnd.y, { steps: 7 });
  const seamExit = await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    return {
      debug: game.getDebugState(),
      ghost: game.exitGhosts[0] ? {
        side: game.exitGhosts[0].side,
        gateId: game.exitGhosts[0].gateId,
        portalIndex: game.exitGhosts[0].portalIndex,
        portal: game.exitGhosts[0].portal,
      } : undefined,
    };
  });
  const seamGhostFrame = await captureFrame();
  await page.mouse.up();
  if (seamExit.debug.puzzle.blocks.some(({ id }) => id === "seam-red-exit")
    || seamExit.ghost?.side !== "bottom"
    || seamExit.ghost?.gateId !== "seam-upper-red"
    || seamExit.ghost?.portalIndex !== 0
    || JSON.stringify(seamExit.ghost?.portal) !== JSON.stringify(seamUpperPortal)) {
    throw new Error(`Portal E2E: directed seam exit resolved the wrong physical portal (${JSON.stringify(seamExit)})`);
  }
  const ghostDraws = namedDraws(seamGhostFrame, "red-single.png").filter(({ clips }) => clips.length);
  const sourceCenter = {
    x: seamState.board.innerX + 4.5 * seamState.board.cell,
    y: seamState.board.innerY + 2.5 * seamState.board.cell,
  };
  const oppositeCenter = {
    x: sourceCenter.x,
    y: seamState.board.innerY + 3.5 * seamState.board.cell,
  };
  const pointInRect = (point, rect) => (
    point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom
  );
  const hasSourceOnlyCompartmentClip = ghostDraws.some(({ clips }) => clips.some(({ rects }) => (
    rects.some((rect) => pointInRect(sourceCenter, rect))
      && !rects.some((rect) => pointInRect(oppositeCenter, rect))
  )));
  if (!hasSourceOnlyCompartmentClip) {
    throw new Error(
      `Portal E2E: exit ghost was not clipped to its source chamber and can reappear beyond the seam; `
        + `clips=${JSON.stringify(ghostDraws.map(({ clips }) => clips))}`,
    );
  }
  await page.screenshot({ path: resolve(output, "board-seam-directed-exit.png") });

  await installLegacyFixture();
  const legacy = await captureFrame();
  const legacyPortals = [
    ["gate-red-horizontal-1.png", { side: "top", origin: [0, 0], size: 1 }],
    ["gate-blue-vertical-1.png", { side: "right", origin: [4, 0], size: 1 }],
    ["gate-green-horizontal-1.png", { side: "bottom", origin: [4, 4], size: 1 }],
    ["gate-yellow-vertical-1.png", { side: "left", origin: [0, 4], size: 1 }],
  ];
  for (const [name, portal] of legacyPortals) {
    requirePortalDraw(legacy, name, portal, `legacy ${portal.side} gate`);
  }
  await page.screenshot({ path: resolve(output, "legacy-four-side-control.png") });

  // The deterministic fixture timeline above is complete. Resume real browser
  // time so each final LEVELS entry can finish its level-specific art request
  // before the production screenshot is inspected.
  await page.clock.resume();
  const runtimePortalLevels = [];
  for (const levelId of [73, 75, 83, 130]) {
    await installRuntimeLevel(levelId);
    const frame = await captureFrame();
    const portalEvidence = verifyRuntimePortalVisuals(frame, levelId);
    const sameColorStateContrasts = portalEvidence.sameColorIndependent.filter(({ frozenValues }) => (
      new Set(frozenValues).size > 1
    ));
    for (const { color, ids, frozenValues } of sameColorStateContrasts) {
      if (!frozenValues.some((value) => value === 0) || !frozenValues.some((value) => value > 0)) continue;
      const devices = [...frame.state.puzzle.gates, ...frame.state.puzzle.flipDoors]
        .filter((device) => ids.includes(device.id));
      for (const device of devices) {
        for (let portalIndex = 0; portalIndex < device.portals.length; portalIndex += 1) {
          const portal = device.portals[portalIndex];
          const evidence = portalEvidence.verified.find((item) => (
            item.id === device.id && item.portalIndex === portalIndex
          ));
          const hasIce = portalIceDraws(frame, portal).length > 0;
          const expectedIce = !evidence?.runtimeRetired && device.frozen > 0;
          if (hasIce !== expectedIce) {
            throw new Error(
              `Portal E2E: runtime Lv${levelId} same-colour ${color} gates shared visual ice state `
                + `(${device.id} frozen=${device.frozen}, retired=${Boolean(evidence?.runtimeRetired)}, hasIce=${hasIce})`,
            );
          }
        }
      }
    }
    const screenshot = `runtime-level-${String(levelId).padStart(3, "0")}-portals.png`;
    await page.screenshot({ path: resolve(output, screenshot) });
    runtimePortalLevels.push({
      levelId,
      gateCount: frame.state.puzzle.gates.length,
      flipDoorCount: frame.state.puzzle.flipDoors.length,
      authoredPortalCount: portalEvidence.verified.length,
      visibleAuthoredPortalCount: portalEvidence.verified.filter(({ runtimeRetired }) => !runtimeRetired).length,
      runtimeRetiredNoTargetPortals: portalEvidence.verified
        .filter(({ runtimeRetired }) => runtimeRetired)
        .map(({ id, color, portalIndex, portal }) => ({ id, color, portalIndex, portal })),
      frozenPortalCount: portalEvidence.verified.filter(({ frozen }) => frozen > 0).length,
      starPortalCount: portalEvidence.verified.filter(({ star }) => star).length,
      sameColorIndependent: portalEvidence.sameColorIndependent,
      screenshot,
    });
  }

  const runtimeSeamLevels = [];
  for (const levelId of [176, 185]) {
    await installRuntimeLevel(levelId);
    const frame = await captureFrame();
    const portalEvidence = verifyRuntimePortalVisuals(frame, levelId);
    const seams = frame.state.puzzle.seams;
    if (seams.length !== 1
      || seams[0].orientation !== "horizontal"
      || seams[0].start !== 0
      || seams[0].size !== frame.state.puzzle.width) {
      throw new Error(`Portal E2E: runtime Lv${levelId} is not the authored full-span horizontal seam (${JSON.stringify(seams)})`);
    }
    const seam = seams[0];
    const boundaryY = frame.state.board.innerY + seam.offset * frame.state.board.cell;
    const tolerance = Math.max(2, frame.state.board.cell * 0.045);
    const seamBaseDraws = frame.draws
      .filter(({ pathname }) => /\/(?:neutral-horizontal-[123]|gate-(?:red|blue|green|yellow|orange|pink|purple|cyan)-horizontal-[123])\.png$/.test(pathname))
      .map((draw) => ({ ...draw, bounds: destinationBounds(draw) }));
    const upperFaces = seamBaseDraws.filter(({ bounds }) => Math.abs(bounds.top - boundaryY) <= tolerance);
    const lowerFaces = seamBaseDraws.filter(({ bounds }) => Math.abs(bounds.bottom - boundaryY) <= tolerance);
    for (let x = 0; x < frame.state.puzzle.width; x += 1) {
      const centerX = frame.state.board.innerX + (x + 0.5) * frame.state.board.cell;
      if (!upperFaces.some(({ bounds }) => bounds.left <= centerX && bounds.right >= centerX)
        || !lowerFaces.some(({ bounds }) => bounds.left <= centerX && bounds.right >= centerX)) {
        throw new Error(
          `Portal E2E: runtime Lv${levelId} seam cell ${x} did not expose both chamber faces; `
            + `upper=${JSON.stringify(upperFaces.map(({ bounds }) => bounds))} `
            + `lower=${JSON.stringify(lowerFaces.map(({ bounds }) => bounds))}`,
        );
      }
    }
    const seamPortals = portalEvidence.verified.filter(({ portal }) => (
      (portal.side === "bottom" && portal.origin[1] === seam.offset - 1)
        || (portal.side === "top" && portal.origin[1] === seam.offset)
    ));
    if (!seamPortals.length) {
      throw new Error(`Portal E2E: runtime Lv${levelId} lost every directed exit on its seam`);
    }
    const shutterDrawIndices = namedDraws(frame, "shutter-v1.png").map(({ index }) => index);
    const seamDrawIndices = [...upperFaces, ...lowerFaces].map(({ index }) => index);
    if (!frame.state.puzzle.shutters.some(({ count, skin }) => count > 0 && skin !== "staging")
      || !shutterDrawIndices.length
      || seamDrawIndices.some((index) => index <= Math.max(...shutterDrawIndices))) {
      throw new Error(
        `Portal E2E: runtime Lv${levelId} seam rail/gate was not restored above active shutters; `
          + `shutter=${shutterDrawIndices.join(",")} seam=${seamDrawIndices.join(",")}`,
      );
    }
    const pixelEvidence = await page.evaluate(({ y, left, right, halfHeight }) => {
      const canvas = document.querySelector("canvas");
      const context = canvas.getContext("2d");
      const x = Math.max(0, Math.floor(left));
      const top = Math.max(0, Math.floor(y - halfHeight));
      const width = Math.max(1, Math.min(canvas.width - x, Math.ceil(right - left)));
      const height = Math.max(1, Math.min(canvas.height - top, Math.ceil(halfHeight * 2)));
      const data = context.getImageData(x, top, width, height).data;
      const colors = new Set();
      let opaque = 0;
      for (let index = 0; index < data.length; index += 16) {
        if (data[index + 3] > 0) opaque += 1;
        colors.add(`${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`);
      }
      return { width, height, sampledOpaquePixels: opaque, sampledUniqueColors: colors.size };
    }, {
      y: boundaryY,
      left: frame.state.board.innerX,
      right: frame.state.board.innerX + frame.state.puzzle.width * frame.state.board.cell,
      halfHeight: Math.max(3, frame.state.board.cell * 0.28),
    });
    if (pixelEvidence.sampledOpaquePixels < 20 || pixelEvidence.sampledUniqueColors < 8) {
      throw new Error(`Portal E2E: runtime Lv${levelId} seam split is not visibly painted (${JSON.stringify(pixelEvidence)})`);
    }
    const screenshot = `runtime-level-${levelId}-seam.png`;
    await page.screenshot({ path: resolve(output, screenshot) });

    const dragCase = levelId === 176
      ? { blockId: "lv176-opening-b07", deltaY: -1.15 }
      : { blockId: "lv185-opening-b14", deltaY: 1.15 };
    const dragSetup = await page.evaluate(({ blockId }) => {
      const game = window.__COLOR_ESCAPE__;
      game.model.shutters.forEach((shutter) => { shutter.count = 0; });
      game.selectedId = undefined;
      game.activePointer = undefined;
      game.dragVisual = undefined;
      game.dirty = true;
      game.render();
      const block = game.model.getBlock(blockId);
      const board = game.boardLayout();
      const [dx, dy] = block.shape[0];
      return {
        before: { x: block.x, y: block.y },
        start: {
          x: board.innerX + (block.x + dx + 0.5) * board.cell,
          y: board.innerY + (block.y + dy + 0.5) * board.cell,
        },
        cell: board.cell,
      };
    }, dragCase);
    await page.mouse.move(dragSetup.start.x, dragSetup.start.y);
    await page.mouse.down();
    const selectedAfterDown = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().selectedId);
    if (selectedAfterDown !== dragCase.blockId) {
      throw new Error(`Portal E2E: runtime Lv${levelId} real Pointer did not select ${dragCase.blockId}`);
    }
    await page.mouse.move(
      dragSetup.start.x,
      dragSetup.start.y + dragCase.deltaY * dragSetup.cell,
      { steps: 8 },
    );
    await page.mouse.up();
    const afterDrag = await page.evaluate((blockId) => {
      const debug = window.__COLOR_ESCAPE__.getDebugState();
      const block = debug.puzzle.blocks.find((candidate) => candidate.id === blockId);
      return { block, selectedId: debug.selectedId, activePointer: debug.activePointer };
    }, dragCase.blockId);
    if (!afterDrag.block
      || afterDrag.block.x !== dragSetup.before.x
      || afterDrag.block.y !== dragSetup.before.y
      || afterDrag.selectedId
      || afterDrag.activePointer !== undefined) {
      throw new Error(`Portal E2E: runtime Lv${levelId} real Pointer crossed its board seam (${JSON.stringify(afterDrag)})`);
    }
    runtimeSeamLevels.push({
      levelId,
      seam,
      authoredPortalCount: portalEvidence.verified.length,
      visibleAuthoredPortalCount: portalEvidence.verified.filter(({ runtimeRetired }) => !runtimeRetired).length,
      runtimeRetiredNoTargetPortals: portalEvidence.verified
        .filter(({ runtimeRetired }) => runtimeRetired)
        .map(({ id, color, portalIndex, portal }) => ({ id, color, portalIndex, portal })),
      seamPortals,
      activeShutterIds: frame.state.puzzle.shutters.filter(({ count, skin }) => count > 0 && skin !== "staging").map(({ id }) => id),
      shutterBeforeSeamVisuals: true,
      pointerCrossingRejected: true,
      pixelEvidence,
      screenshot,
    });
  }

  if (errors.length) throw new Error(`Portal E2E browser errors: ${errors.join(" | ")}`);
  const report = {
    status: "PASS",
    fixture: {
      localPortalDirections: ["top", "right", "bottom", "left"],
      sameColourIndependentGateIds: ["red-frozen-independent", "red-open-independent"],
      sharedMultiportalFlipDoorId: "purple-shared-local-door",
      sharedMultiportalTerminalIce: {
        portalSizes: fracturePulse.portalSizes,
        previous: fracturePulse.previous,
        remaining: fracturePulse.remaining,
        fractureAtSeconds: fracturePulse.age,
        countersCleared: true,
        bothPortalsFractured: true,
        whiteCrackStrokesPerPortalCell: fractureDensity,
      },
      pointerExit: {
        blockId: "red-local-exit",
        side: afterPointer.ghost.side,
        travelCells: afterPointer.ghost.travelCells,
        sourceX: afterPointer.ghost.sourceX,
        sourceY: afterPointer.ghost.sourceY,
      },
      boardSeams: {
        authored: seamState.puzzle.seams,
        horizontalFullSpanOpposingNeutralRails: true,
        verticalPartialOpposingNeutralRails: true,
        railsDeferredAboveBlocks: true,
        shutterPaintedBelowRails: true,
        selectionPaintedAboveRails: true,
        opposingPortalGateIds: ["seam-upper-red", "seam-lower-blue"],
        opposingPortalStatesIndependent: true,
        pointerCrossingRejected: true,
        directedExit: {
          gateId: seamExit.ghost.gateId,
          portalIndex: seamExit.ghost.portalIndex,
          portal: seamExit.ghost.portal,
          ghostClippedToSourceChamber: true,
        },
      },
      legacyControlSides: ["top", "right", "bottom", "left"],
    },
    runtimeLevels: {
      source: "ColorEscapeGame.loadLevel against final LEVELS",
      localPortalLevels: runtimePortalLevels,
      seamLevels: runtimeSeamLevels,
    },
    screenshots: [
      "portal-fixture-before.png",
      "portal-fixture-after-pointer.png",
      "multiportal-terminal-fracture.png",
      "board-seam-opposing-portals.png",
      "board-seam-selection-overlay.png",
      "board-seam-directed-exit.png",
      "legacy-four-side-control.png",
      ...runtimePortalLevels.map(({ screenshot }) => screenshot),
      ...runtimeSeamLevels.map(({ screenshot }) => screenshot),
    ],
  };
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log("Gate portal UI E2E: PASS");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
