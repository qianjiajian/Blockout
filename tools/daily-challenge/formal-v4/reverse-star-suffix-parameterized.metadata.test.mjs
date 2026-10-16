import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import * as task from './reverse-star-suffix-task-v3.mjs';
import * as factory from './reverse-star-suffix-factory-v4.mjs';
import * as lower from './reverse-star-suffix-lower-v2.mjs';
import {assertSource200StarStock,SOURCE200_STAR_DOMAIN} from './reverse-star-suffix-blueprint-v2.mjs';
import {reverseFixedStockCli} from './reverse-star-suffix-cli-v3.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-star-suffix-parameterized.metadata.test.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},toolBindings={},tests=[];let failure=null;
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=hash(b);return b;};
 const read=async(p,h)=>{const b=await bytes(p);if(h)assert.equal(hash(b),h);return JSON.parse(b);};
 const check=async(name,fn)=>{const value=await fn(),p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});tests.push({name,passed:true,evidence:{path:p,sha256:hash(await bytes(p))}});};
 const zero={newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newProjections:0,newRawAdmissions:0,newPrivateWorlds:0,publicClaimsStarted:0,historyLoads:0,productionAuthorized:false};
 try{
  const d=await read(V+'design/star-source200-stock-declaration-02/source-200.json','8047050e694feaf099545da18c2bee55db99a46b1b99a4c8f9395e46e4323b53'),design=await read(d.starDesignDeclaration.path,d.starDesignDeclaration.sha256),stock=d.recipes[0];
  const c={sourceLevelId:200,targetDifficulty:1,stockId:stock.recipeId,starDesignDeclaration:copy(d.starDesignDeclaration)};
  await check('exact-five-forks-and-original-mathematics',async()=>{
   const changes=await read(V+'proof/reverse-star-parameterized-source-01/source-changes.json'),rows=[];
   for(const x of changes.changes){let source=(await bytes(x.original.path)).toString();assert.equal(hash(source),x.original.sha256);const current=(await bytes(x.current.path)).toString();assert.equal(hash(current),x.current.sha256);
    for(const r of x.replacements){assert.equal(source.split(r.from).length-1,r.count);source=source.split(r.from).join(r.to);}assert.equal(source,current);rows.push({original:x.original,current:x.current,exactReconstruction:true,replacements:x.replacements.length});}
   const before=(await bytes(T+'reverse-star-suffix-lower-v1.mjs')).toString(),now=(await bytes(lower.SELF)).toString();assert.equal(now.replaceAll('reverse-star-suffix-blueprint-v2.mjs','reverse-star-suffix-blueprint-v1.mjs').replaceAll('reverse-star-suffix-lower-v2.mjs','reverse-star-suffix-lower-v1.mjs').replaceAll('star-only-single-projection-archived-lower-envelope-v2','star-only-single-projection-archived-lower-envelope-v1'),before);
   assert.equal(task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256,hash(await bytes(task.FACTORY)));
   return{rows,lowerEntireSourceExceptImportSelfVersionUnchanged:true,unchanged:['raw observer/pre-mutation sticky limits','mobility and targetOrder/heldReach','original forward/dual-U functions','projection all-ten-gates/guard/core/receipt accounting','original recipe physical identity and owner/publication paths'],historyAdapterStillV9AndProductionDisabled:true};
  });
  await check('explicit-bound-design02-joint-ids-and-stock',()=>{
   assert.equal(task.assertStarStockIdPreflight(c,d),stock);assert.equal(task.assertBoundStarDeclaredStock(c,d,stock,design),true);assertSource200StarStock(stock.inventory,stock.gates);
   const code=fileBindings[task.SELF];assert(code);return{sourceStock:d.starDesignDeclaration,bodyCount:stock.inventory.length,gateCount:stock.gates.length,unionCount:new Set([...stock.inventory,...stock.gates].map(x=>x.id)).size,totalArea:stock.inventory.reduce((n,b)=>n+b.shape.length,0),positionsAbsent:stock.inventory.every(b=>!('x'in b)&&!('y'in b)),newLevelCreated:false};
  });
  await check('ordinary-stock-is-parameterized-not-design02-hardcoded',()=>{
   const dd=copy(d),g=copy(design),a=g.inventoryWithoutPositions.find(b=>b.designId==='green-long'),b=g.inventoryWithoutPositions.find(b=>b.designId==='purple-square');[a.color,b.color]=[b.color,a.color];
   const r=dd.recipes[0];r.inventory=g.inventoryWithoutPositions.map(({id,color,shape,star})=>({id,color,shape,star}));assert.equal(task.assertBoundStarDeclaredStock(c,dd,r,g),true);
   return{fixture:'In-memory unpositioned metadata only; green-V3 and purple-SQ2 colors exchanged to exercise a second permitted stock. No bound production declaration or candidate created.',stockAcceptedByParameterizedDomain:true};
  });
  await check('finite-domain-and-static-star-rejections',()=>{
   const rejected=[];const no=(name,mutate)=>{const r=copy(stock);mutate(r);assert.throws(()=>assertSource200StarStock(r.inventory,r.gates));rejected.push(name);};
   no('body-count-above-17',r=>r.inventory.push({...copy(r.inventory[6]),id:'extra'}));no('body-count-below-17',r=>r.inventory.pop());
   no('shape-area-above-6',r=>r.inventory[2].shape=Array.from({length:7},(_,i)=>[i,0]));
   no('nonrectangle',r=>r.inventory[2].shape=[[0,0],[1,0],[0,1]]);no('side-span-above-3',r=>r.inventory[2].shape=[[0,0],[0,1],[0,2],[0,3]]);
   no('area-not-48',r=>r.inventory[2].shape=[[0,0],[1,0],[0,1],[1,1]]);no('gate-count-not-10',r=>r.gates.pop());
   no('gate-order-drift',r=>r.gates.reverse());no('gate-size-drift',r=>r.gates[0].size=3);no('unknown-color',r=>r.inventory[2].color='black');
   no('star-lost',r=>r.inventory.find(b=>b.star).star=false);no('star-pair-ordinary-missing',r=>r.inventory.find(b=>b.id.endsWith('pink-normal')).shape=[[0,0],[0,1]]);
   no('retained-tail-changed',r=>r.inventory[0].color='red');no('cross-kind-id',r=>r.gates[0].id=r.inventory[0].id);no('within-kind-id',r=>r.inventory[3].id=r.inventory[2].id);no('empty-id',r=>r.gates[0].id='');
   const more=copy(stock);more.inventory.find(b=>b.designId==='none');const normal=more.inventory.find(b=>b.id.endsWith('green-short'));normal.color='blue';normal.shape=[[0,0]];assert.throws(()=>assertSource200StarStock(more.inventory,more.gates),/three eligible portal/);rejected.push('portal-anchors-above-three-before-area-check');
   return{rejected,domain:SOURCE200_STAR_DOMAIN,geometryOrModelExecuted:false};
  });
  await check('bound-declaration-drift-and-old-id-collision-rejected',async()=>{
   const old=await read(V+'design/star-source200-stock-declaration-01/source-200.json','e3de97f9a290c17e871b7dfb48cdd273e4b9e37c3a8dff7ac6ae5da4e6b4e7ee');assert.throws(()=>task.assertStarStockIdPreflight({...c,stockId:old.recipes[0].recipeId,starDesignDeclaration:old.starDesignDeclaration},old),/Duplicate stock id/);
   const cases=[];for(const [name,mutate]of [['descriptor',x=>x.starDesignDeclaration.sha256='0'.repeat(64)],['actual-color',x=>x.recipes[0].inventory[2].color='red'],['explicit-id',x=>x.recipes[0].inventory[2].id='different-id'],['order',x=>x.recipes[0].insertionOrder.reverse()],['parking-order',x=>x.recipes[0].parkingBodyIds.reverse()]]){const x=copy(d);mutate(x);assert.throws(()=>task.assertBoundStarDeclaredStock(c,x,x.recipes[0],design));cases.push(name);}
   const g=copy(design);g.inventoryWithoutPositions[2].x=0;assert.throws(()=>task.assertBoundStarDeclaredStock(c,d,stock,g),/no positions/);
   return{oldFourCrossKindConflictsRefused:true,rejectedDrifts:cases,positionsRefused:true};
  });
  await check('unchanged-finite-coordinate-and-lower-envelope',()=>{
   const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
   const counts=stock.inventory.map(b=>({id:b.id,anchors:stock.gates.filter(g=>g.color===b.color&&(!b.star||g.star)).reduce((n,g)=>n+Math.max(0,g.size-(['top','bottom'].includes(g.side)?width(b):height(b))+1),0)}));const maxPortals=Math.max(...counts.map(x=>x.anchors));assert.equal(maxPortals,3);
   const A=48,B=17,S=6,G=10,J=3,VV=64*(1+A+B*S+G*(A+4*J+1)+B+G+4*S),transitions=3*VV+64*(A+B*B+B*G+B*S)+B*A*(16*S+4*(8*S+G*(2*S+3))+8)+64*(A+B*S+G*(J+1)+B+G),micro=B*A+2*B;
   const coordinate=17*48*10+10000*(2*maxPortals*(48+1)+2*48);assert.equal(coordinate,3908160);assert.equal(transitions,939904);assert.equal(micro,850);assert.equal(lower.PREPAID_WORLDS,9);assert.equal(task.LOWER_POLICY.rawSetMaximum,9990);assert.equal(9+9990+1,10000);
   assert.deepEqual(lower.LIMITS,{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
   return{arithmeticOnlyNoQuoteOrLowerCall:true,parameters:{A,B,S,G,J},maxPortals,perBodyPortalAnchors:counts,coordinateReservation:coordinate,lowerPrepaid:{worlds:9,transitions,micro},lowerRaw:9990,guard:1,combined:10000,oldPrepaidFormulaUnchanged:true};
  });
  await check('production-blocked-before-runtime-files-or-history',async()=>{
   const pattern=/STAR_PARAMETERIZED_PRODUCTION_DISABLED_PENDING_HISTORY_ADAPTER_AND_QUALIFICATION/;
   assert.throws(()=>task.assertReverseStarProductionReady(),pattern);await assert.rejects(()=>task.prepareReverseStockTask(null,null),pattern);await assert.rejects(()=>task.runReverseStockTask(null,null,'not-created'),pattern);assert.throws(()=>factory.beginReverseStockConstruction(null,null,null),pattern);await assert.rejects(()=>reverseFixedStockCli('prepare','not-read.json'),pattern);
   const src=(await bytes(task.SELF)).toString();assert(src.indexOf('if(!qualificationOnly)assertStarStockIdPreflight(c,declared);')<src.indexOf('const {h,comparison,partialHistoryAuthentication}=await history(r,c,qualificationOnly);'));
   assert(src.includes('starDesignDeclaration:copy(x.c.starDesignDeclaration)'));assert(src.includes('starDesignDeclaration:plan.starDesignDeclaration'));return{entryGuardRefusals:5,noRuntimeOrHistoryLoaded:true,jointIdPreflightPrecedesHistoryInFutureContext:true,planAndReceiptBindExactContextDesign:true,pendingHistoryAdapterNotQualifiedByThisReport:true};
  });
  const prior=await read(V+'proof/reverse-star-suffix-task-v2-independent-01/report.json','25bceb6da05762498a9efaaf9ecdbeee4f3c64ae970e46f0f020df05269f848d');assert.deepEqual(prior.errors,[]);
  await read(V+'proof/reverse-star-suffix-lower-independent-01/report.json','3f32eb2d690611c907ec1dee4275c75fd924d61e5aaff76d4870ff998858fa2f');
  const bundle=await build({entryPoints:[task.SELF,T+'reverse-star-suffix-cli-v3.mjs'],outdir:'unused-metadata-memory',bundle:true,write:false,metafile:true,packages:'external',platform:'node',format:'esm',logLevel:'silent'});
  for(const p of Object.keys(bundle.metafile.inputs)){const b=await bytes(p);toolBindings[p]=hash(b);}await bytes(SELF);
  for(const [p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,p);
 }catch(e){failure={message:e.message,stack:e.stack};}
 const report={status:failure?'REVERSE_STAR_PARAMETERIZED_METADATA_FAILED':'REVERSE_STAR_PARAMETERIZED_METADATA_PASS_PRODUCTION_DISABLED',tests,errors:failure?[failure]:[],fileBindings,toolBindings,bindingWorkingDirectory:process.cwd(),...zero,entryGuardRefusals:failure?null:5,privateMathReusedBySourceEquivalenceOnly:true,newDifficultyCertificate:false,oldFilesChanged:false};
 const p=path.join(out,'report.json');await fs.writeFile(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(failure)throw Error(JSON.stringify(failure));return{path:p,sha256:hash(await fs.readFile(p)),tests:tests.length,fileBindings:Object.keys(fileBindings).length,toolBindings:Object.keys(toolBindings).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv.length,3);console.log(JSON.stringify(await run(process.argv[2])));}
