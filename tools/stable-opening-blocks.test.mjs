import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stableOpeningBlocks} from './stable-opening-blocks.mjs';
import {loadPreviewCore} from './revised-preview-validation-v160.mjs';
const {api}=await loadPreviewCore();
for(const [id,count]of [[65,11],[66,17]])test(`Lv${id} zero-count lift cargo is not opening-visible`,()=>{
 const l=JSON.parse(fs.readFileSync(`.codex-temp/remaining147-v110/early/candidate-${id}.json`)).level;
 assert(l.shutters.some(s=>s.skin==='lift'&&s.count===0));
 const visible=stableOpeningBlocks(l,api.PuzzleModel);assert.equal(visible.length,count);
 assert(visible.every(b=>!b.shutterId));
});
test('initial autonomous materialization uses real model start, including revealed blocks',()=>{
 let called=false;class Model{constructor(l){assert.equal(l.mechanismRules,'revised-fixture');}start(){called=true;}snapshot(){assert(called);return{blocks:[{id:'revealed',shutterId:'a'},{id:'hidden',shutterId:'b'},{id:'generated'}],shutters:[{id:'a',revealed:true},{id:'b',count:0,revealed:false}]};}}
 assert.deepEqual(stableOpeningBlocks({mechanismRules:'revised-fixture'},Model).map(b=>b.id),['revealed','generated']);
});
test('legacy static semantics remain unchanged',()=>{
 const l={blocks:[{id:'a'},{id:'b',shutterId:'c'},{id:'q'},{id:'d',shutterId:'open'}],shutters:[{id:'c',count:1},{id:'open',count:0}],generators:[{queueBlockIds:['q']}]};
 assert.deepEqual(stableOpeningBlocks(l,null).map(b=>b.id),['a','d']);
});
