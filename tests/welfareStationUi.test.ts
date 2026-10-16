import { describe, expect, it } from "vitest";
import { GAME_LANGUAGES } from "../src/game/localization";
import { WELFARE_TEXT, WELFARE_TEXT_KEYS, welfareText } from "../src/game/welfareLocalization";
import { WELFARE_BOOSTER_KINDS, WELFARE_CARD_KINDS, drawWelfareStation, welfareClaimLabel,
  welfareStationLayout, type WelfareCardState, type WelfareRect, type WelfareStationView } from "../src/game/welfareStationUi";

function inside(rect: WelfareRect, parent: WelfareRect) {
  expect(rect.x).toBeGreaterThanOrEqual(parent.x);
  expect(rect.y).toBeGreaterThanOrEqual(parent.y);
  expect(rect.x + rect.width).toBeLessThanOrEqual(parent.x + parent.width);
  expect(rect.y + rect.height).toBeLessThanOrEqual(parent.y + parent.height);
}

describe("welfare station presentation", () => {
  it.each(["zh-CN", "zh-TW"])("names the navigation tab 商城 without renaming the station content in %s", (language) => {
    expect(welfareText(language, "navigationTitle")).toBe("商城");
    expect(welfareText(language, "title")).toBe("福利站");
  });

  it.each([1416, 1110])("makes the last claim and daily reset reachable above a viewport ending at %i", (bottom) => {
    const top = welfareStationLayout(0, bottom), last = welfareStationLayout(100_000, bottom);
    expect(top.scroll).toBe(0);
    expect(last.scroll).toBe(last.maxScroll);
    inside(last.cards.booster.claim, last.viewport);
    inside(last.footer, last.viewport);
    expect(top.cards.inspiration.bounds.y).toBeGreaterThan(top.viewport.y);
    expect(top.cards.booster.bounds.y - last.cards.booster.bounds.y).toBe(last.maxScroll);
    for (const kind of WELFARE_CARD_KINDS) {
      inside(last.cards[kind].claim, last.cards[kind].bounds);
      inside(last.cards[kind].remaining, last.cards[kind].bounds);
    }
  });

  it("keeps choice hit areas distinct from each other and from the shared claim button", () => {
    const layout = welfareStationLayout(70);
    WELFARE_BOOSTER_KINDS.forEach((kind, i) => {
      const choice = layout.boosters[kind];
      inside(choice, layout.cards.booster.bounds);
      expect(choice.y + choice.height).toBeLessThan(layout.cards.booster.claim.y);
      if (i) {
        const previous = layout.boosters[WELFARE_BOOSTER_KINDS[i - 1]];
        expect(previous.x + previous.width).toBeLessThan(choice.x);
      }
    });
    inside(layout.cards.inspiration.collection!, layout.cards.inspiration.bounds);
  });

  it("clamps scrolling and keeps feedback-dependent state outside the geometry", () => {
    expect(welfareStationLayout(-100).scroll).toBe(0);
    expect(welfareStationLayout(Number.NaN).scroll).toBe(0);
    expect(welfareStationLayout(0, Number.NaN)).toEqual(welfareStationLayout());
    expect(welfareStationLayout(50_000).scroll).toBe(welfareStationLayout().maxScroll);
  });

  it.each([0, 78])("keeps the safe header clear and the last card reachable with top offset %i", (offset) => {
    const layout = welfareStationLayout(0, 1416, offset), last = welfareStationLayout(100_000, 1416, offset);
    expect(layout.resourceTopOffset).toBe(offset);
    expect(layout.resources.coins.y).toBe(73 + offset);
    expect(layout.resources.coins.y + layout.resources.coins.height + 8).toBeLessThan(layout.viewport.y);
    expect(layout.cards.inspiration.bounds.y).toBe(222 + offset);
    expect(layout.viewport.y + layout.viewport.height).toBe(1416);
    expect(layout.maxScroll).toBe(Math.max(0, 1400 + offset - 1416));
    inside(last.cards.booster.claim, last.viewport);
    inside(last.footer, last.viewport);
  });

  it("draws wallets, cards and clipping at the same safe coordinates used by layout", () => {
    const view: WelfareStationView = {
      language: "zh-CN", coins: 12345, inspiration: 6789, lives: 4, scroll: 0,
      cards: {
        inspiration: { remaining: 3, state: "unavailable" }, coins: { remaining: 3, state: "unavailable" },
        lives: { remaining: 3, state: "unavailable" }, booster: { remaining: 10, state: "unavailable" },
      },
      boosters: { time: { stock: 0, unlocked: true }, rocket: { stock: 0, unlocked: true }, pulse: { stock: 0, unlocked: true } },
      selectedBooster: "time", canOpenCollection: false,
    };
    const draw = (offset: number, boosterRemaining = 10, resourceRemaining = 3) => {
      const labels: { value: string; x: number; y: number }[] = [], clips: WelfareRect[] = [];
      const methods: Record<string, unknown> = {
        globalAlpha: 1,
        fillText: (value: string, x: number, y: number) => labels.push({ value, x, y }),
        measureText: (value: string) => ({ width: value.length * 15 }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        rect: (x: number, y: number, width: number, height: number) => clips.push({ x, y, width, height }),
      };
      const ctx = new Proxy(methods, { get: (target, key: string) => target[key] ?? (() => {}) }) as unknown as CanvasRenderingContext2D;
      const layout = drawWelfareStation(ctx, { ...view, resourceTopOffset: offset,
        cards: {
          inspiration: { ...view.cards.inspiration, remaining: resourceRemaining },
          coins: { ...view.cards.coins, remaining: resourceRemaining },
          lives: { ...view.cards.lives, remaining: resourceRemaining },
          booster: { ...view.cards.booster, remaining: boosterRemaining },
        } });
      return { labels, clips, layout };
    };
    const original = draw(0), shifted = draw(78);
    for (const value of ["12345", "6789", "4/5", "灵感 ×50"]) {
      const before = original.labels.find((label) => label.value === value)!;
      const after = shifted.labels.find((label) => label.value === value)!;
      expect(after.x).toBe(before.x);
      expect(after.y).toBe(before.y + 78);
    }
    expect(shifted.labels.some(label => label.value === "福利站" || label.value === "观看广告，领取补给")).toBe(false);
    expect(shifted.labels.some(label => label.value === "灵感 ×10")).toBe(false);
    expect(shifted.labels.filter(label => label.value === "今日剩余 3/3 次")).toHaveLength(3);
    expect(shifted.labels.filter(label => label.value === "今日共剩余 10/10 次")).toHaveLength(1);
    const claimed = draw(78, 9);
    expect(claimed.labels.filter(label => label.value === "今日共剩余 9/10 次")).toHaveLength(1);
    expect(claimed.labels.filter(label => label.value === "今日剩余 3/3 次")).toHaveLength(3);
    for (const remaining of [2, 1, 0]) {
      const resourceClaimed = draw(78, 10, remaining);
      expect(resourceClaimed.labels.filter(label => label.value === `今日剩余 ${remaining}/3 次`)).toHaveLength(3);
      expect(resourceClaimed.labels.filter(label => label.value === "今日共剩余 10/10 次")).toHaveLength(1);
    }
    expect(shifted.clips).toContainEqual(shifted.layout.viewport);
    expect(welfareStationLayout(0, 1416, Number.NaN).resourceTopOffset).toBe(0);
    expect(welfareStationLayout(0, 1416, -10).resourceTopOffset).toBe(0);
  });

  it("distinguishes pending-save retry from requesting another ad", () => {
    expect(welfareClaimLabel("zh-CN", { state: "available", remaining: 2 })).toBe("看广告领取");
    expect(welfareClaimLabel("zh-CN", { state: "retry", remaining: 2 })).toBe("重试领取");
    expect(welfareClaimLabel("zh-CN", { state: "cooldown", remaining: 1, cooldownSeconds: 32.1 })).toBe("33秒后领取");
    expect(welfareClaimLabel("en", { state: "unavailable", remaining: 2 })).toBe("Ad unavailable");
  });

  it("provides every visible claim state and interpolated copy in all ten languages", () => {
    const states: WelfareCardState[] = ["available", "unavailable", "cooldown", "limit", "full", "locked", "loading", "waiting", "retry", "blocked"];
    for (const language of GAME_LANGUAGES) {
      for (const key of WELFARE_TEXT_KEYS) {
        expect(WELFARE_TEXT[language][key].trim(), `${language}.${key}`).not.toBe("");
        expect(welfareText(language, key, { count: 1, limit: 10, amount: 50, seconds: 60 })).not.toMatch(/\{\w+\}/);
      }
      for (const state of states) expect(welfareClaimLabel(language, { remaining: 1, state, cooldownSeconds: 2 })).not.toBe("");
      expect(welfareText(language, "sharedRemaining", { count: 1, limit: 10 })).toContain("1/10");
      expect(welfareText(language, "remaining", { count: 3, limit: 3 })).toContain("3/3");
      expect(welfareText(language, "readyCollection")).toContain("50");
    }
    expect(welfareText("unsupported", "title")).toBe(welfareText("en", "title"));
    expect(welfareText("constructor", "title")).toBe(welfareText("en", "title"));
  });
});
