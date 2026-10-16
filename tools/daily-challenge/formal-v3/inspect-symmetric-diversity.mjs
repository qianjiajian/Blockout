import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compareLayouts,auditDiversity,DIVERSITY_POLICY} from './diversity.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Read-only design inspection. It neither searches nor issues replacement receipts.
const [indexPath,outputDirectory]=process.argv.slice(2);
if(!indexPath||!outputDirectory)throw Error('Usage: node inspect-symmetric-diversity.mjs INDEX OUT_WITH_CAPTURED_LEGACY_SOURCE');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const binding=async file=>({path:file,sha256:sha(await fs.readFile(file))});
const index=await readJson(indexPath);
const legacyBinding=await readJson(path.join(outputDirectory,'legacy-source-binding.json'));
const legacyText=await fs.readFile(legacyBinding.copiedSource,'utf8');
assert.equal(sha(legacyText),legacyBinding.sha256,'Captured legacy source must remain exact');
const geometryUrl=pathToFileURL(path.resolve('tools/daily-challenge/formal-v2/geometry.mjs')).href;
const legacy=await import('data:text/javascript;base64,'+Buffer.from(legacyText.replace("'../formal-v2/geometry.mjs'",JSON.stringify(geometryUrl))).toString('base64'));
assert.equal(legacy.DIVERSITY_POLICY.version,'daily-diversity-v3.1');
assert.equal(DIVERSITY_POLICY.version,'daily-diversity-v3.2');
const records=[],inputBindings=[];
for(const file of index.files){
 const bytes=await fs.readFile(file),record=JSON.parse(bytes);
 assert.equal(levelSha256(record.level),record.levelSha256,`Level SHA mismatch: ${file}`);
 assert.equal(routeSha256(record.drags),record.routeSha256,`Route SHA mismatch: ${file}`);
 records.push(record);
 inputBindings.push({path:file,sha256:sha(bytes),formalId:record.formalId,sourceLevelId:record.sourceLevelId,
  stageKey:record.stageKey,difficulty:record.difficulty,levelSha256:record.levelSha256,routeSha256:record.routeSha256,
  proofToolchainSha256:record.toolchainSha256,lowerBoundSha256:levelSha256(record.lowerBound),L:record.L,U:record.U,
  originalDesignPolicy:record.design.policy.version});
}
const pairKey=(a,b)=>[a,b].sort().join('|');
const comparisons=[],violations=[],newViolations=[],aboveConservative65=[],asymmetricLegacy=[];
let swaps=0,oracleChecks=0;
for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
 const a=records[i],b=records[j];
 const oldAB=legacy.compareLayouts(a.level,b.level),oldBA=legacy.compareLayouts(b.level,a.level);
 const ab=compareLayouts(a.level,b.level),ba=compareLayouts(b.level,a.level);
 assert.equal(ab.footprintSimilarity,ba.footprintSimilarity);assert.equal(ab.gateGeometrySimilarity,ba.gateGeometrySimilarity);swaps++;
 const expected=oldBA.footprintSimilarity>oldAB.footprintSimilarity||oldBA.footprintSimilarity===oldAB.footprintSimilarity&&oldBA.gateGeometrySimilarity>oldAB.gateGeometrySimilarity?oldBA:oldAB;
 assert.equal(ab.footprintSimilarity,expected.footprintSimilarity);assert.equal(ab.gateGeometrySimilarity,expected.gateGeometrySimilarity);oracleChecks++;
 const sameGroup=a.stageKey===b.stageKey&&a.difficulty===b.difficulty;
 const maximum=sameGroup?DIVERSITY_POLICY.sameGroupMaximumFootprintSimilarity:DIVERSITY_POLICY.globalMaximumFootprintSimilarity;
 const row={a:a.formalId,b:b.formalId,sourceA:a.sourceLevelId,sourceB:b.sourceLevelId,sameGroup,maximum,
  legacyForward:oldAB.footprintSimilarity,legacyReverse:oldBA.footprintSimilarity,...ab};
 comparisons.push(row);
 if(oldAB.footprintSimilarity!==oldBA.footprintSimilarity)asymmetricLegacy.push(row);
 if(ab.footprintSimilarity>maximum+1e-12){violations.push(row);if(oldAB.footprintSimilarity<=maximum+1e-12)newViolations.push(row);}
 if(ab.footprintSimilarity>.65+1e-12)aboveConservative65.push(row);
}
const oldAudit=legacy.auditDiversity(records),newAudit=auditDiversity(records),reversedAudit=auditDiversity([...records].reverse());
const keys=rows=>rows.map(r=>pairKey(r.a,r.b)).sort();
assert.deepEqual(keys(newAudit.nearPairs),keys(violations));
assert.deepEqual(keys(reversedAudit.nearPairs),keys(violations));
assert.equal(newAudit.status,reversedAudit.status);
const regressionA='deliverables/league-v2-20261008/design/raw-compact-01/candidate-01557.json';
const regressionB='deliverables/daily-formal-v3-20261008/design/generator-berths-05/candidate-0196.json';
const ra=(await readJson(regressionA)).level,rb=(await readJson(regressionB)).level;
const regression={a:await binding(regressionA),b:await binding(regressionB),legacyAB:legacy.compareLayouts(ra,rb),legacyBA:legacy.compareLayouts(rb,ra),newAB:compareLayouts(ra,rb),newBA:compareLayouts(rb,ra)};
assert.equal(regression.newAB.footprintSimilarity,24/35);assert.equal(regression.newBA.footprintSimilarity,24/35);
const unchanged=[];for(const entry of inputBindings){assert.equal((await binding(entry.path)).sha256,entry.sha256);unchanged.push(entry.path);}
const report={schemaVersion:1,kind:'READ_ONLY_SYMMETRIC_DESIGN_REAUDIT',createdAt:new Date().toISOString(),
 policy:DIVERSITY_POLICY,formalReady:false,productionChanged:false,solverInvocations:0,ledgerWrites:0,mathematicalReceiptsReissued:0,
 index:await binding(indexPath),inspector:await binding('tools/daily-challenge/formal-v3/inspect-symmetric-diversity.mjs'),
 currentComparison:await binding('tools/daily-challenge/formal-v3/diversity.mjs'),legacyBinding,
 proofToolchainSha256s:[...new Set(records.map(r=>r.toolchainSha256))],inputs:inputBindings,
 count:records.length,pairCount:comparisons.length,allPairSwapChecks:swaps,allPairLegacyMaximumOracleChecks:oracleChecks,
 inputBytesUnchanged:unchanged.length,legacyAsymmetricPairCount:asymmetricLegacy.length,
 legacyAuditStatus:oldAudit.status,currentPartialAuditStatus:newAudit.status,
 policyViolationCount:violations.length,newPolicyViolationCount:newViolations.length,
 aboveConservative65Count:aboveConservative65.length,
 conservative65Note:'Cross-group scores above .65 and at most .75 are design-review flags, not violations of the catalog policy.',
 violations,newViolations,aboveConservative65,legacyAsymmetricPairs:asymmetricLegacy,regression,
 oldAudit,newAudit,reversedAuditStatus:reversedAudit.status,
 conclusion:violations.length?'Current selection requires design curation before new-policy acceptance. Original mathematics remains unchanged.':'No new numeric policy violations in this 134-candidate snapshot; current-policy receipt revalidation and visual review remain separate.',
 limits:['Only numeric design comparisons are rechecked. This is not a visual PASS, a mathematical reproof, or formal 450 acceptance.',
  'Old receipts carry their original design policy and bindings; this report does not relabel or replace them.',
  'No candidate is removed or its public failure ledger changed by this inspector.']};
await fs.writeFile(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(outputDirectory,'all-pairs.json'),JSON.stringify(comparisons,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:path.join(outputDirectory,'report.json'),count:report.count,pairs:report.pairCount,
 oldStatus:oldAudit.status,newStatus:newAudit.status,violations,newViolations,above65:aboveConservative65.length,
 legacyAsymmetric:asymmetricLegacy.length,oracleChecks,swaps,inputBytesUnchanged:unchanged.length},null,2));
