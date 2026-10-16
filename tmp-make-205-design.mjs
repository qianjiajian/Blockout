import fs from 'node:fs';
const dir='deliverables/continue201-210-20260929/source205-design'; fs.mkdirSync(dir,{recursive:true});
const sq2=[[0,0],[1,0]],h3=[[0,0],[1,0],[2,0]],v2=[[0,0],[0,1]],l3=[[0,0],[0,1],[1,1]];
const blocks=[]; const add=(id,x,y,shape,color)=>blocks.push({id:`c205-${id}`,x,y,shape,color});
// Exact yellow perimeter 24 cells: top two rows + both sides rows 2..6.
add('y-top-left',0,0,h3,'yellow'); add('y-top-mid',3,0,h3,'yellow'); add('y-top-right',6,0,v2,'yellow');
add('y-left-a',0,2,v2,'yellow'); add('y-right-a',6,2,v2,'yellow');
add('y-left-b',0,4,v2,'yellow'); add('y-right-b',6,4,v2,'yellow');
add('y-left-tail',0,6,[[0,0]],'yellow'); add('y-right-tail',6,6,[[0,0]],'yellow');
// Interior 5x5: H3 + SQ2, exact fill. Ordinary source colors green/red/blue.
add('g-row2',1,2,h3,'green'); add('b-row2',4,2,sq2,'blue');
add('r-row3',1,3,h3,'red'); add('g-row3',4,3,sq2,'green');
add('b-row4',1,4,sq2,'blue'); add('r-row4',3,4,h3,'red');
add('g-row5',1,5,sq2,'green'); add('b-row5',3,5,h3,'blue');
add('r-row6',1,6,h3,'red'); add('g-row6',4,6,sq2,'green');
const playable=Array.from({length:7},(_,y)=>Array.from({length:7},(_,x)=>[x,y])).flat();
const level={mechanismRules:'revised-2026-09-27-v1.5',id:205,name:'竞品续章·205（黄色彩格简单适配候选）',difficulty:'easy',timeSeconds:120,reward:200,parMoves:34,preservedMoveTarget:34,width:7,height:7,playable,
 gates:[
  {id:'c205-g-yellow',color:'yellow',side:'top',offset:0,size:7},
  {id:'c205-g-green',color:'green',side:'left',offset:2,size:3},
  {id:'c205-g-red',color:'red',side:'bottom',offset:0,size:3},
  {id:'c205-g-blue',color:'blue',side:'bottom',offset:3,size:3,frozen:10},
 ],blocks,
 coloredGrids:[{id:'c205-yellow-perimeter',color:'yellow',cells:[...Array.from({length:2},(_,y)=>Array.from({length:7},(_,x)=>[x,y])).flat(),...Array.from({length:5},(_,i)=>[[0,i+2],[6,i+2]]).flat()]}],
 designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:5,minimumRepositionOverhead:5},
 mechanismAdaptation:{userAuthorized:'201-210竞品视频续作·205源机制候选',change:'保留已观察24格黄色外围彩格、无卷帘、单个10计数冰门及普通绿/红/蓝出口；采用原创7×7满铺并取消外壳以满足彩格硬规则；形状优先SQ2/H3/V2，少量边界单格为必要填充；黄色口为候选必要适配，来源视频未见黄色普通出口。'}};
fs.writeFileSync(`${dir}/candidate-205.json`,JSON.stringify(level,null,2)+'\n');
fs.writeFileSync(`${dir}/source-observations.json`,JSON.stringify({schemaVersion:1,sourceVideo:'deliverables/continue201-210-20260929/source201-205.json',sourceLevel:205,knownFacts:{coloredGrid:{color:'yellow',cellCount:24,geometry:'7x2 top rows plus both side cells for rows2-6',confidence:'high'},shutters:{count:0,confidence:'high'},iceGates:[{count:10,side:'top',confidence:'high'}],ordinaryExits:[{color:'green',side:'left'},{color:'red',side:'bottom'},{color:'blue',side:'bottom'}]},candidateDifferences:["Exact 7×7 full mask is authored candidate geometry, not exact source coordinates.","All blocks are shell-free because colored-grid + shell is forbidden by revised contract; source frames show layered pieces, retained only as source fact.","Candidate adds a yellow top exit solely to make yellow-grid cargo removable; source ordinary exits list does not include yellow.","Boundary single cells are necessary fill for exact 24-cell grid coverage; SQ2/H3/V2 are used first."],formalAdopted:false,pointerValidated:false,naturalClockValidated:false,releaseApproved:false},null,2)+'\n');
console.log(`${dir}/candidate-205.json`);

