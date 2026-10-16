import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {mapReferenceMacroPrefix,probeMappedMacroPrefix} from './design-macro-prefix-probe.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
const root='deliverables/daily-formal-v3-20261008',out=`${root}/design/macro-prefix64-04`,index=`${root}/selection/macro-fixed64-03-selected/index.json`,read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:false});const runtime=await loadBoundedRuntime(),rows=[],seen=new Set();
for(const file of read(index).files){const q=read(file);if(q.difficulty<2)continue;const b=read(q.baseInputFile);if(seen.has(q.baseInputFile))continue;seen.add(q.baseInputFile);try{assertPlainProofDomain(b.level);}catch{continue;}if(!b.drags)continue;
 const mapped=mapReferenceMacroPrefix(b.level,b.drags,b.level),probe=mapped.ok?probeMappedMacroPrefix(runtime,b.level,mapped):null;
 rows.push({file:q.baseInputFile,sha256:sha(q.baseInputFile),sourceLevelId:q.sourceLevelId,difficulty:q.difficulty,U:b.U??q.U,levelSha256:levelSha256(b.level),
  available:!!probe?.valid,mapped,probe,diagnostic:'Only provided successful-reference actions replayed; no new solver invocation or candidate proof.'});
}
const accepted=rows.filter(x=>x.available),report={status:'SUCCESSFUL_REFERENCE_PREFIX_READ_ANALYSIS',index:{path:index,sha256:sha(index)},rows,
 eligible:accepted.length,eligibleSources:[...new Set(accepted.map(x=>x.sourceLevelId))],d3Eligible:accepted.filter(x=>x.difficulty===3).length,d3Sources:[...new Set(accepted.filter(x=>x.difficulty===3).map(x=>x.sourceLevelId))],gameSearches:0,proofToolchainSha256:runtime.toolchainSha256,
 inference:'Preserve actual initial portal(s) and the translated swept cells/adjacent whole bodies for the first5 parking gestures. Macro retile only other bodies; changed neighboring occupancy is checked at each translated unit. Fresh colouring may change all non-clearing-body colours but may not create first-contact clears on these paths. This preserves a known prefix only, never a difficulty lower bound.'};
fs.writeFileSync(`${out}/reference-analysis.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({references:rows.length,eligible:report.eligible,sources:report.eligibleSources,d3Eligible:report.d3Eligible,d3Sources:report.d3Sources,failures:rows.filter(x=>!x.available).map(x=>({source:x.sourceLevelId,reason:x.probe?.reason??x.mapped.reason}))}));
