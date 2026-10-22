// Distribution-only instrumentation: never edit shared game source or saves.
// Every anchor is unique and mandatory. A game refactor fails this build until
// its transition contract is reviewed, rather than silently dropping events.
const TARGET = "/src/game/ColorEscapeGame.ts";
const NOTIFY = "__notifyGooglePlayLifecycle";
const mode = 'this.leagueRun || this.dailyChallengeRunInfo() || this.temporaryLevelTestSession ? "other" : "campaign"';
const emit = phase => `${NOTIFY}(this.host, { phase: "${phase}", owner: this.model, levelId: this.model.level.id, mode: ${mode} });`;

// Match the actual board-input blockers; tutorial artwork alone does not stop
// dragging, while entrance/guide/transaction/initial-mechanic overlays do.
const ready = `if (this.screen === "playing" && this.appVisible && this.artReady && this.storageBaselineReady
      && !this.popupEntrance.active && !this.directLevelTransition && !this.featureUnlockGuide
      && !this.collectionIntro && !(this.journeyPresentation && this.journeyPresentationBlocksInput())
      && !this.boosterUnlockGuide && !this.pendingLifeStart && !this.lifeRefillOpen
      && !this.pendingSupplyPurchase && !this.welfareTransactionActive()
      && !this.lifeRefillAdTransactionActive() && !this.boosterRewardAdTransactionActive()
      && !this.dailyChallengeRewardAdTransactionActive() && !this.pendingProfileSave
      && !this.pendingRankingSave && !this.pendingBoosterPurchase && !this.pendingSettlement
      && !this.pendingSettlementAbandon && !this.leagueTransaction?.pending
      && !this.rocketFlight && this.pendingCelebration <= 0 && !this.hasActiveMechanicMotion()
      && !this.hasInitialRevisedRegionPresentation() && !this.revisedArtLoading
      && !this.model.readStatus().complete && !this.model.readStatus().failed) {
      ${emit("ready")}
    }`;

function replaceOnce(source, anchor, replacement, name) {
  const first = source.indexOf(anchor);
  if (first < 0 || source.indexOf(anchor, first + anchor.length) !== -1) {
    throw new Error(`Google Play lifecycle anchor changed: ${name}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

export function instrumentGooglePlayLifecycle(source) {
  let code = source.replace(/\r\n/g, "\n");
  if (code.includes(NOTIFY)) throw new Error("Google Play lifecycle instrumentation already present");
  const anchors = [
    ["readiness-frame", "      const beforeTick = this.model.snapshot();\n      const beginsPlayableClock =", `      ${ready}\n      const beforeTick = this.model.snapshot();\n      const beginsPlayableClock =`],
    ["readiness-input", "    if (this.dragVisual?.settling) return;\n\n    const block = this.blockAt(point.x, point.y);", `    if (this.dragVisual?.settling) return;\n    ${ready}\n\n    const block = this.blockAt(point.x, point.y);`],
    ["reset", "  private resetPuzzlePresentation(): void {\n    if (this.pendingBoosterPurchase) return;", `  private resetPuzzlePresentation(): void {\n    if (this.pendingBoosterPurchase) return;\n    ${NOTIFY}(this.host, { phase: "reset" });`],
    ["success", "  private beginCelebration(): void {\n    this.comboAnimation?.clear();", `  private beginCelebration(): void {\n    ${emit("success")}\n    this.comboAnimation?.clear();`],
    ["failure", '        this.screen = "failed";\n        this.dirty = true;', `        this.screen = "failed";\n        ${emit("failed")}\n        this.dirty = true;`],
    ["settlement-render", "    if (this.dirty || animated) {\n      this.render();\n      this.dirty = false;\n    }", `    if (this.dirty || animated) {\n      this.render();\n      this.dirty = false;\n      if (this.appVisible && this.artReady && this.storageBaselineReady) __notifyGooglePlayMainReady(this.host);\n      if (this.appVisible && this.artReady && !this.popupEntrance.active\n        && ((this.screen === "win" && this.winArt) || this.screen === "failed")) {\n        ${emit("settlement")}\n      }\n    }`],
  ];
  for (const [name, anchor, replacement] of anchors) code = replaceOnce(code, anchor, replacement, name);
  return `import { emitGooglePlayLifecycle as ${NOTIFY}, emitGooglePlayMainReady as __notifyGooglePlayMainReady } from "../googlePlay/lifecycle";\n${code}`;
}

export function googlePlayLifecyclePlugin() {
  return {
    name: "google-play-game-lifecycle",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith(TARGET)) return undefined;
      return { code: instrumentGooglePlayLifecycle(source), map: null };
    },
  };
}
