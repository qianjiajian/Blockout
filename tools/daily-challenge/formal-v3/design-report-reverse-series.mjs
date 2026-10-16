import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/reverse-series-summary-01.json`;
if(fs.existsSync(output))throw Error('Preserve prior series summary');
const read=path=>JSON.parse(fs.readFileSync(path)),bind=path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')});
const reports=['reverse-bounded-01','reverse-blueprint-02','reverse-blueprint-joint-03','reverse-d3-stock-04'].map(label=>({label,path:`${root}/${label}/report.json`,report:read(`${root}/${label}/report.json`)}));
const rows=reports.flatMap(x=>x.report.rows.map(r=>({batch:x.label,...r}))),searches=rows.filter(r=>r.path),qualified=rows.filter(r=>r.accepted);
const canonical=[`${root}/reverse-blueprint-02/candidate-003.json`,`${root}/reverse-blueprint-greedy-01/candidate-000.json`].map(path=>{
 const p=read(path);return{...bind(path),sourceLevelId:p.sourceLevelId,difficulty:p.difficulty,L:p.L,U:p.U,totalDrags:p.drags.length,
  levelSha256:p.levelSha256,routeSha256:p.routeSha256,constructorRaw:p.construction.rawDiscoveredStates,proofRaw:p.proof.rawFullBoardStates,
  knownRouteProcessingCumulativeRaw:p.knownRouteGreedyProcessing?.statistics.cumulativeRawStates??null,
  referenceRetainedFootprint:p.provenance.referenceBlueprint.retainedFootprintArea,acceptedMathematically:true,
  formalReady:false,pointerValidated:false,timeValidated:false,practicalValidationNote:p.sourceLevelId===18?'Parent will test the 151-drag witness using real natural Pointer and the unchanged 75-second source timing; neither pass nor timeout is inferred here.':'Complete L/U19 witness available for parent final-slot qualification.'};
});
const out={status:'FINITE_REVERSE_DESIGN_LINE_SUMMARY_NOT_FORMAL_ACCEPTANCE',formalReady:false,productionChanged:false,proofFrozenUnchanged:true,
 counts:{newConstructorInputs:rows.length,completeConstructedWitnesses:rows.filter(x=>x.path).length,firstDifficultySearches:searches.length,
  mathematicalAccepts:qualified.length,D1:qualified.filter(x=>x.difficulty===1).length,D3:qualified.filter(x=>x.difficulty===3).length},
 batches:reports.map(x=>({...bind(x.path),label:x.label,status:x.report.status,rows:x.report.rows})),canonicalPool:canonical,
 evidence:[...['reverse-blueprint-qualification-01/index.json','reverse-blueprint-qualification-02/index.json','reverse-blueprint-qualification-03/index.json',
  'reverse-blueprint-diagnostics-01.json','greedy-route-qualification-01.json','reverse-blueprint-pruned-01/index.json','reverse-blueprint-pruned-02/index.json',
  'reverse-blueprint-greedy-01/index.json'].map(x=>bind(`${root}/${x}`))],
 frozenProofToolchainSha256:reports.at(-1).report.proofToolchainSha256,
 limits:['Every failed construction stock remains blocked; seed, gate or positional-only changes do not reopen it.',
  'The next proof strategy was declared before input: one joint floor31/upper128, no lower-only retry after a stopped joint search.',
  'The final two-input pilot allocated joint raw states as 10000 minus constructor raw; this is a conservative implementation choice, not a new user rule.',
  'Reverse operations and long witnesses establish an actual U only. The two accepted lower bounds came from their own single bounded proof search.',
  'The source18 supplied witness was simplified only by deterministic known-route edits and one committed early-clear trace; no second full-board U/L search was run.'],
 nextDesignDiagnosis:'Small fixed 2–3-cell vacancies often cannot produce a new full tiling with both no adjacent same colours and reference similarity <=.65. Latest source18 had 176 complete attempts: 132 adjacency and 44 similarity rejects; source100 had only its original-type complete footprint. Further mechanical stock sampling is paused pending a genuinely different construction plan.'};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({output,counts:out.counts,canonicalPool:canonical}));
