import type { LevelSpec } from './types';
import { applyReviewedGameplayLayout } from './revisedReviewedLevels';
import { REVISED_CONTINUATION_LAYOUTS } from './revisedContinuationLayouts.generated';

// Independently remade maps must not show tutorials describing their old data
// (notably Lv70's retired timed-generator behaviour). Other 170 maps are intact.
const ORIGINAL_REMAKE_IDS = new Set([32,35,43,70,90,108,111,115,121,122,125,129,130,136,137,142,144,150,151,153,156,159,162,163,181,185,189,190,191,196]);

export function applyRevisedContinuationLevel(previous: LevelSpec): LevelSpec {
  const layout = REVISED_CONTINUATION_LAYOUTS[previous.id];
  if (layout && ORIGINAL_REMAKE_IDS.has(previous.id)) {
    const { featureIntro: _oldIntro, ...source } = previous;
    return applyReviewedGameplayLayout(source, layout);
  }
  return layout && previous.id >= 21 && previous.id <= 200
    ? applyReviewedGameplayLayout(previous, layout)
    : previous;
}
