import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {digest} from '../../revised-preview-validation-v160.mjs';

function parsedSource(file,text,statementCount){
 const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 assert.equal(tree.parseDiagnostics.length,0,`${file} must parse cleanly`);
 assert.equal(tree.statements.length,statementCount,`${file} has an unexpected top-level statement`);
 return tree;
}

function typeOnlyLevelSpecImport(statement){
 assert(ts.isImportDeclaration(statement)&&statement.importClause?.isTypeOnly);
 assert.equal(statement.moduleSpecifier.text,'./types');
 assert(ts.isNamedImports(statement.importClause.namedBindings));
 assert.equal(statement.importClause.namedBindings.elements.length,1);
 const imported=statement.importClause.namedBindings.elements[0];
 assert.equal(imported.name.text,'LevelSpec');
 assert.equal(imported.propertyName,undefined);
}

function exportedConst(tree,statement,name){
 assert(ts.isVariableStatement(statement));
 assert(statement.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword));
 assert(statement.declarationList.flags&ts.NodeFlags.Const);
 assert.equal(statement.declarationList.declarations.length,1);
 const declaration=statement.declarationList.declarations[0];
 assert(ts.isIdentifier(declaration.name));
 assert.equal(declaration.name.text,name);
 assert(declaration.initializer);
 return declaration;
}

function literalRecords(tree,declaration,first,last,asConst=false){
 let expression=declaration.initializer;
 if(asConst){
  assert(ts.isAsExpression(expression));
  assert.equal(expression.type.getText(tree),'const');
  expression=expression.expression;
 }
 assert(ts.isArrayLiteralExpression(expression));
 // A JSON literal excludes spreads, calls, getters and any other runtime work.
 const records=JSON.parse(expression.getText(tree));
 assert(Array.isArray(records));
 const ids=records.map(record=>{
  assert(record&&typeof record==='object'&&!Array.isArray(record));
  assert(Number.isInteger(record.id)&&record.id>=first&&record.id<=last);
  return record.id;
 });
 assert.equal(new Set(ids).size,ids.length);
 return {records,ids};
}

function exactPriorEntries(oldRecords,currentRecords){
 for(const old of oldRecords){
  const current=currentRecords.find(record=>record.id===old.id);
  assert.deepEqual(current,old,`Previously present Lv${old.id} record changed`);
 }
}

export function inspectDisjoint211to220Data(file,previousText,currentText=fs.readFileSync(file,'utf8')){
 assert.equal(file,'src/core/formal211to220Data.ts');
 const parse=text=>{
  const tree=parsedSource(file,text,4);
  const [imp,levelsStatement,evidenceStatement,getterStatement]=tree.statements;
  typeOnlyLevelSpecImport(imp);
  const levelsDeclaration=exportedConst(tree,levelsStatement,'FORMAL_211_220_LEVELS');
  assert.equal(levelsDeclaration.type?.getText(tree),'readonly LevelSpec[]');
  const levels=literalRecords(tree,levelsDeclaration,211,220);
  const evidenceDeclaration=exportedConst(tree,evidenceStatement,'FORMAL_211_220_EVIDENCE');
  assert.equal(evidenceDeclaration.type,undefined);
  const evidence=literalRecords(tree,evidenceDeclaration,211,220,true);
  const getterDeclaration=exportedConst(tree,getterStatement,'getFormal211to220LevelStrict');
  assert(ts.isArrowFunction(getterDeclaration.initializer));
  assert.deepEqual([...levels.ids].sort((a,b)=>a-b),[...evidence.ids].sort((a,b)=>a-b));
  for(const item of evidence.records){
   assert.match(item.levelSha256,/^[a-f0-9]{64}$/);
   assert.match(item.evidence,/^deliverables\/continue211-220-20260930\//);
  }
  return {importText:imp.getText(tree),getterText:getterStatement.getText(tree),
   levels:levels.records,evidence:evidence.records,ids:levels.ids};
 };
 const old=parse(previousText),current=parse(currentText);
 assert.equal(current.importText,old.importText,'Lv211–220 type import changed');
 assert.equal(current.getterText,old.getterText,'Lv211–220 strict getter changed');
 exactPriorEntries(old.levels,current.levels);
 exactPriorEntries(old.evidence,current.evidence);
 return {path:file,accepted:true,verifiedPureData:true,disjointScope:true,
  unchangedImportAndGetter:true,exactExistingEntriesPreserved:true,levelIdsMatchEvidence:true,
  priorIds:old.ids,currentIds:current.ids,currentSha256:digest(currentText),
  verifier:'strict-ast-json-batch-211-220-v1',
  reason:'Only literal Lv211–220 records and their evidence changed; the type import, strict getter, existing entries and all Lv201–210 runtime inputs remain unchanged.'};
}

export function inspectDisjoint221to230Data(file,previousText,currentText=fs.readFileSync(file,'utf8')){
 assert.equal(file,'src/core/remake221to230Data.ts');
 const parse=text=>{
  const tree=parsedSource(file,text,2);
  const [imp,statement]=tree.statements;
  typeOnlyLevelSpecImport(imp);
  const declaration=exportedConst(tree,statement,'QUALIFIED_221_230_LEVELS');
  assert.equal(declaration.type?.getText(tree),'readonly LevelSpec[]');
  const levels=literalRecords(tree,declaration,221,230);
  return {importText:imp.getText(tree),ids:levels.ids};
 };
 const old=parse(previousText),current=parse(currentText);
 assert.equal(current.importText,old.importText,'Lv221–230 type import changed');
 return {path:file,accepted:true,verifiedPureData:true,disjointScope:true,
  priorIds:old.ids,currentIds:current.ids,currentSha256:digest(currentText),
  verifier:'strict-ast-json-batch-221-230-v1',
  reason:'Only literal Lv221–230 records changed; all Lv201–210 objects and shared runtime inputs remained byte-identical to the browser snapshot.'};
}
