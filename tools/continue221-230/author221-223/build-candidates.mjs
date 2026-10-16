import fs from "node:fs";
import { build } from "esbuild";
const root=process.cwd();
const out=`${root}/deliverables/continue221-230-20260929/rebuild221-223`;
const colors=["red","blue","green","yellow","purple","orange","pink","cyan"];
const shape=(cells)=>cells;
const gate=(id,color,side,offset,size,frozen)=>({id:`l${id}-gate-${color}`,color,side,offset,size,...(frozen?{frozen}: {})});
const gates=(id,variant)=>[
 gate(id,"red","top",0,2,variant===223?17:undefined),gate(id,"blue","top",2,2,variant===223?8:undefined),
 gate(id,"green","right",0,2,undefined),gate(id,"yellow","right",2,2,variant===222?9:undefined),
 gate(id,"purple","bottom",0,2,undefined),gate(id,"orange","bottom",2,2,undefined),
 gate(id,"pink","left",0,2,variant===221?15:undefined),gate(id,"cyan","left",2,2,undefined)
];
function make(id,variant){
 const blocks=[]; let n=0;
 // opening rows y=0..4, with varied rectangles; y=5..6 are physically covered.
 const add=(color,x,y,shapeCells,shutterId)=>blocks.push({id:`l${id}-b${n++}`,color,x,y,shape:shape(shapeCells),...(shutterId?{shutterId}:{})});
 const top=[[[0,0],[1,0]],[[2,0],[3,0]],[[4,0],[5,0]],[[6,0]],[[0,1],[0,2]],[[1,1],[1,2]],[[2,1],[3,1]],[[4,1],[5,1]],[[6,1],[6,2]],[[0,3],[1,3]],[[2,2],[2,3]],[[3,2],[4,2]],[[5,3],[6,3]],[[0,4],[1,4]],[[2,4],[3,4]],[[4,3],[4,4]],[[5,4],[6,4]]];
 top.forEach((s,i)=>{const p=s[0]; add(colors[i%8],p[0],p[1],s.map(([x,y])=>[x-p[0],y-p[1]]));});
 // Bottom 7x2 cover is fully occupied by 7 vertical/horizontal pieces.
 const hidden=[[[0,0],[1,0]],[[2,0],[3,0]],[[4,0],[5,0]],[[6,0]],[[0,1],[1,1]],[[2,1],[3,1]],[[4,1],[5,1],[6,1]]];
 hidden.forEach((s,i)=>{const p=s[0]; add(colors[(i+3)%8],p[0],5+p[1],s.map(([x,y])=>[x-p[0],y-p[1]]),`l${id}-cover`);});
 const level={mechanismRules:"revised-2026-09-27-v1.5",id,name:`221-223重建候选·${id}`,difficulty:id===221?"easy":"normal",timeSeconds:120,reward:200,parMoves:id===221?32:id===222?34:36,preservedMoveTarget:id===221?32:id===222?34:36,width:7,height:7,gates:gates(id,variant),blocks,shutters:[{id:`l${id}-cover`,x:0,y:5,width:7,height:2,count:variant===221?5:variant===222?11:12,skin:"shutter"}],designTargets:{formulaVersion:"blockout-d1",calibratedDifficulty:id===221?1.15:id===222?1.3:1.4,minimumRepositionOverhead:id===221?5:id===222?11:12},mechanismAdaptation:{userAuthorized:"221-230竞品视频续作",change:`${id}候选重建：开局7×7实际满铺；视频事实/适配分列。卷帘覆盖区域为底部7×2，库存和必挪下界待fresh证明。`}};
 return level;
}
const levels=[make(221,221),make(222,222),make(223,223)];
fs.writeFileSync(`${out}/candidate-levels.json`,JSON.stringify({schemaVersion:1,ruleVersion:"1.122.0",status:"CANDIDATE_REBUILD_FRESH_PENDING",levels},null,2)+"\n");
fs.writeFileSync(`${out}/source-differences.json`,JSON.stringify({source:"source221-230.json",levels:levels.map(l=>({id:l.id,observed:l.id===221?"L分区/15卷帘/红蓝绿黄门":l.id===222?"中央10卷帘/星块/双补给视觉":"上下分区/红蓝翻转/17/12/2/10/23计数",adapted:l.mechanismAdaptation.change,unknown:["逐块库存","隐藏层批次精确来源","fresh L/U"]}))},null,2)+"\n");
console.log(JSON.stringify(levels.map(l=>({id:l.id,blocks:l.blocks.length,hidden:l.blocks.filter(b=>b.shutterId).length,cover:l.shutters[0].count}))));
