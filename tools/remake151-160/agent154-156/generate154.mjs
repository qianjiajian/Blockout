import {api,base,shapes,tile,color,attempt,write} from './common.mjs';
import {proofNative} from './native-proof.mjs';
import fs from 'node:fs';
import {measureRoute} from '../../remake21to30-quality.mjs';
const start=Number(process.argv[2]??1),count=Number(process.argv[3]??12),rows=[];
for(let seed=start;seed<start+count;seed++){
 const l=base(154,'normal');
 l.gates=[{id:'red',color:'red',side:'right',offset:1,size:2},{id:'blue',color:'blue',side:'left',offset:3,size:2},{id:'green',color:'green',side:'left',offset:7,size:2},{id:'cyan',color:'cyan',side:'top',offset:1,size:3},{id:'yellow-ice',color:'yellow',side:'left',offset:1,size:2,frozen:5},{id:'purple-ice',color:'purple',side:'right',offset:3,size:2,frozen:1}];
 const cover={id:'r102-cover154',x:0,y:5,width:7,height:4,count:11};l.shutters=[cover];
 const hidden=l.playable.filter(([x,y])=>x>=cover.x&&x<cover.x+cover.width&&y>=cover.y&&y<cover.y+cover.height),opening=l.playable.filter(p=>!hidden.some(q=>p[0]===q[0]&&p[1]===q[1]));
 const os=[...Array(6).fill(1),...Array(9).fill(8),2,9,4,4,4];
 const hs=[4,4,4,4,4,9,2,2,8,8,8];
 const mk=(ss,prefix,hidden)=>ss.map((s,i)=>({id:'r102-154-'+prefix+i,shape:shapes[s],color:'red',...(hidden?{shutterId:cover.id}:{}),...(!hidden&&[15,16,17,18].includes(i)?{keyId:'four-keys'}:{}),...(!hidden&&i===6?{lockedBy:'four-keys',lockCount:4}: {})}));
 const ob=tile(mk(os,'o',false),opening,seed),hb=tile(mk(hs,'h',true),hidden,seed+10000);if(!ob||!hb){rows.push({seed,status:'tiling-failed',opening:opening.length,hidden:hidden.length});continue;}
 if(!color(ob,['red','blue','green','yellow','purple','cyan'],seed)||!color(hb,['red','blue','green','yellow','purple','cyan'],seed+10000)){rows.push({seed,status:'color-failed'});continue;}
 l.blocks=[...ob,...hb];const r=attempt(l,seed,{sourcePristine:'deliverables/remake151-160-20260927/agent154-156/first154-03.jpg',sourceCorrection:'Truth426s was after firstclear. First pristine425.0s shows 7x10, cover11, leftice5 rightice1 and fourkey lock4. Original three interiorwall cells forbidden: source20opening34cells+11hidden33cells vs current38opening+28hidden; all31 bodies and8M11 kept, q0 reshaped per1.102.',knownMechanisms:{cover:11,ice:[5,1],keys:4,lockCount:4},hiddenStatus:'11 real source bodies, newly authored full28cell layer (source33footprints+2walls), fiveM11 kept'});rows.push(r);console.log(JSON.stringify(r));
 if(r.U>=11&&r.U<=15){const d=JSON.parse(fs.readFileSync(r.file)),measure=measureRoute(l,d.drags,api);if(measure.multiCellDrags<=measure.singleCellDrags){r.measureReject={single:measure.singleCellDrags,multi:measure.multiCellDrags};continue;}const p=proofNative(l,11);r.proof=write('native-proof-154-'+seed+'-'+Date.now(),p);console.log(JSON.stringify({seed,proof:p.proof.status,cost:p.proof.relaxedNonClearingDrags}));if(p.proof.thresholdProven){console.log(write('ready154-'+seed,{candidate:r.file,proof:r.proof,L:11,U:r.U,measure,needs:'source ledger QA, original art/model decisions, dualscreen real Pointer/naturalclock'}));break;}}
}
console.log(write('iteration154-'+start+'-'+Date.now(),rows));
