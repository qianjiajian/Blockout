import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {canonicalHistoryPath,sha256} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
const out=process.env.CANONICAL_PATH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const context={path:'deliverables/daily-formal-v4-20261008/design/first-clear-six-source-twelve-context-01/context.json',sha256:'3edb1eabca03e11a8d327c23506081bf11ac65a0df45e658f2a29f4d082f52ba'};
const bytes=await fs.readFile(context.path);assert.equal(sha256(bytes),context.sha256);const currentScope=JSON.parse(bytes).historyScope,evidence=[];
const check=(name,fn)=>test(name,async()=>{evidence.push({name,...await fn(),passed:true});});
function equalPaths(scope,paths){const compiled=compileCanonicalHistoryPath(scope);for(const p of paths)assert.equal(compiled.canonical(p),canonicalHistoryPath(p,scope),p);return compiled;}
check('actual seven-root scope strings: aliases, boundary escapes, source separation and invalid inputs',()=>{
 const paths=[];for(const root of currentScope.roots)for(const a of [root.physicalPath,...root.aliases])paths.push(a,a+'/member.json',a+'/identities/a.blocked.json',a+'/../outside.json',a+'-unrelated/member.json',a.toUpperCase()+'\\a\\..\\b.lock',path.win32.relative(currentScope.baseDirectory,a)+'/member.json');
 paths.push('src/game/a.ts','C:/Users/Administrator/Documents/ChatGPT/Block Out!/src/game/a.ts','C:relative.json','D:relative.json','\\root-relative.json','../../outside.json');
 const c=equalPaths(currentScope,paths);assert.notEqual(c.canonical(paths.at(-6)),c.canonical(paths.at(-5)));
 for(const x of ['',null,undefined,17,{}]){assert.throws(()=>canonicalHistoryPath(x,currentScope));assert.throws(()=>c.canonical(x));}
 assert.throws(()=>compileCanonicalHistoryPath({...currentScope,baseDirectory:'relative'}));return{pathCases:paths.length,stats:c.stats()};
});
check('preserve longest alias, stable ties, UNC/drive-root/trailing-slash and one-pass behavior',()=>{
 const scopes=[{baseDirectory:'C:/base',roots:[{id:'a',physicalPath:'C:/physical',aliases:['C:/shared','C:/shared/long']},{id:'b',physicalPath:'D:/other',aliases:['C:/shared/long','C:/physical']}]},
  {baseDirectory:'C:/base',roots:[{id:'drive',physicalPath:'D:/',aliases:['C:/']},{id:'unc',physicalPath:'\\\\server\\share\\',aliases:['C:/unc','\\\\alias\\share\\']},{id:'unicode',physicalPath:'D:/İ',aliases:['C:/Å']}]},
  {baseDirectory:'C:/base',roots:[{id:'trailing',physicalPath:'D:/target/',aliases:['C:/alias/']}]},{baseDirectory:'C:/base',roots:[]}];
 const paths=['C:/shared','C:/shared/long/a','C:/shared/longer/a','C:/physical/a','C:/unc/a','C:/a','C:/','C:/alias/a','C:/alias/../escaped','C:/Å/a','\\\\alias\\share\\a','\\\\server\\share\\a','D:/a','./a'];
 for(const s of scopes)equalPaths(s,paths);return{syntheticScopes:scopes.length,pathCases:scopes.length*paths.length,scopeAuthorityGranted:false};
});
check('immutable scope copy, explicit replacement, bounded FIFO and manual clearing',()=>{
 const input={baseDirectory:'C:/base',roots:[{id:'a',physicalPath:'C:/old',aliases:['C:/alias']}]},c=compileCanonicalHistoryPath(input,{maximumMemoEntries:2});
 const initial=structuredClone(input);input.roots[0].physicalPath='D:/new';input.roots[0].aliases.push('D:/extra');input.baseDirectory='D:/base';
 assert.equal(c.canonical('C:/alias/a'),canonicalHistoryPath('C:/alias/a',initial));assert.notEqual(c.canonical('C:/alias/a'),compileCanonicalHistoryPath(input).canonical('C:/alias/a'));
 assert.throws(()=>c.scope.roots[0].aliases.push('C:/forged'));c.canonical('C:/alias/b');c.canonical('C:/alias/c');assert.equal(c.stats().entries,2);assert(c.stats().evictions>0);
 c.clearMemo();assert.equal(c.stats().entries,0);assert.equal(c.canonical('C:/alias/a'),canonicalHistoryPath('C:/alias/a',initial));
 const noMemo=compileCanonicalHistoryPath(initial,{maximumMemoEntries:0});for(let i=0;i<3;i++)assert.equal(noMemo.canonical('C:/alias/a'),canonicalHistoryPath('C:/alias/a',initial));assert.equal(noMemo.stats().hits,0);return{stats:c.stats(),noMemoStats:noMemo.stats()};
});
check('in-memory microbenchmark: same workload, no ledger listing or file reads',()=>{
 const inputs=[];for(const r of currentScope.roots)for(const alias of [r.physicalPath,...r.aliases])for(let i=0;i<128;i++)inputs.push(alias+`/identities/synthetic-${i}.blocked.json`);
 inputs.push('src/game/ColorEscapeGame.ts','C:/outside/design/reference.json');const expected=inputs.map(p=>canonicalHistoryPath(p,currentScope));
 const compiledOnly=compileCanonicalHistoryPath(currentScope,{maximumMemoEntries:0}),cached=compileCanonicalHistoryPath(currentScope);
 for(let i=0;i<inputs.length;i++){assert.equal(compiledOnly.canonical(inputs[i]),expected[i]);assert.equal(cached.canonical(inputs[i]),expected[i]);}cached.clearMemo();
 const rounds=10,bench=fn=>{let checksum=0;const start=performance.now();for(let k=0;k<rounds;k++)for(const p of inputs)checksum+=fn(p).length;return{milliseconds:performance.now()-start,calls:rounds*inputs.length,checksum};};
 const original=bench(p=>canonicalHistoryPath(p,currentScope)),compiled=bench(compiledOnly.canonical),memo=bench(cached.canonical);assert.equal(compiled.checksum,original.checksum);assert.equal(memo.checksum,original.checksum);
 const stats=cached.stats();return{inputCount:inputs.length,rounds,original,compiled,memo,speedupCompiled:original.milliseconds/compiled.milliseconds,speedupMemo:original.milliseconds/memo.milliseconds,stats,hitFraction:stats.hits/stats.calls,
  limitations:'Synthetic repeated path strings from the actual scope; not an end-to-end checkpoint/prepare timing or a filesystem validation.'};
});
test.after(async()=>{const fileBindings={[context.path]:context.sha256};for(const p of ['tools/daily-challenge/formal-v4/canonical-history-path-compiled.mjs','tools/daily-challenge/formal-v4/canonical-history-path-compiled.test.mjs','tools/daily-challenge/formal-v4/sealed-history-contract.mjs'])fileBindings[p]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===4?'CANONICAL_HISTORY_PATH_COMPILED_EQUIVALENCE_PASS':'INCOMPLETE',tests:evidence.length,evidence,errors:[],fileBindings,newSearches:0,newConstructions:0,newLedgerClaims:0,newHistoryScans:0,existingToolsChanged:false,productionIntegration:false},null,2)+'\n',{flag:'wx'});});
