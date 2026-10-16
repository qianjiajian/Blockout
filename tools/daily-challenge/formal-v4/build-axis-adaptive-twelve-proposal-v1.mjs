/** Metadata only. Invoke after root review with the actual new tool qualification
 * and completed history-export descriptors. This never calls a factory, domain,
 * model, route replay, solver, ledger claim or history merger. Old proposals and
 * consumed recipes are immutable. The output itself does not authorize a run. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertWholeBoardBatchProposal,assertWholeBoardRecipe,adaptivePhaseQuotes,
 futureReservations,replayEnvelope,SELF as TASK,VERSION as TASK_VERSION,
 QUALIFICATION_STATUS,JOINT_BUDGET,LIMITS} from './axis-ice-wholeboard-batch-task-v4.mjs';

export const SELF='tools/daily-challenge/formal-v4/build-axis-adaptive-twelve-proposal-v1.mjs';
export const DRAFT=Object.freeze({path:'deliverables/daily-formal-v4-20261008/design/axis-ice-adaptive-twelve-source-draft-01/proposal.json',sha256:'03fe90ac423aeb158c3e6da0fa232300a8900be5c7ccfefb0f6475cf65d22461'});
const TEMPLATE={path:'deliverables/daily-formal-v4-20261008/design/axis-ice-wholeboard-next-three-proposal-02/proposal.json',sha256:'30c579560d4096a80dec5f8a963f9d2bf634a2b662ccc02699438de9fe0511cd'};
const FACTORY='tools/daily-challenge/formal-v4/axis-ice-wholeboard-stock-v4.mjs';
const PRIMITIVE='tools/daily-challenge/formal-v4/bounded-axis-ice-proof.mjs';
const TOOL_HASHES={
 [TASK]:'920011f9ec17a326ed563f40b2e6e2afae7e4eacd5402b3b4552320e1987db59',
 [FACTORY]:'eee678581de757d9af37e6ea23bc7916e46b3a0d98f5ba181bea54fc9c6d8903',
 [PRIMITIVE]:'2506cb9f3a2eb31b18f2b2d2fa51472bbf4f1ca516cefee54d22f2c60811387e',
};
const SOURCE_IDS=[3,4,7,10,14,19,31,52,60,122,196,200];
// Root narrowed the draft after export29402: these four have no authenticated
// failed parent. Do not invent one or add a new-source permission to task-v4.
const ACTIVE_SOURCE_IDS=[3,7,10,14,31,52,60,200],DEFERRED_SOURCE_IDS=[4,19,122,196];
const COLOURS=['blue','cyan','green','orange','pink','purple','red','yellow'];
const FROZEN='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact path/SHA required');
const integer=(n,lo=0,hi=Number.MAX_SAFE_INTEGER)=>assert(Number.isSafeInteger(n)&&n>=lo&&n<=hi);
const same=(a,b)=>assert.equal(levelSha256(a),levelSha256(b));
const exists=p=>fs.stat(p).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
const cellsKey=c=>JSON.stringify(c.toSorted((a,b)=>a[1]-b[1]||a[0]-b[0]));

/** Same eight-colour rank permutation as stock-v4; no placements or domains. */
export function declaredPalette(seed){integer(seed,0,0xffffffff);let state=seed;
 return COLOURS.map(c=>({c,rank:((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)}))
  .sort((a,b)=>a.rank-b.rank).map(x=>x.c);
}

/** Saved-source geometry facts only. A normal mask is not a claim that its
 * original inventory filled it; source14/source19 gaps remain explicit. */
export function sourceOpeningFacts(row){const l=row.level,A=l.width*l.height;
 integer(l.width,1);integer(l.height,1);assert(A<=63);assert.equal(l.id,row.sourceLevelId);
 assert.equal(levelSha256(l),row.sourceLevelSha256);assert(!(l.blocked?.length));assert(!(l.seams?.length));
 const mask=l.playable??Array.from({length:A},(_,i)=>[i%l.width,Math.floor(i/l.width)]);
 assert.equal(mask.length,A);assert.equal(new Set(mask.map(p=>p.join(','))).size,A);
 for(const[x,y]of mask){integer(x,0,l.width-1);integer(y,0,l.height-1);}
 const queued=new Set((l.generators??[]).flatMap(g=>g.queueBlockIds));
 const opening=l.blocks.filter(b=>!b.shutterId&&!queued.has(b.id)),occupied=new Set(),shapes=new Map();
 for(const b of opening){for(const[x,y]of b.shape){const xx=x+b.x,yy=y+b.y;integer(xx,0,l.width-1);integer(yy,0,l.height-1);
   const k=xx+','+yy;assert(!occupied.has(k),'Source opening overlap');occupied.add(k);}
  const k=cellsKey(b.shape);shapes.set(k,(shapes.get(k)??0)+1);}
 assert.equal(opening.length,row.inventory.openingCount);assert.equal(occupied.size,row.inventory.openingBodyArea);
 assert.equal(l.blocks.length,row.inventory.bodyCount);assert.equal(row.inventory.playableCells,A);
 return {width:l.width,height:l.height,playableCells:A,openingBodyCount:opening.length,
  openingBodyArea:occupied.size,openingUnoccupiedCells:A-occupied.size,
  openingShapeInventory:[...shapes].sort(([a],[b])=>a.localeCompare(b)).map(([shape,count])=>({cells:JSON.parse(shape),count})),
  originalInventory:structuredClone(row.inventory),originalGateCount:(l.gates??[]).length,
  originalFlipDoorCount:(l.flipDoors??[]).length,originalColourInventory:[...new Set(opening.map(b=>b.layers?.[0]??b.color))].sort(),
  existingSourceOnly:true,newPhysicalObjectCreated:false};
}

export function assertAreaArithmetic(variant,area){const a=variant.arithmeticAreaExample;
 assert(a.onlyIntegerAreaArithmetic&&a.geometricTilingClaimed===false);let count=0,cells=0;
 const supportedAreas=new Set(variant.allowedRectangleDimensions.map(([w,h])=>w*h));
 for(const[k,n]of Object.entries(a.countsByArea)){integer(n,1);assert(supportedAreas.has(Number(k)));count+=n;cells+=Number(k)*n;}
 assert.equal(count,variant.authoredBodyCount);assert.equal(cells,area);assert.equal(a.totalBodies,count);assert.equal(a.totalCells,cells);
 return structuredClone(a);
}

/** Only recipe declarations are created: no coordinates for new bodies/gates. */
export function makeAdaptiveRecipe(suggestion,row,template){const v=suggestion.proposedVariant,f=sourceOpeningFacts(row),N=v.authoredBodyCount;
 integer(N,14,23);assert.equal(v.openingBodyCount,N);assert.equal(v.hiddenBodyCount,0);assert.equal(v.queuedBodyCount,0);
 assert.equal(v.maximumSingleCellBodies,0);assert.equal(v.shapeAreaMaximum,6);assertAreaArithmetic(v,f.playableCells);
 same(row.inventory,suggestion.source.inventory);assert.equal(row.sourceLevelSha256,suggestion.source.sourceLevelSha256);
 assert.equal(row.maskSha256,suggestion.source.maskSha256);assert.equal(f.openingUnoccupiedCells,suggestion.source.openingUnoccupiedCells);
 const recipe={recipeId:`wholeboard-adaptive-axis-ice-source${row.sourceLevelId}-fresh-01`,sourceLevelId:row.sourceLevelId,
  targetStageKey:'mechanisms-axis-block-50',targetDifficulty:3,
  constructionDifficultyMeaning:'D3 construction profile keeps only motif A initially clearable at ordinary exits; admission is determined once by fresh exact k, without changing this object.',
  source:{catalogue:structuredClone(suggestion.source.catalogue),rowKey:{sourceLevelId:row.sourceLevelId},
   levelSha256:row.sourceLevelSha256,maskSha256:row.maskSha256,width:f.width,height:f.height,playableCells:f.playableCells,
   rectangularBoard:true,sourceInventory:structuredClone(row.inventory),openingUnoccupiedCells:f.openingUnoccupiedCells,
   oldPlainGlobalFactoryEligible:row.plainGlobalFactoryEligible,
   sourceRole:'Normal rectangular geometry baseline only. Original inventory, gaps and mechanisms are disclosed, not inherited; no old L/U or route transfers.'},
  authoredInventory:{bodyCount:N,openingBodyCount:N,hiddenBodyCount:0,queuedBodyCount:0,shellCount:0,
   nativeOrientation:'q0-only',shapeAreaMaximum:6,shapeProfile:`draft12-source${row.sourceLevelId}-native-rectangles-no-singles-${N}`,
   maximumSingleCellBodies:0,allowedRectangleDimensions:structuredClone(v.allowedRectangleDimensions),
   declaredNativeShapeIds:[...v.shapeIds],filter:'Only bound original-orientation native images in all eight colours. No rotations, missing-image substitution or synthetic rectangles.'},
  seed:v.seed,colourSeed:v.colourSeed,
  labels:{...structuredClone(template.labels),bodyPrefix:`wbai-adaptive-${row.sourceLevelId}-`},
  openingRelations:structuredClone(template.openingRelations),
  redesignRequirements:{...structuredClone(template.redesignRequirements),
   minimumSourceBodiesWhoseFootprintDisappears:Math.ceil(f.openingBodyCount/2),
   minimumOriginalOpeningFootprintAreaChangedFraction:.5,minimumChangedPhysicalGateApertures:2,
   compareAgainst:'Normal mainline source, actual latest failed parent, all sealed physical history, selected161 and every earlier formed object in this batch'},
  finiteLimits:structuredClone(template.finiteLimits),
  witnessEnvelope:{maximumDrags:96,maximumUnitSteps:256,exitEvents:N,
   role:'Finite deterministic dual-replay verification envelope; not a difficulty bound or search-state debit. Exceeding it closes the recipe.'},
 };
 recipe.proposedWholeWorldBudget={accountingVersion:'axis-ice-separated-finite-phases-v1',stageSeparated:true,
  firstFullReservation:1,constructionLimits:{...LIMITS},jointRawSetLimit:9999,unregisteredTerminalGuard:1,
  jointHardLimitIncludingGuard:10000,jointBudget:{...JOINT_BUDGET},
  dualReplayReservation:replayEnvelope(recipe).worlds,verificationDebitedAgainstSearch:false,
  futureReservationsDeclaredOnly:true,futureVerificationExecuted:false,exactCountClaimed:false,
  status:'FIXED_SEPARATE_FINITE_PHASE_PARAMETERS_NOT_EXECUTION_PERMISSION'};
 assertWholeBoardRecipe(recipe);assert(!Object.hasOwn(recipe,'targetFormalId')&&!Object.hasOwn(recipe,'priorSlot'));
 return recipe;
}

/** Consumes the small exported role report only, never reparses the history
 * checkpoint. The actual task must reauthenticate latest parent and seals. */
export function exportedParents(report){assert.equal(report.status,'WHOLEBOARD_AXIS_ICE_BATCH_HISTORY_DELTAS_EXPORTED_AND_V5_VALIDATED');
 assert.deepEqual(report.errors,[]);for(const k of ['newConstructions','newCspCalls','newSearches','newLedgerClaims','newReplayCalls'])assert.equal(report[k],0);
 assert(/^[a-f0-9]{64}$/.test(report.headSha256));const f=report.futureParents;assert(f);
 assert.equal(f.historyHeadSha256,report.headSha256);assert.deepEqual(f.requestedSourceLevelIds,SOURCE_IDS);
 assert.deepEqual(f.unresolved.map(r=>r.sourceLevelId),DEFERRED_SOURCE_IDS);
 for(const r of f.unresolved){assert.equal(r.status,'UNRESOLVED');assert.equal(r.reason,'No latest failed parent');}
 assert.equal(f.newHistoryTraversal,false);assert.equal(f.newModelCalls,0);assert.equal(f.newSearches,0);assert.equal(f.mathematicalProofRevalidated,false);
 assert.equal(f.resolved.length,8);assert.equal(new Set(f.resolved.map(r=>r.sourceLevelId)).size,8);
 return ACTIVE_SOURCE_IDS.map(id=>{const row=f.resolved.find(r=>r.sourceLevelId===id);assert(row);assert.equal(row.status,'RESOLVED_ORIGINAL_FAILED_PARENT');
  assert.equal(row.readDirectHistoryRolePassed,true);assert.equal(row.mathematicalProofRevalidated,false);descriptor(row.receipt);
  assert(typeof row.namespace==='string'&&row.namespace);assert(/^[a-f0-9]{64}$/.test(row.attemptId));assert.equal(row.blocked.length,2);row.blocked.forEach(descriptor);
  return structuredClone(row);});
}

export async function buildAdaptiveTwelveProposal({toolQualification,historyExport}){
 descriptor(toolQualification);descriptor(historyExport);const bindings={},cache=new Map();
 async function bytes(p,expected){let b=cache.get(p);if(!b){b=await fs.readFile(p);cache.set(p,b);}const h=sha(b);if(expected)assert.equal(h,expected,p);
  if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;return b;}
 const bound=async d=>{descriptor(d);return JSON.parse(await bytes(d.path,d.sha256));};
 const draft=await bound(DRAFT),templateProposal=await bound(TEMPLATE);assert.equal(draft.status,'METADATA_DESIGN_DRAFT_NOT_EXECUTABLE');
 assert.equal(draft.normalSourceCount,12);assert.deepEqual(draft.suggestions.map(s=>s.sourceLevelId),SOURCE_IDS);
 const q=await bound(toolQualification);assert.equal(q.status,QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);
 for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);
 for(const[p,h]of Object.entries(TOOL_HASHES)){assert.equal(q.toolBindings?.[p],h,'Qualification must bind exact new tool');await bytes(p,h);}
 for(const[p,h]of Object.entries(q.toolBindings))await bytes(p,h);
 const history=await bound(historyExport),parents=exportedParents(history);
 for(const p of parents){const receipt=await bound(p.receipt);assert.equal(receipt.accepted,false);
  assert.equal(receipt.sourceLevelId??receipt.level?.id,p.sourceLevelId);if(receipt.attempt)assert.equal(receipt.attempt.id,p.attemptId);
  for(const d of p.blocked){const b=await bound(d);assert.equal(b.attemptId,p.attemptId);}}
 const catalogue=await bound(draft.catalogue),selection=await bound(draft.selection);assert.equal(selection.files.length,161);
 const occupied=new Set();for(const file of selection.files){const value=await bound({path:file,sha256:selection.fileBindings[file]});assert(value.accepted);occupied.add(value.formalId);}
 const admissionPolicy={mode:'fresh-input-exact-minimum',allowedBands:[2,3],searchFloor:21,searchUpper:128,
  onBandFull:'terminal-unassigned',fallbackAllowed:false,levelDifficulty:'super',slotsByBand:{2:[],3:[]}};
 const priorFacts=[];for(const difficulty of [2,3])for(let n=difficulty===2?6:2;n<=10;n++){
  const formalId=`daily-mechanisms-axis-block-50-d${difficulty}-${String(n).padStart(2,'0')}`;
  assert(!occupied.has(formalId),'Snapshot slot already occupied');const fact=draft.priorSlotFacts.find(p=>p.formalId===formalId);assert(fact);
  const prior=await bound(fact.prior);assert.equal(prior.accepted,true);assert.equal(prior.formalId,formalId);assert.equal(prior.levelSha256,levelSha256(prior.level));
  assert.equal(prior.levelSha256,fact.levelSha256);admissionPolicy.slotsByBand[difficulty].push({formalId,priorSlot:structuredClone(fact.prior)});
  priorFacts.push(structuredClone(fact));}
 assert.equal(priorFacts.length,14);
 // Import data-only TS exports from the frozen workspace, not a live UI runtime.
 const frozen=path.basename(process.cwd())==='frozen-workspace-4588'?process.cwd():path.resolve(FROZEN);
 const shapeDefinition=draft.commonProposedMechanisms.nativeShapeDefinitions;descriptor(shapeDefinition);await bytes(shapeDefinition.path,shapeDefinition.sha256);
 const bundle=await build({stdin:{contents:"export {FORMAL_BLOCK_SHAPES} from './src/game/formalBlockShapes.ts'; export {GAME_ART} from './src/game/artManifest.ts';",resolveDir:frozen,sourcefile:'metadata-native-art-only.ts',loader:'ts'},bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
 for(const p of Object.keys(bundle.metafile.inputs))if(path.basename(p)!=='metadata-native-art-only.ts'&&p!=='<stdin>')await bytes(p);
 const art=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const recipes=[],sourceFacts=[],nativeSupport=[],palettes=new Set();
 for(const s of draft.suggestions.filter(s=>ACTIVE_SOURCE_IDS.includes(s.sourceLevelId))){const row=catalogue.rows.find(r=>r.sourceLevelId===s.sourceLevelId);assert(row);const recipe=makeAdaptiveRecipe(s,row,templateProposal.recipes[0]);
  const support=[];for(const [i,[w,h]]of recipe.authoredInventory.allowedRectangleDimensions.entries()){
   const def=art.FORMAL_BLOCK_SHAPES.find(x=>x.shapeId===s.proposedVariant.shapeIds[i]);assert(def);assert.equal(def.canonicalWidth,w);assert.equal(def.canonicalHeight,h);
   assert.equal(def.cells.length,w*h);assert.equal(new Set(def.cells.map(p=>p.join(','))).size,w*h);assert(w*h>=2&&w*h<=6);
   for(const[x,y]of def.cells){integer(x,0,w-1);integer(y,0,h-1);}const assets={};
   for(const color of COLOURS){const url=art.GAME_ART.gameplay.formalBlocks[color]?.solid?.[def.shapeId];assert(url,'Missing actual q0 image');const file=path.resolve(frozen,'public',url);await bytes(file);assets[color]={path:file,sha256:bindings[file]};}
   support.push({shapeId:def.shapeId,width:w,height:h,area:w*h,quarterTurns:0,assets});}
  const palette=declaredPalette(recipe.colourSeed);assert(!palettes.has(palette.join(',')),'Duplicate batch palette');palettes.add(palette.join(','));
  recipes.push(recipe);const facts=sourceOpeningFacts(row);sourceFacts.push({sourceLevelId:row.sourceLevelId,...facts,
   authoredBodyCount:recipe.authoredInventory.bodyCount,authoredOpeningArea:facts.playableCells,
   addedCoverageCells:facts.openingUnoccupiedCells,arithmeticAreaExample:assertAreaArithmetic(s.proposedVariant,facts.playableCells),
   actualShapeAndColourChanged:false,actualTilingExistsNotClaimed:true,necessaryNotExistence:true,
   adaptationNote:s.proposedVariant.adaptationNote,sourceMechanismsNotInherited:true,
   minimumDisappearingSourceFootprints:recipe.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears,
   minimumChangedSourceOpeningArea:Math.ceil(facts.openingBodyArea/2)});
  nativeSupport.push({sourceLevelId:row.sourceLevelId,allowedShapes:support,paletteByGateRole:palette,
   actualEightColourAssetBindingsVerified:true,newSourceDomainsEnumerated:0});}
 assert.equal(new Set(recipes.map(r=>r.seed)).size,8);assert.equal(new Set(recipes.map(r=>r.colourSeed)).size,8);
 await bytes(SELF);const proposal={schemaVersion:1,version:'axis-ice-adaptive-twelve-metadata-proposal-v1',
  status:'METADATA_DESIGN_PROPOSAL_NOT_EXECUTABLE',executable:false,reviewed:false,generatedAt:new Date().toISOString(),
  experimentId:'axis-ice-adaptive-eight-fresh-01',scope:'Eight new independent complete-board recipes selected from the twelve-source draft; one fresh exact minimum admission into D2 or D3 only.',
  draftSelection:{originalSourceCount:12,activeSourceIds:ACTIVE_SOURCE_IDS,deferredWithoutFailedParent:structuredClone(history.futureParents.unresolved),
   rootDecision:'Use the eight exported resolved parents with the existing task-v4 contract; no invented parent, no new-source bypass and no renewal of deferred recipes.'},
  fromDraft:DRAFT,templateMetadataOnly:TEMPLATE,selection:draft.selection,toolQualification,
  taskVersion:TASK_VERSION,reusableTools:TOOL_HASHES,recipes,admissionPolicy,priorSlotFacts:priorFacts,sourceFacts,nativeSupport,
  budgetDesign:{version:'axis-ice-separated-finite-phases-v1',constructionFirstFullWorlds:1,
   constructionLimits:{...LIMITS},jointRawSetLimit:9999,jointTerminalGuard:1,jointHardLimit:10000,
   deterministicVerificationChargedToSearch:false,allPhasesFinite:true,eachPhaseStartedAtMostOnce:true,noClockResetOrRetry:true},
  phaseDeclarations:recipes.map(r=>({recipeId:r.recipeId,phaseQuotes:adaptivePhaseQuotes(r),futureReservationsDeclared:futureReservations(r),futureReservationsPaid:false,futureVerificationExecuted:false})),
  latestFailureBinding:{status:'EXPORTED_METADATA_RESOLVED_REVALIDATE_IN_CONTEXT',lastExportedHistoryReport:historyExport,
   lastExportedHistoryHead:history.headSha256,exactParentReceipts:parents,
   contextFailedParents:parents.map(p=>({sourceLevelId:p.sourceLevelId,receipt:p.receipt})),
   originalExportedRecordsPreserved:true,fullHistoryParsedByBuilder:false,currentHeadAuthenticatedOnlyDuringTaskPrepare:true},
  boundaries:{excludedClosedRecipeSources:draft.excludesSourceIdsThisBatch,oldRecipesNeverRetried:true,sourceReuseNotInputFreshness:true,
   firstFullIncludesAllFourAxesAndTwoIceGates:true,firstFullIsTerminal:true,onlyOneLocalOpeningReleaseMotif:true,
   originalFullDualReplayRequired:true,rawJointFloorRemains21:true,derivedExactCertificateRequired:true,
   failedInputRebandAllowed:false,fallbackAllowed:false,recipeSlotPreassignment:false,
   sourceMaximumFootprintSimilarity:.55,old450MaximumFootprintSimilarity:.75,sameGroupMaximumFootprintSimilarity:.65,globalMaximumFootprintSimilarity:.75,
   actualFreshnessAndNearAcceptancePending:true,areaArithmeticDoesNotProveTiling:true,inventoryCountDoesNotProveDifficulty:true},
  newRealDomains:0,newConstructions:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,
  mathematicallyAccepted:false,formalReady:false,productionChanged:false,fileBindings:bindings};
 assertWholeBoardBatchProposal(proposal,8);for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,'Metadata input changed before output');
 return proposal;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[mode,out,qualificationPath,qualificationSha,historyPath,historySha]=process.argv.slice(2);
 assert.equal(mode,'build','build <fresh-output-directory> <tool-qualification> <SHA> <history-export-report> <SHA>');
 assert(out&&!await exists(out),'Fresh output directory required; never overwrite an earlier proposal');
 const proposal=await buildAdaptiveTwelveProposal({toolQualification:{path:qualificationPath,sha256:qualificationSha},historyExport:{path:historyPath,sha256:historySha}});
 await fs.mkdir(out,{recursive:false});const file=path.join(out,'proposal.json');await fs.writeFile(file,JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({path:file,sha256:sha(await fs.readFile(file)),recipes:proposal.recipes.length,priorSlots:14,newConstructions:0,newSearches:0,newClaims:0}));
}
