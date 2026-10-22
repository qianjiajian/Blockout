const TARGET = "/src/game/ColorEscapeGame.ts";

function replaceOnce(source, anchor, replacement, name) {
  if (source.split(anchor).length !== 2) throw new Error(`Google Play life reward anchor changed: ${name}`);
  return source.replace(anchor, replacement);
}

function projectMethod(source, start, end, anchor, replacement, name) {
  if (source.split(start).length !== 2 || source.split(end).length !== 2)
    throw new Error(`Google Play life reward method changed: ${name}`);
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin + start.length);
  if (finish < 0) throw new Error(`Google Play life reward method order changed: ${name}`);
  const method = source.slice(begin, finish);
  return source.slice(0, begin) + replaceOnce(method, anchor, replacement, name) + source.slice(finish);
}

// Five remains the natural-recovery and coin-refill cap. The existing ad
// receipt/account transaction already supports +1 above five; Google Play
// only needs its visible full-state ad button to reach that same transaction.
export function instrumentGooglePlayLifeReward(source) {
  let code = source.replace(/\r\n/g, "\n");
  code = projectMethod(code,
    "  private lifeRefillTargets(): Array<[string, Rect]> {",
    "  private handleLifeRefillPointer(point: PointerSample): void {",
    `    if (!full) {
      if (!this.pendingLifeRefill) targets.push(["lifeRefillAd", adButton]);
      targets.push(["lifeRefillBuy", BUTTONS.lifeRefillBuy]);
    }`,
    `    if (!this.pendingLifeRefill) targets.push(["lifeRefillAd", adButton]);
    if (!full) targets.push(["lifeRefillBuy", BUTTONS.lifeRefillBuy]);`,
    "full-state-ad-target");
  code = projectMethod(code,
    "  private startLifeRefillAd(): void {",
    "  private finishLifeRefillAdSave(): void {",
    `    const quote = this.lifeRefillQuote();
    if (quote.missingLives === 0) {
      this.lifeRefillFeedback = this.notifyButtonFeedback(this.tr("gameplay.life.refillFull"));
      this.playSound("blocked");
      this.dirty = true; this.scheduleFrame();
      return;
    }
`, "", "full-state-ad-start");
  return code;
}

export function googlePlayLifeRewardPlugin() {
  return {
    name: "google-play-life-reward",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith(TARGET)) return undefined;
      return { code: instrumentGooglePlayLifeReward(source), map: null };
    },
  };
}
