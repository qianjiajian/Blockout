import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {describeLayout,compareLayouts,auditDiversity} from './diversity.mjs';

// Read-only candidate selection. No runtime loader, proof search, level mutation,
// or migration of old certificates into a new formal identity occurs here.
const input='deliverables/daily-formal-v3-20261008/selection/macro-fixed64-03-selected/index.json';
const output='deliverables/daily-formal-v3-20261008/design/merged-basic-scope-01';
const merged=new Set(['color-exit','irregular-block','frozen-exit','irregular-board','numeric-ice','shutter']);
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const counts=rows=>[1,2,3].map(d=>rows.filter(r=>r.difficulty===d).length);
const bindings=new Map();
async function bind(p){if(!bindings.has(p))bindings.set(p,sha(await fs.readFile(p)));return bindings.get(p);}
const manifest=await read('docs/rules/manifest.json');if(manifest.activeVersion!=='1.156.0')throw Error('Review current rule before changing this audit');
const index=await read(input);await bind(input);
const records=[];
for(const file of index.files){
 const q=await read(file),issues=[],hash=levelSha256(q.level),routeHash=routeSha256(q.drags),lower=q.lowerBound?.result;
 const check=(yes,why)=>{if(!yes)issues.push(why);};
 check(q.accepted===true,'prior-candidate-acceptance');
 check(hash===q.levelSha256&&hash===q.staticAudit?.levelSha256&&hash===q.lowerBound?.inputLevelSha256&&hash===q.route?.inputLevelSha256,'full-object-binding');
 check(routeHash===q.routeSha256&&routeHash===q.route?.routeSha256,'route-binding');
 check(q.staticAudit?.passed&&q.strength?.passed&&q.design?.passed,'prior-static-design-strength');
 check(q.route?.canonicalReplay?.valid&&q.route?.canonicalReplay?.complete&&q.route?.independentReplay?.valid&&q.route?.independentReplay?.complete,'stored-complete-dual-replay');
 check(q.route.canonicalReplay.nonClearingDrags===q.U&&q.route.independentReplay.nonClearingDrags===q.U,'route-U');
 check(lower?.thresholdProven===true&&lower.certifiedFloor>=q.L,'stored-L');
 check(Number.isSafeInteger(lower?.rawFullBoardStates)&&lower.rawFullBoardStates<=10000&&Number.isSafeInteger(lower?.rawExploredStates)&&lower.rawExploredStates<=10000,'raw-budget-evidence');
 const floor=[null,16,21,31][q.difficulty],upper=[null,20,30,Infinity][q.difficulty];
 check(q.L>=floor&&q.U>=q.L&&q.U<=upper,'band');
 if(q.baseInputFile)check(await bind(q.baseInputFile)===q.baseInputFileSha256,'base-file-binding');
 const assetEntries=Object.entries(q.staticAudit?.assetBindings??{});
 check(assetEntries.length>0,'asset-bindings-missing');
 for(const[p,h]of assetEntries)check(await bind(`public/${p}`)===h,`asset:${p}`);
 const desc=describeLayout(q.level),basic=merged.has(q.newestMechanism);
 if(basic)check(q.staticAudit.mechanisms.every(m=>merged.has(m)),'advanced-mechanism-in-basic');
 records.push({q,file,fileSha256:await bind(file),issues,hash,routeHash,basic,desc});
}
const basic=records.filter(r=>r.basic),advanced=records.filter(r=>!r.basic),bad=records.filter(r=>r.issues.length);
if(bad.length)throw Error(JSON.stringify(bad.map(r=>({file:r.file,issues:r.issues}))));
const pair=new Map(),basicViolations=[];let maximumAll=0;
for(let a=0;a<records.length;a++)for(let b=a+1;b<records.length;b++){
 const x=records[a],y=records[b],s=compareLayouts(x.q.level,y.q.level).footprintSimilarity;
 pair.set([x.file,y.file].sort().join('|'),s);maximumAll=Math.max(maximumAll,s);
 if(x.basic&&y.basic&&x.q.difficulty===y.q.difficulty&&s>.65+1e-12)basicViolations.push({a:x.file,b:y.file,s});
 if(s>.75+1e-12)throw Error('Old 150 global similarity conflict');
}
const sim=(a,b)=>pair.get([a.file,b.file].sort().join('|'))??0;
const selection=[],groups=[];
for(const difficulty of [1,2,3]){
 const available=basic.filter(r=>r.q.difficulty===difficulty),chosen=[];
 while(chosen.length<10&&chosen.length<available.length){
  const sources=new Set(chosen.map(r=>r.q.sourceLevelId)),outlines=new Set(chosen.map(r=>r.desc.boardOutlineSha256));
  const categories=new Set(chosen.map(r=>r.q.newestMechanism));
  const allowed=available.filter(r=>!chosen.includes(r)&&chosen.every(x=>sim(r,x)<=.65+1e-12)
   &&chosen.filter(x=>x.desc.gateGeometrySha256===r.desc.gateGeometrySha256).length<2);
  if(!allowed.length)break;
  const score=r=>[Number(!categories.has(r.q.newestMechanism)),Number(!outlines.has(r.desc.boardOutlineSha256)),Number(!sources.has(r.q.sourceLevelId)),
   -Math.max(0,...chosen.map(x=>sim(r,x))),-chosen.reduce((s,x)=>s+sim(r,x),0),r.q.U-r.q.L,-r.q.sourceLevelId];
  allowed.sort((a,b)=>{const x=score(a),y=score(b);for(let k=0;k<x.length;k++)if(x[k]!==y[k])return y[k]-x[k];return a.file.localeCompare(b.file);});
  chosen.push(allowed[0]);
 }
 const row={difficulty,count:chosen.length,missing:10-chosen.length,sourceLevels:[...new Set(chosen.map(r=>r.q.sourceLevelId))],
  boardOutlines:[...new Set(chosen.map(r=>r.desc.boardOutlineSha256))],priorPrimaryKinds:[...new Set(chosen.map(r=>r.q.newestMechanism))],
  maximumPairSimilarity:Math.max(0,...chosen.flatMap((a,i)=>chosen.slice(i+1).map(b=>sim(a,b))))};
 row.sourceQuotaSatisfied=row.sourceLevels.length>=4;row.outlineQuotaSatisfied=row.boardOutlines.length>=3;
 if(!row.sourceQuotaSatisfied||!row.outlineQuotaSatisfied)throw Error('Merge group quota failure');
 groups.push(row);selection.push(...chosen);
}
const proposed=[...selection,...advanced];
const diversity=auditDiversity(proposed.map(r=>({formalId:r.q.formalId,stageKey:r.basic?'proposed-basic-merged':r.q.stageKey,difficulty:r.q.difficulty,sourceLevelId:r.q.sourceLevelId,level:r.q.level})),{expectFull:false});
if(diversity.reasons.length)throw Error(JSON.stringify(diversity.reasons));
const summarize=r=>({file:r.file,fileSha256:r.fileSha256,oldFormalId:r.q.formalId,oldStageKey:r.q.stageKey,oldSlot:r.q.slot,
 sourceLevelId:r.q.sourceLevelId,difficulty:r.q.difficulty,L:r.q.L,U:r.q.U,totalDrags:r.q.drags.length,
 levelSha256:r.hash,routeSha256:r.routeHash,sourceLevelSha256:r.q.sourceLevelSha256,
 baseInputFile:r.q.baseInputFile,baseInputFileSha256:r.q.baseInputFileSha256,
 oldPrimaryMechanism:r.q.newestMechanism,actualMechanisms:r.q.staticAudit.mechanisms,
 width:r.q.level.width,height:r.q.level.height,playableCells:r.desc.playableCells,openingBodies:r.desc.openingBodies,fullBodies:r.desc.fullBodies,
 boardOutlineSha256:r.desc.boardOutlineSha256,exactPartitionSha256:r.desc.exactPartitionSha256,gateGeometrySha256:r.desc.gateGeometrySha256,
 storedEvidence:{fullObjectAndRouteHashVerified:true,completeDualReplay:true,lowerMethod:r.q.lowerBound.method,rawFullBoardStates:r.q.lowerBound.result.rawFullBoardStates,
  rawExploredStates:r.q.lowerBound.result.rawExploredStates,proofToolchainSha256:r.q.toolchainSha256,proofRuleVersion:r.q.ruleVersion,
  priorStaticPassed:true,priorStrengthPassed:true,originalOrientationArtBindingsVerified:true,assetBindings:r.q.staticAudit.assetBindings,
  storedDesignValidated:r.q.designValidated,storedMechanismStrengthValidated:r.q.mechanismStrengthValidated,
  storedPointerValidated:r.q.pointerValidated,storedTimeValidated:r.q.timeValidated,storedStatus:r.q.status},
 plannedRole:selection.includes(r)?'PROPOSED_MERGED_BASIC':r.basic?'UNSELECTED_PRESERVED_RESERVE':'RETAIN_ADVANCED_PENDING_NEW_BINDING',
 newFormalId:null,newGroupProofClaimed:false,formalReady:false});
const inventory=records.map(summarize),chosenRows=selection.map(summarize),advancedRows=advanced.map(summarize);
const stages=[...new Set(advanced.map(r=>r.q.newestMechanism))].map(mechanism=>{const set=advanced.filter(r=>r.q.newestMechanism===mechanism),byDifficulty=counts(set.map(r=>r.q));return{mechanism,retained:byDifficulty,missing:byDifficulty.map(n=>10-n),count:set.length};});
const proposal={schemaVersion:1,status:'READ_ONLY_MERGED_GROUP_PROPOSAL_NOT_NEW_FORMAL_ACCEPTANCE',ruleVersion:'1.156.0',formalReady:false,productionChanged:false,
 inputIndex:input,inputIndexSha256:await bind(input),original150:{total:150,mergedCandidates:counts(basic.map(r=>r.q)),advancedCandidates:counts(advanced.map(r=>r.q))},
 selectionMethod:'deterministic actual-evidence filter; cover six previous primary kinds, then novel outline/source and lower footprint overlap; no gameplay search',
 selectedBasic:chosenRows,retainedAdvanced:advancedRows,groups,stages,
 totalProposed:proposed.length,proposedByDifficulty:counts(proposed.map(r=>r.q)),missingByDifficulty:counts(proposed.map(r=>r.q)).map(n=>100-n),missingTotal:300-proposed.length,
 existingBasicSameGroupViolations:basicViolations,maximumOriginal150PairSimilarity:maximumAll,diversity,
 notes:['External proposal only: original level, drags, lower result, receipts and old formalId untouched.',
 'New v1.156 stage/static/unlock/family/strength and identity bridge still required; no certificate relabeling.',
 'Old top-level designValidated/mechanismStrengthValidated remain false despite nested design.passed/strength.passed; this audit records both unchanged, and does not relabel the receipts.',
 'Stored Pointer flags do not summarize separately archived sample tests; new full 300x2 formal Pointer acceptance remains outstanding.',
 'Omitted original 34 basic candidates are preserved; any later use requires global physical/family uniqueness and new group qualification.',
 'Historical retired families and actual visual rejections must remain reachable through priorIndex and base ancestry.'],
 searchAccounting:{newUpperSearches:0,newLowerSearches:0,newGameplayStates:0,routeReplayedHere:false},
 toolBindings:{'tools/daily-challenge/formal-v3/design-audit-merged-basic-plan.mjs':await bind('tools/daily-challenge/formal-v3/design-audit-merged-basic-plan.mjs'),
  'tools/daily-challenge/formal-v3/diversity.mjs':await bind('tools/daily-challenge/formal-v3/diversity.mjs')}};
await fs.mkdir(output,{recursive:false});
const write=(p,o)=>fs.writeFile(`${output}/${p}`,JSON.stringify(o,null,2)+'\n',{flag:'wx'});
await write('inventory150.json',{inputIndex:input,inputIndexSha256:await bind(input),records:inventory});
await write('proposal.json',proposal);
await write('index.json',{schemaVersion:1,formalReady:false,priorIndex:input,proposalFile:`${output}/proposal.json`,files:selection.map(r=>r.file)});
for(const[p,h]of bindings)if(sha(await fs.readFile(p))!==h)throw Error(`Input changed ${p}`);
await write('input-bindings.json',{bindings:Object.fromEntries(bindings),allUnchangedAtEnd:true});
console.log(JSON.stringify({output,totalProposed:proposal.totalProposed,retained:proposal.proposedByDifficulty,missing:proposal.missingByDifficulty,groups}));
