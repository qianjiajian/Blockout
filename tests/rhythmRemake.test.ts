// @ts-expect-error Node test fixture IO is not part of the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE,LEVELS_BEFORE_RHYTHM31_40_REMAKE as LEVELS,LEVELS_BEFORE_RHYTHM_REMAKE} from '../src/core/levels';
import {RHYTHM_REMAKE_IDS} from '../src/core/rhythmRemake';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import type {LevelSpec} from '../src/core/types';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/rhythm-remake.json',import.meta.url),'utf8')) as {
  rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
const ids=[21,22,23,24,25,26,27,28,29,30];
const planned=['easy','normal','normal','hard','easy','normal','hard','easy','normal','super'];
const limits={easy:[5,9],normal:[10,14],hard:[15,19],super:[20,25]} as const;
// Historical 21-30 scope and witness checks stay on their adoption stage.
// The subsequent 31-40 batch preserved these objects, but the authorized
// v1.39 remake may replace them after LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE.
const getLevelStrict=(id:number):LevelSpec=>LEVELS.find(level=>level.id===id)!;

describe('v1.27 historical rhythm remake',()=>{
  it('preserved all ten completed maps through the 31-40 batch before the later 21-30 remake',()=>{
    expect(LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE).toHaveLength(200);
    for(const id of ids)expect(LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE[id-1]).toBe(getLevelStrict(id));
  });
  it('changes only the ten authorized maps and preserves all boards, clocks, stars, rewards and peripheral metadata',()=>{
    expect(RHYTHM_REMAKE_IDS).toEqual(ids);expect(fixture.rows.map(r=>r.id)).toEqual(ids);expect(LEVELS).toHaveLength(200);
    for(const [i,l]of LEVELS.entries()){
      const old=LEVELS_BEFORE_RHYTHM_REMAKE[i]!;
      expect(l.id).toBe(i+1);expect(getLevelStrict(l.id)).toBe(l);expect(()=>validateLevel(l)).not.toThrow();
      expect(levelStarTargets(l)).toEqual(levelStarTargets(old));
      if(!ids.includes(l.id)){expect(l).toBe(old);continue;}
      expect(l).not.toEqual(old);expect(l.difficulty).toBe(planned[l.id-21]);
      const mutable=new Set(['blocks','gates','shutters','difficulty','preservedMoveTarget']);
      for(const k of new Set([...Object.keys(l),...Object.keys(old)]))if(!mutable.has(k)){
        expect(l[k as keyof LevelSpec],`Lv${l.id}.${k}`).toEqual(old[k as keyof LevelSpec]);
      }
    }
  });

  for(const row of fixture.rows)it(`replays the exact historical Lv${row.id} with a witness in its approved band`,()=>{
    const level=getLevelStrict(row.id),[min,max]=limits[level.difficulty];
    expect(level).toEqual(row.level);expect(row.lowerBound).toBeGreaterThanOrEqual(min);
    expect(row.upperBound).toBeLessThanOrEqual(max);expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
    const replay=replayRevisedRoute(level,row.drags);expect(replay).toMatchObject({valid:true,complete:true,nonClearingDrags:row.upperBound});
    // This regression binds the real route, not a proof of optimality. Fresh
    // graph exhaustion and its hashes are checked by the adoption verifier.
    const model=new PuzzleModel(level);model.startCountdown();let single=0,multi=0;
    for(const drag of row.drags){
      const area=model.getBlock(drag.blockId)!.shape.length,before=model.snapshot().cleared;
      model.beginAction();for(const [x,y]of drag.path)expect(model.moveBlockStep(drag.blockId,x,y)).toBe(true);
      if(drag.exitSide)expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if(model.snapshot().cleared===before){if(area===1)single++;else multi++;}
    }
    expect(multi).toBeGreaterThan(single);expect(model.snapshot()).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
  });

  it('fills every hidden curtain with its own real footprints, independently from the opening cover',()=>{
    for(const id of ids){const level=getLevelStrict(id);
      for(const curtain of level.shutters??[]){
        const cells=new Set<string>();
        for(const b of level.blocks.filter(b=>b.shutterId===curtain.id))for(const [dx,dy]of b.shape){
          const x=b.x+dx,y=b.y+dy;
          expect(x).toBeGreaterThanOrEqual(curtain.x!);expect(x).toBeLessThan(curtain.x!+curtain.width!);
          expect(y).toBeGreaterThanOrEqual(curtain.y!);expect(y).toBeLessThan(curtain.y!+curtain.height!);
          const key=`${x},${y}`;expect(cells.has(key)).toBe(false);cells.add(key);
        }
        expect(cells.size).toBe(curtain.width!*curtain.height!);
      }
    }
  });

  it('pins the reviewed larger effective counters instead of silently retaining low-count drafts',()=>{
    expect(getLevelStrict(21).shutters?.map(s=>s.count)).toEqual([8]);
    expect(getLevelStrict(22).blocks.filter(b=>b.frozen).map(b=>b.frozen)).toEqual([5]);
    expect(getLevelStrict(24).blocks.filter(b=>b.frozen).map(b=>b.frozen)).toEqual([6,6]);
    expect(getLevelStrict(26).shutters?.map(s=>s.count)).toEqual([12,16]);
    expect(getLevelStrict(27).shutters?.map(s=>s.count)).toEqual([9]);
    expect(getLevelStrict(29).gates.find(g=>g.color==='yellow')?.frozen).toBe(10);
    expect(getLevelStrict(30).gates.find(g=>g.color==='yellow')?.frozen).toBe(9);
  });
});
