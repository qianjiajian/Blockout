import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,rect,writeNew} from './common.mjs';
const blocks=[
 ['green',rect(1,1),0,0],['blue',[[1,0],[0,1],[1,1]],0,0],['red',rect(2,1),2,0],['purple',rect(1,1),4,0],['blue',rect(1,2),5,0],['green',rect(1,2),6,0],
 ['cyan',rect(1,1),2,1],['purple',rect(1,1),3,1],['green',rect(1,1),4,1],['purple',[[0,0],[0,1],[1,1]],0,2],['green',rect(1,1),5,2],['cyan',rect(1,2),6,2],
 ['cyan',rect(1,1),2,3],['green',rect(1,1),3,3],['purple',rect(1,1),4,3],['yellow',rect(1,1),5,3],['green',rect(2,1),0,4],['blue',rect(1,1),6,4],
 ['purple',rect(2,1),0,5],['purple',rect(2,1),2,5],['yellow',[[0,0],[1,0],[1,1]],4,5],['cyan',rect(1,2),6,5],['cyan',rect(1,2),3,6],['red',rect(1,1),4,6],
 ['purple',rect(1,2),0,7],['blue',rect(1,1),1,7],['yellow',[[0,0],[0,1],[1,1]],2,7],['blue',rect(1,1),4,7],['green',rect(1,1),1,8],['green',rect(1,1),4,8],['red',rect(2,1),5,8],
].map(([color,shape,x,y],i)=>({id:'source240-'+i,color,shape,x,y}));
const occupied=blocks.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]));
assert.equal(blocks.length,31);assert.equal(occupied.length,50);assert.equal(new Set(occupied.map(p=>p.join(','))).size,50);
const holes=rect(7,9).filter(p=>!occupied.some(q=>p[0]===q[0]&&p[1]===q[1]));
assert.deepEqual(holes,[[1,2],[2,2],[3,2],[4,2],[2,4],[3,4],[4,4],[5,4],[0,6],[1,6],[2,6],[5,7],[6,7]]);
export const source240={id:240,width:7,height:9,timeSeconds:180,blocks,occupied,holes,
 stableFrames:[953,954],mechanismCorroborationFrames:[970,990,1010,1040],
 gates:[['red','left',0,1,12],['green','top',2,2,9],['cyan','top',6,1,6],['blue','right',2,2,4],['yellow','right',5,2,14],['yellow','left',7,2,20],['red','bottom',3,2,18],['purple','left',4,2,0]].map(([color,side,offset,size,frozen])=>({color,side,offset,size,...frozen?{frozen}:{}})),
 sourceUnknowns:[],sourceHasNo:['shells','block ice','shutters','generators','keys','movement axes','colored grids'],
 requiredAdaptation:['Source internal walls violate original connected symmetric no-island-wall rule: author fresh 7x9,50-cell mask.','Two duplicate gate colors: retain red12/yellow14; adapt yellow20 to orange and red18 to pink with corresponding ordinary inventory.','Blue upper L3 and yellow upper L3 must physically change to supported q0 footprint; no texture rotation.','Source adjacent purple H2 pair must be separated in original layout.']};
const file=ROOT+'/author240/source-transcription.json';
if(!fs.existsSync(file))writeNew(file,source240);
if(process.argv[1]?.endsWith('author240-source.mjs'))console.log(JSON.stringify({file,bodies:31,cells:50,counts:Object.fromEntries([...new Set(blocks.map(b=>b.color))].map(c=>[c,blocks.filter(b=>b.color===c).length]))}));
