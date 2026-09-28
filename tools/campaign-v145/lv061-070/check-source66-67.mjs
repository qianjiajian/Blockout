import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {findLiftCausalCase as liftCausalCase} from './lift-causal-case.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',names={1:'SINGLE',2:'V2',3:'V3',4:'L3',5:'S4',6:'T4',7:'SQ2',8:'H2',9:'H3',10:'L4',13:'RECT6',14:'SQ3',21:'RECT6'};
export function checkSource66_67(level,ledger,api){
 const id=level.id;assert([66,67].includes(id));assert.equal(ledger.id,id);for(const f of ledger.evidence)assert.equal(digest(fs.readFileSync(f.path)),f.sha256,'Frame drift '+f.path);
 const expected=id===66?{
 ice:[['purple','H3',6],['red','H3',6],['yellow','H3',6],['green','V3',6],['red','V3',6]],
 opening:[['cyan','V2'],['red','H3'],['blue','H2'],['green','V3'],['yellow','H2'],['green','V2'],['purple','SQ2'],['purple','V2'],['blue','H2'],['yellow','H2'],['blue','H2'],['cyan','H2']],
 lift2:[['yellow','SINGLE'],['yellow','V3',0,['yellow','blue']],['purple','L3',5],['red','L4',5],['blue','SQ2']]
 }:{
 lift1:[['yellow','H2',5],['blue','V3',5],['red','SQ2',5]],
 opening:[['green','SQ2'],['red','H2'],['green','H3'],['yellow','H2'],['purple','V2'],['cyan','V2'],['blue','V2'],['red','SQ2']],
 'left-open':[['purple','V3',10]],lift2:[['blue','V2'],['green','H2'],['yellow','T4'],['green','SINGLE']],
 'left-hidden':[['green','V3']],cover:[['cyan','H3']]
 };
 const map=new Map(level.blocks.map(b=>[b.id,b])),checks=[];
 for(const [stage,items]of Object.entries(expected))for(const [i,[color,kind,ice,layers]]of items.entries()){
  const bid=`v146-${id}-${stage}-${i}`,b=map.get(bid);assert(b,bid);const art=api.matchFormalBlockShape(b.shape,'native-only');assert(art&&art.quarterTurns===0,bid+' q0');assert.equal(names[art.shapeId],kind,bid+' shape');assert.equal(b.color,color,bid+' color');assert.equal(b.frozen??0,ice??0,bid+' ice');assert.deepEqual(b.layers??[b.color],layers??[color],bid+' shell');
  const shutterId=stage==='lift2'?`v146-${id}-lift2`:stage==='left-hidden'?`v146-${id}-left-lift`:stage==='cover'?`v146-${id}-cover`:undefined;assert.equal(b.shutterId,shutterId,bid+' batch');map.delete(bid);checks.push({id:bid,sourceColor:color,authoredKind:kind,ice:ice??0,layers:layers??[color],shutterId:shutterId??null});
 }
 const extras=[...map.values()];assert(extras.every(b=>b.id.startsWith(`v146-${id}-padding-`)&&!b.shutterId&&!b.frozen&&!b.layers));assert.equal(extras.reduce((n,b)=>n+b.shape.length,0),id===66?20:22);const paddingHistogram={};for(const b of extras){const k=names[api.matchFormalBlockShape(b.shape,'native-only').shapeId];paddingHistogram[k]=(paddingHistogram[k]??0)+1;}
 const gates=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0])),expectedGates=id===66?{green:0,blue:16,cyan:4,yellow:3,purple:2,red:1}:{green:0,yellow:1,red:3,purple:5,cyan:4,blue:5};assert.equal(level.gates.length,6);assert.deepEqual(gates,expectedGates);assert(level.gates.every(g=>!g.star));
 const shutters=Object.fromEntries(level.shutters.map(s=>[s.id,[s.width,s.height,s.count,s.skin??'shutter']]));assert.deepEqual(shutters,id===66?{'v146-66-lift2':[5,3,0,'lift']}:{'v146-67-lift2':[3,3,0,'lift'],'v146-67-left-lift':[1,3,0,'lift'],'v146-67-cover':[3,1,3,'shutter']});
 assert(!level.generators?.length);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.lockCount&&!b.timedBombSeconds));const packing=JSON.parse(fs.readFileSync(root+'/native-hidden-packing.json')),packingTest=packing.tests.find(x=>x.id===id);assert(packingTest.source.exhaustive&&packingTest.source.solutions===0&&packingTest.selected.solutions>0);
 return {passed:true,levelSha256:digest(level),sourceRecordSha256:digest(ledger),checkedFrameCount:ledger.evidence.length,checks,paddingHistogram,paddingBodies:extras.length,paddingCells:extras.reduce((n,b)=>n+b.shape.length,0),sourceBodyCount:id===66?22:17,authoredBodyCount:level.blocks.length,sourceDifferences:ledger.adaptation,packingProof:{path:root+'/native-hidden-packing.json',sha256:digest(fs.readFileSync(root+'/native-hidden-packing.json')),test:packingTest},notExactCopy:true};
}
if(process.argv[1]?.endsWith('check-source66-67.mjs')){const{api}=await loadApi(),candidateFile=process.argv[2],d=JSON.parse(fs.readFileSync(candidateFile)),ledger=JSON.parse(fs.readFileSync(root+'/source-corrections.json')).levels.find(x=>x.id===d.level.id),report={candidateFile,candidateFileSha256:digest(fs.readFileSync(candidateFile)),source:checkSource66_67(d.level,ledger,api),liftCausalCase:liftCausalCase(d.level,d.drags,api)},out=`${root}/source-binding${d.level.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,source:report.source.passed,lift:report.liftCausalCase.passed}));}
