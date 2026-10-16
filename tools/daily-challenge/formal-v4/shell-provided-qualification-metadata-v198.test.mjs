import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {routeSha256} from '../formal-v2/contract.mjs';
import {assertShellLayerTraceV198,assertShellOriginalRouteMetadataV198,assertShellSavedProjectionV198,assertNewShellProvidedReceiptV198,assertRootShellMechanismReviewV198} from './shell-provided-qualification-metadata-v198.mjs';
import {VERSION,assertShellProvidedQualificationConfigV198} from './qualify-shell-provided-v198.mjs';
// Opaque body IDs/colors and traces only: the small fixtures have no positions,
// shapes, board geometry or gates and cannot be loaded as playable levels.
// Existing historical proof bytes below are read, never altered or replayed.
const H='a'.repeat(64),J='b'.repeat(64),K='c'.repeat(64),copy=x=>structuredClone(x);
const config={version:VERSION,...Object.fromEntries(['candidate','rootDesign','pointer','visual','completion','mechanismReview'].map(k=>[k,{path:'opaque-'+k+'.json',sha256:H}])),output:'deliverables/daily-formal-v4-20261008/proof/not-written.json'};
test('qualification config binds all actual evidence without opening files',()=>assert.equal(assertShellProvidedQualificationConfigV198(config),config));
for(const[name,change]of [
 ['unbound completion',x=>delete x.completion],['missing mechanism approval',x=>delete x.mechanismReview],['extra execution control',x=>x.skipPointer=true],
 ['unknown descriptor key',x=>x.candidate.accepted=true],['output overwrites evidence',x=>x.output=x.candidate.path],['path traversal',x=>x.output='deliverables/daily-formal-v4-20261008/proof/../x.json'],
 ['output writes source',x=>x.output='src/core/formalDailyChallenge300Data.ts'],['missing input SHA',x=>delete x.candidate.sha256],
])test('qualification config rejects '+name,()=>{const x=copy(config);change(x);assert.throws(()=>assertShellProvidedQualificationConfigV198(x));});
const blocks=[{id:'opaque-shell',color:'red',layers:['red','blue']},{id:'opaque-body',color:'green'}];
const drags=[{blockId:'opaque-shell',path:[],exitSide:'left'},{blockId:'opaque-body',path:[[0,1]]},{blockId:'opaque-shell',path:[[0,1]]},{blockId:'opaque-body',path:[],exitSide:'bottom'},{blockId:'opaque-shell',path:[],exitSide:'right'}];
const trace=drags.map((d,i)=>({index:i,moves:i+1,blockId:d.blockId,clearDelta:d.exitSide?1:0,complete:i===4,stateSha256:i===4?J:H}));
const expected={bodies:2,layerClearEvents:3,nonClearingDrags:2,totalDrags:5,shells:[{blockId:'opaque-shell',colors:['red','blue'],clears:[{drag:1,layer:0,color:'red',exitSide:'left',otherBodiesRemaining:1},{drag:5,layer:1,color:'blue',exitSide:'right',otherBodiesRemaining:0}],nonClearingDragsAfterFirstPeel:[3],otherBodyActionsBetweenFirstPeelAndRemoval:[{drag:2,blockId:'opaque-body',clearDelta:0},{drag:4,blockId:'opaque-body',clearDelta:1}]}]};
test('peeling preserves a shell until its final layer and records actual intervening traffic',()=>assert.deepEqual(assertShellLayerTraceV198(blocks,drags,trace),expected));
for(const[name,change]of [
 ['missing inner clear',x=>x.t.pop()],['duplicate final clear',x=>{x.d.push(x.d[4]);x.t.push({...x.t[4],index:5,moves:6});x.t[4].complete=false;}],
 ['body used after removal',x=>x.t[4].blockId=x.d[4].blockId='opaque-body'],['unknown body',x=>x.t[0].blockId=x.d[0].blockId='missing'],
 ['negative clear count',x=>x.t[0].clearDelta=-1],['multi-body synthetic clear',x=>x.t[0].clearDelta=2],['missed peel',x=>x.t[0].clearDelta=0],
 ['false exit request',x=>delete x.d[0].exitSide],['early completion',x=>x.t[0].complete=true],['missing final completion',x=>x.t[4].complete=false],
 ['wrong gesture index',x=>x.t[2].index=99],['wrong move count',x=>x.t[2].moves=99],['wrong trace body',x=>x.t[0].blockId='opaque-body'],
 ['bad state hash',x=>x.t[0].stateSha256='not-a-hash'],['duplicate body identity',x=>x.b.push(x.b[0])],['missing layer list',x=>x.b[0].layers=[]],
 ['outer color differs',x=>x.b[0].color='pink'],
])test('layer inventory rejects '+name,()=>{const x={b:copy(blocks),d:copy(drags),t:copy(trace)};change(x);assert.throws(()=>assertShellLayerTraceV198(x.b,x.d,x.t));});
const route={inputLevelSha256:H,routeSha256:routeSha256(drags),search:null,
 canonicalReplay:{valid:true,complete:true,effectiveDrags:5,nonClearingDrags:2,clearEvents:3,finalStateKey:JSON.stringify({complete:true,failed:false,blocks:[],queuedBlocks:[],cleared:3})},
 independentReplay:{valid:true,complete:true,failed:false,effectiveDrags:5,nonClearingDrags:2,clearEvents:3,remainingBodies:0,remainingQueued:0,trace,finalStateSha256:J},
 witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0,drags:5,unitSteps:2}};
const q={formalId:'opaque-formal',level:{blocks},levelSha256:H,drags,routeSha256:route.routeSha256,U:2,route};
test('metadata accepts the real producer canonical schema without a failed property',()=>assert.equal(assertShellOriginalRouteMetadataV198(q).layerClearEvents,3));
for(const[name,change]of [
 ['canonical failed',x=>x.route.canonicalReplay.failed=true],['independent failure field omitted',x=>delete x.route.independentReplay.failed],
 ['body count substituted for layer events',x=>x.route.canonicalReplay.clearEvents=2],['lower-layer clear omitted',x=>x.route.independentReplay.clearEvents=2],
 ['nonclearing mismatch',x=>x.U=3],['final state still contains a body',x=>x.route.canonicalReplay.finalStateKey=JSON.stringify({complete:true,blocks:['sentinel'],queuedBlocks:[],cleared:3})],
 ['final state cleared count is body count',x=>x.route.canonicalReplay.finalStateKey=JSON.stringify({complete:true,blocks:[],queuedBlocks:[],cleared:2})],
 ['queued inventory remains',x=>x.route.independentReplay.remainingQueued=1],['original body remains',x=>x.route.independentReplay.remainingBodies=1],
 ['final trace hash differs',x=>x.route.independentReplay.finalStateSha256=K],['route byte identity differs',x=>x.routeSha256=K],
 ['searched upper represented as provided',x=>x.route.witnessValidation.searchPerformed=true],['claimed nonzero upper states',x=>x.route.witnessValidation.fullBoardSearchStates=1],
 ['provided route flag missing',x=>x.route.witnessValidation.providedRoute=false],['unit steps mismatch',x=>x.route.witnessValidation.unitSteps=3],
])test('original route evidence rejects '+name,()=>{const x=copy(q);change(x);assert.throws(()=>assertShellOriginalRouteMetadataV198(x));});
const oldFile='deliverables/daily-formal-v3-20261008/selection/symmetric-design134/daily-mechanisms-multilayer-shell-15-d1-01.json';
const bytes=fs.readFileSync(oldFile);assert.equal(createHash('sha256').update(bytes).digest('hex'),'8c40e84bbfba450c907ac2a44cb348886ecfbfcd045f6dd8e48a83882e3f8e1a');const old=JSON.parse(bytes);
test('existing unchanged shell proof projection retains every opening body and is lower only',()=>assert.equal(assertShellSavedProjectionV198(old).upperBoundTransfer,false));
test('existing unchanged 34-drag route proves 18 layer clears over 16 bodies',()=>{const r=assertShellOriginalRouteMetadataV198(old);assert.equal(r.totalDrags,34);assert.equal(r.bodies,16);assert.equal(r.layerClearEvents,18);});
for(const[name,change]of [
 ['projection as upper',x=>x.lowerBound.projection.upperBoundTransfer=true],['different original source',x=>x.lowerBound.projection.sourceLevelSha256=H],
 ['different projection identity',x=>x.lowerBound.projectedLevelSha256=H],['omitted projected world',x=>x.lowerBound.projection.projectedLevel=null],
 ['missing retained body record',x=>x.lowerBound.projection.retainedOuterBodies.pop()],['discarded opening body',x=>x.lowerBound.projection.droppedBodyIds.push('sentinel')],
 ['wrong original layer count',x=>x.lowerBound.projection.retainedOuterBodies[0].initialLayers=99],
])test('saved projection rejects '+name,()=>{const x=copy(old);change(x);assert.throws(()=>assertShellSavedProjectionV198(x));});
test('historical receipt cannot masquerade as a new v198 accepted original',()=>assert.throws(()=>assertNewShellProvidedReceiptV198(old)));
const candidate={path:'opaque.json',sha256:H},replay=assertShellOriginalRouteMetadataV198(q);
const review={status:'ROOT_SHELL_ROUTE_MECHANISM_REVIEW_PASS',errors:[],candidate,formalId:q.formalId,levelSha256:q.levelSha256,routeSha256:q.routeSha256,meaningfulMechanismParticipation:true,sourceAndIndependentLayoutReviewed:true,routeInventory:replay};
test('root participation review binds exact derived evidence without adding a parking quota',()=>assertRootShellMechanismReviewV198(review,candidate,q,replay));
for(const[name,change]of [['no actual participation approval',x=>x.meaningfulMechanismParticipation=false],['wrong root candidate',x=>x.candidate.sha256=J],['wrong route',x=>x.routeSha256=J],['wrong actual layer facts',x=>x.routeInventory.layerClearEvents=99],['source/layout review missing',x=>delete x.sourceAndIndependentLayoutReviewed],['review reports an error',x=>x.errors.push('failure')]])test('root review rejects '+name,()=>{const x=copy(review);change(x);assert.throws(()=>assertRootShellMechanismReviewV198(x,candidate,q,replay));});
