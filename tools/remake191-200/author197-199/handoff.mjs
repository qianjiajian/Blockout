import fs from 'node:fs';
import assert from 'node:assert/strict';
import {save,digest} from './common.mjs';
const root='deliverables/remake191-200-20260927/author197-199/';
const targets=[
 [197,'checked197-1790523993758-56984.json','source197-ledger-1790524082065-15884.json',11,15,35],
 [198,'checked198-1790524176399-64252.json','source198-ledger-1790524412341-43980.json',21,29,70],
 [199,'checked199-1790524200698-59416.json','source199-ledger-1790524550146-16216.json',5,10,43],
];
const levels=targets.map(([id,c,s,L,U,moves])=>{
 const cf=root+c,sf=root+s,candidate=JSON.parse(fs.readFileSync(cf)),source=JSON.parse(fs.readFileSync(sf));
 assert.equal(source.levelSha256,digest(candidate.level));assert.equal(candidate.levelSha256,digest(candidate.level));assert.equal(candidate.drags.length,moves);assert.equal(candidate.replay.nonClearingDrags,U);assert.equal(source.sourceUnresolved.length,0);
 const bound=[...source.freshImageBindings,...source.additionalViewedFrameBindings??[]];for(const e of bound)assert.equal(digest(fs.readFileSync(e.path)),e.sha256);
 const more=[...source.personallyViewedFrames??[],...source.personallyViewedRevealFrames??[]].filter(x=>typeof x==='string');const paths=[...new Set([...bound.map(x=>x.path),...more,source.sourcePristineFrame])];
 return{id,candidate:cf,candidateRawSha256:digest(fs.readFileSync(cf)),sourceLedger:sf,sourceLedgerRawSha256:digest(fs.readFileSync(sf)),levelSha256:digest(candidate.level),routeSha256:digest(candidate.drags),certifiedLowerBound:L,completeRouteUpperBound:U,totalDrags:moves,currentSourceFrameHashes:paths.map(path=>({path,sha256:digest(fs.readFileSync(path))})),sourceStatus:'PASS_KNOWN_FACTS_RETAINED_EXPLICIT_COLOR_AND_SHAPE_ADAPTATION',remaining:'Root final dual-screen Pointer/natural clock, independent acceptance and serial production integration.'};
});
const quality=root+'quality198-1790525652752-52964.json';
const q=JSON.parse(fs.readFileSync(quality));assert.equal(q.levelSha256,levels[1].levelSha256);
console.log(save('handoff197-199',{status:'THREE_QUALIFIED_CANDIDATES_READY_FOR_ROOT',activeRulesRead:'1.111.0',taskAuthority:'1.108.0',levels,quality198:{file:quality,sha256:digest(fs.readFileSync(quality)),recommendation:q.judgment},alternate198Search:{status:'BOUNDED_FAMILIES_RETAINED_NOT_ADOPTED',lastBatches:['evolution198-1790525522665-39804.json','evolution198-1790525648281-32472.json'].map(f=>({path:root+f,sha256:digest(fs.readFileSync(root+f))})),result:'All-multicell families reached complete U17 then U23; U23 lower-bound checks found relaxed shortcuts. No new qualified candidate supersedes original mixed-shape L21/U29 map. No unbounded budget escalation.'},scoreConflicts:[{id:197,preservedMoves:25,minFromClearLoadPlusLowerBound:31,action:'Keep25; no score edit authorization.'},{id:198,preservedMoves:56,minFromClearLoadPlusLowerBound:62,action:'Keep56; no score edit authorization.'}],notes:['197 final pink-star ice16 and cyan-star ice15 match coherent source star color-pair mapping. Earlier opposite-gate candidate remains historical.','199 corrects old-formal role placement: all three shells are hidden (one in count5 batch, two in count12 batch); hidden ice16 is in count12 batch.','199 actual design irregular body count2, not3 in an early generic candidate sentence. Full source ledger is authoritative.'],productionModifiedByThisAgent:false,playerSaveTouched:false,published:false}));
