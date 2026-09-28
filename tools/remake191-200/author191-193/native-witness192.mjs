import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{keyPayload}from'./floor-keys32.mjs';import{api,OUT,digest}from'./common.mjs';import{each,clearCount}from'../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
const source='tools/remake191-200/author191-193/native-witness192.cs';
if(!fs.existsSync(source)){
 let s=fs.readFileSync('tools/remake191-200/author194-196/native-keys32.cs','utf8');
 s=s.replace('long explored,transitions;int cost,maxClears;',`readonly List<int> parents=new List<int>(),heap=new List<int>();int currentIndex;
 int Score(int i){return Clears(states[i])*1000-distances[i];}
 void Push(int i){heap.Add(i);int at=heap.Count-1;while(at>0){int p=(at-1)/2;if(Score(heap[p])>=Score(heap[at]))break;int tmp=heap[p];heap[p]=heap[at];heap[at]=tmp;at=p;}}
 int Pop(){int v=heap[0],last=heap[heap.Count-1];heap.RemoveAt(heap.Count-1);if(heap.Count>0){heap[0]=last;int p=0;while(p*2+1<heap.Count){int a=p*2+1;if(a+1<heap.Count&&Score(heap[a+1])>Score(heap[a]))a++;if(Score(heap[p])>=Score(heap[a]))break;int tmp=heap[p];heap[p]=heap[a];heap[a]=tmp;p=a;}}return v;}
 long explored,transitions;int cost,maxClears;`);
 s=s.replace('distances[i]=(byte)nextCost;}else{','distances[i]=(byte)nextCost;parents[i]=currentIndex;}else{').replace('distances.Add((byte)nextCost);','distances.Add((byte)nextCost);parents.Add(currentIndex);').replace('if(edge==0)currentQueue.Add(i);else nextQueue.Add(i);','Push(i);');
 s=s.replace('if(at!=start)Visit(s.Set(i,at|(stage<<7)),1,collect);if(p.exits[stage]>=0&&clears>=p.exits[stage])Visit(s.Set(i,stage+1<b.layers?at|((stage+1)<<7):255),0,collect);','if(p.exits[stage]>=0&&clears>=p.exits[stage]){Visit(s.Set(i,stage+1<b.layers?at|((stage+1)<<7):255),0,collect);continue;}if(at!=start)Visit(s.Set(i,at|(stage<<7)),1,collect);');
 s=s.replace('distances.Add(0);currentQueue.Add(0);','distances.Add(0);parents.Add(-1);Push(0);');
 const begin=s.indexOf('  try{for(cost=0;'),end=s.indexOf('  catch(BudgetStop',begin);assert(begin>=0&&end>begin);
 s=s.slice(0,begin)+`  try{while(heap.Count>0){Guard();int i=Pop();cost=distances[i];currentIndex=i;current=states[i];explored++;int clears=Clears(current);maxClears=Math.Max(maxClears,clears);if(clears>=input.goalClears){shortcut=cost;throw new BudgetStop("witness");}Expand(current,null);}}
`+s.slice(end);
 s=s.replace('bool unknown=stopped==','var route=new List<string>();if(shortcut.HasValue){for(int at=currentIndex;at>=0;at=parents[at])route.Add(states[at].Text(n));route.Reverse();}bool unknown=stopped==');
 s=s.replace('return new{status=unknown?"unknown":shortcut.HasValue?"relaxed-shortcut":"threshold-proven",thresholdProven=!unknown&&!shortcut.HasValue,','return new{witnessStates=route.ToArray(),discoveryOnly=true,status=unknown?"unknown":shortcut.HasValue?"witness":"exhausted",thresholdProven=false,');
 fs.writeFileSync(source,'// WITNESS DISCOVERY ONLY; heap order/canonical contact deliberately not a proof graph.\n'+s,{flag:'wx'});
}
export function nativeWitness192(level,{floor=21,maxMilliseconds=700,maxStates=100000}={}){
 const{p,c}=keyPayload(level,{floor,maxMilliseconds,maxStates});p.groups=[];const hash=digest(fs.readFileSync(source)),exe=path.resolve(OUT,'native-witness192-'+hash.slice(0,12)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const stem=path.resolve(OUT,'native-witness192-'+Date.now()+'-'+Math.random().toString(16).slice(2,8)),input=stem+'-input.json',output=stem+'-output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+10000});const result=JSON.parse(fs.readFileSync(output));if(!result.witnessStates?.length)return{...result,input,output,source,sourceHash:hash};
 const unlocked=(s,i)=>p.blocks[i].keyIndices.filter(j=>s[j]===511).length>=p.blocks[i].lockCount;function eachKey(s,visit){each(c,s,(i,v,cost,get)=>{if(unlocked(s,i))return visit(i,v,cost,get);},{optionalExit:false});}
 function normalize(input){let s=input;const drags=[];for(;;){let found;eachKey(s,(i,v,k,get)=>{if(k===0&&v===511){found={i,v,drag:get()};return false;}});if(!found)return{s,drags};s=s.slice();s[found.i]=found.v;drags.push(found.drag);}}
 const text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b.toString('base64');};let normal=normalize(c.initial),s=normal.s,drags=[...normal.drags];assert.equal(text(s),result.witnessStates[0]);
 for(const target of result.witnessStates.slice(1)){let found;eachKey(s,(i,v,k,get)=>{const next=s.slice();next[i]=v;const normalized=normalize(next);if(text(normalized.s)===target){found={s:normalized.s,drags:[get(),...normalized.drags]};return false;}});assert(found,'Native discovery step must have a labeled canonical successor');s=found.s;drags.push(...found.drags);}
 assert.equal(clearCount(c,s),c.total);const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete&&replay.nonClearingDrags<floor);return{...result,drags,cost:replay.nonClearingDrags,replay,input,output,source,sourceHash:hash,exeHash:digest(fs.readFileSync(exe)),inputHash:digest(fs.readFileSync(input)),discoveryOnly:true};
}
if(process.argv[1]?.endsWith('native-witness192.mjs')){const d=JSON.parse(fs.readFileSync(process.argv[2])),w=nativeWitness192(d.level);console.log(JSON.stringify({status:w.status,U:w.cost,states:w.discoveredStates,maxClears:w.maxClearsSeen,drags:w.drags?.length}));}
