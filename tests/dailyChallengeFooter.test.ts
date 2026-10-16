import { describe, expect, it, vi } from "vitest";
import { createDailyChallengeState } from "../src/core/dailyChallenge";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { DAILY_CHALLENGE_LAYOUT } from "../src/game/dailyChallengeLayout";

const renderLabels = (feedback?: { text: string; color: string }) => {
  const label = vi.fn();
  const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
    ctx: {}, dailyChallengeArt: {}, dailyChallengeFeedback: feedback,
    dailyChallengeState: () => createDailyChallengeState("2026-10-08", 5, undefined, 12345),
    dailyChallengeResetCountdown: () => "13:02:23",
    drawDim: vi.fn(), drawCollectionImageContained: vi.fn(), label,
    withHomeArtboard: (draw: () => void) => draw(),
    drawPressable: (_key: string, _rect: unknown, draw: () => void) => draw(),
  });
  game.drawDailyChallenge();
  return label.mock.calls;
};

describe("daily challenge footer", () => {
  it("uses 挑战 for the exhausted-attempt ad button while retaining its ad icon", () => {
    const labels: string[] = [];
    const ctx = {
      globalAlpha: 1,
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    } as unknown as CanvasRenderingContext2D;
    const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
      ctx,
      buttonPressVisualScale: () => 1,
      label: (text: string) => labels.push(text),
      tr: (key: string) => key,
    });
    game.drawDailyChallengeRewardAdVisual("dailyChallenge.1", { x: 0, y: 0, width: 147, height: 72 }, "挑战", false);
    expect(labels).toContain("挑战");
    expect(labels).not.toContain("看广告");
    expect(labels).not.toContain("+1");
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("omits both static footer descriptions but keeps the header and reset countdown", () => {
    const calls = renderLabels();
    const texts = calls.map(([text]) => text);
    expect(texts).not.toContain("每档每日仅可挑战成功一次");
    expect(texts.some(text => /每日\d+次.*北京时间/.test(String(text)))).toBe(false);
    expect(calls.some(([, , y]) => y === DAILY_CHALLENGE_LAYOUT.hint.y
      || y === DAILY_CHALLENGE_LAYOUT.recovery.y)).toBe(false);
    expect(texts).not.toContain("难度选择");
    expect(texts.filter(text => text === "每日挑战")).toHaveLength(1);
    expect(texts).toContain("剩余次数：");
    expect(texts).toContain("距离重置：13:02:23");
    expect(texts.filter(text => text === "挑战")).toHaveLength(3);
  });

  it("still shows actionable failure feedback instead of silently swallowing it", () => {
    const feedback = { text: "当前阶段暂无可用关卡", color: "#a5414b" };
    const calls = renderLabels(feedback);
    expect(calls).toContainEqual(expect.arrayContaining([
      feedback.text, DAILY_CHALLENGE_LAYOUT.hint.x, DAILY_CHALLENGE_LAYOUT.hint.y,
      DAILY_CHALLENGE_LAYOUT.hint.size, feedback.color,
    ]));
    expect(calls.some(([, , y]) => y === DAILY_CHALLENGE_LAYOUT.recovery.y)).toBe(false);
  });
});
