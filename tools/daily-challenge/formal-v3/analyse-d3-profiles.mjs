// Read-only evidence analysis. Deliberately imports no solver, runtime model,
// factory or proof tool. It cannot continue any failed search.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='deliverables/daily-formal-v3-20261008/design',out=process.argv[2]??'deliverables/daily-formal-v3-20261008/proof/d3-profile-analysis-v1';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,canonical(x[k])])):x;
const sha=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex'),bytesSha=x=>createHash('sha256').update(x).digest('hex');
const files=[];for(const dir of await fs.readdir(root,{withFileTypes:true}))if(dir.isDirectory())for(const name of await fs.readdir(path.join(root,dir.name)))
  if(/^candidate-\d+\.json$/.test(name))files.push(`${root}/${dir.name}/${name}`);
const rows=[],inputs={},skipped=[];
for(const file of files){
  const bytes=await fs.readFile(file),p=JSON.parse(bytes);inputs[file]=bytesSha(bytes);
  if(!p.level||!p.proof){skipped.push({file,reason:'no-complete-level-or-search-record'});continue;}
  const l=p.level,q=p.proof,bodies=l.blocks,shapeCounts={},groups=new Map(),colours=new Set(),areas=[];
  for(const b of bodies){
    const width=Math.max(...b.shape.map(v=>v[0]))+1,height=Math.max(...b.shape.map(v=>v[1]))+1,area=b.shape.length;
    const key=area===1?'S':width===1?`V${height}`:height===1?`H${width}`:area===width*height?`R${width}x${height}`:`I${area}`;
    shapeCounts[key]=(shapeCounts[key]??0)+1;areas.push(area);colours.add(b.color);
    const identity=JSON.stringify([b.color,[...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0])]);groups.set(identity,(groups.get(identity)??0)+1);
  }
  const legal=new Set((l.playable??Array.from({length:l.width*l.height},(_,i)=>[i%l.width,Math.floor(i/l.width)])).map(v=>v.join(',')));
  for(const c of l.blocked??[])legal.delete(c.join(','));
  const gateWidths={};for(const g of l.gates??[])gateWidths[g.size]=(gateWidths[g.size]??0)+1;
  const groupSizes=[...groups.values()].sort((a,b)=>b-a),logQuotient=groupSizes.reduce((n,c)=>n+Array.from({length:c},(_,i)=>Math.log10(i+1)).reduce((a,b)=>a+b,0),0);
  let constrainedLong=0,lateralMisaligned=0,totalLateralDistance=0;
  for(const b of bodies){
    const w=1+Math.max(...b.shape.map(v=>v[0])),h=1+Math.max(...b.shape.map(v=>v[1]));
    const gates=(l.gates??[]).filter(g=>g.color===b.color&&!g.portals?.length&&(['top','bottom'].includes(g.side)?w:h)<=g.size);
    if(!gates.length)continue;
    if((h>=3&&w===1||w>=3&&h===1)&&new Set(gates.map(g=>['top','bottom'].includes(g.side)?'V':'H')).size===1)constrainedLong++;
    const dist=Math.min(...gates.map(g=>{const p=['top','bottom'].includes(g.side)?b.x:b.y,span=['top','bottom'].includes(g.side)?w:h;
      return Math.max(0,g.offset-p,p+span-g.offset-g.size);}));
    if(dist>0)lateralMisaligned++;totalLateralDistance+=dist;
  }
  const recordHash=sha(l),hashMatch=!p.levelSha256||p.levelSha256===recordHash;
  const replay=p.independentReplay??p.replay,validAccepted=p.accepted===true&&hashMatch&&replay?.valid===true&&replay?.complete===true;
  const budgetLimited=q.status==='unknown'||['max-states','max-transitions','max-micro-states','deadline','max-drag-states'].includes(q.termination);
  const provenCost=q.cost??p.L??null,provenance=p.provenance??p.construction??{};
  rows.push({file,batch:file.split('/').at(-2),levelSha256:recordHash,sourceLevelId:p.sourceLevelId,accepted:validAccepted,
    declaredAccepted:p.accepted===true,hashMatch,outcome:validAccepted?`D${p.difficulty}`:budgetLimited?'UNKNOWN':p.failureReason??p.status,
    status:p.status,termination:q.termination,routeTermination:q.routeTermination,factoryVersion:p.factoryVersion,
    searchVersion:q.abstraction??'unknown',difficulty:validAccepted?p.difficulty:null,L:validAccepted?p.L:null,U:validAccepted?p.U:null,provenCost,
    width:l.width,height:l.height,area:legal.size,rectangular:legal.size===l.width*l.height,bodies:bodies.length,meanBodyArea:areas.reduce((a,b)=>a+b,0)/bodies.length,
    shapeCounts,irregular:bodies.filter(b=>b.shape.length!==(Math.max(...b.shape.map(v=>v[0]))+1)*(Math.max(...b.shape.map(v=>v[1]))+1)).length,
    singletonFraction:(shapeCounts.S??0)/bodies.length,verticalLongFraction:Object.entries(shapeCounts).filter(([key])=>/^V[3-9]/.test(key)).reduce((n,[,v])=>n+v,0)/bodies.length,
    longRodFraction:Object.entries(shapeCounts).filter(([key])=>/^[VH][3-9]/.test(key)).reduce((n,[,v])=>n+v,0)/bodies.length,
    colours:colours.size,gateCount:l.gates?.length??0,gateWidths,identicalBodyGroupSizes:groupSizes,duplicateBodyFraction:(bodies.length-groups.size)/bodies.length,
    log10PotentialLabelSymmetry:logQuotient,constrainedLongRods:constrainedLong,lateralMisalignedBodies:lateralMisaligned,totalLateralGateOffset:totalLateralDistance,
    initialExitCount:provenance.initialExitCount??null,emptyBoardMicro:provenance.emptyBoardSingleBodyMicroStates??null,
    states:q.discoveredStates,expanded:q.exploredStates,transitions:q.attemptedTransitions,micro:q.microDiscoveredStates??null,
    closureCalls:q.closureCalls??null,closureRemovals:q.closureRemovals??null,parkingTransitions:q.parkingTransitions??null,
    effectiveBranching:q.exploredStates?q.discoveredStates/q.exploredStates:null,transitionsPerExpanded:q.exploredStates?q.attemptedTransitions/q.exploredStates:null,
    parkingPerExpanded:q.exploredStates&&q.parkingTransitions!==undefined?q.parkingTransitions/q.exploredStates:null,
    budget:q.budget??null,elapsedMilliseconds:q.elapsedMilliseconds,totalDrags:p.drags?.length??null,
    routeNonclearByBody:p.drags&&replay?.trace?Object.fromEntries(bodies.map(b=>[b.id,replay.trace.filter(t=>t.blockId===b.id&&t.clearDelta===0).length])):null});
}
const median=values=>{const v=values.filter(Number.isFinite).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};
const summarize=list=>({count:list.length,accepted:list.filter(r=>r.accepted).length,D1:list.filter(r=>r.difficulty===1).length,D2:list.filter(r=>r.difficulty===2).length,D3:list.filter(r=>r.difficulty===3).length,
  outcomes:Object.fromEntries([...new Set(list.map(r=>r.outcome))].map(k=>[k,list.filter(r=>r.outcome===k).length])),
  medians:Object.fromEntries(['area','bodies','meanBodyArea','singletonFraction','longRodFraction','duplicateBodyFraction','states','expanded','transitions','micro','parkingPerExpanded','effectiveBranching','transitionsPerExpanded','totalLateralGateOffset'].map(k=>[k,median(list.map(r=>r[k]))]))});
const groupBy=fn=>Object.fromEntries([...new Set(rows.map(fn))].map(key=>[key,summarize(rows.filter(r=>fn(r)===key))]));
const aggregate={schemaVersion:1,mode:'READ_ONLY_EXISTING_EVIDENCE_NO_SOLVER',inputFiles:files.length,analysedSearchRecords:rows.length,skipped,
  uniqueLevelHashes:new Set(rows.map(r=>r.levelSha256)).size,summary:summarize(rows),byBatch:groupBy(r=>r.batch),byOutcome:groupBy(r=>r.outcome),
  bySource:groupBy(r=>r.sourceLevelId),byArea:groupBy(r=>r.area<35?'under35':r.area<50?'35-49':r.area<65?'50-64':'65plus'),
  byMeanBodyArea:groupBy(r=>r.meanBodyArea<2?'under2':r.meanBodyArea<2.7?'2-2.69':r.meanBodyArea<3.3?'2.7-3.29':'3.3plus'),
  byLongRodShare:groupBy(r=>r.longRodFraction<.2?'under20%':r.longRodFraction<.4?'20-39%':r.longRodFraction<.6?'40-59%':'60%plus'),
  bySingletonShare:groupBy(r=>r.singletonFraction<.1?'under10%':r.singletonFraction<.25?'10-24%':'25%plus'),
  byDuplicateShare:groupBy(r=>r.duplicateBodyFraction<.15?'under15%':r.duplicateBodyFraction<.3?'15-29%':'30%plus'),
  byBudgetAndTermination:groupBy(r=>`${r.budget?.maxTransitions??'v2-parking-only'}/${r.termination}`),
  successes:rows.filter(r=>r.accepted),D3:rows.filter(r=>r.difficulty===3),
  closestUnknowns:rows.filter(r=>r.outcome==='UNKNOWN').sort((a,b)=>(b.provenCost??0)-(a.provenCost??0)).slice(0,25),
  caveats:['All results are historical objects, not newly qualified or re-solved. Accepted denotes recorded complete exploratory L/U only.',
    'Legacy v2 transitions count parking candidates only and must not be compared directly with v3 full internal transitions.',
    'Budget UNKNOWN is not evidence of high difficulty, solvability or reaching the 10000 board cap.',
    'Associations are selection-biased and do not establish that a shape profile causes high difficulty.',
    'Lateral gate offsets use static bounding-box compatibility and are design descriptors, not lower bounds.'],
  inputHashes:inputs,inputsSha256:sha(inputs),productionChanged:false,solverCalls:0,formalReady:false};
await fs.mkdir(out,{recursive:false});await fs.writeFile(`${out}/analysis.json`,JSON.stringify(aggregate,null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${out}/rows.json`,JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...aggregate,successes:undefined,D3:aggregate.D3.map(r=>({file:r.file,source:r.sourceLevelId,U:r.U,states:r.states,shapeCounts:r.shapeCounts,duplicates:r.duplicateBodyFraction,groupSizes:r.identicalBodyGroupSizes,parkingPerExpanded:r.parkingPerExpanded})),inputHashes:undefined,closestUnknowns:undefined,bySource:undefined,skipped:skipped.length},null,2));
