import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
export const OUT='deliverables/daily-formal-v2-20261007/baseline';
export const stable=v=>v===undefined?undefined:Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
export const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');
export const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export async function freshRuntime(){
 const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
 const b=await build({stdin:{contents:`export * from './src/core/dailyChallenge'; export * from './src/core/dailyChallengeVariant'; export * from './src/core/revisedLevelSearch'; export * from './src/core/revisedRepositionFloor'; export {PuzzleModel,validateLevel} from './src/core/PuzzleModel'; export {LEVELS} from './src/core/levels'; export {FORMAL_DAILY_CHALLENGE_CATALOG} from './src/core/formalDailyChallengeData';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm'});
 fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(`${OUT}/baseline-runtime.mjs`,b.outputFiles[0].text);
 const bindings=Object.fromEntries(Object.keys(b.metafile.inputs).filter(x=>x!=='<stdin>').map(file=>[file,sha(fs.readFileSync(file,'utf8'))]));
 write(`${OUT}/input-bindings.json`,{createdAt:new Date().toISOString(),activeRulesVersion:lock.activeVersion,bindings,bundleSha256:sha(b.outputFiles[0].text),sourceFrozenForEvidence:true});
 return await import(path.resolve(`${OUT}/baseline-runtime.mjs`).replaceAll('\\','/').replace(/^([A-Z]):/i,'file:///$1:')+`?t=${Date.now()}`);
}
export function saveSummary(rows){const counts={};for(const r of rows)counts[r.status]=(counts[r.status]??0)+1;write(`${OUT}/manifest.json`,{schemaVersion:1,createdAt:new Date().toISOString(),scope:'450 actual production daily clones before regeneration; every route/lower decision binds exact frozen level',ruleVersion:'1.152.0',difficultyBands:{1:[16,20],2:[21,30],3:[31,null]},counts,rows,sourceMutated:false,playerSaveTouched:false,published:false});return counts;}
