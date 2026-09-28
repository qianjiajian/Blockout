import fs from 'node:fs';import assert from 'node:assert/strict';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
// Recognize only appended, disjoint, pure-JSON campaign stages. After removing
// their exact import/stage/native-policy additions, every old byte must match.
// This never accepts arbitrary runtime, selector or rendering changes.
export function inspectDisjointWiring(file,requestedIds,previousText,currentText=fs.readFileSync(file,'utf8')){
 assert(['src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(file));assert.equal(typeof previousText,'string');
 const previous=previousText.replaceAll('\r\n','\n');let current=currentText.replaceAll('\r\n','\n');const modules=[];
 if(file==='src/core/levels.ts'){
  const imports=[...current.matchAll(/^import \{ (applyRemake(\d+)to(\d+)) \} from '\.\/(remake\d+to\d+)';\n/gm)].filter(m=>!previous.includes(m[0]));
  assert(imports.length>0);const pending=new Map(imports.map(m=>[m[1],m]));
  while(pending.size){const final=/^export const LEVELS: LevelSpec\[\] = (LEVELS_BEFORE_(\d+)_(\d+)_REMAKE)\.map\((applyRemake\d+to\d+)\);$/m.exec(current);assert(final,'Only a new final pure-data map stage may be appended');const m=pending.get(final[4]);assert(m);assert.equal(m[2],final[2]);assert.equal(m[3],final[3]);assert.equal(m[4],`remake${m[2]}to${m[3]}`);const first=Number(m[2]),last=Number(m[3]);assert(requestedIds.every(id=>id<first||id>last));
   const stage=new RegExp('^export const '+final[1]+': LevelSpec\\[\\] = ([^\\n]+);$','m').exec(current);assert(stage);assert.equal(current.split(stage[0]).length,2);const module=inspectDisjointData(`src/core/${m[4]}.ts`,requestedIds);modules.push(module);
   current=current.replace(stage[0]+'\n','').replace(final[0],`export const LEVELS: LevelSpec[] = ${stage[1]};`).replace(m[0],'');pending.delete(m[1]);
  }
 }else{
  const imports=[...current.matchAll(/^import \{ (REMADE_(\d+)_(\d+)_IDS) \} from '\.\.\/core\/(remake\d+to\d+)';\n/gm)].filter(m=>!previous.includes(m[0]));assert(imports.length>0);
  for(const m of imports){assert.equal(m[4],`remake${m[2]}to${m[3]}`);const first=Number(m[2]),last=Number(m[3]);assert(requestedIds.every(id=>id<first||id>last));modules.push(inspectDisjointData(`src/core/${m[4]}.ts`,requestedIds));const condition=` || ${m[1]}.includes(levelId)`;assert.equal(current.split(condition).length,2);current=current.replace(condition,'').replace(m[0],'');}
 }
 assert.equal(current,previous,'Non-data or existing wiring change detected');return{file,currentSha256:digest(currentText),kind:'exact-disjoint-pure-data-stage-append',modules,requestedIds,allOtherBytesUnchanged:true};
}
