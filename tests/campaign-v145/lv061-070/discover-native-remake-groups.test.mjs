import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverNativeRemakeGroups,assertNativeRemakeInputsUnchanged} from '../../../tools/campaign-v145/lv061-070/discover-native-remake-groups.mjs';

const moduleText=(from,to,ids,options={})=>`export ${options.mutable?'let':'const'} REMADE_${from}_${to}_IDS: ${options.noReadonly?'':'readonly '}number[] = ${ids};`;
function fixture(groups=[{from:61,to:70,ids:'[61,62]'}]){
 const files={},imports=[],stages=[];
 for(const [index,group]of groups.entries()){
  const prefix=group.native?'Native':'',moduleName=group.native?`nativeRemake${group.from}to${group.to}`:`remake${group.from}to${group.to}`;
  const apply=`apply${prefix}Remake${group.from}to${group.to}`,local=group.alias??apply;
  imports.push(`import {${apply}${local===apply?'':' as '+local}} from './${moduleName}';`);
  stages.push(`const stage${index} = ${index?'stage'+(index-1):'original'}.map(${local});`);
  files[`src/core/${moduleName}.ts`]=group.native?`export const NATIVE_REMAKE${group.from}_${group.to}_IDS: readonly number[] = ${group.ids};`:moduleText(group.from,group.to,group.ids);
 }
 files['src/core/levels.ts']=imports.join('\n')+'\n'+stages.join('\n')+`\nexport const LEVELS = stage${groups.length-1};`;
 return {files,readText:file=>{assert(Object.hasOwn(files,file),`Unexpected file read: ${file}`);return files[file];}};
}

test('discovers aliased direct formal stages and sparse IDs without reading drawing policy',()=>{
 const f=fixture([{from:31,to:40,ids:'[31,40]',native:true},{from:61,to:70,ids:'[61,62]',alias:'adopt61'},{from:81,to:90,ids:'[85,86]'}]);
 f.files['src/core/levels.ts']+='\n// import {applyRemake91to100} from "./remake91to100";';
 const result=discoverNativeRemakeGroups(f);assert.deepEqual(result.ids,[31,40,61,62,85,86]);
 assert.deepEqual(result.groups[1],{modulePath:'src/core/remake61to70.ts',applyName:'applyRemake61to70',localName:'adopt61',idsName:'REMADE_61_70_IDS',ids:[61,62],from:61,to:70});
 assert.equal(result.files.length,4);assertNativeRemakeInputsUnchanged(result,f);
});
test('supports an explicitly immutable as-const literal and empty accepted subset',()=>{
 const f=fixture([{from:61,to:70,ids:'[]'}]);f.files['src/core/remake61to70.ts']='export const REMADE_61_70_IDS = [] as const;';
 assert.deepEqual(discoverNativeRemakeGroups(f).ids,[]);
});
test('rejects an import not used by the final stage chain, even if mapped elsewhere',()=>{
 const f=fixture();f.files['src/core/levels.ts']=f.files['src/core/levels.ts'].replace('export const LEVELS = stage0','export const LEVELS = original');
 assert.throws(()=>discoverNativeRemakeGroups(f),/exactly once/);
});
test('rejects wrong import module range and wrong exported IDS range',()=>{
 const f=fixture();f.files['src/core/levels.ts']=f.files['src/core/levels.ts'].replace("'./remake61to70'","'./remake71to80'");
 assert.throws(()=>discoverNativeRemakeGroups(f),/range mismatch/);
 const g=fixture();g.files['src/core/remake61to70.ts']=moduleText(71,80,'[71]');assert.throws(()=>discoverNativeRemakeGroups(g),/range start/);
});
test('rejects out-of-range, repeated and overlapping IDs',()=>{
 for(const ids of ['[60]','[71]','[61,61]']){const f=fixture([{from:61,to:70,ids}]);assert.throws(()=>discoverNativeRemakeGroups(f),/outside|overlapping/);}
 const f=fixture([{from:61,to:70,ids:'[65]'},{from:65,to:74,ids:'[65]'}]);assert.throws(()=>discoverNativeRemakeGroups(f),/overlapping/);
});
test('rejects computed or spread inventory, mutable export and noninteger literals',()=>{
 for(const value of ['Array.from({length:10},(_,i)=>61+i)','[...accepted]','[61+1]','[61.5]','["61"]']){
  const f=fixture([{from:61,to:70,ids:value}]);assert.throws(()=>discoverNativeRemakeGroups(f),/literal/);
 }
 for(const options of [{mutable:true},{noReadonly:true}]){const f=fixture();f.files['src/core/remake61to70.ts']=moduleText(61,70,'[61]',options);assert.throws(()=>discoverNativeRemakeGroups(f),/const|readonly/);}
});
test('rejects ambiguous IDS exports and repeated application of the same group',()=>{
 const f=fixture();f.files['src/core/remake61to70.ts']+='\nexport const NATIVE_REMAKE61_70_IDS: readonly number[] = [61];';assert.throws(()=>discoverNativeRemakeGroups(f),/one exported/);
 const g=fixture();g.files['src/core/levels.ts']=g.files['src/core/levels.ts'].replace('export const LEVELS = stage0','export const LEVELS = stage0.map(applyRemake61to70)');assert.throws(()=>discoverNativeRemakeGroups(g),/exactly once/);
});
test('detects mutation of either the formal chain or any accepted data module',()=>{
 for(const file of ['src/core/levels.ts','src/core/remake61to70.ts']){const f=fixture(),result=discoverNativeRemakeGroups(f);f.files[file]+='\n// concurrent change';assert.throws(()=>assertNativeRemakeInputsUnchanged(result,f),/Concurrent/);}
});
