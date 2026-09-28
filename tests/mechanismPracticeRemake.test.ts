// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE,LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE,getLevelStrict} from '../src/core/levels';
import {MECHANISM_PRACTICE_REMAKE_IDS} from '../src/core/mechanismPracticeRemake';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import type {LevelSpec} from '../src/core/types';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/mechanism-practice-remake-v139.json',import.meta.url),'utf8')) as {
  ruleVersion:string;rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
const ids=Array.from({length:10},(_,i)=>21+i);
const difficulties=['easy','normal','normal','hard','easy','normal','hard','easy','normal','super'];
const bands={easy:[5,10],normal:[11,15],hard:[16,20],super:[21,30]} as const;
const curtainValues=[[10,17,19],[17],[9,12],[12,12],[],[19,22],[9],[3,7],[20,25],[12]];
const iceGateValues=[[2,6,13],[17,19,19],[3,5],[4,6,15,18,18],[4,8,13,14,16,17,21],[5,9,14],[10,13,13],[2],[10,20,20,20],[9]];
const iceBlockValues=[[2,6],[5,5,5,5],[],[6,6,6,6],[],[],[],[],[],[]];
const shellCounts=[4,0,4,3,2,0,0,0,8,0];
const ordinaryCounts=[2,3,3,1,1,4,2,5,2,3];
const sorted=(values:number[])=>values.sort((a,b)=>a-b);

describe('v1.39 formal source-aligned remake with necessary board-fit adaptations',()=>{
  it('changes only 21–30, preserving all geometry, original evaluation targets and the other 190 exact objects',()=>{
    expect(fixture.ruleVersion).toBe('1.39.0');expect(MECHANISM_PRACTICE_REMAKE_IDS).toEqual(ids);
    expect(fixture.rows.map(r=>r.id)).toEqual(ids);expect(LEVELS).toHaveLength(200);
    const mutable=new Set(['blocks','gates','shutters','difficulty','preservedMoveTarget']);
    for(const [i,level]of LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE.entries()){
      const old=LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE[i]!;
      expect(level.id).toBe(i+1);
      if(![21,22,23,26,28,29,30].includes(level.id))expect(getLevelStrict(level.id)).toBe(level);
      expect(levelStarTargets(level)).toEqual(levelStarTargets(old));expect(()=>validateLevel(level)).not.toThrow();
      if(!ids.includes(level.id)){expect(level).toBe(old);continue;}
      expect(level).not.toEqual(old);expect(level.difficulty).toBe(difficulties[level.id-21]);
      for(const key of new Set([...Object.keys(level),...Object.keys(old)]))if(!mutable.has(key)){
        expect(level[key as keyof LevelSpec],`Lv${level.id}.${key}`).toEqual(old[key as keyof LevelSpec]);
      }
    }
  });
  it('preserves source mechanisms, stage placement and counter values, with only qualified mouth-capacity adaptations',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),i=id-21;
      expect(sorted((level.shutters??[]).map(s=>s.count))).toEqual(curtainValues[i]);
      expect(sorted(level.gates.filter(g=>(g.frozen??0)>0).map(g=>g.frozen!))).toEqual(iceGateValues[i]);
      expect(level.gates.filter(g=>!(g.frozen??0))).toHaveLength(ordinaryCounts[i]!);
      expect(sorted(level.blocks.filter(b=>(b.frozen??0)>0).map(b=>b.frozen!))).toEqual(iceBlockValues[i]);
      expect(level.blocks.filter(b=>(b.layers?.length??1)>1)).toHaveLength(shellCounts[i]!);
      expect(level.blocks.filter(b=>!b.shutterId&&(b.frozen??0)>0)).toHaveLength(0);
      expect(level.blocks.filter(b=>!b.shutterId&&(b.layers?.length??1)>1)).toHaveLength([23,25].includes(id)?2:0);
      expect(level.generators??[]).toHaveLength(0);
    }
  });
  for(const row of fixture.rows)it(`replays the preserved v1.39 Lv${row.id} with multi-cell decisions in its approved band`,()=>{
    const level=LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE[row.id-1]!,[min,max]=bands[level.difficulty];
    expect(level).toEqual(row.level);expect(row.lowerBound).toBeGreaterThanOrEqual(min);
    expect(row.upperBound).toBeLessThanOrEqual(max);expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
    // These regressions bind witnesses, not optimality. The independent author
    // verifier exhausts the qualified relaxed graph afresh for the lower bound.
    expect(replayRevisedRoute(level,row.drags)).toMatchObject({valid:true,complete:true,nonClearingDrags:row.upperBound});
    const model=new PuzzleModel(level);model.startCountdown();let single=0,multi=0;
    for(const drag of row.drags){
      const area=model.getBlock(drag.blockId)!.shape.length,before=model.snapshot().cleared;
      model.beginAction();for(const [x,y]of drag.path)expect(model.moveBlockStep(drag.blockId,x,y)).toBe(true);
      if(drag.exitSide)expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if(model.snapshot().cleared===before){if(area===1)single++;else multi++;}
    }
    expect(multi).toBeGreaterThan(single);expect(model.snapshot()).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
    expect(model.snapshot().shutters.every(s=>s.revealed)).toBe(true);
    expect(model.snapshot().gates.every(g=>!g.frozen)).toBe(true);
  });
  it('fills every hidden region with actual block footprints and gives every ice gate matching cargo',()=>{
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
      for(const gate of level.gates.filter(g=>(g.frozen??0)>0)){
        expect(level.blocks.some(b=>(b.layers??[b.color]).includes(gate.color))).toBe(true);
      }
    }
  });
});
