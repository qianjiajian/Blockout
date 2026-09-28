import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi} from '../replay.mjs';import {ROOT,writeNew,digest,ruleGate} from '../common.mjs';
import {compile,each,clearCount,stateOf} from '../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
const {api}=await loadApi();ruleGate();
const input=ROOT+'/assist164/qualification164-1790518677121.json',q=JSON.parse(fs.readFileSync(input)),reports=[];
for(const index of [0,7,9,18,23,25]){
 const f=q.smallFullGraph[index],level=structuredClone(f.level);level.mechanismRules='revised-2026-09-27-v1.5';
 const p={...level,mechanismRules:'revised-2026-09-23-v1.4'},c=compile(p,api,f.goal),start=new api.PuzzleModel(level);start.startCountdown();
 const key=m=>String.fromCharCode(...stateOf(c,m.snapshot())),models=[start],seen=new Set([key(start)]);let moves=0,exits=0;
 for(let at=0;at<models.length;at++){assert(models.length<20000,'Qualification fixture too large');const model=models[at],state=stateOf(c,model.snapshot());if(clearCount(c,state)>=f.goal)continue;
  const fast=new Set();each(c,state,(i,v,k)=>{const s=state.slice();s[i]=v;fast.add(k+':'+String.fromCharCode(...s));});
  const accept=(m,cost)=>{const k=key(m);assert(fast.has(cost+':'+k),`Missing authoritative edge fixture${index} state${at}`);if(!seen.has(k)){seen.add(k);models.push(m);}};
  for(const b of model.snapshot().blocks){if(!model.isBlockActive(model.getBlock(b.id)))continue;const poses=[{x:b.x,y:b.y,path:[]}],positions=new Set([b.x+','+b.y]);
   for(let j=0;j<poses.length;j++){const pose=poses[j],walk=()=>{const child=model.clone();child.beginAction();for(const xy of pose.path)assert(child.moveBlockStep(b.id,...xy));return child;},held=walk();
    if(pose.path.length){const child=walk();assert(child.commitAction());accept(child,1);moves++;}
    for(const side of ['top','right','bottom','left']){const child=walk();if(child.tryExit(b.id,side).ok){assert(child.commitAction());accept(child,0);exits++;}}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=pose.x+dx,y=pose.y+dy,k=x+','+y;if(positions.has(k))continue;const child=held.clone();if(!child.moveBlockStep(b.id,x,y))continue;positions.add(k);poses.push({x,y,path:[...pose.path,[x,y]]});}
   }
  }
 }
 reports.push({index,states:models.length,moves,exits,allAuthoritativeEdgesIncluded:true,exhausted:true});console.log(JSON.stringify(reports.at(-1)));
}
writeNew(ROOT+'/assist164/model-prefix-qualification-'+Date.now()+'.json',{passed:true,input,inputSha256:digest(fs.readFileSync(input)),reports,scope:'Complete current PuzzleModel finite prefix graphs embed into the relaxed JS prefix graph. Native backend separately checked against complete JS normalized graphs. Hidden objects cannot move before first countdown3; omitted only past terminal prefix. Removing locks only adds motions. No generator/flip/lift/axis/star/timer exists in164.'});

