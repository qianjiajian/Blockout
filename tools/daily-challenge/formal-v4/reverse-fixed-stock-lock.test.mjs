import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {reverseRecipeExecutionIdentity,SELF,FACTORY} from './reverse-fixed-stock-task.mjs';
import {sha} from './low-twenty-io.mjs';
const out=process.env.REVERSE_STOCK_LOCK_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});let passed=false;
const d=async p=>({path:p,sha256:sha(await fs.readFile(p))});
test('pre-full terminal recipe lock is invariant to relabel/reband/budget and actual body ID rename',async()=>{
 const original=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/reverse-fixed-stock-task-private-03/u1/plan.json')).recipe;
 const identity=reverseRecipeExecutionIdentity(original),file=path.join(out,'reverse-recipe-'+identity+'.execution.json');await fs.writeFile(file,JSON.stringify({recipeIdentity:identity,consumedInputs:0,maximumInputs:1,status:'SYNTHETIC_PRE_FULL_BUDGET_TERMINAL',restartAllowed:false}),{flag:'wx'});
 const edit=structuredClone(original);edit.recipeId='other-label';edit.board.name='other-display';edit.targetDifficulty=2;edit.floor=21;edit.upper=30;edit.budget.maxStates=50;edit.budget.maxMilliseconds=5;
 const renamed=new Map(edit.inventory.map((b,i)=>[b.id,'changed-label-'+i]));for(const b of edit.inventory)b.id=renamed.get(b.id);edit.insertionOrder=edit.insertionOrder.map(id=>renamed.get(id));edit.parkingBodyIds=edit.parkingBodyIds.map(id=>renamed.get(id));edit.board.gates.forEach((g,i)=>g.id='other-gate-'+i);
 assert.equal(reverseRecipeExecutionIdentity(edit),identity);await assert.rejects(fs.writeFile(path.join(out,'reverse-recipe-'+reverseRecipeExecutionIdentity(edit)+'.execution.json'),'not written',{flag:'wx'}),{code:'EEXIST'});
 for(const mutate of [r=>r.inventory[0].color='blue',r=>r.inventory[0].shape=[[0,0],[1,0]],r=>r.insertionOrder.reverse(),r=>r.board.gates[0].offset++]){const r=structuredClone(original);mutate(r);assert.notEqual(reverseRecipeExecutionIdentity(r),identity);}
 const source=await fs.readFile(SELF,'utf8');assert(source.indexOf("assert(!await exists(recipeFile)")<source.indexOf('factory.beginReverseStockConstruction'));assert(source.includes("await outputFile(recipeFile,"));assert(source.includes('allowed.push(trackedFile(constructorRoot,recipeFile))'));
 passed=true;
});
test.after(async()=>{const toolBindings={},c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(c.metafile.inputs))toolBindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 const prior=await d('deliverables/daily-formal-v4-20261008/proof/reverse-fixed-stock-task-private-03/report.json');
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:passed?'REVERSE_FIXED_STOCK_STABLE_RECIPE_LOCK_PASS':'INCOMPLETE',errors:passed?[]:['Test incomplete'],tests:1,priorModelQualification:prior,existingModelGroupsReused:4,newModelRuns:0,newReplayCalls:0,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,syntheticFilesystemLockOnly:true,toolBindings,fileBindings:{...toolBindings,[(await d('tools/daily-challenge/formal-v4/reverse-fixed-stock-lock.test.mjs')).path]:(await d('tools/daily-challenge/formal-v4/reverse-fixed-stock-lock.test.mjs')).sha256},factoryUnchanged:await d(FACTORY)},null,2)+'\n',{flag:'wx'});
});
