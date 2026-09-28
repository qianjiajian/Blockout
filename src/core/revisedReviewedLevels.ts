import type { LevelSpec } from './types';
import { levelStarTargets } from './levelStarConditions';
import { REVISED_REVIEWED_LAYOUTS, type RevisedLevelLayout } from './revisedReviewedLayouts.generated';

/** v1.10 authorizes staged campaign integration, not difficulty certification. */
export function applyRevisedReviewedLevel(previous: LevelSpec): LevelSpec {
  const layout = REVISED_REVIEWED_LAYOUTS[previous.id];
  if (!layout || previous.id < 21 || previous.id > 200) return previous;
  return applyReviewedGameplayLayout(previous, layout);
}

/** Shared metadata policy for subsequent independently verified batches. */
export function applyReviewedGameplayLayout(previous: LevelSpec, layout: RevisedLevelLayout): LevelSpec {
  const position = previous.id % 10;
  // Preserve the actual old result-card targets, not an obsolete geometric
  // floor or raw par value that previously produced a different target.
  const targets = levelStarTargets(previous);
  return {
    ...layout,
    id: previous.id,
    name: previous.name,
    difficulty: position === 0 ? 'super' : [3, 5, 8].includes(position) ? 'hard' : 'normal',
    timeSeconds: previous.timeSeconds,
    reward: previous.reward,
    parMoves: targets.moveTarget,
    ...(previous.featureIntro ? { featureIntro: previous.featureIntro } : {}),
  };
}
