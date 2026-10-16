/** Official shop slices supplied by the user; source PNG bytes are preserved. */
export const WELFARE_SUPPLIED_ART = {
  panel: "assets/art/ui/formal-pages/shop-supplied-v1/panel.png",
  buttonGreen: "assets/art/ui/formal-pages/shop-supplied-v1/button-green.png",
  buttonYellow: "assets/art/ui/formal-pages/shop-supplied-v1/button-yellow.png",
  rewardInspiration: "assets/art/ui/formal-pages/shop-supplied-v1/reward-inspiration.png",
  rewardCoins: "assets/art/ui/formal-pages/shop-supplied-v1/reward-coins.png",
  rewardLife: "assets/art/ui/formal-pages/shop-supplied-v1/reward-life.png",
  boosterTime: "assets/art/ui/formal-pages/shop-supplied-v1/booster-time.png",
  boosterRocket: "assets/art/ui/formal-pages/shop-supplied-v1/booster-rocket.png",
  boosterPulse: "assets/art/ui/formal-pages/shop-supplied-v1/booster-pulse.png",
  resourceCoins: "assets/art/ui/formal-pages/shop-supplied-v1/resource-coins.png",
  resourceInspiration: "assets/art/ui/formal-pages/shop-supplied-v1/resource-inspiration.png",
  resourceLife: "assets/art/ui/formal-pages/shop-supplied-v1/resource-life.png",
  video: "assets/art/ui/formal-pages/shop-supplied-v1/video.png",
  gift: "assets/art/ui/formal-pages/shop-supplied-v1/gift.png",
  clock: "assets/art/ui/formal-pages/shop-supplied-v1/clock.png",
  walletPanel: "assets/art/ui/formal-pages/shop-supplied-v1/wallet-panel.png",
  remainingPanel: "assets/art/ui/formal-pages/shop-supplied-v1/remaining-panel.png",
  sharedRemainingPanel: "assets/art/ui/formal-pages/shop-supplied-v1/shared-remaining-panel.png",
  stockPanel: "assets/art/ui/formal-pages/shop-supplied-v1/stock-panel.png",
  choicePanel: "assets/art/ui/formal-pages/shop-supplied-v1/choice-panel.png",
  boosterTitlePanel: "assets/art/ui/formal-pages/shop-supplied-v1/booster-title-panel.png",
  selected: "assets/art/ui/formal-pages/shop-supplied-v1/selected.png",
  line: "assets/art/ui/formal-pages/shop-supplied-v1/line.png",
} as const;

export type WelfareSuppliedArtKey = keyof typeof WELFARE_SUPPLIED_ART;
export type WelfareSuppliedArt = { [Key in WelfareSuppliedArtKey]: HTMLImageElement };
