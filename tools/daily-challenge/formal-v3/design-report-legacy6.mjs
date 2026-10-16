import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {orbitFootprintArea,bodyFootprint} from './diversity-layout-factory.mjs';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/reverse-legacy6-analysis-01.json`;
if(fs.existsSync(output))throw Error('Preserve diagnosis evidence');
const read=p=>JSON.parse(fs.readFileSync(p)),bind=p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')});
const reportPath=`${root}/reverse-legacy6-07/report.json`,screenPath=`${root}/reverse-legacy-screen-01.json`,report=read(reportPath),screen=read(screenPath);
if(report.status!=='REVERSE_FINITE_BATCH_FINISHED'||report.rows.length!==6)throw Error('Batch not complete');
const rows=report.rows.map((row,i)=>{
 const c=read(row.constructionPath),s=c.construction,reference=screen.records[i],original=read(reference.path),p=row.path?read(row.path):null;
 if(bind(reference.path).sha256!==reference.fileSha256)throw Error('Reference changed');
 if(s.rawDiscoveredStates>10000||s.rawExpandedStates>10000||s.rawWorldSha256s.length!==s.rawDiscoveredStates)throw Error('Invalid raw count');
 const claim=read(`${c.constructionAttempt}/claim.json`),outcomePath=`${c.constructionAttempt}/proof-outcome.json`;
 return{serial:i,sourceLevelId:row.sourceLevelId,normalDimensions:[original.level.width,original.level.height],reference:bind(reference.path),
  shapeInventorySha256:reference.shapeInventorySha256,colourInventorySha256:reference.colourInventorySha256,
  constructor:bind(row.constructionPath),claim:bind(`${c.constructionAttempt}/claim.json`),result:bind(`${c.constructionAttempt}/result.json`),
  ...(p?{candidate:bind(row.path),proofOutcome:bind(outcomePath)}:{}),
  status:row.status,reason:c.reason??null,constructed:c.ok,accepted:p?.accepted??false,knownU:c.U??null,
  proofStrategy:p?.declaredProofStrategy??null,L:p?.L??null,U:p?.U??null,difficulty:p?.difficulty??null,
  constructionRaw:s.rawDiscoveredStates,constructionExpanded:s.rawExpandedStates,micro:s.microDiscoveredStates,transitions:s.attemptedTransitions,
  elapsedMilliseconds:s.elapsedMilliseconds,originalReferenceU:original.U,prefixClearCount:reference.blueprintPrefixClearCount,vacancyArea:reference.temporaryVacancyArea,
  fullDifficultySearches:p?.proof?1:0,proofRaw:p?.proof?.rawFullBoardStates??null,proofReason:p?.proof?.reason??null,
  finalSameColourRejected:s.finalAdjacencyRejected,referenceSimilarityRejected:s.referenceSimilarityRejected,interleavedCompleteGoals:s.interleavedGoalWorlds,
  parkingsOfReinsertedBodies:s.interleavedInsertedBodyParkingEdges,maximumParkingDepth:s.maximumVacancyDepth,
  changedBodyFootprints:c.ok?c.level.blocks.filter(b=>bodyFootprint(b)!==bodyFootprint(original.level.blocks.find(o=>o.id===b.id))).length:null,
  referenceFootprintSimilarity:c.ok?orbitFootprintArea(original.level,c.level):null,diversity:row.diversity??null,
  persistentStockClaimMatches:claim.inputSha256===reference.inputSha256,
  humanVisualReview:'PENDING_REAL_OPENING_REVIEW',formalReady:false};
});
const out={status:'LEGACY_SIX_STOCK_REVERSE_PILOT_FINISHED',newConstructionInputs:6,newCompleteWitnesses:rows.filter(x=>x.constructed).length,
 actualDifficultySearches:rows.reduce((n,x)=>n+x.fullDifficultySearches,0),accepted:report.accepted,formalReady:false,
 proofToolchainSha256:report.proofToolchainSha256,inputs:[bind(reportPath),bind(screenPath)],originalExecutionBindings:report.inputBindings,rows,
 facts:['Six successful legacy stock templates were used only as references. Their original layouts were not added to the new pool.',
  'Every stock differs in both shape and colour inventory from all prior failed construction stocks and from the other five inputs. Each stock was searched once.',
  'All prefixes expose exactly two cells after one or two actual clears. Source masks and complete shape/color inventories remain intact through reverse construction.',
  'New layouts are compared at <=0.65 against current selected128, all v3 successes, the six references, and 542 legacy successful objects. The second source2 map was rejected at 0.6667 before any lower search.',
  'Only the first source2 map reached a lower call. Its already verified complete U30 selected floor21 before the claim; fresh lower certified21 in624 raw worlds. No search or target was changed after a result.',
  'Three construction inputs stopped on their first declared budget (10000 raw or30seconds); one exhausted its finite constructor. These and the diversity rejection remain blocked without retry.',
  'The accepted map is an exploratory mathematical candidate. Stage adaptation, actual opening visual review and final Pointer remain separate.'],
 nextBoundary:'Report this bounded pilot before further expansion; do not mechanically repeat failed stocks.'};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({output,accepted:out.accepted,rows:rows.map(x=>({source:x.sourceLevelId,status:x.status,raw:x.constructionRaw,U:x.knownU,changed:x.changedBodyFootprints,referenceSimilarity:x.referenceFootprintSimilarity}))}));
