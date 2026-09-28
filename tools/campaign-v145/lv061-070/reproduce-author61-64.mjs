import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {loadApi} from '../../remake21to30-v120.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';
const [mode,file]=process.argv.slice(2),baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const mutable=['blocks','gates','shutters','generators','difficulty','preservedMoveTarget'];
if(mode==='capture'){
 const c=JSON.parse(fs.readFileSync(file)),base=baseline.levels[c.level.id-1].level;
 const rest=o=>Object.fromEntries(Object.entries(o).filter(([k])=>!mutable.includes(k)));
 assert.deepEqual(rest(c.level),rest(base));
 const recipe={id:c.level.id,seed:c.seed,attempts:c.attempts,constructorSearchParametersHistoricalOnly:true,reproductionAuthority:'realized construction recipe plus preserved baseline; exact level SHA checked below',candidateFile:file,candidateFileSha256:digest(fs.readFileSync(file)),baselineSha256:digest(base),levelSha256:digest(c.level),patch:Object.fromEntries(mutable.filter(k=>Object.hasOwn(c.level,k)).map(k=>[k,c.level[k]])),drags:c.drags,routeSha256:digest(c.drags),source:c.source,adaptations:c.adaptations,sourceEvidence:c.sourceEvidence};
 const out=`${root}/construction${c.level.id}-recipe.json`;fs.writeFileSync(out,JSON.stringify(recipe,null,2)+'\n',{flag:'wx'});console.log(out);
}else if(mode==='reproduce'){
 const recipe=JSON.parse(fs.readFileSync(file)),base=baseline.levels[recipe.id-1].level;assert.equal(digest(base),recipe.baselineSha256);
 const level=structuredClone(base);for(const k of mutable)delete level[k];Object.assign(level,recipe.patch);assert.equal(digest(level),recipe.levelSha256);assert.equal(digest(recipe.drags),recipe.routeSha256);
 const {api}=await loadApi();api.validateLevel(level);const art=api.auditCandidateBlockArt(level);assert(art.passed);const replay=api.replayRevisedRoute(level,recipe.drags);assert(replay.valid&&replay.complete);
 const out=`${root}/reproduction${recipe.id}-recipe-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({recipe:file,recipeSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(recipe.drags),matched:true,art,replay,level},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,levelSha256:digest(level),matched:true,U:replay.nonClearingDrags,drags:recipe.drags.length}));
}else throw Error('capture candidate.json | reproduce construction-recipe.json');
