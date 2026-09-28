import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {build} from 'esbuild';
import {validateSelection,assertFormalLevelsMatch} from '../../../tools/campaign-v145/lv061-070/playtest-formal.mjs';

const summary=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv061-070/summary.json'));
const selected=summary.rows.map(row=>({file:row.candidate.path,data:JSON.parse(fs.readFileSync(row.candidate.path))}));
function browserHarness({cloneModelLevel=false}={}){
 const LEVELS=Array.from({length:200},(_,i)=>({id:i+1,mechanismRules:'revised-2026-09-23-v1.4',blocks:[]})),calls=[];
 class Game{constructor(){this.model={level:LEVELS[0]};}loadLevel(id,play){calls.push([id,play]);this.model={level:cloneModelLevel?structuredClone(LEVELS[id-1]):LEVELS[id-1]};}start(){}}
 const context=vm.createContext({ColorEscapeGame:Game,WebHost:class{},getLevelStrict:id=>LEVELS[id-1],LEVELS,FEATURE_INTRO_POLICY:[],structuredClone,window:{}});
 const source=fs.readFileSync('tools/campaign-v145/lv061-070/formal-browser.mjs','utf8').replace(/^import .*;\r?\n/gm,'');vm.runInContext(source,context);
 return{context,LEVELS,calls,bridge:context.window.__REMAKE_FORMAL__};
}
test('formal browser calls the existing production entry with only id/play and keeps exact identity',()=>{
 const {bridge,calls,LEVELS}=browserHarness(),before=JSON.stringify(LEVELS),entry=bridge.load(64,{id:64,forbiddenCandidate:true});
 assert.deepEqual(calls,[[64,true]]);assert.equal(JSON.stringify(LEVELS),before);assert.equal(entry.candidateInjected,false);assert.equal(entry.formalObjectIdentity,true);assert.equal(entry.formalDefinitionsUnchanged,true);assert.equal(entry.level.forbiddenCandidate,undefined);
 assert.equal(bridge.storage().backend,'MemoryHost');assert.throws(()=>bridge.load(60),/61–70/);assert.throws(()=>bridge.load(61.5),/integer/);
});
test('formal browser rejects a cloned model definition instead of accepting value equality',()=>{
 assert.throws(()=>browserHarness({cloneModelLevel:true}).bridge.load(61),/exact formal LEVELS object/);
});
test('formal browser detects replacement and in-place mutation of actual LEVELS',()=>{
 const replaced=browserHarness();replaced.bridge.load(61);replaced.LEVELS[60]=structuredClone(replaced.LEVELS[60]);assert.throws(()=>replaced.bridge.verifyIdentity(61),/object replaced/);
 const mutated=browserHarness();mutated.bridge.load(61);mutated.LEVELS[60].blocks.push({id:'drift'});assert.throws(()=>mutated.bridge.verifyIdentity(61),/definitions mutated/);
});
test('summary selection checks exact candidate file, bytes, level and route hashes',()=>{
 assert.equal(validateSelection(summary,selected).length,10);
 const altered=structuredClone(summary);altered.rows[0].candidate.sha256='0'.repeat(64);assert.throws(()=>validateSelection(altered,[selected[0]]),/bytes drifted/);
 const changedRoute=structuredClone(selected[0]);changedRoute.data.drags.pop();assert.throws(()=>validateSelection(summary,[changedRoute]),/route drifted/);
 const otherPath={...selected[0],file:selected[1].file};assert.throws(()=>validateSelection(summary,[otherPath]),/not the selected candidate/);
 assert.throws(()=>validateSelection(summary,[selected[0],selected[0]]),/Duplicate requested/);
});
test('actual final LEVELS match all ten summary-selected candidates; stale definitions are rejected',async()=>{
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:'export {LEVELS} from "./src/core/levels.ts";'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 assertFormalLevelsMatch(api.LEVELS,selected);
 const changed=structuredClone(api.LEVELS);changed[60].blocks[0].x+=1;assert.throws(()=>assertFormalLevelsMatch(changed,selected),/actual final LEVELS differs/);
});
