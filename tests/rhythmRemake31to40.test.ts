// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE,LEVELS_BEFORE_RHYTHM31_40_REMAKE,getLevelStrict} from '../src/core/levels';
import {RHYTHM31_40_REMAKE_IDS} from '../src/core/rhythmRemake31to40';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import type {LevelSpec} from '../src/core/types';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/rhythm-remake31-40.json',import.meta.url),'utf8')) as {
  ruleVersion:string;rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
// The v1.28 fixture remains immutable history. Only the actually repaired
// level uses its freshly verified v1.29 witness; do not relabel the other nine.
const repair=JSON.parse(readFileSync(new URL('./fixtures/generator-queue-color-repair.json',import.meta.url),'utf8')) as {
  ruleVersion:string;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number;
};
const currentRows=fixture.rows.map(row=>row.id===35?{...repair,id:35}:row);
const ids=Array.from({length:10},(_,i)=>31+i);
const planned=['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal'];
const limits={easy:[5,9],normal:[10,14],hard:[15,19],super:[20,25]} as const;

describe('31–40 rhythm remake with the targeted v1.29 queue-color repair',()=>{
  it('changed only its ten approved maps at the historical stage, preserving boards and actual evaluation targets',()=>{
    expect(fixture.ruleVersion).toBe('1.28.0');expect(RHYTHM31_40_REMAKE_IDS).toEqual(ids);
    expect(fixture.rows.map(r=>r.id)).toEqual(ids);expect(LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE).toHaveLength(200);
    for(const [i,level]of LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE.entries()){
      const old=LEVELS_BEFORE_RHYTHM31_40_REMAKE[i]!;
      expect(level.id).toBe(i+1);
      expect(()=>validateLevel(level)).not.toThrow();expect(levelStarTargets(level)).toEqual(levelStarTargets(old));
      if(!ids.includes(level.id)){expect(level).toBe(old);continue;}
      // The later 21-30 remake must still expose the exact completed 31-40
      // objects; route tests below deliberately use the actual final getter.
      expect(getLevelStrict(level.id)).toBe(level);
      expect(level).not.toEqual(old);expect(level.difficulty).toBe(planned[level.id-31]);
      const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
      for(const key of new Set([...Object.keys(level),...Object.keys(old)]))if(!mutable.has(key)){
        expect(level[key as keyof LevelSpec],`Lv${level.id}.${key}`).toEqual(old[key as keyof LevelSpec]);
      }
    }
  });

  for(const row of currentRows)it(`replays the exact formal Lv${row.id} including every hidden and queued body`,()=>{
    const level=getLevelStrict(row.id),[min,max]=limits[level.difficulty];
    expect(level).toEqual(row.level);expect(row.lowerBound).toBeGreaterThanOrEqual(min);
    expect(row.upperBound).toBeLessThanOrEqual(max);expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
    expect(replayRevisedRoute(level,row.drags)).toMatchObject({valid:true,complete:true,nonClearingDrags:row.upperBound});
    // The fixture binds the canonical witness. It is not trusted as a lower
    // bound certificate; the adoption verifier freshly exhausts that graph.
    const model=new PuzzleModel(level);model.startCountdown();let single=0,multi=0;
    for(const drag of row.drags){
      const area=model.getBlock(drag.blockId)!.shape.length,before=model.snapshot().cleared;
      model.beginAction();for(const [x,y]of drag.path)expect(model.moveBlockStep(drag.blockId,x,y)).toBe(true);
      if(drag.exitSide)expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if(model.snapshot().cleared===before){if(area===1)single++;else multi++;}
    }
    expect(multi).toBeGreaterThan(single);const end=model.snapshot();
    expect(end).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
    expect(end.generators.every(g=>g.remaining===0)).toBe(true);expect(end.queuedBlocks).toHaveLength(0);
    expect(end.shutters.every(s=>s.revealed)).toBe(true);
  });

  it('keeps generator teaching at35 and low-pressure practice at36 without consuming the deferred super slot',()=>{
    for(const id of [31,32,33,34])expect(getLevelStrict(id).generators??[]).toHaveLength(0);
    for(const id of [35,36]){expect(getLevelStrict(id).difficulty).toBe('easy');expect(getLevelStrict(id).generators!.length).toBeGreaterThan(0);}
    expect(getLevelStrict(35).generators!.map(g=>g.queueBlockIds.length)).toEqual([8]);
    expect(getLevelStrict(38).generators!.map(g=>g.queueBlockIds.length)).toEqual([6]);
    expect(getLevelStrict(39).generators!.map(g=>g.queueBlockIds.length)).toEqual([2]);
    expect(getLevelStrict(40).difficulty).toBe('normal');
    expect(getLevelStrict(41)).toBe(LEVELS_BEFORE_RHYTHM31_40_REMAKE[40]);
  });

  it('fills each hidden region with its own actual footprints rather than counting the visual cover',()=>{
    for(const id of ids){const level=getLevelStrict(id);
      for(const curtain of level.shutters??[]){
        const cells=new Set<string>();
        for(const b of level.blocks.filter(b=>b.shutterId===curtain.id))for(const [dx,dy]of b.shape){
          const x=b.x+dx,y=b.y+dy,key=`${x},${y}`;
          expect(x).toBeGreaterThanOrEqual(curtain.x!);expect(x).toBeLessThan(curtain.x!+curtain.width!);
          expect(y).toBeGreaterThanOrEqual(curtain.y!);expect(y).toBeLessThan(curtain.y!+curtain.height!);
          expect(cells.has(key)).toBe(false);cells.add(key);
        }
        expect(cells.size).toBe(curtain.width!*curtain.height!);
      }
    }
  });

  it('pins competitor-referenced key counters, not low placeholder values',()=>{
    expect(getLevelStrict(31).blocks.filter(b=>b.frozen).map(b=>b.frozen)).toEqual([5]);
    expect(getLevelStrict(32).blocks.filter(b=>b.frozen).map(b=>b.frozen)).toEqual([4]);
    expect(getLevelStrict(33).gates.filter(g=>g.frozen).map(g=>g.frozen)).toEqual([10]);
    expect(getLevelStrict(34).shutters?.map(s=>s.count)).toEqual([12]);
    expect(getLevelStrict(34).gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a!-b!)).toEqual([7,13]);
    expect(getLevelStrict(38).blocks.filter(b=>b.frozen).map(b=>b.frozen)).toEqual([5]);
    expect(getLevelStrict(40).shutters?.map(s=>s.count)).toEqual([4]);
  });
});
