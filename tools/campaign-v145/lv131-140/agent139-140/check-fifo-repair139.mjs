import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {repairOrdinaryFifoPrefix} from './repair-ordinary-fifo-prefix139.mjs';
Error.stackTraceLimit=0;
const {api}=await loadApi();
const level={id:139,name:'actual FIFO insertion smoke',difficulty:'normal',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0,
gates:[{id:'p',side:'right',offset:0,size:3,color:'purple'},{id:'r',side:'left',offset:0,size:3,color:'red',frozen:2}],
blocks:[{id:'head-cover',x:1,y:0,shape:[[0,0]],color:'purple'},{id:'q0',x:1,y:0,shape:[[0,0]],color:'purple'},{id:'q1',x:1,y:0,shape:[[0,0]],color:'red'}],
generators:[{id:'g',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['q0','q1']}]};
const result=repairOrdinaryFifoPrefix(level,[{blockId:'head-cover',path:[[2,0]],exitSide:'right'}],api);
assert(result.selected.completeProjected);assert.deepEqual(result.selected.inserted,['q0']);assert.equal(result.selected.replay.nonClearingDrags,0);assert.equal(result.selected.finalSnapshot.cleared,2);assert(result.selected.finalSnapshot.blocks.some(b=>b.id==='q1'));
const file='deliverables/remake131-140-v146-20260924/agent139-140/fifo-insertion-smoke139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,result},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,status:'PASS',inserted:result.selected.inserted,cleared:result.selected.finalSnapshot.cleared}));
