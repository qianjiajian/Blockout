// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import {readFileSync} from 'node:fs';
// @ts-expect-error Node evidence hashing is outside the browser tsconfig.
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE,getLevelStrict} from '../src/core/levels';
import {PuzzleModel,validateLevel} from '../src/core/PuzzleModel';
import {levelStarTargets} from '../src/core/levelStarConditions';
import {replayRevisedRoute,type RevisedSearchDrag} from '../src/core/revisedLevelSearch';
import type {BlockSpec,LevelSpec,PuzzleSnapshot} from '../src/core/types';

const baseline=JSON.parse(readFileSync(new URL('../deliverables/generator-color-repair-21-40-20260924/baseline.json',import.meta.url),'utf8')) as {
  levels:{id:number;sha256:string;starTargets:ReturnType<typeof levelStarTargets>}[];
  originalLevel35:LevelSpec;
};
const fixture=JSON.parse(readFileSync(new URL('./fixtures/generator-queue-color-repair.json',import.meta.url),'utf8')) as {
  ruleVersion:string;level:LevelSpec;drags:RevisedSearchDrag[];lowerBound:number;upperBound:number;
};
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical((value as Record<string,unknown>)[key])])):value;
const sha=(value:unknown):string=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const outer=(block:BlockSpec)=>block.layers?.[0]??block.color;

describe('v1.29 minimal generator queue color repair in 21–40',()=>{
  it('changed only level35 across all200 historical-stage fingerprints and preserved every actual star target',()=>{
    expect(baseline.levels.map(row=>row.id)).toEqual(Array.from({length:200},(_,i)=>i+1));
    expect(LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE).toHaveLength(200);
    const changed:number[]=[];
    for(const [i,level]of LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE.entries()){
      const original=baseline.levels[i]!;
      expect(level.id).toBe(original.id);
      // A later authorized 21-30 replacement is outside this historical diff,
      // but the repaired 35 must remain the identical actual final object.
      if(level.id===35)expect(getLevelStrict(35)).toBe(level);
      expect(levelStarTargets(level),`Lv${level.id} actual star targets`).toEqual(original.starTargets);
      if(sha(level)!==original.sha256)changed.push(level.id);
    }
    expect(changed).toEqual([35]);
    expect(sha(baseline.originalLevel35)).toBe(baseline.levels[34]!.sha256);
  });

  it('changes exactly one queued body color and no other level or block field',()=>{
    const original=baseline.originalLevel35,current=getLevelStrict(35);
    expect(current.blocks.map(b=>b.id)).toEqual(original.blocks.map(b=>b.id));
    const differences=current.blocks.flatMap((b,i)=>sha(b)===sha(original.blocks[i])?[]:[i]);
    expect(differences).toHaveLength(1);
    const index=differences[0]!,before=original.blocks[index]!,after=current.blocks[index]!;
    expect(after.color).not.toBe(before.color);
    expect(original.generators!.flatMap(g=>g.queueBlockIds).filter(id=>id===after.id)).toHaveLength(1);
    const restored=structuredClone(current);restored.blocks[index]!.color=before.color;
    expect(restored).toEqual(original);
  });

  it('preserves the eight-item supply, exact queue order, mounting, spawn and cargo shapes',()=>{
    const original=baseline.originalLevel35,current=getLevelStrict(35);
    expect(current.generators).toEqual(original.generators);
    expect(current.generators).toHaveLength(1);
    const queue=current.generators![0]!.queueBlockIds;
    expect(queue).toHaveLength(8);expect(new Set(queue).size).toBe(8);
    for(const id of queue){
      const before=original.blocks.find(b=>b.id===id)!,after=current.blocks.find(b=>b.id===id)!;
      expect(after.shape).toEqual(before.shape);expect([after.x,after.y]).toEqual([before.x,before.y]);
      expect(after.layers).toEqual(before.layers);expect(after.frozen??0).toBe(0);
    }
    expect(()=>validateLevel(current)).not.toThrow();
  });

  it('independently checks every machine in21–40 using consecutive initial outer colors',()=>{
    const palette=new Set(['red','blue','green','yellow','purple','orange','cyan','pink']);
    for(let id=21;id<=40;id++){
      const level=getLevelStrict(id),blocks=new Map(level.blocks.map(b=>[b.id,b])),owners=new Set<string>();
      expect(blocks.size).toBe(level.blocks.length);
      for(const generator of level.generators??[]){
        let previous:string|undefined;
        for(const blockId of generator.queueBlockIds){
          expect(owners.has(blockId)).toBe(false);owners.add(blockId);
          const block=blocks.get(blockId);expect(block,`Lv${id}/${generator.id}/${blockId}`).toBeDefined();
          const color=outer(block!);expect(palette.has(color)).toBe(true);
          if(previous!==undefined)expect(color,`Lv${id}/${generator.id}/${blockId}`).not.toBe(previous);
          previous=color;
        }
      }
    }
  });

  it('replays the newly bound formal route inside5–9 non-clearing gestures',()=>{
    const level=getLevelStrict(35);
    expect(fixture.ruleVersion).toBe('1.29.0');expect(fixture.level).toEqual(level);
    expect(fixture.drags.length).toBeGreaterThan(0);
    expect(fixture.lowerBound).toBeGreaterThanOrEqual(5);
    expect(fixture.upperBound).toBeLessThanOrEqual(9);
    expect(fixture.lowerBound).toBeLessThanOrEqual(fixture.upperBound);
    const replay=replayRevisedRoute(level,fixture.drags);
    expect(replay).toMatchObject({valid:true,complete:true,nonClearingDrags:fixture.upperBound});
    expect(replay.nonClearingDrags).toBeGreaterThanOrEqual(fixture.lowerBound);
    // This regression binds the published interval and its complete witness;
    // the separate authoring verifier freshly proves the lower bound.
    const end=JSON.parse(replay.finalStateKey!) as PuzzleSnapshot;
    expect(end).toMatchObject({complete:true,failed:false,timeFreezeSeconds:0});
    expect(end.blocks).toHaveLength(0);expect(end.queuedBlocks).toHaveLength(0);
  });

  it('observes all eight real deliveries in fixed order through unit moves, peels and removals',()=>{
    const level=getLevelStrict(35),machine=level.generators![0]!,queue=machine.queueBlockIds;
    const model=new PuzzleModel(level);model.startCountdown();
    let previousHead=0;const delivered:string[]=[];
    const observe=()=>{
      const snapshot=model.snapshot(),state=snapshot.generators.find(g=>g.id===machine.id)!;
      expect(state.head).toBeGreaterThanOrEqual(previousHead);expect(state.head).toBeLessThanOrEqual(queue.length);
      expect(state.remaining).toBe(queue.length-state.head);
      expect(state.queueBlockIds).toEqual(queue);expect(state.nextBlockId).toBe(queue[state.head]);
      expect(snapshot.queuedBlocks.map(b=>b.id).sort()).toEqual(queue.slice(state.head).sort());
      for(const id of queue.slice(previousHead,state.head)){
        const born=snapshot.blocks.find(b=>b.id===id),authored=level.blocks.find(b=>b.id===id)!;
        expect(born,`actual emitted ${id}`).toBeDefined();
        expect(born!.layers[0]).toBe(outer(authored));expect(born!.shape).toEqual(authored.shape);
        delivered.push(id);
      }
      previousHead=state.head;
    };
    observe();
    for(const drag of fixture.drags){
      model.beginAction();
      for(const [x,y]of drag.path){expect(model.moveBlockStep(drag.blockId,x,y)).toBe(true);observe();}
      if(drag.exitSide){expect(model.tryExit(drag.blockId,drag.exitSide).ok).toBe(true);observe();}
      expect(model.commitAction()).toBe(true);observe();
    }
    expect(delivered).toEqual(queue);expect(new Set(delivered).size).toBe(8);
    const final=model.snapshot();expect(final.complete).toBe(true);expect(final.failed).toBe(false);
    expect(final.generators[0]!.remaining).toBe(0);expect(final.queuedBlocks).toHaveLength(0);
    expect(final.cleared).toBe(level.blocks.reduce((total,b)=>total+(b.layers?.length??1),0));
  });
});
