import {describe,it,expect} from 'vitest';
import {FORMAL_BLOCK_SHAPES,matchFormalBlockShape,matchFormalBlockShapeForLevel} from '../src/game/formalBlockShapes';
import {REMADE_181_190_IDS} from '../src/core/remake181to190';
import {NATIVE_REMAKE31_40_IDS} from '../src/core/nativeRemake31to40';
import {REMADE_71_80_IDS} from '../src/core/remake71to80';
import {REMADE_61_70_IDS} from '../src/core/remake61to70';
import {REMADE_41_50_IDS} from '../src/core/remake41to50';
import {REMADE_51_60_IDS} from '../src/core/remake51to60';
import {REMADE_91_100_IDS} from '../src/core/remake91to100';
import {REMADE_81_90_IDS} from '../src/core/remake81to90';
import {REMADE_111_120_IDS} from '../src/core/remake111to120';
import {REMADE_101_110_IDS} from '../src/core/remake101to110';
import type {Point} from '../src/core/types';

describe('native texture policy in adapted levels, with explicit legacy exceptions',()=>{
 const inverseL:Point[]=[[1,0],[0,1],[1,1]];
 it('rejects a shape that would require rotating an image in adapted levels',()=>{
  expect(matchFormalBlockShape(inverseL)?.quarterTurns).toBe(3);
  for(let id=1;id<=30;id++)if(id!==5)expect(matchFormalBlockShapeForLevel(inverseL,id)).toBeUndefined();
  for(const id of [...REMADE_181_190_IDS,...NATIVE_REMAKE31_40_IDS,...REMADE_71_80_IDS,...REMADE_61_70_IDS,...REMADE_41_50_IDS,...REMADE_51_60_IDS,...REMADE_91_100_IDS,...REMADE_81_90_IDS,...REMADE_111_120_IDS,...REMADE_101_110_IDS])expect(matchFormalBlockShapeForLevel(inverseL,id)).toBeUndefined();
 });
 it('preserves exactly the existing matcher for Lv5 and every unadapted later level',()=>{
  for(const id of [5,...Array.from({length:170},(_,i)=>i+31).filter(id=>!REMADE_181_190_IDS.includes(id)&&!NATIVE_REMAKE31_40_IDS.includes(id)&&!REMADE_71_80_IDS.includes(id)&&!REMADE_61_70_IDS.includes(id)&&!REMADE_41_50_IDS.includes(id)&&!REMADE_51_60_IDS.includes(id)&&!REMADE_91_100_IDS.includes(id)&&!REMADE_81_90_IDS.includes(id)&&!REMADE_111_120_IDS.includes(id)&&!REMADE_101_110_IDS.includes(id))]){
   expect(matchFormalBlockShapeForLevel(inverseL,id)).toEqual(matchFormalBlockShape(inverseL));
  }
 });
 it('uses all complete native sprites, including separate horizontal and vertical artwork',()=>{
  for(const shape of FORMAL_BLOCK_SHAPES){
   const match=matchFormalBlockShapeForLevel(shape.cells,23);
   expect(match?.quarterTurns).toBe(0);expect(match?.shapeId).toBe(shape.shapeId);
  }
 });
 it('does not invent composited, reflected or invalid silhouettes',()=>{
  for(const cells of [[],[[0,0],[0,0]],[[0.5,0]],[[0,0],[1,1]]] as Point[][]){
   expect(matchFormalBlockShape(cells,'native-only')).toBeUndefined();
  }
 });
});
