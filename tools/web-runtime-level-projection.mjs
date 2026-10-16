import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';

const hash=value=>createHash('sha256').update(value).digest('hex');
const requiredDataExports=['LEVELS','REMADE_201_210_LEVELS','CONTINUATION_LEVELS_201_210','FORMAL_201_210_LEVELS','FORMAL_ISOLATED_201_210_LEVELS','FORMAL_201_210_EVIDENCE',
 'REMADE_211_220_LEVELS','CONTINUATION_LEVELS_211_220','FORMAL_211_220_LEVELS','FORMAL_211_220_EVIDENCE',
 'REMADE_221_230_LEVELS','CONTINUATION_LEVELS_221_230','FORMAL_221_230_LEVELS','FORMAL_221_230_EVIDENCE'];
const getterSources={
 'src/core/levels.ts':['getLevelStrict','getLevel'],
 'src/core/formal201to210Data.ts':['getFormal201to210LevelStrict'],
 'src/core/formal211to220Data.ts':['getFormal211to220LevelStrict'],
 'src/core/formal221to230Data.ts':['getFormal221to230LevelStrict'],
};

/** Preserve values, enumerable undefined fields, shared object references and
 * freeze/seal/extensibility. Only the final public runtime data is emitted;
 * original repair stages remain in levels.ts for tests, audit and development. */
export function serializeRuntimeGraph(exports){
 const references=new Map(),active=new Set(),names=new Map(),definitions=[];let next=0;
 const visit=value=>{if(value===null||typeof value!=='object')return;const prior=references.get(value);if(prior){references.set(value,prior+1);return;}references.set(value,1);
  assert([Array.prototype,Object.prototype,null].includes(Object.getPrototypeOf(value)),'Only plain runtime data can be projected');
  for(const key of Reflect.ownKeys(value)){if(Array.isArray(value)&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);assert(typeof key==='string'&&d&&'value'in d&&d.enumerable,'Accessor/symbol/non-enumerable runtime data is unsupported');visit(d.value);}};
 Object.values(exports).forEach(visit);
 const emit=value=>{
  if(value===undefined)return 'void 0';if(value===null)return 'null';if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number')return Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':String(value);
  assert.equal(typeof value,'object','Runtime projection supports data, not callable values');
  if(names.has(value)){assert(!active.has(value),'Cyclic runtime data is unsupported');return names.get(value);}
  const shared=references.get(value)>1,name=shared?`shared${next++}`:undefined;if(shared)names.set(value,name);active.add(value);
  if(Array.isArray(value))assert.equal(Object.keys(value).length,value.length,'Sparse/custom-property arrays are unsupported');
  let expression=Array.isArray(value)?`[${value.map(emit).join(',')}]`:`{${Object.keys(value).map(k=>`${k==='__proto__'?'["__proto__"]':JSON.stringify(k)}:${emit(value[k])}`).join(',')}}`;
  if(Object.getPrototypeOf(value)===null)expression=`Object.assign(Object.create(null),${expression})`;
  if(Object.isFrozen(value))expression=`/* @__PURE__ */ Object.freeze(${expression})`;
  else if(Object.isSealed(value))expression=`/* @__PURE__ */ Object.seal(${expression})`;
  else if(!Object.isExtensible(value))expression=`/* @__PURE__ */ Object.preventExtensions(${expression})`;
  active.delete(value);if(shared){definitions.push(`const ${name}=${expression};`);return name;}return expression;
 };
 const statements=Object.entries(exports).map(([name,value])=>`export const ${name}=${emit(value)};`);
 return {code:[...definitions,...statements].join('\n'),objects:references.size,sharedObjects:names.size};
}

export function verifyRuntimeGraph(expected,actual){
 assert.deepStrictEqual(actual,expected,'Projected runtime data differs');const forward=new Map(),backward=new Map();
 const visit=(a,b)=>{if(a===null||typeof a!=='object')return;
  if(forward.has(a)){assert.equal(b,forward.get(a),'Shared-reference identity was split');return;}
  assert(!backward.has(b),'Distinct runtime objects were merged');forward.set(a,b);backward.set(b,a);
  assert.equal(Object.isFrozen(b),Object.isFrozen(a));assert.equal(Object.isSealed(b),Object.isSealed(a));assert.equal(Object.isExtensible(b),Object.isExtensible(a));
  assert.deepEqual(Object.keys(b),Object.keys(a),'Property enumeration order changed');
  for(const key of Reflect.ownKeys(a)){const da=Object.getOwnPropertyDescriptor(a,key),db=Object.getOwnPropertyDescriptor(b,key);assert.deepEqual({...db,value:undefined},{...da,value:undefined},'Property descriptor changed');}
  for(const key of Object.keys(a))visit(a[key],b[key]);};
 // The wrapper record itself is not emitted; compare the exported roots.
 for(const key of Object.keys(expected))visit(expected[key],actual[key]);return forward.size;
}

function getterCode(source,file,names){
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),found=new Map();
 for(const statement of parsed.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
  const name=declaration.name.getText(parsed);if(names.includes(name))found.set(name,statement.getText(parsed));}
 assert.deepEqual([...found.keys()].sort(),[...names].sort(),`Missing original runtime getter in ${file}`);
 return ts.transpileModule(names.map(name=>found.get(name)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
}

export async function createWebRuntimeLevelProjection({root=process.cwd(),sourceRoot=root}={}){
 root=resolve(root);sourceRoot=resolve(sourceRoot);const inputs={},sourceTexts={};
 const compiled=await build({entryPoints:[resolve(root,'src/core/levels.ts')],bundle:true,write:false,format:'esm',platform:'node',target:'es2020',logLevel:'silent',
  plugins:[{name:'read-projection-sources',setup(builder){builder.onLoad({filter:/\.ts$/},async args=>{
   const relative=args.path.slice(root.length+1).replaceAll('\\','/'),file=resolve(sourceRoot,relative),contents=await readFile(file,'utf8');inputs[relative]=hash(contents);sourceTexts[relative]=contents;
   return{contents,loader:'ts',resolveDir:dirname(args.path)};
  });}}]});
 const original=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
 const getterExports=Object.values(getterSources).flat();
 assert.deepEqual(Object.keys(original).filter(name=>typeof original[name]==='function').sort(),[...getterExports].sort(),'New callable export requires an explicit projection implementation');
 // Preserve every historical export too. Unused immutable data declarations
 // are removed by the bundler, while future runtime imports keep working.
 const dataExportNames=Object.keys(original).filter(name=>!getterExports.includes(name));
 for(const name of requiredDataExports)assert(dataExportNames.includes(name),`Missing required runtime export ${name}`);
 const data=Object.fromEntries(dataExportNames.map(name=>{assert(name in original,`Missing runtime export ${name}`);return[name,original[name]];}));
 assert.equal(data.LEVELS.length,200,'Production campaign boundary must remain 200');
 const serialized=serializeRuntimeGraph(data),getters=Object.entries(getterSources).map(([file,names])=>getterCode(sourceTexts[file],file,names)).join('\n');
 const code=`// Build-time projection of the unchanged source levels pipeline. Do not edit.\n${serialized.code}\n${getters}`;
 const projected=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
 assert.deepEqual(Object.keys(projected),Object.keys(original),'Projection must preserve the complete export namespace');
 const graphNodes=verifyRuntimeGraph(data,Object.fromEntries(dataExportNames.map(name=>[name,projected[name]])));
 const capture=(fn,value)=>{try{return{value:fn(value)}}catch(e){return{error:e.constructor.name,message:e.message}}};
 const queries=[undefined,null,NaN,Infinity,-Infinity,-2,0,1,7,10,20,70,150,171,199,200,201,210,211,220,221,230,231,1.5,'1','200','bad'];
 for(const name of Object.values(getterSources).flat())for(const query of queries){
  const a=capture(original[name],query),b=capture(projected[name],query);assert.deepStrictEqual(b,a,`${name}(${String(query)}) changed`);
  if(b.value){const sourceArray=name==='getLevel'||name==='getLevelStrict'?projected.LEVELS:name.includes('201')?projected.FORMAL_201_210_LEVELS:name.includes('211')?projected.FORMAL_211_220_LEVELS:projected.FORMAL_221_230_LEVELS;assert.equal(b.value,sourceArray.find(level=>level.id===b.value.id),'Getter must return the registered object');}
 }
 for(const [file,digest]of Object.entries(inputs))assert.equal(hash(await readFile(resolve(sourceRoot,file),'utf8')),digest,`Source changed while projecting ${file}`);
 return{code,report:{status:'PASS',inputs,dataExports:dataExportNames,getterExports:Object.values(getterSources).flat(),productionLevels:data.LEVELS.length,formalContinuationCounts:[data.FORMAL_201_210_LEVELS.length,data.FORMAL_211_220_LEVELS.length,data.FORMAL_221_230_LEVELS.length],graphNodes,sharedObjects:serialized.sharedObjects,getterChecks:Object.values(getterSources).flat().length*queries.length,codeBytes:Buffer.byteLength(code),codeSha256:hash(code)}};
}

export function webRuntimeLevelProjectionPlugin({sourceRoot}={}){
 let root,projection,reportFile;const virtualId='\0block-out:runtime-level-projection';
 return{name:'block-out-runtime-level-projection',apply:'build',enforce:'pre',
  configResolved(config){root=config.root;reportFile=config.isWorker?'runtime-level-projection-worker.json':'runtime-level-projection.json';},
  async buildStart(){projection=await createWebRuntimeLevelProjection({root,sourceRoot:sourceRoot??root});for(const file of Object.keys(projection.report.inputs))this.addWatchFile(resolve(sourceRoot??root,file));},
  async resolveId(source,importer){if(!/(?:^|\/)levels(?:\.ts)?$/.test(source.replaceAll('\\','/')))return;
   const resolved=await this.resolve(source,importer,{skipSelf:true});if(resolved&&resolve(resolved.id)===resolve(root,'src/core/levels.ts'))return virtualId;},
  load(id){if(id===virtualId){assert(projection);return projection.code;}},
  generateBundle(){this.emitFile({type:'asset',fileName:reportFile,source:JSON.stringify(projection.report,null,2)+'\n'});},
 };
}
