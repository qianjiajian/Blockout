import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Read existing evidence only. In particular, this performs no constructor,
// colour-domain probe, CSP search, replay, or difficulty search.
const root='deliverables/daily-formal-v3-20261008/design';
const label=process.env.DESIGN_COLOUR_BATCH_LABEL??'reverse-route-colour6-08';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid batch label');
const directory=`${root}/${label}`,input=`${directory}/report.json`,output=`${root}/${label}-analysis.json`;
if(fs.existsSync(output))throw Error('Preserve prior analysis');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=JSON.parse(fs.readFileSync(input));
if(report.status!=='REVERSE_FINITE_BATCH_FINISHED')throw Error('Batch must finish first');
if(report.accepted.length)throw Error('Successful batches need an acceptance-specific analysis');
const screenBinding=report.inputBindings?.find(x=>x.path.startsWith(root)&&x.path.includes('screen')&&x.path.endsWith('.json'));
const screen=screenBinding?JSON.parse(fs.readFileSync(screenBinding.path)):null;
const bindings=[{path:input,sha256:sha(input)}],rows=[];
for(const row of report.rows){
 const p=JSON.parse(fs.readFileSync(row.constructionPath)),c=p.construction??{};
 bindings.push({path:row.constructionPath,sha256:sha(row.constructionPath)});
 const reports=p.colourCspReports??[],last=reports.at(-1),level=p.lastColourCspInput?.level;
 let lastDomainDiagnostic=null;
 if(last&&level&&last.inputLevelSha256===p.lastColourCspInput.levelSha256){
  const histogram={},excluded={},forced=last.domains.filter(d=>d.choices.length===1),conflicts=[];
  for(const d of last.domains){histogram[d.choices.length]=(histogram[d.choices.length]??0)+1;
   for(const e of d.excluded)excluded[e.reason]=(excluded[e.reason]??0)+1;}
  for(const a of forced)for(const b of forced)if(a.id<b.id&&a.choices[0].color===b.choices[0].color){
   const ba=level.blocks.find(x=>x.id===a.id),bb=level.blocks.find(x=>x.id===b.id);
   if(ba.shape.some(([x,y])=>bb.shape.some(([u,v])=>Math.abs(ba.x+x-bb.x-u)+Math.abs(ba.y+y-bb.y-v)===1)))
    conflicts.push({a:a.id,b:b.id,onlyCompatibleColour:a.choices[0].color});
  }
  lastDomainDiagnostic={inputLevelSha256:last.inputLevelSha256,domainSizeHistogram:histogram,excludedReasons:excluded,
   forcedAdjacentSameColourPairs:conflicts,
   inference:conflicts.length?'This closure is impossible under the fixed parking/clear-order witness even if exact colour-count preservation is removed. Both adjacent bodies have the same singleton route-compatible domain.':'No singleton adjacency contradiction identified by this read-only check.'};
 }
 const missingGateColours=p.lastColourCspInput?.level?.gates.filter(g=>!p.lastColourCspInput.level.blocks.some(b=>b.color===g.color)).map(g=>g.color)??[];
 const reference=screen?.records?.[row.serial];
 rows.push({...row,knownReferenceU:reference?.U,inheritedSuffixU:reference?reference.U-reference.prefixDragCount+reference.blueprintPrefixClearCount:null,
  withheldPrefixU:reference?reference.prefixDragCount-reference.blueprintPrefixClearCount:null,
  rawExpandedStates:c.rawExpandedStates,microDiscoveredStates:c.microDiscoveredStates,
  attemptedTransitions:c.attemptedTransitions,elapsedMilliseconds:c.elapsedMilliseconds,
  completeGeometryGoals:c.interleavedGoalWorlds,referenceSimilarityRejected:c.referenceSimilarityRejected,
  poolSimilarityRejected:c.poolSimilarityRejected,colourCspAttempts:c.colourCspAttempts,
  colourCspUnsatisfied:c.colourCspUnsatisfied,colourCspNodes:c.colourCspNodes,
  constructorRawCapRespected:c.rawDiscoveredStates<=10000&&c.rawExpandedStates<=10000,
  frontierPeak:c.interleavedFrontierPeak,poppedWorlds:c.interleavedPoppedWorlds,maximumParkingDepth:c.maximumVacancyDepth,
  maximumBodies:c.maximumBodies,stockBodyCount:p.constructionTemplateLevel?.blocks.length,
  completeFinalReplays:reports.reduce((n,r)=>n+(r.statistics?.finalDoubleReplays??0),0),missingGateColours,
  lowerSearchInvocations:c.fullBoardDifficultySearchInvocations??0,lastDomainDiagnostic,
  stockClaimPath:p.constructionAttempt});
}
const sum=k=>rows.reduce((n,r)=>n+(r[k]??0),0);
const result={status:'REVERSE_FINITE_BATCH_ANALYSED_NO_ACCEPTED_CANDIDATES',formalReady:false,
 productionChanged:false,searchesPerformedByThisAnalysis:0,inputBindings:bindings,
 implementationQualification:{path:`${root}/route-colour-qualification-v2/report.json`,sha256:sha(`${root}/route-colour-qualification-v2/report.json`),tests:26,failed:0},
 proofToolchainSha256:report.proofToolchainSha256,
 summary:{constructionInputs:rows.length,accepted:report.accepted.length,completeAdmissibleUpperWitnesses:0,
  lowerSearchInvocations:sum('lowerSearchInvocations'),completeGeometryGoals:sum('completeGeometryGoals'),
  referenceSimilarityRejected:sum('referenceSimilarityRejected'),poolSimilarityRejected:sum('poolSimilarityRejected'),
  colourCspAttempts:sum('colourCspAttempts'),colourCspUnsatisfied:sum('colourCspUnsatisfied'),
  colourCspNodes:sum('colourCspNodes'),completeFinalReplays:sum('completeFinalReplays'),
  allConstructorRawCapsRespected:rows.every(x=>x.constructorRawCapRespected)},rows,
 constructionQueuePolicy:report.declaredBeforeAllSearches.constructionQueuePolicy??'minimum-parking',
 conclusions:[
  `There were ${sum('completeGeometryGoals')} full-geometry goals and ${sum('colourCspAttempts')} colour-domain attempts; no accepted complete upper witness and no difficulty lower search.`,
  'Stopped constructors are UNKNOWN results, not proofs that these stocks are impossible. Their persistent claims/results remain immutable and block reuse.',
  'Withholding a large clear prefix also withholds its early parking dependencies. The per-row inheritedSuffixU is the exact non-clearing count remaining in the supplied known witness, not a difficulty lower bound.',
  'Any recorded forced adjacent singleton-colour pair is a direct contradiction for that fixed witness, even without exact colour-count preservation. It is not an impossibility proof for all possible routes.',
  'Construction order and its geometric/colour screening are separate from the unchanged bounded lower solver. No reference difficulty or long inverse walk is treated as new difficulty evidence.'
 ],nextDesignSuggestions:[
  'For genuinely new stocks, account for complete portal accessibility of all still-missing bodies in construction ordering, instead of filling quickly into a nearly full but unclosable region. This is a prospective heuristic, not established feasibility.',
  'Use the recorded fixed-suffix colour domains to avoid creating forced same-colour adjacency; all actual new colour-world probes must remain inside the single constructor raw budget.',
  'Preserve early pressure relationships when selecting references: a large-hole cut with suffix U0–4 does not retain the original early difficulty chain.',
  'Do not retry these inputs or mechanically increase budgets. A further experiment must declare a finite batch of different shape and colour inventories.'
 ]};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,summary:result.summary,rows:rows.map(r=>({source:r.sourceLevelId,raw:r.constructionRaw,goals:r.completeGeometryGoals,csp:r.colourCspAttempts,reason:r.reason,forcedPairs:r.lastDomainDiagnostic?.forcedAdjacentSameColourPairs.length??0}))}));
