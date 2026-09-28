import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const digest=text=>createHash('sha256').update(text).digest('hex');
const readDefault=file=>fs.readFileSync(file,'utf8');
const applyPattern=/^apply(Native)?Remake(\d+)to(\d+)$/;
const idsPattern=/^(?:NATIVE_REMAKE|REMADE_)(\d+)_(\d+)_IDS$/;
const exported=node=>node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword);
function parse(file,text){
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`Invalid TypeScript syntax: ${file}`);
 return source;
}
function declarations(source){
 return source.statements.filter(ts.isVariableStatement).flatMap(statement=>
  statement.declarationList.declarations.filter(d=>ts.isIdentifier(d.name)).map(declaration=>({statement,declaration,name:declaration.name.text})));
}
function unwrap(expression){while(ts.isParenthesizedExpression(expression))expression=expression.expression;return expression;}
function readonlyLiteral(declaration,file){
 const annotation=declaration.type;
 const typedReadonly=annotation&&ts.isTypeOperatorNode(annotation)&&annotation.operator===ts.SyntaxKind.ReadonlyKeyword
  &&ts.isArrayTypeNode(annotation.type)&&annotation.type.elementType.kind===ts.SyntaxKind.NumberKeyword;
 let value=declaration.initializer;assert(value,`Missing IDs initializer: ${file}`);
 value=unwrap(value);
 const constAssertion=ts.isAsExpression(value)&&ts.isTypeReferenceNode(value.type)
  &&ts.isIdentifier(value.type.typeName)&&value.type.typeName.text==='const';
 assert(typedReadonly||constAssertion,`IDs must be readonly number[] or an as-const literal: ${file}`);
 if(constAssertion)value=unwrap(value.expression);
 assert(ts.isArrayLiteralExpression(value),`IDs must be a direct numeric array literal: ${file}`);
 return value.elements.map(element=>{
  assert(ts.isNumericLiteral(element)&&/^\d+$/.test(element.text),`IDs must contain decimal integer literals only: ${file}`);
  const id=Number(element.text);assert(Number.isSafeInteger(id));return id;
 });
}

/** Discover acceptance from the formal campaign pipeline, never drawing policy.
 * readText is injectable only to qualify this parser against isolated fixtures.
 * No TypeScript from a discovered module is evaluated by this helper.
 */
export function discoverNativeRemakeGroups({levelsPath='src/core/levels.ts',readText=readDefault}={}){
 const bindings={},read=file=>{const text=readText(file);assert.equal(typeof text,'string');bindings[file]=digest(text);return text;};
 const source=parse(levelsPath,read(levelsPath)),imports=[];
 for(const statement of source.statements){
  if(!ts.isImportDeclaration(statement)||!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings))continue;
  for(const specifier of statement.importClause.namedBindings.elements){
   const applyName=(specifier.propertyName??specifier.name).text,match=applyPattern.exec(applyName);if(!match)continue;
   assert(!statement.importClause.isTypeOnly&&!specifier.isTypeOnly,'A formal remake must be a value import');
   assert(ts.isStringLiteral(statement.moduleSpecifier));
   const from=Number(match[2]),to=Number(match[3]),moduleName=`${match[1]?'nativeRemake':'remake'}${from}to${to}`;
   assert(from>=31&&to<=200&&from<=to,`Invalid campaign range: ${applyName}`);
   assert([`./${moduleName}`,`./${moduleName}.ts`].includes(statement.moduleSpecifier.text),`Apply import/file range mismatch: ${applyName}`);
   const modulePath=path.posix.join(path.posix.dirname(levelsPath.replaceAll('\\','/')),moduleName+'.ts');
   imports.push({modulePath,applyName,localName:specifier.name.text,from,to});
  }
 }
 assert(imports.length>0,'No formal native remake imports discovered');
 assert.equal(new Set(imports.map(group=>group.modulePath)).size,imports.length,'Duplicate remake module import');
 assert.equal(new Set(imports.map(group=>group.localName)).size,imports.length,'Duplicate remake local name');
 const vars=new Map(declarations(source).map(row=>[row.name,row.declaration.initializer]));
 assert(vars.has('LEVELS'),'Missing final LEVELS initializer');
 const reached=new Map(),visited=new Set(),locals=new Set(imports.map(group=>group.localName));
 function trace(input){
  if(!input)return;const expression=unwrap(input);
  if(ts.isIdentifier(expression)){
   assert(!visited.has(expression.text),`Cycle in final LEVELS stage chain: ${expression.text}`);
   visited.add(expression.text);trace(vars.get(expression.text));return;
  }
  if(ts.isCallExpression(expression)&&ts.isPropertyAccessExpression(expression.expression)&&expression.expression.name.text==='map'){
   const callback=expression.arguments[0];
   if(callback&&ts.isIdentifier(callback)&&locals.has(callback.text)){
    assert.equal(expression.arguments.length,1,'A formal remake stage must be a direct one-callback map');
    reached.set(callback.text,(reached.get(callback.text)??0)+1);
   }
   trace(expression.expression.expression);
  }
 }
 trace(vars.get('LEVELS'));
 const owners=new Map(),groups=[];
 for(const group of imports){
  assert.equal(reached.get(group.localName),1,`Imported remake must occur exactly once in final LEVELS stage chain: ${group.applyName}`);
  const module=parse(group.modulePath,read(group.modulePath));
  const lists=declarations(module).filter(row=>exported(row.statement)&&idsPattern.test(row.name));
  assert.equal(lists.length,1,`Expected one exported remake IDS constant: ${group.modulePath}`);
  const {statement,declaration,name:idsName}=lists[0],range=idsPattern.exec(idsName);
  assert(statement.declarationList.flags&ts.NodeFlags.Const,'Remake IDS export must be const');
  assert.equal(Number(range[1]),group.from,'IDS export range start differs from module filename');
  assert.equal(Number(range[2]),group.to,'IDS export range end differs from module filename');
  const ids=readonlyLiteral(declaration,group.modulePath);
  for(const id of ids){
   assert(id>=group.from&&id<=group.to,`ID ${id} outside module filename range ${group.from}–${group.to}`);
   assert(!owners.has(id),`Duplicate or overlapping accepted ID ${id}: ${owners.get(id)} / ${group.modulePath}`);
   owners.set(id,group.modulePath);
  }
  groups.push({...group,idsName,ids:[...ids].sort((a,b)=>a-b)});
 }
 groups.sort((a,b)=>a.from-b.from||a.to-b.to);
 return {groups,ids:[...owners.keys()].sort((a,b)=>a-b),files:Object.keys(bindings).sort(),bindings,
  source:'Final LEVELS map chain, named numeric remake imports, and each module’s readonly literal accepted IDs; independent of formalBlockShapes'};
}

export function assertNativeRemakeInputsUnchanged(discovery,{readText=readDefault}={}){
 for(const [file,expected]of Object.entries(discovery.bindings))assert.equal(digest(readText(file)),expected,`Concurrent formal remake source change: ${file}`);
}
