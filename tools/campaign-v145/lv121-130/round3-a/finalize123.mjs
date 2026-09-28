import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {mechanismInventory,auditDraft} from '../../../remake121to130-v172.mjs';
import {loadIsolatedApi} from '../round3-c/isolated-api.mjs';
import {save} from './author.mjs';
const lock=verifyRulesLock();assert(lock.ok);const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),l=raw.level,oldSource=JSON.parse(fs.readFileSync(raw.sourceFile)),api=await loadIsolatedApi();
assert.equal(l.id,123);assert(raw.proof.thresholdProven);assert.equal(raw.proof.sourceLevelSha256,digest(l));
const facts=structuredClone(oldSource.facts),id='r171-123-';
const sourceBlocks=[
 ['opening-shell','L4','pink',{layers:['pink','red']}],['key-green','SQ2','green',{keyCount:1}],['key-orange','V2','orange',{keyCount:1}],['key-cyan','V3','cyan',{keyCount:1}],['opening-orange','H2','orange',{}],['opening-cyan','S','cyan',{}],['tray-pink','H3','pink',{}],['tray-cyan','L3','cyan',{}],['tray-green','H2','green',{}],['tray-orange','H2','orange',{}],['covered-lock','L3','green',{lockCount:3}],['covered-purple','L3','purple',{}],['covered-pink','L4','pink',{}],['covered-blue','H2','blue',{}],['lower-blue','L3','blue',{}],['lower-orange','T4','orange',{}],['lower-cyan','L3','cyan',{}],['central-cyan','PLUS5','cyan',{}],['central-blue','H3','blue',{}]
].map(([name,shape,color,mechanisms])=>({id:id+name,shape,color,...mechanisms}));
assert(sourceBlocks.every(b=>l.blocks.some(a=>a.id===b.id)));assert.equal(l.blocks.length,33);
const inventory=mechanismInventory(l);assert.deepEqual({bombs:inventory.bombs,ice:inventory.ice,shells:inventory.shells,keys:inventory.keys,locks:inventory.locks,covers:inventory.covers,generators:inventory.generators},{bombs:[],ice:[],shells:1,keys:3,locks:[3],covers:[0,0,3],generators:[]});
const adaptations=[
 'Preserve actual baseline 7×11 with75 playable cells, name,85seconds,69move star target,61second star target,200historical reward. Source waist geometry and visible vacancies cannot replace this required baseline.',
 'Retain all19 source body identities, every known mechanism and value:1shell pink/red,3keys,1green lock requiring3keys,cover3,2real lifts,6frozen gates4/5/5/4/1/2. No bombs, numeric block ice, generators or additional mechanisms are authored.',
 'The countdown hidden inventory has12 observed cells and4bodies. Its new3×4 region is exactly filled by greenH3 lock3, purpleV3, pinkSQ2 andblueH2. Earlier source-ledger prose saying V3/V3 is superseded by this exact per-body audit; old evidence files remain unchanged.',
 'The source central lift is nested within the source cover; authoritative validation rejects this overlap as shutter-opening-cell-covered. Its2known bodies move to a separate real3×3 lift atx4/y6. Source cyanPLUS5 becomes nativeRECT6, blueH3 remains H3, giving9/9 full cells. Source lower lift retains3bodies and10cells using blueH3,orangeSQ2,cyanH3 atx1/y9.',
 'All10 source opening bodies retain identity. Their source26cells remain26cells after native and color adaptation.14explicit ordinary capacity bodies,9three-cell+5two-cell, add37cells. Thus24visible bodies cover63cells and the genuine12cell cover supplies remaining opening coverage75/75.',
 'The supplied source L4 shell becomes same-area nativeSQ2 because irregular shell artwork is unavailable. Other shape/color changes use v1.71 bounded-search authorization, including green-key carrier→pink, aligned orange/cyan/pink upper tray and pink/orange/cyan/green lower tray. Exact source and candidate bodies are paired below; artwork never rotates.',
 'Seven unique exits retain all source colors and frozen counts, relocated to valid preserved-board edges: ordinarypink; purple4,blue5,orange5,red4,cyan1,green2. No source mechanism is deleted to make solving easier.'
];
const sourceReview={passed:true,method:'Manual review of opening plus both true-lift reveals and full completion sequence; then exact identity and mechanism inventory assertions. Independent parent review remains separate.',bindings:{...oldSource.hashes,[raw.sourceFile]:digest(fs.readFileSync(raw.sourceFile)),[input]:digest(fs.readFileSync(input))},facts,sourceBlocks,reviewedFullMechanisms:oldSource.reviewedFullMechanisms,adaptations,bodyAdaptations:l.blocks.map(b=>({source:sourceBlocks.find(s=>s.id===b.id)??{id:b.id,provenance:'authored ordinary capacity filler'},authored:b})),expectedInventory:inventory,unknowns:[]};
const data={...raw,sourceReview,sourceLedgerSupersededOnlyInProse:raw.sourceFile,priorCandidate:input,levelSha256:digest(l),routeSha256:digest(raw.drags),formalAdopted:false,pointerValidated:false,naturalClockValidated:false};
data.audit=auditDraft(data,api);data.replay=api.replayRevisedRoute(l,data.drags);assert(data.replay.valid&&data.replay.complete);assert(data.replay.nonClearingDrags>=16&&data.replay.nonClearingDrags<=20);
const m=new api.PuzzleModel(l);m.startCountdown();let elapsed=0;const tick=t=>{m.tick(t);elapsed+=t;assert(!m.snapshot().failed);};for(const d of data.drags){tick(.75);tick(.08);m.beginAction();for(const p of d.path){tick(.12);assert(m.moveBlockStep(d.blockId,...p));}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());tick(.08);}assert(m.snapshot().complete);data.positiveTimeModel={valid:true,complete:true,elapsedSeconds:elapsed,remainingSeconds:m.snapshot().timeRemaining,profile:{pause:.75,down:.08,unitMove:.12,up:.08},naturalClockValidated:false,pointerValidated:false};
console.log(JSON.stringify({file:save('ready123',data),U:data.replay.nonClearingDrags,L:data.proof.floor,positiveTimeSeconds:elapsed,levelSha256:data.levelSha256}));
