const TARGET = "/src/game/ColorEscapeGame.ts";

function replaceOnce(source, anchor, replacement, name) {
  if (source.split(anchor).length !== 2) throw new Error(`Google Play input performance anchor changed: ${name}`);
  return source.replace(anchor, replacement);
}

// Project only pure-query/allocation reductions into Google Play. Pointer
// samples, swept collision, model mutations, clock charging and rendering
// schedules remain in their original order in the shared game source.
export function instrumentGooglePlayInputPerformance(source) {
  let code = source.replace(/\r\n/g, "\n");
  const caller = "    const synced = this.syncDragGridCandidate(visual, swept.path);\n    const moved = synced.moved;";
  if (code.split(caller).length !== 2
    || (code.match(/this\.syncDragGridCandidate\s*\(/g) ?? []).length !== 1
    || (code.match(/\bsynced\b/g) ?? []).length !== 2) {
    throw new Error("Google Play input performance requires the sole sync result consumer to read moved only");
  }
  code = replaceOnce(code, `    const snapshot = this.model.snapshot();
    return {
      moved,
      exitPortals: block
        ? matchingContinuousExitPortals(snapshot, block, this.model.possibleExitSides(block))
        : [],
    };`, `    // The sole caller consumes moved only. Keep the earlier portal stop,
    // but avoid copying/querying the whole board for this unused tail value.
    return { moved, exitPortals: [] };`, "unused-sync-tail-portals");
  code = replaceOnce(code, `            const snapshot = this.model.snapshot();
            const exitPortals = matchingContinuousExitPortals(
              snapshot,
              movedBlock,
              this.model.possibleExitSides(movedBlock),
            );`, `            const possibleSides = this.model.possibleExitSides(movedBlock);
            const exitPortals = possibleSides.length
              ? matchingContinuousExitPortals(this.model.snapshot(), movedBlock, possibleSides)
              : [];`, "successful-step-lazy-snapshot");
  code = replaceOnce(code, `      if (!current) return [];
      return matchingContinuousExitPortals(
        this.model.snapshot(),
        current,
        this.model.possibleExitSides(current),
      ).filter(({ portal }) => isContinuousPoseAtPortal(`, `      if (!current) return [];
      const possibleSides = this.model.possibleExitSides(current);
      if (!possibleSides.length) return [];
      return matchingContinuousExitPortals(
        this.model.snapshot(),
        current,
        possibleSides,
      ).filter(({ portal }) => isContinuousPoseAtPortal(`, "capture-lazy-snapshot");
  code = replaceOnce(code, `    const journeyBounds = this.journeyScrollBounds();
    const journeyScrollAnimating = this.screen === "levels"`, `    const journeyBounds = this.screen === "levels" ? this.journeyScrollBounds() : undefined;
    const journeyScrollAnimating = journeyBounds !== undefined && this.screen === "levels"`, "journey-frame-screen-guard");
  return code;
}

export function googlePlayInputPerformancePlugin() {
  return {
    name: "google-play-input-performance",
    enforce: "pre",
    transform(source, id) {
      if (!id.replace(/\\/g, "/").split("?")[0].endsWith(TARGET)) return undefined;
      return { code: instrumentGooglePlayInputPerformance(source), map: null };
    },
  };
}
