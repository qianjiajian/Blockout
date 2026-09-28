import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {ROOT,digest,writeNew,ruleGate} from '../common.mjs';
import {payload} from '../author194-196/floor-countdown.mjs';
export function delayedPayload(level,options={}){
 const l=structuredClone(level);assert.equal(l.generators.length,1);const g=l.generators[0];assert.equal(g.queueBlockIds.length,1);const q=g.queueBlockIds[0],b=l.blocks.find(b=>b.id===q);assert(!b.layers?.length);assert(!l.flipDoors?.length);assert(!l.blocks.some(b=>b.frozen||b.keyId||b.lockedBy||b.timedBombSeconds));
 const c=l.shutters.find(c=>c.id==='c10');assert(c&&c.count===10);assert(b.shape.every(([x,y])=>g.spawn[0]+x>=c.x&&g.spawn[0]+x<c.x+c.width&&g.spawn[1]+y>=c.y&&g.spawn[1]+y<c.y+c.height));
 l.blocks=l.blocks.filter(b=>b.id!==q);delete l.generators;
 const queueGate=l.gates.filter(g=>g.color===b.color);assert.equal(queueGate.length,1);
 const {p}=payload(l,{floor:11,maxMilliseconds:1800,maxStates:150000,...options});p.delayedCreditAt=Math.max(c.count,queueGate[0].frozen??0);p.goalClears++;return{p,projected:l,queueId:q};
}
export function delayedNative(p){
 const source='tools/campaign-v145/lv131-140/agent139-140/native-prefix-pruned.cs',original=fs.readFileSync(source,'utf8');
 const needle='int Clears(World s){int c=0;for(int i=0;i<n;i++){int v=s.Get(i);c+=v==511?bodies[i].layers:v>>7;}return c;}';assert(original.includes(needle));
 const modified=original.replace('public int width,height,floor,maxStates,maxMilliseconds,goalClears;','public int width,height,floor,maxStates,maxMilliseconds,goalClears,delayedCreditAt;').replace(needle,needle.replace('return c;','return c+(input.delayedCreditAt>0 && c>=input.delayedCreditAt?1:0);'));
 const dir=ROOT+'/root194',cs=path.resolve(dir,'native-delayed-credit-'+digest(modified).slice(0,12)+'.cs'),exe=cs.replace(/\.cs$/,'.exe');
 if(!fs.existsSync(cs))fs.writeFileSync(cs,modified,{flag:'wx'});else assert.equal(fs.readFileSync(cs,'utf8'),modified);
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,cs],{windowsHide:true,stdio:'pipe'});
 const stem=path.resolve(dir,'delayed-'+Date.now()+'-'+process.pid),input=stem+'-input.json',output=stem+'-output.json';writeNew(input,p);execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+10000});return{...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash:digest(original),cs,csHash:digest(modified),exeHash:digest(fs.readFileSync(exe)),inputHash:digest(fs.readFileSync(input))};
}
if(process.argv[1]?.endsWith('delayed-credit.mjs')){
 ruleGate();const candidate=process.argv[2],d=JSON.parse(fs.readFileSync(candidate)),{p,projected,queueId}=delayedPayload(d.level),result=delayedNative(p),out=ROOT+'/root194/delayed-probe-'+Date.now()+'.json';
 writeNew(out,{status:'DIAGNOSTIC_NOT_CERTIFIED',candidate,levelSha256:digest(d.level),projected,queueId,result,delayedCreditAt:p.delayedCreditAt,argument:'Exactly one ordinary FIFO body cannot spawn before the count10 cover reveals or clear before its matching ice gate thaws. Omit its occupancy and grant its clear at nonqueue count=max(cover count, matching gate ice). Earlier counters are unchanged; later counters are no lower than any actual state. All original nonqueue bodies and shell stages remain. No hidden ice/key/flip/lift/timer. Early reveal stays inside an already forbidden curtain area. This nondecreasing counter preserves final-body clear commutation. Full goal is32 nonqueue events plus1 credit. Complete original route and qualification remain mandatory.'});console.log(JSON.stringify({out,status:result.status,shortcut:result.relaxedNonClearingDrags,states:result.discoveredStates}));
}
