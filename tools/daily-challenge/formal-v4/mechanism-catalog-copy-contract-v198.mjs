import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';

// Source-only comparison. No runtime, level, model, search or replay is loaded.
export const CATALOG_COPY_FILES_V198=Object.freeze({
 oldCatalog:{path:'deliverables/daily-formal-v4-20261008/frozen-workspace-4588/src/core/mechanismCatalog.ts',sha256:'fae7a5324f73b9c52ca4e5758364098e2773100d6ae111f1f890f9d0ab0d51bc'},
 newCatalog:{path:'src/core/mechanismCatalog.ts',sha256:'50cefb5cd244b138054af64928e0595b200378a293dc4db76480a9e1f2f179cb'},
});
const sha=s=>createHash('sha256').update(s).digest('hex');
const IDS=['generator','axis-block','key-lock','star','flip-door','colored-grid','bomb','shutter','layered-lift','color-exit','irregular-block','irregular-board','frozen-exit','numeric-ice','multilayer-shell'];
const KEYS=['id','title','unlockLevel','atlasIndex','group','effect'];
function inspect(text){
 assert.equal(typeof text,'string');
 const sf=ts.createSourceFile('mechanismCatalog.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(sf.parseDiagnostics.length,0,'Catalog must parse without diagnostics');
 const arrays=[],allEffectAssignments=[];
 function visit(n){
  if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='MECHANISM_GUIDE_ENTRIES'){
   assert(n.initializer&&ts.isAsExpression(n.initializer),'Expected original as-const array');
   assert(ts.isArrayLiteralExpression(n.initializer.expression));arrays.push(n.initializer.expression);
  }
  if(ts.isPropertyAssignment(n)&&n.name.getText(sf)==='effect')allEffectAssignments.push(n);
  ts.forEachChild(n,visit);
 }
 visit(sf);assert.equal(arrays.length,1);assert.equal(arrays[0].elements.length,15);assert.equal(allEffectAssignments.length,15);
 const effects=[],rows=arrays[0].elements.map((obj,index)=>{
  assert(ts.isObjectLiteralExpression(obj));assert.equal(obj.properties.length,6);const row={},nodes=[];
  for(const p of obj.properties){
   assert(ts.isPropertyAssignment(p)&&ts.isIdentifier(p.name),'Only original named assignments allowed');
   const key=p.name.text;assert(KEYS.includes(key)&&!Object.hasOwn(row,key),'Unknown/duplicate catalog property');
   if(key==='unlockLevel'||key==='atlasIndex'){assert(ts.isNumericLiteral(p.initializer));row[key]=Number(p.initializer.text);}
   else{assert(ts.isStringLiteral(p.initializer),'Catalog text must remain a literal');row[key]=p.initializer.text;}
   if(key==='effect'){assert(allEffectAssignments.includes(p));nodes.push({index,start:p.initializer.getStart(sf),end:p.initializer.end,literal:p.initializer.getText(sf),text:p.initializer.text});}
  }
  assert.deepEqual(Object.keys(row).sort(),[...KEYS].sort());assert.equal(row.id,IDS[index]);assert.equal(nodes.length,1);
  effects.push({...nodes[0],id:row.id});return row;
 });
 let normalized=text;for(const e of [...effects].reverse())normalized=normalized.slice(0,e.start)+'"__ONLY_EFFECT_TEXT__"'+normalized.slice(e.end);
 return{effects,rows,normalized};
}

// Does not waive file pins. The caller binds the two exact complete sources.
// This pure function also supports negative tests of non-text changes.
export function assertMechanismCatalogCopySourcesV198(oldText,newText){
 const a=inspect(oldText),b=inspect(newText);
 assert.equal(a.normalized,b.normalized,'Any change outside the 15 exact effect literals is forbidden');
 const withoutEffect=rows=>rows.map(({effect,...rest})=>rest);
 assert.deepEqual(withoutEffect(a.rows),withoutEffect(b.rows));
 assert(a.effects.every((e,i)=>e.id===b.effects[i].id&&e.text!==b.effects[i].text),'Exactly all 15 effects changed');
 let forward=oldText,backward=newText;
 for(const e of [...a.effects].reverse())forward=forward.slice(0,e.start)+b.effects[e.index].literal+forward.slice(e.end);
 for(const e of [...b.effects].reverse())backward=backward.slice(0,e.start)+a.effects[e.index].literal+backward.slice(e.end);
 assert.equal(forward,newText);assert.equal(backward,oldText);
 assert(Buffer.from(forward,'utf8').equals(Buffer.from(newText,'utf8')));assert(Buffer.from(backward,'utf8').equals(Buffer.from(oldText,'utf8')));
 return{changedLiteralCount:15,nonEffectRows:withoutEffect(a.rows),completeSourceReconstructionBothDirections:true,
  outsideEffectLiteralsByteIdentical:true,normalizedSha256:sha(a.normalized),
  reconstructedCurrentSha256:sha(forward),reconstructedOldSha256:sha(backward),
  exactReplacements:a.effects.map((e,i)=>({id:e.id,oldText:e.literal,newText:b.effects[i].literal,oldStart:e.start,oldEnd:e.end,newStart:b.effects[i].start,newEnd:b.effects[i].end}))};
}

export function checkMechanismCatalogCopyNegativesV198(oldText,newText){
 const replace=(from,to)=>{assert.equal(newText.split(from).length,2);return newText.replace(from,to);};
 const mutations=[
  ['unlock-level-change',replace('unlockLevel: 35','unlockLevel: 36')],
  ['persistent-id-change',replace('id: "generator"','id: "generator-modified"')],
  ['sort-function-change',replace('left.unlockLevel - right.unlockLevel','left.unlockLevel + right.unlockLevel')],
  ['extra-effect-property',replace('id: "generator",','effect: "extra", id: "generator",')],
  ['extra-effect-object',newText+'\nconst unexpected = { effect: "extra" };\n'],
  ['effect-expression',replace('effect: "固定落点全空时，按顺序生成下一块；被挡住时等待。"','effect: String("固定落点全空时，按顺序生成下一块；被挡住时等待。")')],
 ];
 const rows=mutations.map(([name,mutated])=>{assert.throws(()=>assertMechanismCatalogCopySourcesV198(oldText,mutated),undefined,name);return{name,rejected:true};});
 // A different UI string would pass the structural scope but must fail the
 // pinned complete-file pair. Do not accept arbitrary future copy changes.
 const altered=replace('固定落点全空时，按顺序生成下一块；被挡住时等待。','不在本次审查范围内的另一条说明。');
 assert.notEqual(sha(altered),CATALOG_COPY_FILES_V198.newCatalog.sha256);rows.push({name:'unreviewed-effect-text-rejected-by-complete-file-pin',rejected:true});
 return rows;
}

export function extractNamedSourceDeclarationsV198(text,names){
 const sf=ts.createSourceFile('source.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(sf.parseDiagnostics.length,0);
 const out={};function visit(n){if((ts.isVariableDeclaration(n)||ts.isFunctionDeclaration(n))&&names.includes(n.name?.getText(sf))){const name=n.name.getText(sf);assert(!Object.hasOwn(out,name));out[name]=n.getText(sf).replaceAll('\r\n','\n');}ts.forEachChild(n,visit);}visit(sf);
 assert.deepEqual(Object.keys(out).sort(),[...names].sort());return out;
}
