import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {UI_SELECTION_EVIDENCE_PINS as P,separateExactPointerUIBindings,readSeparated161SelectionEvidence} from './selection-ui-evidence-separation.mjs';

test('Exact real evidence split retains mathematical paths, contracts, assets and receipt; no prefix-wide loophole',async()=>{
 const bindings={},r=await readSeparated161SelectionEvidence(P.quick,{bindings});assert.equal(r.exclusionCount,293);assert.equal(r.runs.length,2);assert.equal(r.images.length,6);assert.equal(bindings[P.quick.path],P.quick.sha256);assert.equal(bindings[P.actual.path],P.actual.sha256);
 const env=JSON.parse(await fs.readFile(P.environment.path)),root=env.sourceWorkspace,h='1'.repeat(64),ui=path.win32.join(root,'src/game/ColorEscapeGame.ts');
 const protectedFiles=['tools/daily-challenge/formal-v2/contract.mjs','docs/rules/mechanism-rules-v1.156.0.md','public/assets/art/body.png',P.receipt.path,'src/core/puzzle.ts',path.win32.join(root,'deliverables/daily-formal-v4-20261008/frozen-workspace-4588/src/core/puzzle.ts')];
 const b=Object.fromEntries([ui,...protectedFiles].map(p=>[p,h])),split=separateExactPointerUIBindings(b,b,root);
 assert.deepEqual(split.excludedUIBindings.map(x=>x.path),[ui]);for(const p of protectedFiles)assert.equal(split.historicalBindings[p],h);
 const pointer=JSON.parse(await fs.readFile(P.pointer.path));for(const e of r.excludedUIBindings)assert.equal(e.sha256,pointer.bindings[e.pointerBindingPath]);
});

test('Quick/Pointer hash mismatch, unlisted UI and forged descriptors cannot bypass the exact report boundary',async()=>{
 const env=JSON.parse(await fs.readFile(P.environment.path)),root=env.sourceWorkspace,p=path.win32.join(root,'src/game/ColorEscapeGame.ts'),h='1'.repeat(64);
 assert.throws(()=>separateExactPointerUIBindings({[p]:h},{[p]:'2'.repeat(64)},root),/SHA mismatch/);
 assert.throws(()=>separateExactPointerUIBindings({[p]:h},{},root),/Unlisted root UI/);
 const math='tools/daily-challenge/formal-v3/bounded-proof.mjs';assert.throws(()=>separateExactPointerUIBindings({[math]:h},{[math]:'2'.repeat(64)},root),/SHA mismatch/);
 await assert.rejects(()=>readSeparated161SelectionEvidence({...P.quick,sha256:'0'.repeat(64)}),/Only reviewed actual161/);
});
