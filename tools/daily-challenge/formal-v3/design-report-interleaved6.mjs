import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/reverse-interleaved6-analysis-01.json`;
if(fs.existsSync(output))throw Error('Preserve historical diagnosis');
const read=path=>JSON.parse(fs.readFileSync(path)),bind=path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')});
const reportPath=`${root}/reverse-interleaved6-06/report.json`,screenPath=`${root}/reverse-interleaved-screen-01.json`,report=read(reportPath),screen=read(screenPath);
if(report.status!=='REVERSE_FINITE_BATCH_FINISHED'||report.rows.length!==6)throw Error('Six-input batch is not finished');
const rows=report.rows.map(row=>{
 const construction=read(row.constructionPath),s=construction.construction,p=row.path?read(row.path):null,ref=screen.records.find(x=>x.sourceLevelId===row.sourceLevelId);
 const actual=bind(ref.path);if(actual.sha256!==ref.fileSha256)throw Error('Reference modified');
 if(s.rawDiscoveredStates!==s.rawWorldSha256s.length||s.rawDiscoveredStates>10000||s.rawExpandedStates>10000||s.expandedWorldSha256s.some(x=>!s.rawWorldSha256s.includes(x)))throw Error('Invalid raw accounting');
 const receipt=construction.constructionAttempt;
 return{sourceLevelId:row.sourceLevelId,seed:row.seed,reference:actual,shapeInventorySha256:ref.shapeInventorySha256,colourInventorySha256:ref.colourInventorySha256,
  construction:bind(row.constructionPath),claim:bind(`${receipt}/claim.json`),result:bind(`${receipt}/result.json`),
  ...(p?{candidate:bind(row.path),proofOutcome:bind(`${receipt}/proof-outcome.json`)}:{}),
  status:row.status,constructorStatus:construction.status,constructorReason:construction.reason??null,constructed:construction.ok,
  accepted:p?.accepted??false,finiteU:construction.U??null,unprunedU:construction.unprunedConstructionWitness?.U??null,
  constructionRaw:s.rawDiscoveredStates,constructionExpanded:s.rawExpandedStates,constructionMicro:s.microDiscoveredStates,constructionTransitions:s.attemptedTransitions,
  boardArea:construction.constructionTemplateLevel.blocks.reduce((n,b)=>n+b.shape.length,0),maximumFilledCells:s.maximumFilledCells,
  missingStockCount:ref.blueprintPrefixClearCount,temporaryVacancyArea:s.blueprintInitialVacancyArea,
  interleavedPoppedWorlds:s.interleavedPoppedWorlds,parkingsOfReinsertedBodies:s.interleavedInsertedBodyParkingEdges,
  completeGoalWorlds:s.interleavedGoalWorlds,frontierPeak:s.interleavedFrontierPeak,maximumParkingDepth:s.maximumVacancyDepth,
  finalSameColourRejected:s.finalAdjacencyRejected,referenceSimilarityRejected:s.referenceSimilarityRejected,noFreePortalCalls:s.insertionCallsWithoutPortal,
  fullDifficultySearches:p?.proof?1:0,lowerStatus:p?.proof?.status??null,lowerReason:p?.proof?.reason??null,
  lowerRaw:p?.proof?.rawFullBoardStates??null,partialCertifiedFloor:p?.proof?.certifiedFloor??null,diversity:row.diversity??null,
  constructorRawIsNotLowerEvidence:true,formalReady:false};
});
const out={status:'INTERLEAVED_SIX_INPUT_PILOT_FINISHED',formalReady:false,productionChanged:false,
 newConstructionInputs:6,completeWitnesses:rows.filter(x=>x.constructed).length,difficultySearches:rows.reduce((n,x)=>n+x.fullDifficultySearches,0),accepted:rows.filter(x=>x.accepted).length,
 allOriginalReferenceFilesUnchanged:true,allConstructorsRawAtMost10000:true,proofToolchainSha256:report.proofToolchainSha256,
 inputs:[bind(reportPath),bind(screenPath),bind(`${root}/reverse-interleaved-qualification-01.json`),bind(`${root}/reverse-blueprint-qualification-05/index.json`)],
 originalExecutionBindings:report.inputBindings,declaredStrategy:report.declaredBeforeAllSearches,rows,
 facts:['The same graph admits insertion, parking of any current entity, and later insertion without resetting its visited set or raw budget.',
  'Known source54/source100/source80 reference routes passed exact inventory restoration and both actual-model replays through this scheduler. Those qualifications generated no new moves and ran no search on their failed stocks.',
  'All six new input stocks differ in both shape and colour inventories from every failed stock present at the read-only screen. No previously failed physical input was retried.',
  'Two new full layouts had finite actual-model witnesses, U28 and U13, and passed the numeric similarity prefilter. U13 is below every target band and was rejected without a difficulty search.',
  'The U28 layout received exactly one predeclared lower31 search. It stopped at 10000 raw worlds with only partial floor14, so neither D2 nor D3 was accepted.',
  'All six input stocks remain blocked after their construction or subsequent rejection. No second lower or upper search was run.'],
 interpretation:['The former scheduling omission is fixed and exercised by actual newly inserted bodies, but does not by itself ensure a diverse high-difficulty layout.',
  'Three exhausted construction graphs reached only limited or rejected complete layouts under their unchanged stock and portals. Exhaustion is of this finite constructor, not a proof of puzzle unsolvability.',
  'A future batch should use genuinely different successful high-difficulty stocks and preserve a long early blocking dependency; this batch does not justify increasing budgets or repeating the same inventories.']};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({output,newConstructionInputs:6,completeWitnesses:out.completeWitnesses,difficultySearches:out.difficultySearches,accepted:out.accepted,rows:rows.map(x=>({source:x.sourceLevelId,raw:x.constructionRaw,U:x.finiteU,goals:x.completeGoalWorlds,parkedInserted:x.parkingsOfReinsertedBodies,adj:x.finalSameColourRejected,near:x.referenceSimilarityRejected,status:x.status}))}));
