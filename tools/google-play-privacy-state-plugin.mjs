// The settings overlay needs three small presentation values. Full diagnostic
// snapshots calculate every game system and must stay outside pointer handling.
// Apply this accessor only to the Google Play build; shared channel source stays
// unchanged and the public diagnostic bridge retains its isolated snapshots.
const TARGET = "/src/game/ColorEscapeGame.ts";
const METHOD = "getGooglePlayPrivacyState";
const ANCHOR = "  getDebugState(): Record<string, unknown> {";

export function instrumentGooglePlayPrivacyState(source) {
  const code = source.replace(/\r\n/g, "\n");
  if (code.includes(METHOD)) throw new Error("Google Play privacy state instrumentation already present");
  if (code.split(ANCHOR).length !== 2) {
    throw new Error("Google Play privacy state anchor changed: getDebugState");
  }
  return code.replace(ANCHOR, `  ${METHOD}() {
    return {
      screen: this.screen,
      reviewReady: this.screen === "home" && this.appVisible && this.artReady && this.storageBaselineReady
        && !this.popupEntrance.active && !this.navigationTransition && !this.profilePage
        && !this.featureUnlockGuide && !this.collectionIntro && !this.journeyPresentation
        && !this.lifeRefillOpen && !this.pendingButtonPress && this.activePointer === undefined
        && !this.isHomeEpisodeUnlockPending() && !this.pendingSettlement && !this.pendingLifeStart
        && !this.homeCoinFlight && !this.directLevelTransition && !this.collectionRestorationGuide
        && !this.temporaryLevelTestSession && !this.temporaryLevelSelector
        && !this.pendingSettlementAbandon && !this.pendingLifeRefill && !this.pendingSupplyPurchase
        && !this.pendingBoosterPurchase && !this.pendingJourneyClaim && !this.pendingJourneyThemeSelection
        && !this.pendingLanguageSelection && !this.pendingDailyTaskClaim && !this.pendingAchievementClaim
        && !this.pendingCollectionRestoration && !this.welfareTransactionActive()
        && !this.lifeRefillAdTransactionActive() && !this.boosterRewardAdTransactionActive()
        && !this.dailyChallengeRewardAdTransactionActive()
        && !this.pendingProfileSave && !this.pendingRankingSave && !this.leagueTransaction?.pending,
      settings: { language: this.save.language },
      viewportTransform: this.viewportTransform(),
    };
  }

${ANCHOR}`);
}

export function googlePlayPrivacyStatePlugin() {
  return {
    name: "google-play-privacy-presentation-state",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith(TARGET)) return undefined;
      return { code: instrumentGooglePlayPrivacyState(source), map: null };
    },
  };
}
