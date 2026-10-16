import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/reverse-prefix6-analysis-01.json`;
if(fs.existsSync(output))throw Error('Preserve prior diagnosis');
const read=path=>JSON.parse(fs.readFileSync(path)),bind=path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')});
const reportPath=`${root}/reverse-prefix6-05/report.json`,qualificationPath=`${root}/reverse-blueprint-qualification-04/index.json`,report=read(reportPath),qualification=read(qualificationPath);
const rows=report.rows.map(row=>{
 const p=read(row.constructionPath),s=p.construction,q=qualification.records.find(x=>x.sourceLevelId===row.sourceLevelId),original=read(q.path),prefix=original.drags.slice(0,q.prefixDragCount);
 const removedIds=new Set(prefix.filter(x=>x.exitSide).map(x=>x.blockId)),parks=prefix.filter(x=>!x.exitSide);
 const area=p.constructionTemplateLevel.blocks.reduce((n,b)=>n+b.shape.length,0);
 return{sourceLevelId:row.sourceLevelId,seed:row.seed,reference:bind(q.path),constructor:bind(row.constructionPath),
  constructionClaim:bind(`${p.constructionAttempt}/claim.json`),constructionResult:bind(`${p.constructionAttempt}/result.json`),
  status:row.status,reason:row.reason,rawDiscovered:s.rawDiscoveredStates,rawExpanded:s.rawExpandedStates,
  area,maximumFilled:s.maximumFilledCells,temporaryVacancyArea:s.blueprintInitialVacancyArea,prefixClearCount:q.initialPrefixClearCount,
  prefixDragCount:q.prefixDragCount,withheldIds:[...removedIds],originalInventoryIds:original.level.blocks.map(b=>b.id).sort(),
  inverseQualificationRestoredExactInventory:q.originalWorldRestored,referenceU:q.originalU,reconstructedU:q.reconstructedU,
  insertionCandidates:s.insertionCandidates,finalSameColourRejected:s.finalAdjacencyRejected,referenceSimilarityRejected:s.referenceSimilarityRejected,
  insertionCallsWithoutPortal:s.insertionCallsWithoutPortal,vacancyDepthLimitHits:s.vacancyDepthLimitHits,maximumVacancyDepth:s.maximumVacancyDepth,
  referenceParkingOnWithheldBodies:parks.filter(x=>removedIds.has(x.blockId)).length,
  referenceParkingOnRetainedBodies:parks.filter(x=>!removedIds.has(x.blockId)).length,
  prefixActionSchedule:prefix.map((x,i)=>({index:i,kind:x.exitSide?'clear':'parking',blockId:x.blockId,bodyWithheldAtCut:removedIds.has(x.blockId)})),
  difficultySearches:0,accepted:false,formalReady:false};
});
const out={status:'SIX_NEW_STOCK_LARGER_PREFIX_PILOT_COMPLETE_NO_NEW_ACCEPTS',newConstructionInputs:6,accepted:0,difficultySearches:0,
 formalReady:false,productionChanged:false,proofFrozenUnchanged:true,inputs:[bind(reportPath),bind(qualificationPath),bind(`${root}/reverse-prefix-screen-01.json`)],
 toolBindings:['design-reverse-blueprint.mjs','design-reverse-construction-factory.mjs','design-reverse-pool.mjs','design-reverse-prefix.test.mjs','design-report-prefix6.mjs'].map(x=>bind(`tools/daily-challenge/formal-v3/${x}`)),
 declaredStrategy:report.declaredBeforeAllSearches,rows,
 facts:['All six stocks differed in both shape inventory and colour inventory from every construction failure recorded at screening; no previous failed input was searched again.',
  'The reference cut is after the second or third actual clear, not the second/third drag. Withheld inventory includes only removed bodies; parking does not create a duplicate body.',
  'Known inverse qualification reconstructs every original body ID, position, shape and colour, including the three-clear source100 reference.',
  'The candidate factory attempts every withheld body order and each legal insertion, and accepts only after the entire inventory is restored and the original-model route completely clears it.',
  'Candidate completion currently performs only insertions once it begins restoring the withheld group. It does not generate parking between these insertions.',
  'Three supplied successful prefixes do move bodies that will themselves be withheld at the cut: source54 two such parking gestures, source100 three and source80 one. These cannot occur in the factory while those bodies are still absent.'],
 interpretation:['The larger vacancy allows more partial insertions, but did not cure coupled portal closure. This pilot does not prove that these stocks have no diverse solvable arrangement.',
  'A potential different constructor would search one bounded reverse graph containing both true insertion and parking edges, so a newly restored body can participate before the next insertion. It still needs one common raw budget, actual inverse auditing and whole-inventory final replay.',
  'That different strategy has not been implemented or run here. Every failed stock remains blocked; a later strategy must start from different real shape and colour stock.']};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({output,accepted:0,newConstructionInputs:6,difficultySearches:0}));
