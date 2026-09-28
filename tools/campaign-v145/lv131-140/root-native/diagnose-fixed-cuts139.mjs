// Diagnostic only. Fixed obstacle cuts in an optimistic geometry graph.
import fs from 'node:fs';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {validateObligationPrefix} from './stationary-obligations.mjs';
import {compile} from '../agent139-140/axis128-masked-prefix-floor.mjs';
import {projectQueueFreePrefix} from '../agent139-140/queue-prefix.mjs';
Error.stackTraceLimit=0;
const input=process.argv[2],api=await loadModelApi(),candidate=JSON.parse(fs.readFileSync(input)),level=candidate.level,contract=validateObligationPrefix(level,api),c=compile(projectQueueFreePrefix(level,api,contract.goalClears).level,api,contract.goalClears),overlap=(a,b)=>a.some((v,i)=>v&b[i]);
const blockers=contract.blockers.map(b=>c.blocks.find(a=>a.id===b.id)),targets=contract.targets.map(b=>c.blocks.find(a=>a.id===b.id)),covers=[0,0,0,0];
for(const co of c.covers)for(let j=0;j<4;j++)covers[j]|=co.mask[j];
function blocked(target,ids){const occ=covers.slice();for(const i of ids){const b=blockers[i],m=b.poses[b.initial].mask;for(let j=0;j<4;j++)occ[j]|=m[j];}const q=[target.initial],seen=new Set(q);for(let at=0;at<q.length;at++){const p=q[at],pose=target.poses[p];if(pose.exits[0]&&!pose.exits[0].frozen)return false;for(const to of pose.neighbors)if(!seen.has(to)&&!overlap(target.poses[to].mask,occ)){seen.add(to);q.push(to);}}return true;}
const cuts=[];const order=Number(process.env.CUT_ORDER??2),start=Date.now();let tested=0;
function combinations(left,begin,ids){if(!left){tested++;if(cuts.some(c=>c.ids.every(i=>ids.includes(i))))return;for(const t of targets)if(blocked(t,ids)){cuts.push({ids:ids.slice(),targetId:t.id});break;}return;}for(let i=begin;i<=blockers.length-left;i++)combinations(left-1,i+1,[...ids,i]);}
for(let size=1;size<=order;size++)combinations(size,0,[]);
let nodes=0;function minHit(edges,memo=new Map()){if(!edges.length)return 0;const key=edges.map(e=>e.join(',')).sort().join(';');if(memo.has(key))return memo.get(key);nodes++;const e=edges.reduce((a,b)=>a.length<b.length?a:b),answer=1+Math.min(...e.map(i=>minHit(edges.filter(row=>!row.includes(i)),memo)));memo.set(key,answer);return answer;}
const lower=minHit(cuts.map(c=>c.ids));const out='deliverables/remake131-140-v146-20260924/root-native/fixed-cut-diagnostic139-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({input,diagnosticOnly:true,notQualified:true,thresholdProven:false,order,tested,ms:Date.now()-start,lower,nodes,blockers:blockers.map(b=>b.id),cuts},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,order,tested,cuts:cuts.length,lower,nodes,ms:Date.now()-start}));
