import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileLevel} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {compileNative41 as compileNative,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

const root='deliverables/lv9-remake-20260927';
const out=path.join(root,'design-search-'+Date.now());fs.mkdirSync(out,{recursive:true});
const binary=compileNative(path.join(root,'design-native'));
let seed=Number(process.argv[2]??273901),random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(random()*a.length)];
const palettes=['yellow','green','blue','pink','red'];
const shapes=[['0110','1111','1111'],['0110','1111','0110','0110'],['1111','0110','1111'],['0110','1111','1111']];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function make(id){
 const rows=shapes[process.argv[5]===undefined?id%shapes.length:Number(process.argv[5])],W=2*rows[0].length,H=2*rows.length,anchors=[];
 rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='1')anchors.push([2*x,2*y]);}));
 const shape=[[0,0],[1,0],[0,1],[1,1]],playable=anchors.flatMap(([x,y])=>shape.map(([dx,dy])=>[x+dx,y+dy]));
 const mask=new Set(playable.map(p=>p.join(','))),mouths=[];
 for(const side of ['top','right','bottom','left'])for(let offset=0;offset<((side==='top'||side==='bottom')?W:H)-1;offset++){
  const cells=[0,1].map(i=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,H-1]:side==='left'?[0,offset+i]:[W-1,offset+i]);
  if(cells.every(p=>mask.has(p.join(','))))mouths.push({side,offset,size:2});
 }
 let colors;
 for(let tries=0;tries<1000;tries++){
  colors=shuffle(palettes.flatMap(c=>[c,c]));
  if(anchors.every(([x,y],i)=>anchors.every(([xx,yy],j)=>i===j||colors[i]!==colors[j]||Math.abs(x-xx)+Math.abs(y-yy)!==2)))break;
  colors=null;
 }
 if(!colors)return;
 const possibleYellow=mouths.filter(g=>anchors.some(([x,y],i)=>colors[i]==='yellow'&&(g.side==='top'?y===0&&x===g.offset:g.side==='bottom'?y===H-2&&x===g.offset:g.side==='left'?x===0&&y===g.offset:x===W-2&&y===g.offset)));
 if(!possibleYellow.length)return;
 const gates=[{...pick(possibleYellow),id:'lv9-yellow',color:'yellow'}];
 for(let i=1;i<5;i++){
  const choices=mouths.filter(g=>!gates.some(h=>h.side===g.side&&g.offset<h.offset+h.size&&h.offset<g.offset+g.size));
  if(!choices.length)return;gates.push({...pick(choices),id:'lv9-'+palettes[i],color:palettes[i],frozen:i*2});
 }
 return {id:9,name:'冰封色门',difficulty:'hard',width:W,height:H,playable,blocked:[],seams:[],timeSeconds:105,reward:60,mechanismRules:'revised-2026-09-23-v1.4',blocks:anchors.map(([x,y],i)=>({id:'lv9-original-'+i,x,y,color:colors[i],shape})),gates};
}
function native(level,ms=500,floor=21){
 const c=compileLevel(level);
 const payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:0,revealAt:0,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:[],generators:[],groups:equivalentBlockGroups(c),floor,maxStates:300000,maxMilliseconds:ms,normalize:true,symmetry:true,collect:false};
 const input=path.join(out,'current-input.json'),output=path.join(out,'current-output.json');fs.writeFileSync(input,JSON.stringify(payload));
 execFileSync(binary.exe,[path.resolve(input),path.resolve(output)],{windowsHide:true,stdio:'pipe',timeout:ms+10000});return JSON.parse(fs.readFileSync(output));
}
const report=[];let best=-1;
for(let i=0;i<Number(process.argv[3]??300);i++){
 const level=make(i);if(!level)continue;
 const r=native(level,Number(process.argv[4]??600));
 const row={iteration:i,seed,levelSha256:digest(level),status:r.status,cost:r.relaxedNonClearingDrags??null,states:r.discoveredStates,ms:r.milliseconds};report.push(row);
 if(row.cost!==null&&row.cost>best){best=row.cost;fs.writeFileSync(path.join(out,'best-'+best+'.json'),JSON.stringify({level,native:r},null,2));console.log(JSON.stringify({best,...row,path:out}));}
 if(row.cost>=16&&row.cost<=20){
  const found=path.join(out,'candidate-'+i+'.json');fs.writeFileSync(found,JSON.stringify({level,native:r},null,2));
  console.log('CANDIDATE '+found);
  const route=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:30000});
  fs.writeFileSync(path.join(out,'route-'+i+'.json'),JSON.stringify({level,result:route},null,2));
  if(route.relaxedRoute){console.log('ROUTE '+path.join(out,'route-'+i+'.json'));break;}
 }
 if(i%25===0){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({binary,sourceSha256:digest(fs.readFileSync(NATIVE_SOURCE)),report},null,2));console.log(JSON.stringify({iteration:i,best,status:r.status,cost:row.cost}));}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({binary,sourceSha256:digest(fs.readFileSync(NATIVE_SOURCE)),report},null,2));
console.log(JSON.stringify({out,best,count:report.length}));
