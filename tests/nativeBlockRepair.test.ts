// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS,LEVELS_BEFORE_NATIVE_BLOCK_REPAIR,LEVELS_BEFORE_181_190_REMAKE as LEVELS_AFTER_NATIVE_BLOCK_REPAIR,getLevelStrict} from '../src/core/levels';
import {NATIVE_BLOCK_REPAIR_IDS} from '../src/core/nativeBlockRepair';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import {matchFormalBlockShape} from '../src/game/formalBlockShapes';
import type {BlockSpec,LevelSpec,Point} from '../src/core/types';

interface Replacement {sourceIds:string[];blockIds:string[];reason:string}
interface FixtureRow {id:number;level:LevelSpec;drags:RevisedSearchDrag[];replacements:Replacement[];lowerBound:number;upperBound:number}
// Missing artifacts fail collection; this acceptance must never silently skip
// when only a candidate has been generated but production adoption is missing.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-block-repair-v143.json',import.meta.url),'utf8')) as {
  ruleVersion:string;rows:FixtureRow[];
};
const ids=[23,26,28,29,30];
const targetIds:Record<number,string[]>={
  23:['r139-23-17'],
  26:['r139-26-h10','r139-26-h11'],
  28:['s28-hidden-1-0','s28-hidden-1-1','s28-hidden-1-2'],
  29:['s29-open-red-1','s29-open-red-2','s29-hidden-2-4'],
  30:['s30-open-15','s30-hidden-3','s30-hidden-4'],
};
const bands:Record<number,readonly [number,number]>={23:[11,15],26:[11,15],28:[5,10],29:[11,15],30:[21,30]};
const difficulty:Record<number,LevelSpec['difficulty']>={23:'normal',26:'normal',28:'easy',29:'normal',30:'super'};
const withoutBlocks=(level:LevelSpec)=>Object.fromEntries(Object.entries(level).filter(([key])=>key!=='blocks'));
const footprint=(blocks:BlockSpec[])=>blocks.flatMap(b=>b.shape.map(([x,y])=>`${x+b.x},${y+b.y}`)).sort();
const pointKey=([x,y]:Point)=>`${x},${y}`;
const bodyById=(level:LevelSpec,id:string)=>{
  const block=level.blocks.find(b=>b.id===id);expect(block,`Lv${level.id}: missing ${id}`).toBeDefined();return block!;
};

describe('v1.43 exact-footprint native-art repair, explicitly excluding Lv5',()=>{
  it('v1.43 stage adopts only its five levels and preserves its exact other 195 objects; final getters remain current',()=>{
    expect(fixture.ruleVersion).toBe('1.43.0');
    expect(NATIVE_BLOCK_REPAIR_IDS).toEqual(ids);expect(fixture.rows.map(row=>row.id)).toEqual(ids);
    expect(LEVELS).toHaveLength(200);expect(LEVELS_BEFORE_NATIVE_BLOCK_REPAIR).toHaveLength(200);
    let kept=0;
    // Check the historical repair boundary, before the separately authorized
    // v1.47 remakes. Its immutable fixture and 195-object invariant stay exact.
    for(const [index,level]of LEVELS_AFTER_NATIVE_BLOCK_REPAIR.entries()){
      const before=LEVELS_BEFORE_NATIVE_BLOCK_REPAIR[index]!;
      expect(level.id).toBe(index+1);expect(before.id).toBe(index+1);expect(getLevelStrict(index+1)).toBe(LEVELS[index]);
      if(ids.includes(level.id)){
        expect(level).not.toBe(before);expect(level).not.toEqual(before);
        expect(level).toEqual(fixture.rows.find(row=>row.id===level.id)!.level);
      }else{expect(level).toBe(before);expect(level).toEqual(before);kept++;}
    }
    expect(kept).toBe(195);
    expect(getLevelStrict(5)).toBe(LEVELS_BEFORE_NATIVE_BLOCK_REPAIR[4]);
  });

  it('changes no field outside blocks: board, mouths, mechanisms, counters, difficulty, time, reward and stars stay exact',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),before=LEVELS_BEFORE_NATIVE_BLOCK_REPAIR[id-1]!;
      expect(()=>validateLevel(level)).not.toThrow();
      expect(withoutBlocks(level)).toEqual(withoutBlocks(before));
      expect(levelStarTargets(level)).toEqual(levelStarTargets(before));
      expect(level.difficulty).toBe(difficulty[id]);expect(level.mechanismRules).toBe('revised-2026-09-23-v1.4');
    }
  });

  it('replaces exactly the twelve authorized targets inside their same-stage actual footprint unions',()=>{
    expect(Object.values(targetIds).flat()).toHaveLength(12);
    for(const row of fixture.rows){
      const level=getLevelStrict(row.id),before=LEVELS_BEFORE_NATIVE_BLOCK_REPAIR[row.id-1]!,targets=targetIds[row.id]!;
      const kept=before.blocks.filter(b=>!targets.includes(b.id)),keptIds=new Set(kept.map(b=>b.id));
      expect(level.blocks.filter(b=>keptIds.has(b.id))).toEqual(kept);
      const added=level.blocks.filter(b=>!keptIds.has(b.id));
      expect(added.length).toBeGreaterThan(0);
      expect(new Set(level.blocks.map(b=>b.id)).size).toBe(level.blocks.length);
      expect(row.replacements.length).toBeGreaterThan(0);
      expect(row.replacements.flatMap(r=>r.sourceIds).sort()).toEqual([...targets].sort());
      expect(row.replacements.flatMap(r=>r.blockIds).sort()).toEqual(added.map(b=>b.id).sort());
      for(const replacement of row.replacements){
        expect(replacement.reason.length).toBeGreaterThanOrEqual(8);
        expect(replacement.sourceIds.length).toBeGreaterThan(0);expect(replacement.blockIds.length).toBeGreaterThan(0);
        const sources=replacement.sourceIds.map(id=>bodyById(before,id));
        const destinations=replacement.blockIds.map(id=>bodyById(level,id));
        expect(new Set(sources.map(b=>b.shutterId??'opening')).size).toBe(1);
        expect(destinations.every(b=>b.shutterId===sources[0]!.shutterId)).toBe(true);
        // Compare sorted multisets, not a Set or area total: duplicate coverage,
        // a hole, a translation or borrowing a cell from a different layer fails.
        expect(footprint(destinations)).toEqual(footprint(sources));
        for(const body of destinations){
          expect(Object.keys(body).every(key=>['id','x','y','shape','color','shutterId'].includes(key))).toBe(true);
          expect(keptIds.has(body.id)).toBe(false);
          expect(level.gates.some(g=>g.color===body.color)).toBe(true);
          expect(matchFormalBlockShape(body.shape)?.quarterTurns).toBe(0);
        }
      }
    }
  });

  it('retains all non-target block properties and every actual block-carried mechanism',()=>{
    const mechanismFields=['layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds','rotationBadge'] as const;
    const special=(level:LevelSpec)=>level.blocks.filter(b=>mechanismFields.some(key=>b[key]!==undefined));
    for(const id of ids){
      const level=getLevelStrict(id),before=LEVELS_BEFORE_NATIVE_BLOCK_REPAIR[id-1]!;
      for(const target of targetIds[id]!){
        const body=bodyById(before,target);
        for(const key of mechanismFields)expect(body[key]).toBeUndefined();
      }
      expect(special(level)).toEqual(special(before));
      expect(level.gates).toEqual(before.gates);expect(level.shutters).toEqual(before.shutters);
      expect(level.generators).toEqual(before.generators);expect(level.flipDoors).toEqual(before.flipDoors);
      expect(level.coloredGrids).toEqual(before.coloredGrids);expect(level.elevators).toEqual(before.elevators);
    }
  });

  it('audits every opening and hidden block in 1–30, leaving precisely the three original Lv5 rotations',()=>{
    const rotations:{level:number;block:string;quarterTurns:number}[]=[];
    for(const level of LEVELS.slice(0,30))for(const block of level.blocks){
      const match=matchFormalBlockShape(block.shape);
      expect(match,`Lv${level.id} ${block.id} must still have whole artwork`).toBeDefined();
      if(match!.quarterTurns!==0)rotations.push({level:level.id,block:block.id,quarterTurns:match!.quarterTurns});
    }
    expect(rotations.sort((a,b)=>a.block.localeCompare(b.block))).toEqual([
      {level:5,block:'piece-04',quarterTurns:1},
      {level:5,block:'piece-05',quarterTurns:1},
      {level:5,block:'strategy-guard-01',quarterTurns:2},
    ]);
    // The legacy fallback remains necessary for protected later levels. This
    // test never claims that all 200 levels have already been adapted.
    const later=(levels:LevelSpec[])=>levels.slice(30).flatMap(level=>level.blocks.map(block=>({id:level.id,block:block.id,match:matchFormalBlockShape(block.shape)})));
    expect(later(LEVELS_AFTER_NATIVE_BLOCK_REPAIR)).toEqual(later(LEVELS_BEFORE_NATIVE_BLOCK_REPAIR));
  });

  for(const row of fixture.rows)it(`fully replays final Lv${row.id}, preserving mechanics and multi-cell-dominated necessary-reposition evidence`,()=>{
    const level=getLevelStrict(row.id),[minimum,maximum]=bands[row.id]!;
    expect(level).toEqual(row.level);expect(row.drags.length).toBeGreaterThan(0);
    expect(Number.isSafeInteger(row.lowerBound)).toBe(true);expect(Number.isSafeInteger(row.upperBound)).toBe(true);
    expect(row.lowerBound).toBeGreaterThanOrEqual(minimum);expect(row.upperBound).toBeLessThanOrEqual(maximum);
    expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
    // The stored lowerBound is metadata, not a proof. Fresh exhaustive bound
    // reports and real Pointer/natural-time tests remain separate acceptance.
    expect(replayRevisedRoute(level,row.drags)).toMatchObject({valid:true,complete:true,nonClearingDrags:row.upperBound});
    const model=new PuzzleModel(level);model.startCountdown();let single=0,multi=0;
    for(const drag of row.drags){
      const block=model.getBlock(drag.blockId);expect(block).toBeDefined();
      const area=block!.shape.length,before=model.snapshot().cleared;
      model.beginAction();for(const [x,y]of drag.path)expect(model.moveBlockStep(drag.blockId,x,y)).toBe(true);
      if(drag.exitSide)expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if(model.snapshot().cleared===before){if(area===1)single++;else multi++;}
    }
    const final=model.snapshot();
    expect(multi+single).toBe(row.upperBound);expect(multi).toBeGreaterThan(single);
    expect(final).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
    expect(final.cleared).toBe(level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0));
    expect(final.blocks).toHaveLength(0);expect(final.queuedBlocks).toHaveLength(0);
    expect(final.shutters.every(s=>s.revealed)).toBe(true);expect(final.gates.every(g=>!g.frozen)).toBe(true);
  });

  it('keeps opening coverage, visible neighbor colors and each real hidden layer fully occupied without overlap',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),blocked=new Set((level.blocked??[]).map(pointKey));
      const all=level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)] as Point);
      const legal=new Set(all.map(pointKey).filter(key=>!blocked.has(key))),opening=new Set<string>();
      const visibleCells=new Map<string,BlockSpec>();
      const claim=(set:Set<string>,x:number,y:number)=>{
        const key=`${x},${y}`;expect(legal.has(key),`Lv${id}: off-board ${key}`).toBe(true);
        expect(set.has(key),`Lv${id}: overlapping ${key}`).toBe(false);set.add(key);
      };
      for(const b of level.blocks.filter(b=>!b.shutterId))for(const [dx,dy]of b.shape){
        claim(opening,b.x+dx,b.y+dy);visibleCells.set(`${b.x+dx},${b.y+dy}`,b);
      }
      for(const [cell,b]of visibleCells){
        const [x,y]=cell.split(',').map(Number) as [number,number];
        for(const neighbor of [`${x+1},${y}`,`${x},${y+1}`]){
          const other=visibleCells.get(neighbor);
          if(other&&other.id!==b.id)expect(b.layers?.[0]??b.color).not.toBe(other.layers?.[0]??other.color);
        }
      }
      for(const shutter of level.shutters??[]){
        for(let y=shutter.y;y<shutter.y+shutter.height;y++)for(let x=shutter.x;x<shutter.x+shutter.width;x++)claim(opening,x,y);
        const hidden=new Set<string>(),members=level.blocks.filter(b=>b.shutterId===shutter.id);
        expect(members.length).toBeGreaterThan(0);
        for(const b of members)for(const [dx,dy]of b.shape){
          const x=b.x+dx,y=b.y+dy;
          expect(x).toBeGreaterThanOrEqual(shutter.x);expect(x).toBeLessThan(shutter.x+shutter.width);
          expect(y).toBeGreaterThanOrEqual(shutter.y);expect(y).toBeLessThan(shutter.y+shutter.height);claim(hidden,x,y);
        }
        expect(hidden.size).toBe(shutter.width*shutter.height);
      }
      expect([...opening].sort()).toEqual([...legal].sort());
      for(const b of level.blocks.filter(b=>b.shutterId))expect(level.shutters!.some(s=>s.id===b.shutterId)).toBe(true);
    }
  });
});
