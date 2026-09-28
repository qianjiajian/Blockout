import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {witness} from '../lv11-remake-20260927/design-witness.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.84.0');
const input=process.argv[2],maxFiles=Number(process.argv[3]??16),budget=Number(process.argv[4]??1200);
const rows=JSON.parse(fs.readFileSync(path.join(input,'report.json'))).rows.filter(r=>r.status==='unknown').sort((a,b)=>b.discovered-a.discovered).slice(0,maxFiles);
const root=`deliverables/lv16-remake-20260927/design-upper-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const{api}=await loadPreviewCore(),reports=[];let selected;
for(const[index,row]of rows.entries()){
 const original=JSON.parse(fs.readFileSync(row.file)),level=original.level;
 const result=witness(level,{maxCost:15,maxStates:150000,maxMilliseconds:budget,weight:30}),drags=result.drags??[];
 const replay=drags.length?api.replayRevisedRoute(level,drags):null,nonclears=drags.filter(d=>!d.exitSide),multi=nonclears.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
 const file=path.join(root,`attempt-${index}.json`),data={source:row.file,level,levelSha256:digest(level),result,drags,replay,kinds:{multiCell:multi,singleCell:nonclears.length-multi}};fs.writeFileSync(file,JSON.stringify(data,null,2));
 reports.push({file,status:result.status,cost:result.cost,kinds:data.kinds,bestClears:result.bestClears});
 console.log(JSON.stringify(reports.at(-1)));
 if(replay?.valid&&replay.complete&&result.cost>=11&&result.cost<=15&&multi>0){selected=file;break;}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({status:'BOUNDED_UPPER_SEARCH_NOT_A_LOWER_BOUND',selected,rows:reports},null,2));
console.log(JSON.stringify({root,selected}));
