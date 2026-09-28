import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
import {digest} from './revised-preview-validation-v160.mjs';
// Only plain typed JSON lookup modules are eligible. A matching filename alone
// never permits an executable initializer, extra statement or runtime change.
export function inspectDisjointData(file,requestedIds,previousText){
 const match=/^src\/core\/(remake(\d+)to(\d+)|nativeRemake31to40)\.ts$/.exec(file);assert(match,`Not a qualified data module: ${file}`);
 const first=Number(match[2]??31),last=Number(match[3]??40);
 function parse(text){const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0);assert.equal(tree.statements.length,4);
 const [imp,...rest]=tree.statements;assert(ts.isImportDeclaration(imp)&&imp.importClause?.isTypeOnly);assert.equal(imp.moduleSpecifier.text,'./types');assert.equal(imp.importClause.namedBindings.elements.length,1);assert.equal(imp.importClause.namedBindings.elements[0].name.text,'LevelSpec');
 const vars={};for(const statement of rest){assert(ts.isVariableStatement(statement));assert(statement.declarationList.flags&ts.NodeFlags.Const);assert.equal(statement.declarationList.declarations.length,1);const d=statement.declarationList.declarations[0];assert(ts.isIdentifier(d.name)&&d.initializer);assert(!Object.hasOwn(vars,d.name.text));vars[d.name.text]=d.initializer.getText(tree);}
 const idsName=first===31?'NATIVE_REMAKE31_40_IDS':`REMADE_${first}_${last}_IDS`,applyName=first===31?'applyNativeRemake31to40':`applyRemake${first}to${last}`;
 assert.deepEqual(Object.keys(vars).sort(),[idsName,'reviewed',applyName].sort());assert.equal(vars[applyName].replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');
 const ids=JSON.parse(vars[idsName]),reviewed=JSON.parse(vars.reviewed);assert(Array.isArray(ids));assert.equal(new Set(ids).size,ids.length);assert(ids.every(id=>Number.isInteger(id)&&id>=first&&id<=last));assert.deepEqual(Object.keys(reviewed).map(Number).sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));for(const id of ids)assert.equal(reviewed[id].id,id);
 return{ids,reviewed};}
 const text=fs.readFileSync(file,'utf8'),{ids,reviewed}=parse(text),overlap=requestedIds.filter(id=>id>=first&&id<=last);
 if(overlap.length){assert(typeof previousText==='string','Same-batch changes require the exact captured module');const old=parse(previousText);for(const id of overlap){assert.equal(ids.includes(id),old.ids.includes(id));assert.deepEqual(reviewed[id],old.reviewed[id],`Tested level ${id} changed in a shared data module`);}}
 return{file,currentSha256:digest(text),verifiedPureData:true,ids,requestedIds,disjointScope:overlap.length===0,exactTestedEntriesPreserved:overlap};
}
