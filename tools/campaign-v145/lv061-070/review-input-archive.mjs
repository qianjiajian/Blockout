import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {digest} from '../../revised-preview-validation-v160.mjs';

// Preserve the exact local inputs of a fresh proof. Ongoing authoring may later
// change a tool, so evidence points to immutable copies as well as live paths.
export function archiveReviewInputs(root,files){
 const bindings={},copies={};
 function bind(file){
  const absolute=path.resolve(file),relative=path.relative(process.cwd(),absolute).replaceAll('\\','/');assert(!relative.startsWith('../')&&!path.isAbsolute(relative));if(Object.hasOwn(bindings,relative))return;
  const bytes=fs.readFileSync(absolute),copy=`${root}/inputs/${relative}`;bindings[relative]=digest(bytes);copies[relative]=copy;fs.mkdirSync(path.dirname(copy),{recursive:true});fs.writeFileSync(copy,bytes,{flag:'wx'});
  if(/\.[cm]?[jt]s$/.test(relative)){const parsed=ts.createSourceFile(relative,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);for(const statement of parsed.statements){if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;const spec=statement.moduleSpecifier;if(spec&&ts.isStringLiteral(spec)&&/^\..*\.[cm]?[jt]s$/.test(spec.text))bind(path.resolve(path.dirname(absolute),spec.text));}}
 }
 files.forEach(bind);
 return{root,bindings,copies,assertUnchanged(){const changed=Object.entries(bindings).filter(([f,h])=>digest(fs.readFileSync(f))!==h).map(([f])=>f);assert.deepEqual(changed,[],'Proof inputs changed during verification');},serializable(){return{root,bindings,copies};}};
}
