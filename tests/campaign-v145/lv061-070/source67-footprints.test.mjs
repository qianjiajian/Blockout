import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {digest} from '../../../tools/revised-preview-validation-v160.mjs';
import {checkFootprints67} from '../../../tools/campaign-v145/lv061-070/check-source67.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/',{api}=await loadApi(),level=JSON.parse(fs.readFileSync(root+'candidate67-1790256228628.json')).level,source=JSON.parse(fs.readFileSync(root+'source-footprint-binding67-1790256314128.json'));
test('67 one source green L3 binds two genuine bodies with unchanged total area and all other exact footprints',()=>assert.equal(checkFootprints67(level,source,api).status,'PASS'));
test('67 exact footprint gate rejects misleading split, altered source orientation, added special attribute and altered batch',()=>{
 for(const mutate of [s=>{s.rows.find(r=>r.candidateBlockIds.length===2).candidateBlockIds.pop();},s=>{s.rows.find(r=>r.blockId.endsWith('lift2-2')).sourceShape=[[0,0],[1,0],[2,0],[1,1]];}]){const s=structuredClone(source);mutate(s);assert.throws(()=>checkFootprints67(level,s,api));}
 for(const mutate of [l=>{l.blocks.find(b=>b.id.endsWith('lift2-3')).shutterId='wrong';},l=>{l.blocks.find(b=>b.id.endsWith('lift2-1')).movementAxis='horizontal';}]){const l=structuredClone(level);mutate(l);const s=structuredClone(source);s.levelSha256=digest(l);assert.throws(()=>checkFootprints67(l,s,api));}
});
