import { WELFARE_DAILY_LIMITS, WELFARE_REWARD_AMOUNTS } from "../core/welfareRewards";
import { welfareText, type WelfareTextKey } from "./welfareLocalization";
import type { WelfareSuppliedArt } from "./welfareSuppliedArt";

export interface WelfareRect { x: number; y: number; width: number; height: number }
export type WelfareCardKind = "inspiration" | "coins" | "lives" | "booster";
export type WelfareBoosterKind = "time" | "rocket" | "pulse";
export type WelfareIconKind = "inspiration" | "coins" | "life" | WelfareBoosterKind;
export type WelfareCardState = "available" | "unavailable" | "cooldown" | "limit" | "full"
  | "locked" | "loading" | "waiting" | "retry" | "blocked";
export interface WelfareCardView {
  remaining: number;
  state: WelfareCardState;
  cooldownSeconds?: number;
}
export interface WelfareStationView {
  language: string;
  coins: number;
  inspiration: number;
  lives: number;
  livesLabel?: string;
  scroll: number;
  cards: Record<WelfareCardKind, WelfareCardView>;
  boosters: Record<WelfareBoosterKind, { stock: number; unlocked: boolean }>;
  selectedBooster: WelfareBoosterKind;
  inspirationShortfall?: number;
  canOpenCollection: boolean;
  feedback?: string;
  viewportBottom?: number;
  resourceTopOffset?: number;
}
export interface WelfareStationPaint {
  art?: WelfareSuppliedArt;
  icons?: Partial<Record<WelfareIconKind, HTMLImageElement>>;
  pressable?: (key: string, rect: WelfareRect, draw: () => void) => void;
}
export interface WelfareCardLayout {
  bounds: WelfareRect;
  icon: WelfareRect;
  title: WelfareRect;
  description: WelfareRect;
  remaining: WelfareRect;
  claim: WelfareRect;
  collection?: WelfareRect;
}
export interface WelfareStationLayout {
  resourceTopOffset: number;
  resources: Record<"coins" | "inspiration" | "lives", WelfareRect>;
  resourceIcons: Record<"coins" | "inspiration" | "lives", WelfareRect>;
  panel: WelfareRect;
  viewport: WelfareRect;
  maxScroll: number;
  scroll: number;
  cards: Record<WelfareCardKind, WelfareCardLayout>;
  boosters: Record<WelfareBoosterKind, WelfareRect>;
  footer: WelfareRect;
}

export const WELFARE_CARD_KINDS: readonly WelfareCardKind[] = ["inspiration", "coins", "lives", "booster"];
export const WELFARE_BOOSTER_KINDS: readonly WelfareBoosterKind[] = ["time", "rocket", "pulse"];
export const WELFARE_STATION_UI = {
  width: 720, height: 1584,
  viewport: { x: 0, y: 174, width: 720, height: 1242 },
  coins: { x: 47, y: 73, width: 157, height: 56 },
  inspiration: { x: 308, y: 73, width: 157, height: 56 },
  lives: { x: 543, y: 73, width: 157, height: 56 },
  contentBottom: 1400,
} as const;

/** Scroll and hit geometry share these exact home-art coordinates. */
export function welfareStationLayout(scroll = 0, viewportBottom = 1416, resourceTopOffset = 0): WelfareStationLayout {
  const safeTop = Math.max(0, Math.min(1584 - WELFARE_STATION_UI.viewport.y - 1,
    Number.isFinite(resourceTopOffset) ? resourceTopOffset : 0));
  const shiftHeader = (rect: WelfareRect): WelfareRect => ({ ...rect, y: rect.y + safeTop });
  const viewportY = WELFARE_STATION_UI.viewport.y + safeTop;
  const bottom = Math.max(viewportY + 1,
    Math.min(1584, Number.isFinite(viewportBottom) ? viewportBottom : 1416));
  const viewport = { ...WELFARE_STATION_UI.viewport, y: viewportY, height: bottom - viewportY };
  const maxScroll = Math.max(0, WELFARE_STATION_UI.contentBottom + safeTop - bottom);
  const offset = Math.max(0, Math.min(maxScroll, Number.isFinite(scroll) ? scroll : 0));
  const shift = (rect: WelfareRect): WelfareRect => ({ ...rect, y: rect.y + safeTop - offset });
  const card = (top: number, icon: WelfareRect, claimY: number, remainingY: number, inspiration = false): WelfareCardLayout => {
    return {
      bounds: shift({ x: 45, y: top, width: 630, height: 193 }),
      icon: shift(icon),
      title: shift({ x: 238, y: top + (inspiration ? 18 : 31), width: 419, height: 54 }),
      description: shift({ x: 237, y: top + 68, width: 418, height: 40 }),
      remaining: shift({ x: 233, y: remainingY, width: 202, height: 38 }),
      claim: shift({ x: 455, y: claimY, width: 212, height: 71 }),
      ...(inspiration ? { collection: shift({ x: 237, y: top + 68, width: 418, height: 40 }) } : {}),
    };
  };
  const boosterTop = 869 + safeTop - offset;
  const boosters = Object.fromEntries(WELFARE_BOOSTER_KINDS.map((kind, i) => [kind,
    shift({ x: [68, 269, 470][i], y: 976, width: 182, height: 230 }),
  ])) as Record<WelfareBoosterKind, WelfareRect>;
  return {
    resourceTopOffset: safeTop,
    resources: {
      coins: shiftHeader(WELFARE_STATION_UI.coins),
      inspiration: shiftHeader(WELFARE_STATION_UI.inspiration),
      lives: shiftHeader(WELFARE_STATION_UI.lives),
    },
    resourceIcons: {
      coins: shiftHeader({ x: 32, y: 68, width: 66, height: 71 }),
      inspiration: shiftHeader({ x: 266, y: 64, width: 89, height: 80 }),
      lives: shiftHeader({ x: 515, y: 65, width: 78, height: 74 }),
    },
    panel: shift({ x: 0, y: 174, width: 720, height: 1248 }),
    viewport, maxScroll, scroll: offset,
    cards: {
      inspiration: card(222, { x: 74, y: 261, width: 126, height: 111 }, 330, 351, true),
      coins: card(432, { x: 67, y: 481, width: 146, height: 93 }, 541, 560),
      lives: card(645, { x: 79, y: 692, width: 116, height: 105 }, 752, 770),
      booster: {
        bounds: { x: 45, y: boosterTop, width: 630, height: 436 },
        icon: boosters.time,
        title: { x: 143, y: boosterTop + 16, width: 176, height: 56 },
        description: { x: 466, y: boosterTop + 25, width: 181, height: 51 },
        remaining: { x: 66, y: boosterTop + 369, width: 253, height: 38 },
        claim: { x: 455, y: boosterTop + 352, width: 212, height: 71 },
      },
    },
    boosters,
    footer: shift({ x: 195, y: 1328, width: 337, height: 30 }),
  };
}

export function welfareClaimLabel(language: string, card: WelfareCardView): string {
  const key: WelfareTextKey = card.state === "available" ? "watchAd" : card.state;
  return welfareText(language, key, { seconds: Math.max(0, Math.ceil(card.cooldownSeconds ?? 0)) });
}

function path(ctx: CanvasRenderingContext2D, r: WelfareRect, radius: number): void {
  const d = Math.min(radius, r.width / 2, r.height / 2), right = r.x + r.width, bottom = r.y + r.height;
  ctx.beginPath();
  ctx.moveTo(r.x + d, r.y); ctx.lineTo(right - d, r.y);
  ctx.quadraticCurveTo(right, r.y, right, r.y + d); ctx.lineTo(right, bottom - d);
  ctx.quadraticCurveTo(right, bottom, right - d, bottom); ctx.lineTo(r.x + d, bottom);
  ctx.quadraticCurveTo(r.x, bottom, r.x, bottom - d); ctx.lineTo(r.x, r.y + d);
  ctx.quadraticCurveTo(r.x, r.y, r.x + d, r.y); ctx.closePath();
}

export function drawWelfareStation(ctx: CanvasRenderingContext2D, view: WelfareStationView,
  paint: WelfareStationPaint = {}): WelfareStationLayout {
  const layout = welfareStationLayout(view.scroll, view.viewportBottom, view.resourceTopOffset);
  if (paint.art) return drawSuppliedWelfareStation(ctx, view, paint, layout);
  const tr = (key: WelfareTextKey, values?: Record<string, string | number>) => welfareText(view.language, key, values);
  const press = (key: string, rect: WelfareRect, draw: () => void) =>
    paint.pressable ? paint.pressable(key, rect, draw) : draw();
  const gradient = (r: WelfareRect, top: string, bottom: string) => {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.height);
    g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
  };
  const round = (r: WelfareRect, fill: string | CanvasGradient, stroke?: string, width = 2, radius = 24) => {
    path(ctx, r, radius); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  const text = (value: string, r: WelfareRect, size: number, color = "#642a1c",
    align: CanvasTextAlign = "left", outline?: string) => {
    ctx.font = `700 ${size}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const x = align === "center" ? r.x + r.width / 2 : align === "right" ? r.x + r.width : r.x;
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = Math.max(3, size * 0.10); ctx.strokeText(value, x, r.y + r.height / 2, r.width); }
    ctx.fillStyle = color; ctx.fillText(value, x, r.y + r.height / 2, r.width);
  };
  const wrap = (value: string, r: WelfareRect, size: number, color = "#713a29") => {
    ctx.font = `600 ${size}px "Microsoft YaHei",sans-serif`;
    if (ctx.measureText(value).width <= r.width) { text(value, r, size, color); return; }
    const characters = Array.from(value);
    let split = 1;
    while (split < characters.length && ctx.measureText(characters.slice(0, split + 1).join("")).width <= r.width) split++;
    // Prefer a word boundary for Latin/Cyrillic without sacrificing CJK wrapping.
    const prefix = characters.slice(0, split).join("");
    const space = prefix.lastIndexOf(" ");
    if (space > split * 0.55) split = space;
    text(characters.slice(0, split).join("").trim(), { ...r, height: r.height / 2 }, size, color);
    text(characters.slice(split).join("").trim(), { ...r, y: r.y + r.height / 2, height: r.height / 2 }, size, color);
  };
  const icon = (kind: WelfareIconKind, r: WelfareRect) => {
    const image = paint.icons?.[kind];
    if (image && (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0) {
      const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
      const scale = Math.min(r.width / w, r.height / h);
      ctx.drawImage(image, r.x + (r.width - w * scale) / 2, r.y + (r.height - h * scale) / 2, w * scale, h * scale);
    } else {
      const symbols: Record<WelfareIconKind, string> = { inspiration: "◆", coins: "●", life: "♥", time: "◷", rocket: "↑", pulse: "◉" };
      const colors: Record<WelfareIconKind, string> = { inspiration: "#bd42f1", coins: "#ffc83e", life: "#f34f62", time: "#439ee6", rocket: "#ee5b43", pulse: "#38c5d9" };
      text(symbols[kind], r, Math.min(r.width, r.height) * 0.72, colors[kind], "center", "#713847");
    }
  };
  const count = (value: number, cap?: number) => {
    const finite = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return cap === undefined ? finite : Math.min(cap, finite);
  };
  const claim = (kind: WelfareCardKind) => {
    const card = view.cards[kind], r = layout.cards[kind].claim;
    const enabled = card.state === "available" || card.state === "retry";
    press(`welfare.claim.${kind}`, r, () => {
      round({ ...r, y: r.y + 4 }, "#637144", undefined, 0, 34);
      round(r, gradient(r, enabled ? "#8de949" : "#c2c8ab", enabled ? "#149e16" : "#899775"), enabled ? "#438626" : "#7d8868", 3, 34);
      round({ x: r.x + 5, y: r.y + 5, width: r.width - 10, height: r.height * 0.43 },
        enabled ? "rgba(237,255,175,.35)" : "rgba(255,255,255,.18)", undefined, 0, 25);
      const video = card.state === "available";
      if (video) {
        ctx.beginPath(); ctx.moveTo(r.x + 27, r.y + 18); ctx.lineTo(r.x + 27, r.y + r.height - 18);
        ctx.lineTo(r.x + 53, r.y + r.height / 2); ctx.closePath();
        ctx.fillStyle = "#fffce6"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#2a7325"; ctx.stroke();
      }
      text(welfareClaimLabel(view.language, card), { x: r.x + (video ? 62 : 12), y: r.y + 2,
        width: r.width - (video ? 74 : 24), height: r.height - 4 }, 27,
      enabled ? "#fffcec" : "#f7f7eb", "center", enabled ? "#2c741c" : "#707d5c");
    });
  };

  ctx.save();
  try {
    ctx.fillStyle = gradient({ x: 0, y: 0, width: 720, height: 1584 }, "#38398e", "#4053aa");
    ctx.fillRect(0, 0, 720, 1584);
    ctx.fillStyle = "rgba(141,135,241,.07)";
    for (let y = 115; y < 1650; y += 150) for (let x = -75; x < 800; x += 150) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 75, y + 75);
      ctx.lineTo(x, y + 150); ctx.lineTo(x - 75, y + 75); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = gradient({ x: 0, y: 0, width: 720, height: 112 + layout.resourceTopOffset }, "#693dff", "#4c25e7");
    ctx.fillRect(0, 0, 720, 112 + layout.resourceTopOffset);
    ctx.fillStyle = "#ffd975"; ctx.fillRect(0, 107 + layout.resourceTopOffset, 720, 7);
    ctx.fillStyle = "#fff2c0"; ctx.fillRect(0, 107 + layout.resourceTopOffset, 720, 2);
    for (const [kind, amount] of [
      ["coins", String(count(view.coins))], ["inspiration", String(count(view.inspiration))],
      ["lives", view.livesLabel ?? `${count(view.lives)}/5`],
    ] as const) {
      const r = layout.resources[kind];
      round({ ...r, y: r.y + 3 }, "#45248a", undefined, 0, 24);
      round(r, gradient(r, "#fff5dd", "#f8dfb8"), "#ddae6c", 2, 24);
      icon(kind === "lives" ? "life" : kind, { x: r.x - 8, y: r.y - 11, width: 68, height: 71 });
      text(amount, { x: r.x + 66, y: r.y, width: r.width - 79, height: r.height }, 35, "#641d10", "center");
    }
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(layout.viewport.x, layout.viewport.y, layout.viewport.width, layout.viewport.height); ctx.clip();
      for (const kind of WELFARE_CARD_KINDS) {
        const card = layout.cards[kind], r = card.bounds;
        if (r.y + r.height < layout.viewport.y || r.y > layout.viewport.y + layout.viewport.height) continue;
        round({ ...r, y: r.y + 6 }, "rgba(26,25,61,.45)", undefined, 0, 27);
        round(r, gradient(r, "#fff7e5", "#fae8c9"), kind === "inspiration" ? "#ffd158" : "#fff6e5", kind === "inspiration" ? 5 : 3, 27);
        round({ x: r.x + 7, y: r.y + 7, width: r.width - 14, height: r.height - 14 }, "rgba(255,255,255,.02)",
          kind === "inspiration" ? "#fff6b6" : "rgba(212,184,143,.35)", 2, 22);
        if (kind !== "booster") {
          round(card.icon, gradient(card.icon, "#ecd0ab", "#f4d7b1"), "#d9b38d", 2, 20);
          const isCollection = kind === "inspiration" && view.canOpenCollection;
          const art = { x: card.icon.x + 9, y: card.icon.y + 7, width: card.icon.width - 18,
            height: card.icon.height - (isCollection ? 51 : 15) };
          icon(kind === "lives" ? "life" : kind, art);
          const amount = WELFARE_REWARD_AMOUNTS[kind];
          text(`${tr(kind)} ×${amount}`, card.title, 42, "#ffe279", "left", "#6d2411");
          if (kind === "inspiration") {
            const caption = view.canOpenCollection ? tr("readyCollection")
              : view.inspirationShortfall === undefined ? tr("nextArtwork")
                : tr("shortfall", { amount: count(view.inspirationShortfall) });
            wrap(caption, card.description, 24);
            if (view.canOpenCollection && card.collection) {
              const collection = card.collection;
              press("welfare.collection", collection, () => {
                round(collection, gradient(collection, "#fff0b6", "#e7ba72"), "#c1904e", 2, 15);
                text(tr("goCollection"), collection, 22, "#783f27", "center");
              });
            }
          }
        } else {
          text(`${tr("booster")} ×1`, card.title, 39, "#ffe279", "left", "#6d2411");
          round(card.description, "#efd2b4", undefined, 0, 18);
          text(tr("choose"), card.description, 23, "#713123", "center");
          for (const booster of WELFARE_BOOSTER_KINDS) {
            const rect = layout.boosters[booster], selected = view.selectedBooster === booster;
            const state = view.boosters[booster];
            press(`welfare.select.${booster}`, rect, () => {
              round(rect, gradient(rect, selected ? "#fff2c5" : "#f5e1c3", "#f2d8b0"), selected ? "#ffc335" : "#ddb990", selected ? 5 : 2, 18);
              if (selected) round({ x: rect.x + 5, y: rect.y + 5, width: rect.width - 10, height: rect.height - 10 }, "rgba(255,255,255,.03)", "#fffbe3", 2, 14);
              ctx.save();
              if (!state.unlocked || state.stock >= 9) ctx.globalAlpha *= 0.48;
              icon(booster, { x: rect.x + 22, y: rect.y + 12, width: rect.width - 44, height: 134 });
              ctx.restore();
              text(tr(booster), { x: rect.x + 8, y: rect.y + 147, width: rect.width - 16, height: 31 }, 25, "#642a1c", "center");
              const stock = { x: rect.x + 14, y: rect.y + 182, width: rect.width - 28, height: 29 };
              round(stock, "#eacdAB", undefined, 0, 15);
              text(state.unlocked ? tr("inventory", { count: count(state.stock, 9) }) : tr("locked"), stock, 20, "#713123", "center");
              if (selected) {
                const x = rect.x + rect.width - 13, y = rect.y + 9;
                ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fillStyle = "#e7a728"; ctx.fill();
                ctx.lineWidth = 3; ctx.strokeStyle = "#fff5c5"; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 2, y + 6); ctx.lineTo(x + 9, y - 6);
                ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.lineCap = "round"; ctx.stroke();
              }
            });
          }
        }
        round(card.remaining, "#efd5b9", undefined, 0, 22);
        const limit = WELFARE_DAILY_LIMITS[kind];
        text(tr(kind === "booster" ? "sharedRemaining" : "remaining", { count: count(view.cards[kind].remaining, limit), limit }),
          { ...card.remaining, x: card.remaining.x + 9, width: card.remaining.width - 18 }, 23, "#723522", "center");
        claim(kind);
      }
      text(tr("reset"), layout.footer, 23, "#e2e0ff", "center");
    } finally { ctx.restore(); }
    if (layout.maxScroll > 0) {
      const track = { x: 699, y: layout.viewport.y + 12, width: 5, height: layout.viewport.height - 24 };
      const thumbHeight = Math.max(45, track.height * layout.viewport.height / (layout.viewport.height + layout.maxScroll));
      const thumbY = track.y + (track.height - thumbHeight) * layout.scroll / layout.maxScroll;
      round({ ...track, y: thumbY, height: thumbHeight }, "rgba(235,223,255,.5)", undefined, 0, 3);
    }
  } finally { ctx.restore(); }
  return layout;
}

/** Native 720×1584 supplied composition. Text and all transaction state stay dynamic. */
function drawSuppliedWelfareStation(ctx: CanvasRenderingContext2D, view: WelfareStationView,
  paint: WelfareStationPaint, layout: WelfareStationLayout): WelfareStationLayout {
  const art = paint.art!;
  const tr = (key: WelfareTextKey, values?: Record<string, string | number>) => welfareText(view.language, key, values);
  const count = (value: number, cap = Number.MAX_SAFE_INTEGER) =>
    Number.isFinite(value) ? Math.max(0, Math.min(cap, Math.floor(value))) : 0;
  const press = (key: string, rect: WelfareRect, draw: () => void) =>
    paint.pressable ? paint.pressable(key, rect, draw) : draw();
  const image = (bitmap: HTMLImageElement, rect: WelfareRect) => ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
  const text = (value: string, rect: WelfareRect, size: number, color = "#97511e",
    centered = false, outline?: string) => {
    ctx.save();
    ctx.font = `700 ${size}px "Microsoft YaHei",sans-serif`;
    const measured = ctx.measureText(value).width;
    const fitted = measured > rect.width ? size * rect.width / measured : size;
    ctx.font = `700 ${fitted}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = centered ? "center" : "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const x = centered ? rect.x + rect.width / 2 : rect.x, y = rect.y + rect.height / 2;
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = Math.max(2, fitted * .10); ctx.strokeText(value, x, y, rect.width); }
    ctx.fillStyle = color; ctx.fillText(value, x, y, rect.width); ctx.restore();
  };
  const twoLines = (value: string) => {
    const chars = Array.from(value), middle = Math.ceil(chars.length / 2);
    let split = middle;
    const spaces = chars.flatMap((char, index) => char === " " ? [index] : []);
    if (spaces.length) split = spaces.reduce((nearest, index) =>
      Math.abs(index - middle) < Math.abs(nearest - middle) ? index : nearest, spaces[0]);
    return [chars.slice(0, split).join("").trim(), chars.slice(split).join("").trim()];
  };
  const widthAt = (value: string, size: number) => {
    ctx.save(); ctx.font = `700 ${size}px "Microsoft YaHei",sans-serif`;
    const width = ctx.measureText(value).width; ctx.restore(); return width;
  };
  const description = (value: string, rect: WelfareRect, color = "#97511e") => {
    if (widthAt(value, 22) <= rect.width) { text(value, rect, 22, color); return; }
    twoLines(value).forEach((line, index) => text(line,
      { ...rect, y: rect.y + index * rect.height / 2, height: rect.height / 2 }, 18, color));
  };
  const label = (value: string, rect: WelfareRect, size: number, color: string, outline?: string) => {
    // Long translations retain legible lettering inside the supplied button/title slice.
    if (widthAt(value, size) <= rect.width * 1.25) { text(value, rect, size, color, true, outline); return; }
    twoLines(value).forEach((line, index) => text(line,
      { ...rect, y: rect.y + index * rect.height / 2, height: rect.height / 2 },
      Math.min(size, rect.height * .4), color, true, outline));
  };
  const claim = (kind: WelfareCardKind) => {
    const card = view.cards[kind], rect = layout.cards[kind].claim;
    const available = card.state === "available", green = available || card.state === "retry";
    press(`welfare.claim.${kind}`, rect, () => {
      image(green ? art.buttonGreen : art.buttonYellow, rect);
      if (available) image(art.video, { x: rect.x + 34, y: rect.y + 15, width: 43, height: 32 });
      const caption = available && (view.language === "zh-CN" || view.language === "zh-TW")
        ? (view.language === "zh-CN" ? "领取" : "領取") : welfareClaimLabel(view.language, card);
      label(caption, { x: rect.x + (available ? 84 : 12), y: rect.y + 2,
        width: rect.width - (available ? 101 : 24), height: rect.height - 10 }, 29, "#ffffff",
      green ? "#32843b" : "#a56b00");
    });
  };
  const resourceArt = { coins: art.resourceCoins, inspiration: art.resourceInspiration, lives: art.resourceLife };
  const rewardArt = { inspiration: art.rewardInspiration, coins: art.rewardCoins, lives: art.rewardLife };
  const boosterArt = { time: art.boosterTime, rocket: art.boosterRocket, pulse: art.boosterPulse };
  const shift = layout.panel.y - 174;
  ctx.save();
  try {
    ctx.fillStyle = "#3c468f"; ctx.fillRect(0, 0, 720, 1584);
    ctx.fillStyle = "rgba(141,135,241,.09)";
    for (let y = 174; y < 1650; y += 150) for (let x = -75; x < 800; x += 150) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 75, y + 75);
      ctx.lineTo(x, y + 150); ctx.lineTo(x - 75, y + 75); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#613bff"; ctx.fillRect(0, 0, 720, 174 + layout.resourceTopOffset);
    ctx.fillStyle = "#f6cd65"; ctx.fillRect(0, 168 + layout.resourceTopOffset, 720, 10);
    ctx.fillStyle = "#fff5d3"; ctx.fillRect(0, 169 + layout.resourceTopOffset, 720, 3);
    for (const [kind, amount] of [["coins", String(count(view.coins))], ["inspiration", String(count(view.inspiration))],
      ["lives", view.livesLabel ?? `${count(view.lives)}/5`]] as const) {
      const rect = layout.resources[kind];
      image(art.walletPanel, rect); image(resourceArt[kind], layout.resourceIcons[kind]);
      text(amount, { x: rect.x + 51, y: rect.y, width: rect.width - 61, height: rect.height }, 34, "#905014", true);
    }
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(layout.viewport.x, layout.viewport.y, layout.viewport.width, layout.viewport.height); ctx.clip();
      image(art.panel, layout.panel);
      for (const kind of WELFARE_CARD_KINDS) {
        const card = layout.cards[kind];
        if (card.bounds.y + card.bounds.height < layout.viewport.y || card.bounds.y > layout.viewport.y + layout.viewport.height) continue;
        if (kind !== "booster") {
          image(rewardArt[kind], card.icon);
          text(`${tr(kind)} ×${WELFARE_REWARD_AMOUNTS[kind]}`, card.title, 41);
          if (kind === "inspiration") {
            if (view.canOpenCollection && card.collection) press("welfare.collection", card.collection, () => {
              description(`${tr("readyCollection")} · ${tr("goCollection")}`, card.description, "#7753bd");
            });
            else description(view.inspirationShortfall === undefined ? tr("nextArtwork")
              : tr("shortfall", { amount: count(view.inspirationShortfall) }), card.description);
          }
        } else {
          image(art.boosterTitlePanel, { x: 64, y: 878 + shift, width: 266, height: 72 });
          image(art.gift, { x: 83, y: 885 + shift, width: 54, height: 56 });
          label(`${tr("booster")} ×1`, card.title, 29, "#ffffff", "#7750bf");
          image(art.choicePanel, card.description); text(tr("choose"), card.description, 27, "#ffffff", true);
          for (const [index, booster] of WELFARE_BOOSTER_KINDS.entries()) {
            const rect = layout.boosters[booster], state = view.boosters[booster];
            press(`welfare.select.${booster}`, rect, () => {
              ctx.save(); if (!state.unlocked || state.stock >= 9) ctx.globalAlpha *= .48;
              const width = [128, 120, 138][index];
              image(boosterArt[booster], { x: [88, 294, 494][index], y: rect.y + 12, width, height: 136 });
              ctx.restore();
              text(tr(booster), { x: rect.x + 8, y: rect.y + 149, width: rect.width - 16, height: 35 }, 27, "#844329", true);
              const stock = { x: rect.x + 16, y: rect.y + 186, width: 149, height: 36 };
              image(art.stockPanel, stock);
              text(state.unlocked ? tr("inventory", { count: count(state.stock, 9) }) : tr("locked"), stock, 22, "#844329", true);
              if (view.selectedBooster === booster) image(art.selected,
                { x: rect.x - 12, y: rect.y - 12, width: 201, height: 249 });
            });
          }
        }
        image(kind === "booster" ? art.sharedRemainingPanel : art.remainingPanel, card.remaining);
        text(tr(kind === "booster" ? "sharedRemaining" : "remaining", {
          count: count(view.cards[kind].remaining, WELFARE_DAILY_LIMITS[kind]), limit: WELFARE_DAILY_LIMITS[kind],
        }), { ...card.remaining, x: card.remaining.x + 7, width: card.remaining.width - 14 }, 22, "#97511e", true);
        claim(kind);
      }
      image(art.line, { x: 27, y: 1339 + shift, width: 666, height: 5 });
      const resetCaption = tr("reset");
      const resetWidth = Math.min(layout.footer.width - 30, widthAt(resetCaption, 22));
      const clockX = layout.footer.x + (layout.footer.width - resetWidth - 30) / 2;
      image(art.clock, { x: clockX, y: layout.footer.y, width: 25, height: 25 });
      text(resetCaption, { ...layout.footer, x: clockX + 30, width: resetWidth }, 22, "#ffffff", true);
    } finally { ctx.restore(); }
    if (layout.maxScroll > 0) {
      const trackHeight = layout.viewport.height - 24;
      const height = Math.max(45, trackHeight * layout.viewport.height / (layout.viewport.height + layout.maxScroll));
      const y = layout.viewport.y + 12 + (trackHeight - height) * layout.scroll / layout.maxScroll;
      path(ctx, { x: 708, y, width: 5, height }, 3); ctx.fillStyle = "rgba(235,223,255,.5)"; ctx.fill();
    }
  } finally { ctx.restore(); }
  return layout;
}
