import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {digest} from '../revised-preview-validation-v160.mjs';

// Specific continuity checks for v1.108 Lv200, v1.107 Lv182,
// and the later v1.106 Lv177/Lv180 pure-data additions.
// These are not permission to ignore arbitrary source changes.
export function checkConcurrent200(before,api){
 const files=['src/core/remake191to200.ts','src/core/levels.ts','src/game/formalBlockShapes.ts','src/core/remake181to190.ts','src/core/remake171to180.ts'];
 const raw=Object.fromEntries(files.map(p=>[p,fs.readFileSync(p,'utf8')]));
 const levelsBefore171=raw[files[1]].replace(/^import \{ applyRemake171to180 \} from '\.\/remake171to180';\r?\n/,'')
  .replace('export const LEVELS_BEFORE_171_180_REMAKE: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);')
  .replace(/export const LEVELS: LevelSpec\[\] = LEVELS_BEFORE_171_180_REMAKE.map\(applyRemake171to180\);\r?\n/,'');
 const levels=levelsBefore171.replace(/^import \{ applyRemake191to200 \} from '\.\/remake191to200';\r?\n/,'')
  .replace('export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);')
  .replace(/export const LEVELS: LevelSpec\[\] = LEVELS_BEFORE_191_200_REMAKE.map\(applyRemake191to200\);\r?\n/,'');
 assert.equal(levels,before.src[files[1]].raw,'Only the exact added pure-data stage is accepted');
 const artBefore171=raw[files[2]].replace(/^import \{ REMADE_171_180_IDS \} from '\.\.\/core\/remake171to180';\r?\n/,'').replace(' || REMADE_171_180_IDS.includes(levelId)','');
 const art=artBefore171.replace(/^import \{ REMADE_191_200_IDS \} from '\.\.\/core\/remake191to200';\r?\n/,'').replace(' || REMADE_191_200_IDS.includes(levelId)','');
 assert.equal(art,before.src[files[2]].raw,'Only the additional native-art membership is accepted');
 const parsed=ts.createSourceFile(files[0],raw[files[0]],ts.ScriptTarget.Latest,true),statements=parsed.statements;
 assert.equal(statements.length,4);assert(ts.isImportDeclaration(statements[0]));assert(statements[0].importClause.isTypeOnly);assert.equal(statements[0].moduleSpecifier.text,'./types');
 const decl=(index,name)=>{const stmt=statements[index];assert(ts.isVariableStatement(stmt));assert.equal(stmt.declarationList.declarations.length,1);const d=stmt.declarationList.declarations[0];assert.equal(d.name.getText(parsed),name);return d.initializer;};
 const ids191=JSON.parse(decl(1,'REMADE_191_200_IDS').getText(parsed));assert(ids191.includes(200)&&ids191.every(id=>Number.isInteger(id)&&id>=191&&id<=200));assert.deepEqual(ids191,[...new Set(ids191)].sort((a,b)=>a-b));
 const data=JSON.parse(decl(2,'reviewed').getText(parsed));assert.deepEqual(Object.keys(data).map(Number),ids191);
 assert.equal(decl(3,'applyRemake191to200').getText(parsed).replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');
 for(const id of ids191){assert.equal(data[id].id,id);api.validateLevel(data[id]);assert.equal(digest(api.LEVELS[id-1]),digest(data[id]));for(const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','parMoves','reward'])assert.deepEqual(data[id][k],before.levels[id-1].level[k]);assert.deepEqual(api.levelStarTargets(data[id]),before.levels[id-1].starTargets);}
 const parsed182=ts.createSourceFile(files[3],raw[files[3]],ts.ScriptTarget.Latest,true);let block182,ids182;
 for(const s of parsed182.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations){if(d.name.getText(parsed182)==='reviewed')block182=d.initializer.properties.find(p=>p.name.text==='182');if(d.name.getText(parsed182)==='REMADE_181_190_IDS')ids182=d.initializer;}
 assert(block182&&ids182);assert.deepEqual(JSON.parse(ids182.getText(parsed182)),[181,182,183,184,186,187,188,189,190]);assert.equal(raw[files[3]][block182.end],',');
 let inverse182=raw[files[3]].slice(0,block182.getFullStart())+raw[files[3]].slice(block182.end+1);
 inverse182=inverse182.replace('// Reviewed batch data: original eight under v1.47; 182/185 additions under v1.107.','// Independently reviewed v1.47 batch data; only listed levels are replaced.').replace('[181,182,183,184,186,187,188,189,190]','[181,183,184,186,187,188,189,190]');
 assert.equal(inverse182,before.src[files[3]].raw,'Only Lv182 literal, membership and accurate provenance comment added');
 const level182=JSON.parse(block182.initializer.getText(parsed182));assert.equal(digest(api.LEVELS[181]),digest(level182));
 for(const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','parMoves','reward'])assert.deepEqual(level182[k],before.levels[181].level[k]);
 assert.deepEqual(api.levelStarTargets(level182),before.levels[181].starTargets);
 const parsed171=ts.createSourceFile(files[4],raw[files[4]],ts.ScriptTarget.Latest,true);assert.equal(parsed171.statements.length,4);assert(ts.isImportDeclaration(parsed171.statements[0])&&parsed171.statements[0].importClause.isTypeOnly);assert.equal(parsed171.statements[0].moduleSpecifier.text,'./types');
 const decl171=(index,name)=>{const s=parsed171.statements[index];assert(ts.isVariableStatement(s));assert.equal(s.declarationList.declarations.length,1);const d=s.declarationList.declarations[0];assert.equal(d.name.getText(parsed171),name);return d.initializer;};
 const ids171=JSON.parse(decl171(1,'REMADE_171_180_IDS').getText(parsed171));assert(ids171.includes(177)&&ids171.includes(180)&&ids171.every(id=>Number.isInteger(id)&&id>=171&&id<=180));assert.deepEqual(ids171,[...new Set(ids171)].sort((a,b)=>a-b));
 const data171=JSON.parse(decl171(2,'reviewed').getText(parsed171));assert.deepEqual(Object.keys(data171).map(Number),ids171);
 assert.equal(decl171(3,'applyRemake171to180').getText(parsed171).replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');
 for(const id of ids171){assert.equal(data171[id].id,id);api.validateLevel(data171[id]);assert.equal(digest(api.LEVELS[id-1]),digest(data171[id]));for(const k of ['id','name','width','height','playable','blocked','seams','timeSeconds','parMoves','reward'])assert.deepEqual(data171[id][k],before.levels[id-1].level[k]);assert.deepEqual(api.levelStarTargets(data171[id]),before.levels[id-1].starTargets);}
 const inverse191Edits=decl(2,'reviewed').properties.filter(p=>p.name.text!=='200').map(p=>({start:p.getFullStart(),end:p.end+1,text:''}));for(const e of inverse191Edits)assert.equal(raw[files[0]][e.end-1],',');
 const ids191Node=decl(1,'REMADE_191_200_IDS');inverse191Edits.push({start:ids191Node.getStart(parsed),end:ids191Node.end,text:'[200]'});let before193Raw=raw[files[0]];for(const e of inverse191Edits.sort((a,b)=>b.start-a.start))before193Raw=before193Raw.slice(0,e.start)+e.text+before193Raw.slice(e.end);
 const result={passed:true,authorizedRules:[{version:'1.108.0',ids:ids191},{version:'1.107.0',ids:[182]},{version:'1.106.0',ids:ids171}],concurrentLevelIds:[...ids171,182,...ids191].sort((a,b)=>a-b),pureDataOnly:true,levelsStageInverseExact:true,artMembershipInverseExact:true,level182ModuleInverseExact:true,currentBindings:Object.fromEntries(files.map(p=>[p,digest(Buffer.from(raw[p]))])),before171SourceHashes:{[files[1]]:digest(Buffer.from(levelsBefore171)),[files[2]]:digest(Buffer.from(artBefore171))},before193ModuleHash:digest(Buffer.from(before193Raw)),currentLevel200:data[200],currentLevel200Sha256:digest(data[200]),currentLevel182:level182,currentLevel182Sha256:digest(level182),current171Data:data171,current191Data:data};
 for(const p of files)assert.equal(fs.readFileSync(p,'utf8'),raw[p]);return result;
}
