import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionMeter,constructZeroParkingTail,atGate} from './design-vacancy-route-colouring.mjs';
const source={width:2,height:2},bodies=[{id:'a',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',x:0,y:1,shape:[[0,0],[1,0]]}],gates=[{side:'top',offset:0,size:2,color:'blue'},{side:'bottom',offset:0,size:2,color:'red'}];
const input={bodies,tailBodies:bodies,gates,domains:[[0],[1]],assigned:[-1,-1],adjacency:[[1],[0]],requiredColors:[0,1]};
test('Joint colour/removal builds complete zero-parking tail with initial adjacency',()=>{
 const meter=constructionMeter(),r=constructZeroParkingTail(source,input,meter);assert(r.solution);assert.deepEqual(r.solution.assigned,[0,1]);
 assert.equal(r.solution.drags.length,2);assert(r.solution.drags.every(d=>d.exitSide));assert.equal(meter.counts.rawFullBoardStates,4);
});
test('All branch worlds share one pre-guarded board allowance',()=>{
 const meter=constructionMeter({maxStates:2});assert.throws(()=>constructZeroParkingTail(source,input,meter),/board-budget/);assert.equal(meter.counts.rawFullBoardStates,2);
});
test('An already removed neighbor still forbids its initial colour',()=>{
 const meter=constructionMeter(),r=constructZeroParkingTail(source,{...input,tailBodies:[bodies[1]],domains:[[0],[0]],assigned:[0,-1],requiredColors:[0]},meter);
 assert.equal(r.solution,null);assert.equal(meter.counts.rawFullBoardStates,1);
});
test('Finite budget arguments reject NaN, infinity, negatives and oversized cap',()=>{
 for(const budget of [{maxStates:NaN},{maxStates:10001},{maxMilliseconds:Infinity},{maxTransitions:-1},{maxMicroStates:3.5}])assert.throws(()=>constructionMeter(budget));
 assert(atGate(source,bodies[0],[0,0],gates[0]));assert(!atGate(source,bodies[0],[0,1],gates[0]));
});
