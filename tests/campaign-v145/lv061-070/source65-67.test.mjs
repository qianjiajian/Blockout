import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {checkSource65} from '../../../tools/campaign-v145/lv061-070/check-source65.mjs';
import {checkSource66_67} from '../../../tools/campaign-v145/lv061-070/check-source66-67.mjs';
const{api}=await loadApi(),root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/',ledger=JSON.parse(fs.readFileSync(root+'source-corrections.json')).levels;
for(const [id,name,check]of [[65,'candidate65-1790248711981.json',checkSource65],[66,'candidate66-1790250038524.json',checkSource66_67],[67,'candidate67-1790256228628.json',checkSource66_67]]){
 const level=JSON.parse(fs.readFileSync(root+name)).level,source=ledger.find(x=>x.id===id);
 test(`${id} exact frozen source mapping and frame checksums`,()=>assert(check(level,source,api).passed));
 test(`${id} reject wrong color, ice, hidden batch, frame SHA`,()=>{
  for(const mutate of [l=>{l.blocks.find(b=>b.frozen).frozen++;},l=>{l.blocks.find(b=>b.shutterId).shutterId='wrong';},l=>{l.blocks.find(b=>b.id.includes('-opening-')).color='wrong';}]){const bad=structuredClone(level);mutate(bad);assert.throws(()=>check(bad,source,api));}
  const bad=structuredClone(source);bad.evidence[0].sha256='wrong';assert.throws(()=>check(level,bad,api));
 });
}
