import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {test} from 'node:test';
import {levelSha256} from '../formal-v2/contract.mjs';

// Execute the auditor's actual pure parent-redesign assertion block in isolation.
// Importing its CLI entry would perform an actual batch audit; no solver or
// ledger is needed to qualify this parent comparison.
const file='tools/daily-challenge/formal-v4/audit-low-band-prefix-actual-independent.mjs';
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('  assert.equal(parentResult.accepted,false);');
const end=source.indexOf('  assert.equal(result.accepted,q.accepted);',start);
assert(start>=0&&end>start);
const script=new vm.Script('(()=>{'+source.slice(start,end)+';return true;})()');
const verify=(parent,fp)=>script.runInNewContext({assert,levelSha256,parent,fp,parentResult:{accepted:false}},{timeout:1000});
const old={shapeSha256:'old-shape',colorSha256:'old-cells',colorAssignments:[{id:'a',colors:['red']},{id:'b',colors:['blue']}]};
const next={shapeSha256:'new-shape',colorSha256:'new-cells',colorAssignments:[{id:'c',colors:['red']},{id:'d',colors:['green']}]};

test('no shared IDs and actual colour inventory changes passes',()=>assert.equal(verify(old,next),true));
test('renamed IDs with unchanged colour inventory rejects despite different metadata hashes',()=>{
 const q=structuredClone(next);q.colorAssignments=[{id:'d',colors:['blue']},{id:'c',colors:['red']}];
 assert.throws(()=>verify(old,q),/full colour inventory must change/);
});
test('shared ID requires a real colour change even if unrelated new stock differs',()=>{
 const q=structuredClone(next);q.colorAssignments[0].id='a';assert.throws(()=>verify(old,q),/shared body colour must change/);
 q.colorAssignments[0].colors=['yellow'];assert.equal(verify(old,q),true);
});
test('same shape fingerprint rejects even after true colour change',()=>{
 const q=structuredClone(next);q.shapeSha256=old.shapeSha256;assert.throws(()=>verify(old,q));
});
test('same actual colour-grid fingerprint rejects even after new shape and new IDs',()=>{
 const q=structuredClone(next);q.colorSha256=old.colorSha256;assert.throws(()=>verify(old,q));
});
