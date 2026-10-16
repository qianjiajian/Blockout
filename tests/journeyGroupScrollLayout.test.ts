// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  JOURNEY_EPISODES,
  JOURNEY_LEVEL_COUNT,
  JOURNEY_MILESTONE_LEVELS,
  JOURNEY_MILESTONE_REWARDS,
  JOURNEY_THEME_TITLES,
} from "../src/core/journeyProgress";
import { GAME_ART } from "../src/game/artManifest";
import { FORMAL_JOURNEY_LAYOUT } from "../src/game/formalPageLayout";
import { JourneyDeferredArt } from "../src/game/JourneyDeferredArt";

const sourcePath = fileURLToPath(new URL("../src/game/ColorEscapeGame.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

const privateMethodSource = (signature: string): string => {
  const start = source.indexOf(signature);
  expect(start, `missing ${signature}`).toBeGreaterThanOrEqual(0);
  const followingSource = source.slice(start + signature.length);
  const nextMethodOffset = followingSource.search(/\n  private [A-Za-z]/);
  return source.slice(start, nextMethodOffset < 0 ? source.length : start + signature.length + nextMethodOffset);
};

describe("Journey continuous long-map scroll plane", () => {
  it("renders to the navigation bar while keeping its protruding tab out of the gesture viewport", () => {
    expect(FORMAL_JOURNEY_LAYOUT.renderViewport).toEqual({
      x: 0,
      y: 180,
      width: 720,
      height: 1268,
    });
    expect(FORMAL_JOURNEY_LAYOUT.contentViewport).toEqual({
      x: 0,
      y: 180,
      width: 720,
      height: 1240,
    });
    expect(FORMAL_JOURNEY_LAYOUT.renderViewport.y + FORMAL_JOURNEY_LAYOUT.renderViewport.height).toBe(1448);
    expect(FORMAL_JOURNEY_LAYOUT.renderViewport.height - FORMAL_JOURNEY_LAYOUT.contentViewport.height).toBe(28);
    expect(FORMAL_JOURNEY_LAYOUT.scrollViewport).toEqual(FORMAL_JOURNEY_LAYOUT.contentViewport);
    expect(FORMAL_JOURNEY_LAYOUT.referenceCardViewport.y).toBeGreaterThan(FORMAL_JOURNEY_LAYOUT.contentViewport.y);
  });

  it("defines twenty ten-level chapters that reuse the ten supplied themes", () => {
    expect(JOURNEY_EPISODES.map(({ index, title, startLevel, endLevel, unlockLevel }) => ({
      index,
      title,
      startLevel,
      endLevel,
      unlockLevel,
    }))).toEqual(Array.from({ length: 20 }, (_, offset) => ({
      index: offset + 1,
      title: `${JOURNEY_THEME_TITLES[offset % 10]}${offset < 10 ? "" : " II"}`,
      startLevel: offset * 10 + 1,
      endLevel: offset * 10 + 10,
      unlockLevel: offset * 10 + 1,
    })));
  });

  it("uses explicit milestones and keeps every ten-level episode populated", () => {
    const firstHundredLevels = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
    const firstHundredRewards = [
      { level: 10, kind: "coins", amount: 50 },
      { level: 15, kind: "unlimited_lives", amount: 1_800 },
      { level: 25, kind: "unlimited_lives", amount: 3_600 },
      { level: 30, kind: "pulse", amount: 1 },
      { level: 35, kind: "time", amount: 1 },
      { level: 45, kind: "rocket", amount: 1 },
      { level: 50, kind: "unlimited_lives", amount: 1_800 },
      { level: 60, kind: "pulse", amount: 1 },
      { level: 65, kind: "time", amount: 1 },
      { level: 75, kind: "rocket", amount: 1 },
      { level: 80, kind: "pulse", amount: 1 },
      { level: 90, kind: "unlimited_lives", amount: 3_600 },
      { level: 95, kind: "time", amount: 1 },
    ] as const;
    expect(JOURNEY_MILESTONE_LEVELS).toEqual([
      ...firstHundredLevels,
      ...firstHundredLevels.map((level) => level + 100),
    ]);
    expect(JOURNEY_MILESTONE_REWARDS).toEqual([
      ...firstHundredRewards,
      ...firstHundredRewards.map((reward) => ({ ...reward, level: reward.level + 100 })),
    ]);
  });

  it("builds one tall, descending map from rewards, chapters, and the finale", () => {
    const content = FORMAL_JOURNEY_LAYOUT.journeyContent;
    const entryCount = JOURNEY_MILESTONE_REWARDS.length + JOURNEY_EPISODES.length + 1;
    const contentHeight = content.paddingTop
      + JOURNEY_MILESTONE_REWARDS.length * content.rewardHeight
      + JOURNEY_EPISODES.length * content.episodeHeight
      + content.finaleHeight
      + (entryCount - 1) * content.gap
      + content.paddingBottom;

    expect(entryCount).toBe(47);
    expect(contentHeight).toBeGreaterThan(FORMAL_JOURNEY_LAYOUT.contentViewport.height * 11);
    expect(contentHeight).toBeLessThan(FORMAL_JOURNEY_LAYOUT.contentViewport.height * 12);
    expect(content.episodeImage).toEqual({ x: 207, yOffset: 70, width: 299, height: 288 });
    expect(content.episodeLock).toEqual({ xOffset: 123, yOffset: 100, width: 60, height: 77 });
    expect(content.episodeRange).toEqual({ x: 252, yOffset: 91, width: 208, height: 36 });
    expect(content.episodeButton).toEqual({ x: 278, yOffset: 352, width: 157, height: 58 });
    expect(source).toContain("...JOURNEY_MILESTONE_REWARDS.map((reward)");
    expect(source).toContain("...JOURNEY_EPISODES.map((episode)");
    expect(source).toContain("].sort((left, right) => right.levelId - left.levelId");
    expect(source).toContain("contentHeight: Math.max(0, cursor - layout.gap + layout.paddingBottom)");

    const renderer = privateMethodSource("private drawLevels(");
    expect(renderer).toContain("journeyView.entries.forEach((entry)");
    expect(renderer).toContain('entry.kind === "reward"');
    expect(renderer).toContain('entry.kind === "episode"');
    expect(renderer).toContain('this.tr("journey.finaleTitle")');
    expect(renderer).toContain("ctx.drawImage(art.rewards.complete, rewardCard.x + 171, rewardCard.y + 85)");
    expect(renderer).toContain("ctx.drawImage(art.rewards.complete, button.x + 47, button.y - 26)");
    expect(renderer).toContain("if (!completed) {");
    expect(renderer).toContain("const active = entry.levelId === anchorRewardLevel");
    expect(renderer).toContain("ctx.drawImage(art.levelCardActiveLeft, card.x - 9, card.y - 7)");
    expect(renderer).toContain("ctx.drawImage(art.rewardCardActiveRight, rewardCard.x - 9, rewardCard.y - 6)");
    expect(renderer.indexOf("art.levelCardActiveLeft")).toBeLessThan(renderer.indexOf("art.levelCardLeft"));
    expect(renderer.indexOf("art.rewardCardActiveRight")).toBeLessThan(renderer.indexOf("art.rewardCardRight"));
    expect(renderer).not.toContain("layout.journeyContent.progressBadge");
    expect(renderer).not.toContain("layout.typography.progressLevel");
    expect(privateMethodSource("private levelIdAt(x:")).toContain("return rows[index].levelId");
    expect(renderer).not.toMatch(/journey(?:Previous|Prev|Next)/);
  });

  it("reuses all ten chapter resources for twenty chapters", async () => {
    const art = GAME_ART.ui.formalPages.journey;
    expect(art.episodes).toEqual(Array.from(
      { length: 10 },
      (_, index) => `assets/art/ui/formal-pages/journey/episode-${String(index + 1).padStart(2, "0")}.webp`,
    ));
    expect(art.homeThemes).toEqual([
      "assets/art/ui/home-v3/background.jpg",
      ...Array.from(
        { length: 9 },
        (_, index) => `assets/art/ui/formal-pages/journey/home-${String(index + 2).padStart(2, "0")}.jpg`,
      ),
    ]);
    expect({
      lockedShade: art.lockedShade,
      lock: art.lock,
      episodeRangePanel: art.episodeRangePanel,
      episodeSelectedButton: art.episodeSelectedButton,
      episodeActionButton: art.episodeActionButton,
    }).toEqual({
      lockedShade: "assets/art/ui/formal-pages/journey/episode-locked-shade.png",
      lock: "assets/art/ui/formal-pages/journey/lock.png",
      episodeRangePanel: "assets/art/ui/formal-pages/journey/episode-range-panel.png",
      episodeSelectedButton: "assets/art/ui/formal-pages/journey/episode-selected-button.png",
      episodeActionButton: "assets/art/ui/formal-pages/journey/episode-action-button.png",
    });
    expect(art.presentation).toEqual({
      panel: "assets/art/ui/formal-pages/journey/presentation-panel.png",
      close: "assets/art/ui/formal-pages/journey/presentation-close.png",
      episodeButton: "assets/art/ui/formal-pages/journey/presentation-episode-button.png",
      rewardButton: "assets/art/ui/formal-pages/journey/presentation-reward-button.png",
      titleEpisodeUnlocked: "assets/art/ui/formal-pages/journey/title-episode-unlocked.png",
      titleJourneyRewards: "assets/art/ui/formal-pages/journey/title-journey-rewards.png",
      rewards: {
        pulse: "assets/art/ui/formal-pages/journey/presentation-reward-pulse.png",
        time: "assets/art/ui/formal-pages/journey/presentation-reward-time.png",
        rocket: "assets/art/ui/formal-pages/journey/presentation-reward-rocket.png",
        heart: "assets/art/ui/formal-pages/journey/presentation-reward-heart.png",
        coins: "assets/art/ui/formal-pages/journey/presentation-reward-coins.png",
      },
    });

    expect(source).toContain("episodePaths: paths.episodes");
    expect(source).toContain("presentationPaths: paths.presentation");
    const deferred = new JourneyDeferredArt({
      episodePaths: art.episodes, presentationPaths: art.presentation,
      loadImage: async path => ({ src: path } as HTMLImageElement),
      releaseImage: () => {}, onChange: () => {},
    });
    await Promise.all([
      deferred.requestEpisodes(Array.from({ length: 10 }, (_, index) => index)),
      deferred.requestPresentation(),
    ]);
    expect(Array.from({ length: 10 }, (_, index) => deferred.episode(index)?.src)).toEqual(art.episodes);
    expect(deferred.presentation?.panel.src).toBe(art.presentation.panel);
    expect(deferred.presentation?.rewards.coins.src).toBe(art.presentation.rewards.coins);
    deferred.dispose();
    expect(source).not.toContain("art.lockedShade");
    expect(source).toContain("destinationPath: paths.destination");
    expect(source).toContain("art.episodeRangePanel");
    expect(source).toContain("selected ? art.episodeSelectedButton : art.episodeActionButton");
    expect(source).toContain('this.tr("journey.levelRange", { start: episode.startLevel, end: episode.endLevel })');
    expect(source).not.toContain("art.lockedFrame");
    expect(source).not.toContain("paths.lockedFrame");
  });

  it("moves the background, both track states, marker, and nodes through one content offset", () => {
    const renderViewport = privateMethodSource("private journeyRenderViewportArt():");
    expect(renderViewport).toContain("FORMAL_JOURNEY_LAYOUT.renderViewport");
    expect(renderViewport).toContain("HOME_ART_LAYOUT.navigationBar.y - safeBottomArt");
    expect(source).toContain("const contentViewport = this.journeyRenderViewportArt()");
    expect(source).toContain(
      "this.drawJourneyVerticalTiles(art.background, layout.background, journeyView.contentOffset, contentViewport)",
    );
    expect(source).toContain(
      "this.drawJourneyVerticalTiles(art.track, movingTrack, journeyView.contentOffset, contentViewport)",
    );
    expect(source).toContain(
      "this.drawJourneyVerticalTiles(art.trackProgress, movingProgressTrack, journeyView.contentOffset, contentViewport)",
    );
    expect(source).not.toContain("progressBottom");
    expect(source).not.toContain("progressBottom");
    expect(source).toMatch(/const markerCenterY = contentViewport\.y[\s\S]*?journeyMarkerContentPointForLevel\(anchorLevel\)[\s\S]*?- journeyView\.scrollOffset/);
    expect(source).toContain("const y = contentViewport.y + source.contentY + contentOffset");
    expect(source).not.toContain("journeyDisplayRowY");
  });

  it("caps both Journey rails at the Lv1-10 starting node", () => {
    const endpoint = privateMethodSource("private journeyStartTrackEndContentPoint():");
    const renderer = privateMethodSource("private drawLevels(");

    expect(endpoint).toContain("const firstEpisode = JOURNEY_EPISODES[0]");
    expect(endpoint).toContain("entry.episode.index === firstEpisode.index");
    expect(endpoint).toContain("startEpisode.contentY + button.yOffset + button.height / 2");
    expect(renderer).toContain("const startTrackEndY = contentViewport.y");
    expect(renderer).toContain("+ this.journeyStartTrackEndContentPoint()");
    expect(renderer).toContain("trackClipBottom - contentViewport.y");
    expect(renderer.indexOf("ctx.clip();", renderer.indexOf("const startTrackEndY")))
      .toBeLessThan(renderer.indexOf("this.drawJourneyVerticalTiles(art.track, movingTrack"));
    expect(renderer.indexOf("this.drawJourneyVerticalTiles(art.track, movingTrack"))
      .toBeLessThan(renderer.indexOf("this.drawJourneyVerticalTiles(art.trackProgress, movingProgressTrack"));
  });

  it("centers the current marker in the exposed connector between neighboring chapters", () => {
    const markerPoint = privateMethodSource("private journeyMarkerContentPointForLevel(level:");
    const defaultScroll = privateMethodSource("private journeyDefaultScrollOffset(level:");
    expect(markerPoint).toContain("const episode = getJourneyEpisode(level)");
    expect(markerPoint).toContain("entry.episode.index === episode.index + 1");
    expect(markerPoint).toContain("content.episodeButton.yOffset");
    expect(markerPoint).toContain("content.episodeButton.height");
    expect(markerPoint).toContain("content.episodeImage.yOffset");
    expect(markerPoint).toContain("content.finaleImage.yOffset");
    expect(markerPoint).toContain("content.finaleImage.height");
    expect(markerPoint).toContain("(upperBottom + lowerTop) / 2");
    expect(defaultScroll).toContain("this.journeyContentPointForLevel(level)");
    expect(defaultScroll).not.toContain("journeyMarkerContentPointForLevel");

    const content = FORMAL_JOURNEY_LAYOUT.journeyContent;
    const ordered: Array<{
      kind: "finale" | "reward" | "episode";
      levelId: number;
      episodeIndex?: number;
      contentY?: number;
    }> = [
      { kind: "finale" as const, levelId: JOURNEY_LEVEL_COUNT },
      ...JOURNEY_MILESTONE_REWARDS.map((reward) => ({ kind: "reward" as const, levelId: reward.level })),
      ...JOURNEY_EPISODES.map((episode) => ({
        kind: "episode" as const,
        levelId: episode.unlockLevel,
        episodeIndex: episode.index,
      })),
    ].sort((left, right) => right.levelId - left.levelId || (
      left.kind === "finale" ? -1 : right.kind === "finale" ? 1 : left.kind === "reward" ? -1 : 1
    ));
    let cursor = content.paddingTop;
    ordered.forEach((entry) => {
      entry.contentY = cursor;
      cursor += (entry.kind === "episode"
        ? content.episodeHeight
        : entry.kind === "finale"
          ? content.finaleHeight
          : content.rewardHeight) + content.gap;
    });

    const centers = JOURNEY_EPISODES.map((episode) => {
      const lowerEpisode = ordered.find((entry) => (
        entry.kind === "episode" && entry.episodeIndex === episode.index
      ));
      expect(lowerEpisode?.contentY).toBeTypeOf("number");
      const lowerTop = lowerEpisode!.contentY! + content.episodeImage.yOffset;
      const upperBottom = episode.index < JOURNEY_EPISODES.length
        ? (() => {
          const upperEpisode = ordered.find((entry) => (
            entry.kind === "episode" && entry.episodeIndex === episode.index + 1
          ));
          expect(upperEpisode?.contentY).toBeTypeOf("number");
          return upperEpisode!.contentY! + content.episodeButton.yOffset + content.episodeButton.height;
        })()
        : (() => {
          const finale = ordered.find((entry) => entry.kind === "finale");
          expect(finale?.contentY).toBeTypeOf("number");
          return finale!.contentY! + content.finaleImage.yOffset + content.finaleImage.height;
        })();
      const center = (upperBottom + lowerTop) / 2;
      const halfMarker = FORMAL_JOURNEY_LAYOUT.marker.height / 2;
      expect(center - halfMarker).toBeGreaterThan(upperBottom);
      expect(center + halfMarker).toBeLessThan(lowerTop);
      return center;
    });

    expect(centers).toHaveLength(20);
    expect(centers.every((center, index) => index === 0 || center < centers[index - 1])).toBe(true);
  });

  it("supports flick inertia, rubber resistance, and spring-back at both boundaries", () => {
    const drag = privateMethodSource("private updateJourneyScroll(point:");
    const motion = privateMethodSource("private updateJourneyScrollMotion(delta:");
    const release = privateMethodSource("private handleUp(point:");

    expect(drag).toContain("* 0.28");
    expect(drag).toContain("JOURNEY_SCROLL_MAX_OVERSCROLL");
    expect(drag).toContain("gesture.velocity * 0.42 + instantaneous * 0.58");
    expect(release).toContain("this.journeyScrollVelocity = moved && !this.save.reducedMotion");
    expect(motion).toContain("Math.exp(-JOURNEY_SCROLL_FRICTION * delta)");
    expect(motion).toContain("JOURNEY_SCROLL_SPRING");
    expect(motion).toContain("JOURNEY_SCROLL_SPRING_DAMPING");
    expect(motion).toContain("bounds.min - JOURNEY_SCROLL_MAX_OVERSCROLL");
    expect(motion).toContain("bounds.max + JOURNEY_SCROLL_MAX_OVERSCROLL");
    expect(motion).toContain("if (this.save.reducedMotion)");
  });

  it("retains the exact Journey offset across bottom-navigation visits", () => {
    const navigation = privateMethodSource("private handleMainNavigation(point:");
    expect(navigation).toContain('if (target !== "levels") this.journeyScrollVelocity = 0');
    expect(navigation).not.toContain("resetJourneyScrollToLevel");
    expect(navigation).not.toMatch(/journeyScrollOffset\s*=/);
  });

  it("keeps completed milestone rewards pending without opening Journey automatically", () => {
    const presentation = privateMethodSource("private beginPendingJourneyPresentation():");
    const pendingEvent = presentation.indexOf("const event = findPendingJourneyEvent(");
    const milestoneGuard = presentation.indexOf('if (event.type === "milestone_reward") return false;');
    const openPresentation = presentation.indexOf("this.journeyPresentation = { event, phase: \"progress\"");
    expect(pendingEvent).toBeGreaterThanOrEqual(0);
    expect(milestoneGuard).toBeGreaterThan(pendingEvent);
    expect(milestoneGuard).toBeLessThan(openPresentation);
    expect(presentation).toContain("claim badge");
    expect(presentation).not.toContain('this.screen = "levels"');
    expect(presentation).not.toContain("resetJourneyScrollToLevel(event.level)");
  });

  it("opens a two-step theme-selection overlay and only applies it after the theme is ready", () => {
    const selection = privateMethodSource("private selectJourneyEpisode(episode:");
    const completion = privateMethodSource("private completeJourneyThemeSelection(presentation:");
    const dismissal = privateMethodSource("private dismissJourneyPresentation():");

    const lockedGuard = selection.indexOf("!isJourneyEpisodeUnlocked(episode, this.save.highestLevel, this.save.rewardedLevels)");
    const selectedGuard = selection.indexOf("this.save.selectedJourneyEpisode === episode.index");
    const openOverlay = selection.indexOf("this.journeyPresentation = {");
    expect(lockedGuard).toBeGreaterThanOrEqual(0);
    expect(selectedGuard).toBeGreaterThan(lockedGuard);
    expect(openOverlay).toBeGreaterThan(selectedGuard);
    expect(selection).toContain('intent: "theme_selection"');
    expect(selection).toContain('phase: "overlay"');
    expect(selection).toContain('event: { type: "episode_unlock", level: episode.unlockLevel, episode }');
    expect(selection).not.toContain("candidate.selectedJourneyEpisode");
    expect(selection).not.toContain("persistVerified");
    expect(selection).not.toContain("requestJourneyHomeThemeArt");
    expect(selection).not.toContain("this.screen =");
    expect(selection).not.toContain("resetJourneyScrollToLevel");

    const request = completion.indexOf("this.loadJourneyHomeThemeCandidate(episode.index)");
    const ready = completion.indexOf("if (!themeReady)");
    const candidate = completion.indexOf("candidate.selectedJourneyEpisode = episode.index");
    const persist = completion.indexOf("this.persistVerified(candidate, baseline)");
    const commit = completion.indexOf("this.save = candidate");
    const commitTheme = completion.indexOf("this.commitJourneyHomeThemeCandidate(themeCandidate)");
    const closeOverlay = completion.indexOf("this.journeyPresentation = undefined");
    const home = completion.indexOf('this.screen = "home"');
    for (const offset of [request, ready, candidate, persist, commit, commitTheme, closeOverlay, home]) {
      expect(offset).toBeGreaterThanOrEqual(0);
    }
    expect(request).toBeLessThan(ready);
    expect(ready).toBeLessThan(candidate);
    expect(candidate).toBeLessThan(persist);
    expect(persist).toBeLessThan(commit);
    expect(commit).toBeLessThan(commitTheme);
    expect(commitTheme).toBeLessThan(closeOverlay);
    expect(commit).toBeLessThan(closeOverlay);
    expect(closeOverlay).toBeLessThan(home);
    expect(completion).not.toContain("journeyProgress");
    expect(completion).not.toContain("beginPendingJourneyPresentation");

    expect(dismissal).toContain('if (presentation.intent === "theme_selection")');
    expect(dismissal).toContain("if (this.pendingJourneyThemeSelection)");
    expect(dismissal).toContain("this.journeyPresentation = undefined");
    expect(dismissal).toContain("const episodeIndex = this.save.selectedJourneyEpisode");
    expect(dismissal).toContain("this.requestJourneyHomeThemeArt(episodeIndex)");
    expect(dismissal).not.toContain("candidate.selectedJourneyEpisode");
    expect(dismissal).not.toContain("persistVerified");
    expect(dismissal).not.toContain('this.screen = "home"');
  });

  it("keeps level selection separate from reward inspection and makes read-only rewards inert", () => {
    const resolver = privateMethodSource("private buttonReleaseTargetAt(point:");
    const pointerDown = privateMethodSource("private handleDown(point:");
    const dispatch = privateMethodSource("private executePointerAction(point:");
    expect(privateMethodSource("private executePointerDown(point:")).toContain("this.executePointerAction(point)");
    const openReward = privateMethodSource("private openJourneyReward(reward:");
    const rewardEarned = privateMethodSource("private journeyRewardEarned(reward:");
    const readOnlyText = privateMethodSource("private journeyPresentationRewardReadOnlyText(");
    const completion = privateMethodSource("private completeJourneyPresentation():");
    const dismissal = privateMethodSource("private dismissJourneyPresentation():");
    const evidence = privateMethodSource("private interactionTargetEvidence():");
    const overlay = privateMethodSource("private drawJourneyPresentationOverlay():");

    expect(pointerDown).toContain('target?.key.startsWith("journeyReward.")');
    expect(resolver).toContain('target(`journeyReward.${row.levelId}`');
    expect(resolver.indexOf('target(`journeyReward.${row.levelId}`'))
      .toBeLessThan(resolver.indexOf('target(`journeyNode.${index}`'));
    expect(dispatch.indexOf("const reward = this.journeyRewardAt(point.x, point.y)")).toBeGreaterThanOrEqual(0);
    expect(dispatch.indexOf("this.openJourneyReward(reward)")).toBeGreaterThanOrEqual(0);
    expect(dispatch.indexOf("this.openJourneyReward(reward)"))
      .toBeLessThan(dispatch.indexOf("const levelId = this.levelIdAt(point.x, point.y)"));

    expect(openReward).toContain('intent: "reward_inspection"');
    expect(openReward).not.toContain("persistVerified");
    expect(openReward).not.toContain("reward.level > this.save.highestLevel");
    expect(rewardEarned).toContain("this.save.rewardedLevels.includes(reward.level)");
    expect(rewardEarned).not.toContain("highestLevel");
    expect(readOnlyText).toContain('presentation?.intent !== "reward_inspection"');
    expect(readOnlyText).toContain('if (this.journeyPresentationRewardClaimed(presentation)) return this.tr("journey.claimed");');
    expect(readOnlyText).toContain("!this.journeyRewardEarned(presentation.event.reward)");
    expect(readOnlyText).toContain('this.tr("journey.claimAfterLevel", { level: presentation.event.reward.level })');
    expect(readOnlyText.indexOf('return this.tr("journey.claimed")'))
      .toBeLessThan(readOnlyText.indexOf("!this.journeyRewardEarned(presentation.event.reward)"));
    expect(readOnlyText).not.toContain("reward.level > this.save.highestLevel");
    expect(completion).toContain("!this.journeyRewardEarned(presentation.event.reward)");
    expect(completion).not.toContain("reward.level > this.save.highestLevel");
    expect(completion).toContain("if (this.journeyPresentationRewardClaimed(presentation)) return;");
    expect(completion.indexOf("if (this.journeyPresentationRewardClaimed(presentation)) return;"))
      .toBeLessThan(completion.indexOf("const pending = this.pendingJourneyClaim"));
    expect(dismissal).toContain('if (presentation.intent === "reward_inspection")');
    expect(dismissal).toContain("this.journeyPresentation = undefined");

    expect(evidence).toContain("if (this.journeyPresentationArtReady() && this.journeyPresentationRewardReadOnlyText() === undefined)");
    expect(evidence).toContain('add("journeyPresentation", BUTTONS.journeyPresentation)');
    expect(overlay).toContain("const readOnlyText = this.journeyPresentationRewardReadOnlyText(presentation)");
    expect(overlay).toContain("if (readOnlyText)");
    expect(overlay).toContain("readOnlyText,");
    expect(overlay.indexOf("if (readOnlyText)"))
      .toBeLessThan(overlay.indexOf('this.drawPressable("journeyPresentation"'));

    expect(source).toContain("visibleRewards: journeyView.rewardRows.map(({ reward }) => ({");
    expect(source).toContain("unlocked: this.journeyRewardEarned(reward)");
    expect(source).toContain('targetKey: `journeyReward.${reward.level}`');
    expect(source).toContain("claimed: this.journeyPresentationRewardClaimed()");
    expect(source).toContain('locked: this.journeyPresentation.intent === "reward_inspection"');
    expect(source).toContain("!this.journeyRewardEarned(this.journeyPresentation.event.reward)");
    expect(source).toContain('primaryAction: this.journeyPresentation.phase !== "overlay"');
    expect(source).toContain("|| this.journeyPresentationRewardReadOnlyText() !== undefined");
    expect(source).not.toContain('if (!this.navigationTransition && this.screen === "levels" && !this.journeyPresentation)');
  });

  it("draws the fixed title after the scrolling clip and the fixed navigation after the page", () => {
    const renderer = privateMethodSource("private drawLevels(");
    const scrollClip = renderer.indexOf("ctx.rect(contentViewport.x, contentViewport.y");
    const fixedHeader = renderer.indexOf("ctx.drawImage(art.topHeader");
    const clipRestore = renderer.lastIndexOf("ctx.restore();", fixedHeader);
    const title = renderer.indexOf("ctx.drawImage(art.title, layout.title.x, layout.title.y)", fixedHeader);
    const navigation = renderer.indexOf('if (drawNavigation) this.drawMainNavigation("levels")', title);

    expect(scrollClip).toBeGreaterThanOrEqual(0);
    expect(clipRestore).toBeGreaterThan(scrollClip);
    expect(fixedHeader).toBeGreaterThan(clipRestore);
    expect(title).toBeGreaterThan(fixedHeader);
    expect(navigation).toBeGreaterThan(title);
  });

  it("uses the supplied Adventures bitmap at the shared formal title anchor", () => {
    expect(GAME_ART.ui.formalPages.journey.title).toBe("assets/art/ui/formal-pages/journey/title.png");
    expect(FORMAL_JOURNEY_LAYOUT.title).toEqual({ x: 236, y: 108, width: 266, height: 48 });
  });
});
