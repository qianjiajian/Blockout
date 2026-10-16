import { LEAGUE_TIERS, type LeagueSettlement } from "../core/league";
import type { LeagueSettlementArt } from "./LeagueSettlementArtStore";
import { leagueArtRect, LEAGUE_ART_OFFSET_Y, LEAGUE_ART_SCALE } from "./leagueSuppliedLayout";
import type { LeaguePaint, LeagueRect } from "./leagueUi";

/** Coordinates in the supplied 720 × 1584 season settlement reference. */
export const LEAGUE_SETTLEMENT_UI = {
  back: leagueArtRect(31, 86, 88, 88),
  claim: leagueArtRect(218, 1322, 283, 95),
};
const BADGES = ["bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "glory"] as const;

export interface LeagueSettlementView {
  pending: LeagueSettlement;
  persistence?: "unknown" | "rejected";
  action?: "open" | "refresh" | "claim" | "intro";
  artError?: boolean;
}

export function drawLeagueSettlement(
  ctx: CanvasRenderingContext2D, view: LeagueSettlementView,
  paint: Pick<LeaguePaint, "button" | "pressable">, art?: LeagueSettlementArt,
): void {
  ctx.save();
  ctx.fillStyle = "#343f84";
  ctx.fillRect(0, 0, 496, 1078);
  const text = (value: string, x: number, y: number, size: number, color = "#8c5fff",
    align: CanvasTextAlign = "center", maxWidth = 580, outline?: string): void => {
    ctx.font = `700 ${size * LEAGUE_ART_SCALE}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    const px = x * LEAGUE_ART_SCALE, py = y * LEAGUE_ART_SCALE + LEAGUE_ART_OFFSET_Y;
    if (outline) {
      ctx.strokeStyle = outline; ctx.lineWidth = 5 * LEAGUE_ART_SCALE; ctx.lineJoin = "round";
      ctx.strokeText(value, px, py, maxWidth * LEAGUE_ART_SCALE);
    }
    ctx.fillStyle = color; ctx.fillText(value, px, py, maxWidth * LEAGUE_ART_SCALE);
  };
  const press = (key: string, rect: LeagueRect, draw: () => void): void => {
    if (paint.pressable) paint.pressable(key, rect, draw); else draw();
  };
  const retry = view.persistence !== undefined;
  const key = retry ? "league.retry" : "league.claim";
  const label = retry ? (view.action === "claim" ? "重试领取" : "重试保存") : "领取并继续";
  if (!art) {
    text("联赛结算", 360, 150, 62, "#fff");
    text(view.artError ? "界面加载失败" : "界面加载中…", 360, 800, 32, "#fff");
    if (view.persistence !== "unknown") paint.button("league.back", LEAGUE_SETTLEMENT_UI.back, "‹");
    if (retry) paint.button(key, LEAGUE_SETTLEMENT_UI.claim, label);
    else if (view.artError) paint.button("league.artRetry", LEAGUE_SETTLEMENT_UI.claim, "重新加载");
    ctx.restore(); return;
  }
  const image = (name: keyof LeagueSettlementArt, x: number, y: number, width: number, height: number): void => {
    const img = art[name], r = leagueArtRect(x, y, width, height);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.min(r.width / iw, r.height / ih), w = iw * scale, h = ih * scale;
    ctx.drawImage(img, r.x + (r.width - w) / 2, r.y + (r.height - h) / 2, w, h);
  };
  const s = view.pending;
  image("background", 0, 0, 720, 1584);
  if (view.persistence !== "unknown") press("league.back", LEAGUE_SETTLEMENT_UI.back, () => image("back-button", 31, 86, 88, 88));
  image("star", 180, 101, 44, 52); image("star", 493, 101, 44, 52);
  text("联赛结算", 360, 148, 62, "#fff", "center", 272);
  image("stage-panel", 40, 187, 639, 456);
  image("glow", 118, 230, 485, 418);
  image(s.toTier === 1 ? "silver-hero" : BADGES[s.toTier], 212, 302, 296, 271);
  image("sparkles", 162, 275, 402, 314);
  text(`第${s.seasonIndex + 1}期　已结束`, 360, 229, 30, "#fff", "center", 290, "#c88936");
  image("result-panel", 32, 662, 650, 856);
  text("赛季成绩", 360, 714, 45, "#fff");
  image("rank-icon", 98, 766, 66, 62);
  text("最终排名", 172, 812, 30, "#7951ff", "left", 180);
  text(`第${s.rank}名`, 610, 812, 30, "#7951ff", "right", 240);
  image("divider", 96, 836, 524, 3);
  image("score-icon", 102, 849, 59, 67);
  text("联赛积分", 172, 894, 30, "#7951ff", "left", 180);
  text(String(s.score), 610, 894, 30, "#7951ff", "right", 240);
  text("段位变化", 360, 985, 45);
  image(BADGES[s.fromTier], 143, 991, 160, 145);
  image("arrow", 303, 1025, 114, 73);
  image(BADGES[s.toTier], 417, 991, 160, 145);
  const tierName = (tier: number, stars: number): string => `${LEAGUE_TIERS[tier]}${tier === 7 ? ` ${stars}星` : ""}`;
  text(tierName(s.fromTier, s.fromStars), 223, 1172, 30, "#8c5fff", "center", 225);
  text(tierName(s.toTier, s.toStars), 497, 1172, 30, "#8c5fff", "center", 225);
  image("divider", 96, 1201, 524, 3);
  ctx.font = `700 ${45 * LEAGUE_ART_SCALE}px "Microsoft YaHei",sans-serif`;
  const rewardWidth = Math.min(300, ctx.measureText(`+${s.coins}`).width / LEAGUE_ART_SCALE);
  const rewardLeft = (720 - (54 + 10 + rewardWidth)) / 2;
  image("coin", rewardLeft, 1234, 54, 56);
  text(`+${s.coins}`, rewardLeft + 64, 1281, 45, "#8c5fff", "left", 300);
  press(key, LEAGUE_SETTLEMENT_UI.claim, () => {
    image("claim-button", 218, 1322, 283, 95);
    text(label, 360, 1382, 35, "#fff", "center", 245, "#217321");
  });
  text(s.score === 0 ? "本期0分，无金币奖励" : "领取后进入当前赛季", 360, 1480, 26, "#8c5fff", "center", 540);
  ctx.restore();
}
