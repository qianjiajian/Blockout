// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {LEVELS_BEFORE_NATIVE_BLOCK_REPAIR as LEVELS,LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE} from '../src/core/levels';
import {LAYOUT_ORIGINALITY_REMAKE_IDS} from '../src/core/layoutOriginalityRemake';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import type {LevelSpec,Point} from '../src/core/types';

// Missing adoption artifacts are a failure, not a reason to skip acceptance.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/layout-originality-v140.json',import.meta.url),'utf8')) as {
  ruleVersion:string;rows:{id:number;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number}[];
};
const ids=[21,22,23,28];
// Historical v1.40 witnesses stay bound to their own immutable campaign stage.
const getLevelStrict=(id:number)=>LEVELS[id-1]!;
const difficultyById:Record<number,'easy'|'normal'>={21:'easy',22:'normal',23:'normal',28:'easy'};
const bands={easy:[5,10],normal:[11,15]} as const;
const counters:Record<number,{curtains:number[];iceGates:number[];iceBodies:number[];shells:number;ordinary:number}>={
  21:{curtains:[10,17,19],iceGates:[2,6,13],iceBodies:[2,6],shells:4,ordinary:2},
  22:{curtains:[17],iceGates:[17,19,19],iceBodies:[5,5,5,5],shells:0,ordinary:3},
  23:{curtains:[9,12],iceGates:[3,5],iceBodies:[],shells:4,ordinary:3},
  28:{curtains:[3,7],iceGates:[2],iceBodies:[],shells:0,ordinary:5},
};
const sorted=(xs:number[])=>xs.slice().sort((a,b)=>a-b);
const without=(value:object,fields:readonly string[])=>Object.fromEntries(Object.entries(value).filter(([k])=>!fields.includes(k)));
const byId=<T extends {id:string}>(xs:T[])=>xs.slice().sort((a,b)=>a.id.localeCompare(b.id));
const key=([x,y]:Point)=>`${x},${y}`;
const boardCells=(level:LevelSpec):Point[]=>level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]);

// Rectangular orientation is an inventory category: H2 and V2 cannot exchange.
// For a non-rectangle, canonicalize only rigid rotations/reflections of its
// exact footprint. This does not merge unrelated polyominoes of equal area.
function shapeKind(shape:Point[]):string{
  const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
  const w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
  if(shape.length===w*h)return `rectangle:${w}x${h}`;
  const variants:string[]=[];
  for(const reflect of [false,true])for(let turns=0;turns<4;turns++){
    const points=shape.map(([x0,y0])=>{let x=reflect?-x0:x0,y=y0;for(let i=0;i<turns;i++){const t=x;x=-y;y=t;}return [x,y] as Point;});
    const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));
    variants.push(points.map(([x,y])=>`${x-minX},${y-minY}`).sort().join(';'));
  }
  return `irregular:${variants.sort()[0]}`;
}

function partition(level:LevelSpec,transform:(p:Point)=>Point=(p=>p)):string{
  const points=(cells:Point[])=>cells.map(transform).map(key).sort().join(';');
  const curtains=(level.shutters??[]).map(s=>'C:'+points(Array.from({length:s.width*s.height},(_,i)=>[s.x+i%s.width,s.y+Math.floor(i/s.width)])));
  const blocks=level.blocks.map(b=>(b.shutterId?'H:':'O:')+points(b.shape.map(([x,y])=>[x+b.x,y+b.y])));
  return JSON.stringify({curtains:curtains.sort(),blocks:blocks.sort()});
}

describe('v1.40 original aligned arrangements for only 21, 22, 23 and 28',()=>{
  it('binds all four fixtures to the final getters and preserves the other 196 exact objects',()=>{
    expect(fixture.ruleVersion).toBe('1.40.0');
    expect(LAYOUT_ORIGINALITY_REMAKE_IDS).toEqual(ids);
    expect(fixture.rows.map(r=>r.id)).toEqual(ids);
    expect(LEVELS).toHaveLength(200);expect(LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE).toHaveLength(200);
    let unchanged=0;
    for(const [i,level]of LEVELS.entries()){
      const old=LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE[i]!;
      expect(level.id).toBe(i+1);expect(old.id).toBe(i+1);expect(getLevelStrict(i+1)).toBe(level);
      if(!ids.includes(level.id)){expect(level).toBe(old);unchanged++;continue;}
      expect(level).not.toBe(old);expect(level).not.toEqual(old);
      expect(level).toEqual(fixture.rows.find(r=>r.id===level.id)!.level);
      expect(level.difficulty).toBe(difficultyById[level.id]);
    }
    expect(unchanged).toBe(196);
  });

  it('preserves board geometry, all peripheral metadata, clocks, rewards and actual star targets',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),old=LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE[id-1]!;
      expect(()=>validateLevel(level)).not.toThrow();
      // No difficulty or preservedMoveTarget exception is allowed in this batch.
      expect(without(level,['blocks','gates','shutters'])).toEqual(without(old,['blocks','gates','shutters']));
      expect({width:level.width,height:level.height,playable:level.playable,blocked:level.blocked,seams:level.seams})
        .toEqual({width:old.width,height:old.height,playable:old.playable,blocked:old.blocked,seams:old.seams});
      expect(levelStarTargets(level)).toEqual(levelStarTargets(old));
      expect(level.mechanismRules).toBe('revised-2026-09-23-v1.4');
    }
  });

  it('retains every body identity, colour, shape category, property and hidden batch plus every mechanism identity and value',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),old=LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE[id-1]!;
      const bodies=(l:LevelSpec)=>byId(l.blocks.map(b=>({...without(b,['x','y','shape']),id:b.id,shapeKind:shapeKind(b.shape)})));
      expect(bodies(level)).toEqual(bodies(old));
      expect(byId(level.gates.map(g=>({...without(g,['side','offset','size']),id:g.id}))))
        .toEqual(byId(old.gates.map(g=>({...without(g,['side','offset','size']),id:g.id}))));
      const curtains=(l:LevelSpec)=>byId((l.shutters??[]).map(s=>({...without(s,['x','y','width','height']),id:s.id,area:s.width*s.height})));
      expect(curtains(level)).toEqual(curtains(old));
      expect(new Set(level.blocks.map(b=>b.id)).size).toBe(level.blocks.length);
      const expected=counters[id]!;
      expect(sorted((level.shutters??[]).map(s=>s.count))).toEqual(expected.curtains);
      expect(sorted(level.gates.filter(g=>(g.frozen??0)>0).map(g=>g.frozen!))).toEqual(expected.iceGates);
      expect(sorted(level.blocks.filter(b=>(b.frozen??0)>0).map(b=>b.frozen!))).toEqual(expected.iceBodies);
      expect(level.blocks.filter(b=>(b.layers?.length??1)>1)).toHaveLength(expected.shells);
      expect(level.gates.filter(g=>!(g.frozen??0))).toHaveLength(expected.ordinary);
      expect(level.generators??[]).toHaveLength(0);
    }
  });

  it('changes the actual geometric partition rather than only identities, colours or a global mirror/rotation',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),old=LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE[id-1]!,w=old.width,h=old.height;
      const transforms:((p:Point)=>Point)[]=[([x,y])=>[x,y],([x,y])=>[w-1-x,y],([x,y])=>[x,h-1-y],([x,y])=>[w-1-x,h-1-y]];
      if(w===h)transforms.push(([x,y])=>[y,x],([x,y])=>[w-1-y,x],([x,y])=>[y,h-1-x],([x,y])=>[w-1-y,h-1-x]);
      for(const transform of transforms)expect(partition(level),`Lv${id} must have a genuinely new partition`).not.toBe(partition(old,transform));
    }
    // This is a geometric guard, not a numeric originality score or a substitute
    // for the separately recorded source/before/after visual review.
  });

  for(const row of fixture.rows)it(`replays the exact final Lv${row.id}, including all hidden bodies, with multi-cell-dominated repositioning`,()=>{
    const level=getLevelStrict(row.id),[min,max]=bands[difficultyById[row.id]!];
    expect(level).toEqual(row.level);expect(row.drags.length).toBeGreaterThan(0);
    expect(Number.isSafeInteger(row.lowerBound)).toBe(true);expect(Number.isSafeInteger(row.upperBound)).toBe(true);
    expect(row.lowerBound).toBeGreaterThanOrEqual(min);expect(row.upperBound).toBeLessThanOrEqual(max);
    expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
    // Fixture metadata is not itself a lower-bound proof. Fresh exhaustive
    // relaxed-graph validation remains a separate adoption requirement.
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
    const end=model.snapshot();expect(multi+single).toBe(row.upperBound);expect(multi).toBeGreaterThan(single);
    expect(end).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
    expect(end.cleared).toBe(level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0));
    expect(end.shutters.every(s=>s.revealed)).toBe(true);expect(end.gates.every(g=>!g.frozen)).toBe(true);
  });

  it('fills the opening and every hidden region independently with legal, non-overlapping real footprints',()=>{
    for(const id of ids){
      const level=getLevelStrict(id),legal=new Set(boardCells(level).map(key)),opening=new Set<string>();
      const claim=(set:Set<string>,x:number,y:number)=>{const cell=`${x},${y}`;expect(legal.has(cell),`Lv${id}: off-board ${cell}`).toBe(true);expect(set.has(cell),`Lv${id}: overlapping ${cell}`).toBe(false);set.add(cell);};
      for(const b of level.blocks.filter(b=>!b.shutterId))for(const [dx,dy]of b.shape)claim(opening,b.x+dx,b.y+dy);
      for(const curtain of level.shutters??[]){
        expect(curtain.count).toBeGreaterThan(0);expect(curtain.width).toBeGreaterThan(0);expect(curtain.height).toBeGreaterThan(0);
        for(let y=curtain.y;y<curtain.y+curtain.height;y++)for(let x=curtain.x;x<curtain.x+curtain.width;x++)claim(opening,x,y);
        const hidden=new Set<string>(),members=level.blocks.filter(b=>b.shutterId===curtain.id);expect(members.length).toBeGreaterThan(0);
        for(const b of members)for(const [dx,dy]of b.shape){
          const x=b.x+dx,y=b.y+dy;expect(x).toBeGreaterThanOrEqual(curtain.x);expect(x).toBeLessThan(curtain.x+curtain.width);
          expect(y).toBeGreaterThanOrEqual(curtain.y);expect(y).toBeLessThan(curtain.y+curtain.height);claim(hidden,x,y);
        }
        expect(hidden.size).toBe(curtain.width*curtain.height);
      }
      expect([...opening].sort()).toEqual([...legal].sort());
      for(const b of level.blocks.filter(b=>b.shutterId))expect(level.shutters!.some(s=>s.id===b.shutterId)).toBe(true);
      for(const gate of level.gates.filter(g=>(g.frozen??0)>0))expect(level.blocks.some(b=>(b.layers??[b.color]).includes(gate.color))).toBe(true);
    }
  });
});
