import { describe, expect, it, vi } from "vitest";
import { JOURNEY_MILESTONE_REWARDS } from "../src/core/journeyProgress";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { FORMAL_JOURNEY_LAYOUT } from "../src/game/formalPageLayout";

const reward = JOURNEY_MILESTONE_REWARDS.find(entry => entry.level === 15)!;
const image = { width: 80, height: 80, naturalWidth: 80, naturalHeight: 80 };

/** Exercise the actual Journey renderers and localized labels. The single row
 * isolates a permanent task from the independently moving progress marker. */
function renderingGame(highestLevel: number, completed = false, claimed = false) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.save = game.sanitizeSave({ ...game.sanitizeSave(undefined), language: "zh-CN",
    highestLevel, currentLevel: highestLevel, rewardedLevels: completed ? [15] : [],
    bestStars: {}, journeyProgress: { claimedMilestoneLevels: claimed ? [15] : [], seenEpisodeUnlockLevels: [] },
  });
  game.screen = "levels";
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  const row = { kind: "reward", levelId: 15, reward, y: 450, contentY: 450 };
  game.journeyScrollView = () => ({ entries: [row], rewardRows: [row], scrollOffset: 0, contentOffset: 0 });
  const popup = { panel: image, close: image, rewardButton: image, rewards: { heart: image } };
  const art = { screen: "levels", background: image, track: image, trackProgress: image,
    levelCardActiveLeft: image, levelCardLeft: image, rewardCardActiveRight: image, rewardCardRight: image,
    currentMarker: image, topHeader: image, titlePanel: image, title: image,
    rewards: { heart: image, complete: image },
    deferred: { presentation: popup, requestEpisodes: vi.fn(() => Promise.resolve()) },
  };
  game.formalPageArtFor = () => art;
  game.journeyEpisodeIndexesInView = () => [];
  game.requestJourneyPresentationArt = vi.fn();
  game.ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
    fillRect: vi.fn(), drawImage: vi.fn() };
  game.drawFormalPageReference = (_reference: unknown, draw: () => void) => draw();
  game.withHomeArtboard = (draw: () => void) => draw();
  game.withPopupEntrance = (_key: string, _bounds: unknown, draw: () => void) => draw();
  game.drawPressable = (_key: string, _rect: unknown, draw: () => void) => draw();
  game.drawJourneyVerticalTiles = vi.fn();
  game.drawDiscoveryBadge = vi.fn();
  game.drawMainNavigation = vi.fn();
  game.label = vi.fn();
  return game;
}

describe("Journey tasks display the level that must be completed", () => {
  it.each([15, 16, 17])("keeps task 15 fixed while the progress marker reaches %i", highestLevel => {
    const game = renderingGame(highestLevel);
    game.drawLevels(false);
    const labels = game.label.mock.calls;
    const cardLabels = labels.filter(([, x]: [string, number]) => x === FORMAL_JOURNEY_LAYOUT.typography.levelLabel.x);
    expect(cardLabels.map(([text]: [string]) => text)).toEqual(["通过关卡", "15"]);
    expect(labels.map(([text]: [string]) => text)).toContain("15");
    if (highestLevel !== 15) expect(labels.map(([text]: [string]) => text)).not.toContain(String(highestLevel));
    expect(game.journeyAnchorLevel()).toBe(highestLevel);
  });

  it.each([[false, false, 0], [true, false, 1], [true, true, 0]] as const)(
    "shows a reward badge only for a completed, unclaimed task (completed=%s, claimed=%s)",
    (completed, claimed, badges) => {
      const game = renderingGame(16, completed, claimed);
      game.drawLevels(false);
      expect(game.drawDiscoveryBadge).toHaveBeenCalledTimes(badges);
    },
  );

  it.each([false, true])("uses the same fixed completion target in the reward dialog (completed=%s)", completed => {
    const game = renderingGame(17, completed);
    game.journeyPresentation = { event: { type: "milestone_reward", level: 15, reward },
      phase: "overlay", age: 0, intent: "reward_inspection" };
    game.drawJourneyPresentationOverlay();
    const texts = game.label.mock.calls.map(([text]: [string]) => text);
    expect(texts).toContain("通过第 15 关");
    expect(texts).not.toContain("通过第 17 关");
    expect(texts).toContain(completed ? game.tr("journey.tapToClaim") : game.tr("journey.claimAfterLevel", { level: 15 }));
  });
});
