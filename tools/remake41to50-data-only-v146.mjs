import assert from 'node:assert/strict';import ts from 'typescript';
const ranges={'src/core/remake101to110.ts':[101,110],'src/core/remake111to120.ts':[111,120]};
export function verifyAdditionalDataModule(file,source){
 const range=ranges[file];assert(range,'Only explicitly reviewed additional stages');const stem=range.join('_'),name=`${range[0]}to${range[1]}`,tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 assert.deepEqual(tree.parseDiagnostics,[]);assert.equal(tree.statements.length,4);
 const [imp,ids,rows,apply]=tree.statements;assert(ts.isImportDeclaration(imp)&&imp.importClause?.isTypeOnly&&imp.moduleSpecifier.text==='./types');assert.equal(imp.importClause.namedBindings?.getText(tree),'{LevelSpec}');
 const declaration=(s,n)=>{assert(ts.isVariableStatement(s));assert.equal(s.declarationList.flags&ts.NodeFlags.Const,ts.NodeFlags.Const);assert.equal(s.declarationList.declarations.length,1);const d=s.declarationList.declarations[0];assert.equal(d.name.getText(tree),n);return d.initializer;};
 const idList=JSON.parse(declaration(ids,`REMADE_${stem}_IDS`).getText(tree)),reviewed=JSON.parse(declaration(rows,'reviewed').getText(tree));
 assert(Array.isArray(idList)&&new Set(idList).size===idList.length&&idList.every(id=>Number.isInteger(id)&&id>=range[0]&&id<=range[1]));
 assert.deepEqual(Object.keys(reviewed).map(Number).sort((a,b)=>a-b),[...idList].sort((a,b)=>a-b));for(const id of idList)assert.equal(reviewed[id].id,id);
 const arrow=declaration(apply,`applyRemake${name}`);assert(ts.isArrowFunction(arrow)&&!arrow.modifiers?.length&&arrow.parameters.length===1&&arrow.parameters[0].name.getText(tree)==='level'&&!arrow.parameters[0].initializer&&!arrow.parameters[0].dotDotDotToken);assert.equal(arrow.body.getText(tree).replace(/\s/g,''),'reviewed[level.id]??level');
 assert(ids.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&apply.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));assert(!rows.modifiers?.length);
 return {path:file,ids:idList,range,pureDataStage:true};
}
