/** Non-search revalidation after a rendering source changes. Only the UI file
 * is allowed to drift; all old physics, lower-solver and rule bytes must still
 * match. The original lower certificate is preserved byte-for-byte as JSON.
 * loadRuntime reads UI departure timing, so this bridge REFUSES timed routes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadLeagueProofRuntime,auditLeagueStatic,auditLeagueScoring,levelSha256,routeSha256,PROOF_VERSION,RULE_VERSION} from './proof-contract.mjs';
import {auditLeagueAdaptedSource} from './proof-source-adaptation.mjs';
import {independentReplay} from '../daily-challenge/formal-v2/contract.mjs';

export const RENDER_REVALIDATION_VERSION='league-v2-untimed-render-revalidation-1';
export const RENDER_ONLY_INPUT='src/game/ColorEscapeGame.ts';
export const RENDER_REVALIDATION_TOOL='tools/league-v2/proof-render-revalidation.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const validSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const untouchedKeys=['contractVersion','ruleVersion','index','sourceLevelId','sourceLevelSha256','level','levelSha256','band','drags','routeSha256','L','U','lowerBound','attempt','specials','sourceAdaptation','sourceAdaptationVersion','staticSourceRepair','proofExtension'];
export function hasTimeSchedule(value){
 if(!value||typeof value!=='object')return false;
 if(Object.hasOwn(value,'timeSchedule')&&value.timeSchedule!==undefined&&value.timeSchedule!==null)return true;
 return Object.values(value).some(hasTimeSchedule);
}

/** Internal chain checks; the caller separately hashes previousReceipt bytes
 * and checks every current dependency. No claim that this is a fresh lower. */
export function inspectRenderRevalidation(report,previous){
 const errors=[],r=report?.renderRevalidation;
 if(!r||r.version!==RENDER_REVALIDATION_VERSION||r.searchInvocations!==0||r.newSearchStates!==0||r.lowerRecomputed!==false||r.untimedOnly!==true||!validSha(r.previousReceiptSha256)||typeof r.previousReceipt!=='string')errors.push('render-revalidation-metadata');
 if(hasTimeSchedule(report)||hasTimeSchedule(previous))errors.push('render-revalidation-timed-route-forbidden');
 if(!previous||previous.renderRevalidation||previous.accepted!==true||previous.contractVersion!==PROOF_VERSION||previous.ruleVersion!==RULE_VERSION)errors.push('render-revalidation-prior-not-original-accepted-proof');
 if(!previous)return errors;
 for(const key of untouchedKeys)if(!isDeepStrictEqual(report[key],previous[key]))errors.push('render-revalidation-carried-field-changed:'+key);
 if(r?.previousToolchainSha256!==previous.toolchainSha256||r?.carriedLowerBoundSha256!==levelSha256(previous.lowerBound))errors.push('render-revalidation-original-certificate-not-bound');
 const oldBindings=previous.toolchainBindings??{},newBindings=report.toolchainBindings??{};
 const changed=Object.keys(oldBindings).filter(file=>newBindings[file]!==oldBindings[file]);
 if(changed.length!==1||changed[0]!==RENDER_ONLY_INPUT||!isDeepStrictEqual(r?.changedFiles,[{file:RENDER_ONLY_INPUT,before:oldBindings[RENDER_ONLY_INPUT],after:newBindings[RENDER_ONLY_INPUT]}]))errors.push('render-revalidation-non-render-input-drift');
 if(!validSha(newBindings[RENDER_REVALIDATION_TOOL])||Object.keys(newBindings).some(file=>!(file in oldBindings)&&file!==RENDER_REVALIDATION_TOOL))errors.push('render-revalidation-tool-bindings');
 if(!isDeepStrictEqual(r?.freshChecks,{staticAndAssets:true,canonicalRoute:true,independentRoute:true,leagueScoring:true}))errors.push('render-revalidation-fresh-checks-missing');
 return errors;
}

export async function revalidateLeagueRendering({previousReceipt,previousReceiptSha256,outputFile,runtime}){
 if(!validSha(previousReceiptSha256))throw Error('Explicit original proof SHA required');
 const previousBytes=await fs.readFile(previousReceipt);if(sha(previousBytes)!==previousReceiptSha256)throw Error('Original proof file SHA mismatch');
 const previous=JSON.parse(previousBytes);runtime??=await loadLeagueProofRuntime();
 // Lazy import avoids the catalog -> chain-inspector -> catalog module cycle.
 const {inspectLeagueReceipt}=await import('./catalog-progress.mjs');
 const source=runtime.LEVELS.find(l=>l.id===previous.sourceLevelId);
 const problems=inspectLeagueReceipt(previous,source,previous.index);
 if(problems.length)throw Error('Original proof internally invalid: '+problems.join(';'));
 if(previous.renderRevalidation||hasTimeSchedule(previous))throw Error('Only original accepted untimed receipts may use the render bridge');
 const toolchainBindings={};
 for(const[file,oldHash]of Object.entries(previous.toolchainBindings)){
  const currentHash=sha(await fs.readFile(path.resolve(ROOT,file)));
  if(currentHash!==oldHash&&file!==RENDER_ONLY_INPUT)throw Error('Non-render input changed: '+file);
  toolchainBindings[file]=currentHash;
 }
 for(const file of Object.keys(runtime.toolchainBindings))if(!Object.hasOwn(previous.toolchainBindings,file))throw Error('Original proof missing current runtime dependency: '+file);
 if(toolchainBindings[RENDER_ONLY_INPUT]===previous.toolchainBindings[RENDER_ONLY_INPUT])throw Error('No render drift; reuse existing proof');
 toolchainBindings[RENDER_REVALIDATION_TOOL]=sha(await fs.readFile(fileURLToPath(import.meta.url)));
 const report=structuredClone(previous),level=report.level,drags=report.drags;
 report.toolchainBindings=toolchainBindings;report.toolchainSha256=levelSha256(toolchainBindings);
 report.accepted=false;report.formalReady=false;report.designValidated=false;report.mechanismStrengthValidated=false;report.pointerValidated=false;report.timeValidated=false;
 report.renderRevalidation={version:RENDER_REVALIDATION_VERSION,createdAt:new Date().toISOString(),previousReceipt:previousReceipt.replaceAll('\\','/'),previousReceiptSha256,
  previousToolchainSha256:previous.toolchainSha256,carriedLowerBoundSha256:levelSha256(previous.lowerBound),searchInvocations:0,newSearchStates:0,lowerRecomputed:false,untimedOnly:true,
  changedFiles:[{file:RENDER_ONLY_INPUT,before:previous.toolchainBindings[RENDER_ONLY_INPUT],after:toolchainBindings[RENDER_ONLY_INPUT]}],
  freshChecks:{staticAndAssets:false,canonicalRoute:false,independentRoute:false,leagueScoring:false},
  scope:'Original lower evidence is carried unchanged; fresh untimed routes, structural/current sprite and league-scoring checks only. Actual current rendering and Pointer remain separate.',
  dependencyExplanation:'The lower graph imports PuzzleModel/spatial/projection modules, not ColorEscapeGame. loadRuntime also reads GATE_EXIT_INGEST_DURATION from that UI source for timed-route validation. This bridge refuses every timeSchedule, makes no assertion about the unavailable prior UI constant, and replays both actual untimed models.'};
 report.reasons=[];
 try{
  const candidate={index:report.index,sourceLevelId:report.sourceLevelId,level,specials:report.specials};
  report.staticAudit=report.sourceAdaptation?await auditLeagueAdaptedSource(runtime,candidate):await auditLeagueStatic(runtime,candidate);
  if(!report.staticAudit.passed||!report.staticAudit.support.supported)throw Error('Fresh static/current-asset audit failed');
  if(report.staticAudit.sourceLevelSha256!==report.sourceLevelSha256)throw Error('Source level changed');
  report.renderRevalidation.freshChecks.staticAndAssets=true;
  const canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
  if(!canonical.valid||!canonical.complete||canonical.nonClearingDrags!==report.U||canonical.effectiveDrags!==drags.length)throw Error('Fresh canonical route failed');
  report.renderRevalidation.freshChecks.canonicalRoute=true;
  if(!independent.valid||!independent.complete||independent.failed||independent.remainingBodies!==0||independent.remainingQueued!==0||independent.nonClearingDrags!==report.U||independent.effectiveDrags!==drags.length||independent.clearEvents!==canonical.clearEvents)throw Error('Fresh independent route failed');
  report.renderRevalidation.freshChecks.independentRoute=true;
  // Any historical upper search is retained explicitly; neither search reruns.
  report.route={...report.route,canonicalReplay:canonical,independentReplay:independent};
  report.scoring=auditLeagueScoring(runtime,level,drags,{index:report.index,specials:report.specials});
  report.renderRevalidation.freshChecks.leagueScoring=true;
  report.accepted=true;report.status='LEAGUE_SPATIAL_SCORING_VERIFIED_AWAITING_DESIGN_POINTER';
  const errors=[...inspectRenderRevalidation(report,previous),...inspectLeagueReceipt(report,source,report.index)];
  if(errors.length)throw Error('Revalidation chain rejected: '+errors.join(';'));
 }catch(error){report.accepted=false;report.status='RENDER_REVALIDATION_REJECTED';report.reasons.push(error.message);}
 for(const[file,hash]of Object.entries(toolchainBindings))if(sha(await fs.readFile(path.resolve(ROOT,file)))!==hash){report.accepted=false;report.status='RENDER_REVALIDATION_INPUT_CHANGED';report.reasons.push(file);}
 for(const[file,hash]of Object.entries(report.staticAudit?.assetBindings??{}))if(sha(await fs.readFile(path.resolve(ROOT,'public',file)))!==hash){report.accepted=false;report.status='RENDER_REVALIDATION_INPUT_CHANGED';report.reasons.push(file);}
 if(sha(await fs.readFile(previousReceipt))!==previousReceiptSha256)throw Error('Original proof changed during revalidation');
 const allowed=path.resolve(ROOT,'deliverables/league-v2-20261008/proof'),target=path.resolve(ROOT,outputFile),relative=path.relative(allowed,target);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Render revalidation output must stay under league proof');
 report.proofReceipt=outputFile.replaceAll('\\','/');await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}

async function runCli(){
 const [selectionFile,output]=process.argv.slice(2);if(!selectionFile||!output)throw Error('Usage: node proof-render-revalidation.mjs selection.json new-proof-directory');
 const allowed=path.resolve(ROOT,'deliverables/league-v2-20261008/proof'),target=path.resolve(ROOT,output),relative=path.relative(allowed,target);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output must stay under league proof');
 await fs.mkdir(target,{recursive:false});
 const selectedBytes=await fs.readFile(selectionFile),selected=JSON.parse(selectedBytes),runtime=await loadLeagueProofRuntime(),rows=[],selections=[];
 for(const s of selected.selections){
  const bytes=await fs.readFile(s.proofFile),file=path.join(output,`index-${String(s.index).padStart(3,'0')}.result.json`).replaceAll('\\','/');
  const report=await revalidateLeagueRendering({previousReceipt:s.proofFile,previousReceiptSha256:sha(bytes),outputFile:file,runtime});
  rows.push({index:s.index,accepted:report.accepted,status:report.status,previousReceipt:s.proofFile,proofFile:file,lowerRecomputed:false,searchInvocations:0,reasons:report.reasons});
  selections.push({...s,proofFile:file});console.log(JSON.stringify(rows.at(-1)));
 }
 if(sha(await fs.readFile(selectionFile))!==sha(selectedBytes))throw Error('Input selection changed');
 await fs.writeFile(path.join(output,'selection.json'),JSON.stringify({...selected,selections},null,2)+'\n',{flag:'wx'});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({version:RENDER_REVALIDATION_VERSION,selectionFile,selectionFileSha256:sha(selectedBytes),accepted:rows.every(r=>r.accepted),count:rows.length,formalReady:false,lowerSearchInvocations:0,rows},null,2)+'\n',{flag:'wx'});
 if(rows.some(r=>!r.accepted))process.exitCode=1;
}
// Defer CLI execution until module evaluation completes. The catalog imports
// this module's pure chain inspector, so awaiting it at top level deadlocks.
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)setImmediate(()=>{runCli().catch(error=>{console.error(error);process.exitCode=1;});});
