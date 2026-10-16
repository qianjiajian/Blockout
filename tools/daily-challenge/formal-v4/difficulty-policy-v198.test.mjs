import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadDailyDifficultyPolicyV198,DIFFICULTY_RULE_VERSION,DIFFICULTY_RULE_FILE,DIFFICULTY_RULE_SHA} from './difficulty-policy-v198.mjs';

// Real TS loader and rule bytes. No stubs, model, search, ledger or player save.
test('real policy loader binds the exact tolerance contract and freezes all three bands',async()=>{
 const p=await loadDailyDifficultyPolicyV198();assert.equal(p.version,'1.198.0');assert.equal(DIFFICULTY_RULE_VERSION,p.version);
 assert.deepEqual(p.bands,{1:{nominalLower:16,nominalUpper:20,lower:13,upper:23},2:{nominalLower:21,nominalUpper:30,lower:18,upper:33},3:{nominalLower:31,nominalUpper:null,lower:28,upper:null}});
 const hash=x=>createHash('sha256').update(x).digest('hex');assert.equal(hash((await fs.readFile(DIFFICULTY_RULE_FILE,'utf8')).replaceAll('\r\n','\n')),DIFFICULTY_RULE_SHA);
 assert(Object.isFrozen(p));assert(Object.isFrozen(p.bands));for(const b of Object.values(p.bands))assert(Object.isFrozen(b));
 assert(Object.keys(p.bindings).some(f=>f==='src/core/dailyChallengeDifficultyPolicy.ts'));
 for(const[file,h]of Object.entries(p.bindings))assert.equal(hash(await fs.readFile(file)),h);
});
test('real predicate accepts only same-layout finite intervals within the adjusted bands',async()=>{
 const p=await loadDailyDifficultyPolicyV198();
 for(const [d,L,U]of [[1,13,13],[1,13,23],[1,16,20],[1,23,23],[2,18,18],[2,18,33],[2,21,30],[2,33,33],[3,28,28],[3,31,80],[3,80,100000]])assert.equal(p.accepts(d,L,U),true,`${d}: [${L},${U}]`);
 for(const [d,L,U]of [[1,12,20],[1,13,24],[2,17,30],[2,18,34],[3,27,31],[3,30,29],[1,0,0],[3,28,Infinity],[3,NaN,40],[3,28,30.5],[0,13,20],[4,28,50],['1',13,20],[3,null,40],[3,28,'40'],[3,28,Number.MAX_SAFE_INTEGER+1]])assert.equal(p.accepts(d,L,U),false,`${d}: [${L},${U}]`);
 const evidence=Object.freeze({L:16,U:20});assert(p.accepts(1,evidence.L,evidence.U));assert.deepEqual(evidence,{L:16,U:20},'Policy never rewrites old proof values');
});
