// Finite candidate discovery. The selected groups are rechecked with the real
// model; this authoring script alone is not a formal acceptance certificate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {validateQueueObligationPrefix} from './stationary-queue-obligations.mjs';
import {checkDisjointStationaryCuts} from './stationary-disjoint-cuts.mjs';
import {compile} from '../agent139-140/axis128-masked-prefix-floor.mjs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input)),level=d.level,api=await loadModelApi(),contract=validateQueueObligationPrefix(level,api),reduced=structuredClone(level),queue=new Set(contract.queueIds);
delete reduced.generators;reduced.blocks=reduced.blocks.filter(b=>!queue.has(b.id));for(const b of reduced.blocks)delete b.generatorId;
const c=compile(reduced,api,contract.goalClears),blocks=contract.blockers.map(b=>c.blocks.find(a=>a.id===b.id)),targets=contract.targets.map(b=>c.blocks.find(a=>a.id===b.id)),cover=[0,0,0,0],overlap=(a,b)=>a.some((v,i)=>v&b[i]);
for(const co of c.covers)for(let i=0;i<4;i++)cover[i]|=co.mask[i];
const started=Date.now(),maxMs=Number(process.env.CUT_MS??15000),floor=Number(process.env.CUT_FLOOR??11),maxSize=Number(process.env.CUT_SIZE??3),cuts=[];let tested=0,complete=true;
function blocked(t,ids){const occupied=cover.slice();for(const i of ids)for(let j=0;j<4;j++)occupied[j]|=blocks[i].poses[blocks[i].initial].mask[j];const q=[t.initial],seen=new Set(q);for(let at=0;at<q.length;at++){const pose=t.poses[q[at]];if(pose.exits[0]&&!pose.exits[0].frozen)return false;for(const to of pose.neighbors)if(!seen.has(to)&&!overlap(t.poses[to].mask,occupied)){seen.add(to);q.push(to);}}return true;}
function enumerate(left,start,ids){if(Date.now()-started>maxMs){complete=false;return;}if(!left){tested++;if(cuts.some(c=>c.ids.every(i=>ids.includes(i))))return;for(const t of targets)if(blocked(t,ids)){cuts.push({ids:[...ids],targetId:t.id,mask:ids.reduce((m,i)=>m|(1n<<BigInt(i)),0n)});break;}return;}for(let i=start;i<=blocks.length-left;i++)enumerate(left-1,i+1,[...ids,i]);}
for(let size=1;size<=maxSize&&complete;size++)enumerate(size,0,[]);
const singles=cuts.filter(c=>c.ids.length===1),used=singles.reduce((m,c)=>m|c.mask,0n),choices=cuts.filter(c=>c.ids.length>1&&!(c.mask&used));let best=singles.slice(),packingNodes=0;
// Stop as soon as the requested bound is reached. No claim of optimal packing.
function pack(from,mask,chosen){packingNodes++;if(chosen.length>best.length)best=[...chosen];if(best.length>=floor||Date.now()-started>maxMs||packingNodes>100000)return;for(let i=from;i<choices.length;i++)if(!(choices[i].mask&mask))pack(i+1,mask|choices[i].mask,[...chosen,choices[i]]);}
if(best.length<floor)pack(0,used,singles);
const selected=best.map(c=>({targetId:c.targetId,blockerIds:c.ids.map(i=>blocks[i].id)})),proof=checkDisjointStationaryCuts(level,api,{floor,cuts:selected});assert.equal(proof.provedObligations,best.length,'Every optimistic cut must survive real-model verification');
const file='deliverables/remake131-140-v146-20260924/root-native/discovered-cuts139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({input,inputSha256:digest(fs.readFileSync(input)),discovery:{tested,maxSize,completeEnumeration:complete,packingNodes,milliseconds:Date.now()-started,cutCount:cuts.length},proof,formalAdopted:false,independentQualificationPending:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,L:proof.provedObligations,thresholdProven:proof.thresholdProven,tested,cuts:cuts.length,ms:Date.now()-started}));
