import assert from 'node:assert/strict';
import test from 'node:test';
import {serializeRuntimeGraph,verifyRuntimeGraph,createWebRuntimeLevelProjection} from './web-runtime-level-projection.mjs';
test('projection preserves optional fields, aliases, property ordering and mutable/frozen ownership',async()=>{
 const shared=Object.freeze({id:1,optional:undefined,negativeZero:-0,nan:NaN,infinity:Infinity});
 const plain=Object.create(null);plain.__proto__='ordinary key';
 const source={levels:[shared],alias:[shared],distinct:{id:1},sealed:Object.seal({a:1}),fixed:Object.preventExtensions({b:2}),plain};
 const output=await import('data:text/javascript;base64,'+Buffer.from(serializeRuntimeGraph(source).code).toString('base64'));
 verifyRuntimeGraph(source,Object.fromEntries(Object.keys(source).map(key=>[key,output[key]])));
 assert.equal(output.levels[0],output.alias[0]);assert.equal(Object.hasOwn(output.levels[0],'optional'),true);assert.equal(Object.getPrototypeOf(output.plain),null);
 output.levels.push({id:2});assert.equal(output.alias.length,1);assert.throws(()=>{output.levels[0].id=2;},TypeError);
});
test('unsupported new graph structures fail closed',()=>{
 const cycle={};cycle.self=cycle;
 for(const data of [{cycle},{accessor:{get value(){return 1;}}},{symbol:{[Symbol()]:1}},{sparse:new Array(2)},{method:()=>1}])assert.throws(()=>serializeRuntimeGraph(data));
});
test('current full levels export namespace and all getter boundaries survive build projection',async()=>{
 const projected=await createWebRuntimeLevelProjection();assert.equal(projected.report.status,'PASS');assert.equal(projected.report.productionLevels,200);assert.deepEqual(projected.report.formalContinuationCounts,[10,10,10]);assert(projected.report.dataExports.includes('BASE_LEVELS'));assert(projected.report.dataExports.includes('LEVELS_BEFORE_171_180_REMAKE'));assert.equal(projected.report.getterChecks,135);
});
