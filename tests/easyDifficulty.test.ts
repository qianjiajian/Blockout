import {describe,it,expect} from 'vitest';
import {LEVELS} from '../src/core/levels';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import type {LevelSpec} from '../src/core/types';

describe('easy difficulty metadata compatibility',()=>{
  it('keeps authored scoring and runtime behavior independent of the new label',()=>{
    const original=LEVELS[20]!;
    const easy:LevelSpec={...original,difficulty:'easy',preservedMoveTarget:levelStarTargets(original).moveTarget};
    expect(()=>validateLevel(easy)).not.toThrow();
    expect(levelStarTargets(easy)).toEqual(levelStarTargets(original));
    expect(new PuzzleModel(easy).snapshot()).toEqual(new PuzzleModel(original).snapshot());
  });
  it('has a finite fallback for uncalibrated future easy drafts, without modifying authored levels',()=>{
    const draft:LevelSpec={...LEVELS[20]!,difficulty:'easy',parMoves:undefined,preservedMoveTarget:undefined};
    expect(Number.isFinite(levelStarTargets(draft).moveTarget)).toBe(true);
    expect(levelStarTargets(draft).moveTarget).toBeGreaterThan(0);
  });
});
