import {api,base,shapes,tile,color,attempt,write,digest} from './common.mjs';
const start=Number(process.argv[2]??1),count=Number(process.argv[3]??12),rows=[];
for(let seed=start;seed<start+count;seed++){
 const l=base(155,'hard');
 l.gates=[{id:'ice-blue',color:'blue',side:'bottom',offset:0,size:2,frozen:5},{id:'ice-purple',color:'purple',side:'right',offset:4,size:2,frozen:5},{id:'ice-red',color:'red',side:'bottom',offset:3,size:2,frozen:5}];
 l.flipDoors=[{id:'flip-green',color:'green',side:'top',offset:1,size:3,initiallyOpen:false},{id:'flip-yellow',color:'yellow',side:'left',offset:1,size:2,initiallyOpen:true},{id:'flip-star-red',color:'red',side:'left',offset:5,size:2,initiallyOpen:false,star:true}];
 const ids=[...Array(7).fill(1),...Array(6).fill(seed%3===0?8:2),3,6,8,8,8,4,4];
 let specs=ids.map((shape,i)=>({id:'r102-155-b'+i,shape:shapes[shape],...(i===19?{star:true}:{}),color:'red'}));
 const bs=tile(specs,l.playable,seed);if(!bs){rows.push({seed,status:'tiling-failed'});continue;}
 if(!color(bs,['red','blue','purple','yellow','green'],seed,{'r102-155-b19':'red','r102-155-b13':'green','r102-155-b14':'yellow'})){rows.push({seed,status:'color-failed'});continue;}
 l.blocks=bs;
 const r=attempt(l,seed,{sourceOpening:'.codex-temp/video-audit-135-169/openings/level-155.jpg',verifiedIce:[5,5,5],verifiedFlips:3,stars:1,fullBodies:20,adaptation:'Independently verified20-body source (greenV3 was mislabeledV2+S in oldtruth). Source36 cells to preserved38: two single cells become dominoes; original retile/recolor, native q0 T/L orientation; all20 real bodies retained, threeM11.'});rows.push(r);console.log(JSON.stringify(r));
}
console.log(write('iteration155-'+start+'-'+Date.now(),rows));
