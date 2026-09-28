import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67';
const evidence=seconds=>seconds.map(second=>{const path=`.codex-temp/video-audit-41-70/frames-61-70/frame-${String(second).padStart(4,'0')}.jpg`;return {second,path,sha256:digest(fs.readFileSync(path))};});
const levels=[
 {id:65,status:'direct-frame-reviewed',evidence:evidence([359,389,396,397,398,399,400]),
  sourceOpening:{count:11,area:30,colors:['red','green','blue','yellow','purple','pink'],histogram:{H2:1,V2:3,V3:2,H3:4,SQ2:1},ice:[{shape:'V2',color:'blue',value:10}],
   pieces:[['green','H3'],['red','H2'],['purple','H3'],['green','SQ2'],['yellow','H3'],['purple','V3'],['blue','V3'],['blue','V2',10],['red','V2'],['pink','V2'],['yellow','H3']]},
  sourceMechanisms:{lifts:[{physicalRegionCount:1,sourceRectangle:[1,1,5,6],layersIncludingOpening:2}],ordinaryGates:6,frozenGates:[],keys:0,shells:0},
  sourceHidden:{count:12,area:30,histogram:{SINGLE:2,H2:3,V2:1,H3:2,L3:2,L4:1,T4:1},pieces:[['red','H2'],['green','H3'],['purple','L4'],['yellow','SINGLE'],['red','L3'],['green','V2'],['blue','L3'],['purple','SINGLE'],['yellow','T4'],['pink','H2'],['yellow','H2'],['blue','H3']]},
  corrections:['truth-v6 opening V2×5 misreads two 3-cell vertical bodies; frames359/389 give V2×3,V3×2.','frame396 exposes the ice-10 body as BLUE V2; first exploratory draft pink is rejected.','frames397–400 show twelve separately outlined hidden bodies, including two singles and two L3; source full count is23, not22.'],
  adaptation:{sourcePlayable:56,sourceVisibleArea:30,preservedPlayable:56,addedOpeningCells:26,addedOpeningBodies:5,addedShapes:{RECT6:3,SQ2:2},reason:'原7×8棋盘保留，源仅30格可见体而无封闭帘，补26格真实普通多格块；不新增机关/冰/壳。',hiddenArea:30,hiddenCount:12,hiddenAdditions:0,
   carrierShapeChanges:[{id:'lift2-2',color:'purple',source:'vertical L4',authored:'native shape10 horizontal L4',reason:'现有紫色完整原向L4是shape10；保4格、颜色及批次，重排隐藏层。'},{id:'lift2-4',color:'red',source:'right-leg L3',authored:'native shape4 L3',reason:'原图朝向限制，保3格/色/层。'},{id:'lift2-6',color:'blue',source:'upper-left L3',authored:'native shape4 L3',reason:'原图朝向限制，保3格/色/层。'}],precision:'source-based original adaptation, not coordinate copy'},
  decisionReview:'单个真实升降教学：开局冰10、占区与外围让位；隐藏层12体保持，无第二次解锁新机制。'
 },
 {id:66,status:'direct-frame-reviewed',evidence:evidence([424,425,451,452,453,463,464,465,472,475,476]),
  sourceOpening:{count:17,area:43,histogram:{H2:6,V2:3,H3:4,V3:3,SQ2:1},colors:['red','green','blue','yellow','purple','cyan'],ice:[['purple','H3',6],['red','H3',6],['yellow','H3',6],['green','V3',6],['red','V3',6]],shellCount:0},
  sourceMechanisms:{physicalLiftCount:1,sourceRegion:[1,1,5,3],layersIncludingOpening:2,ordinaryGates:[{color:'green'}],frozenGates:[['blue',16],['cyan',4],['yellow',3],['purple',2],['red',1]],shells:[{stage:'hidden-final',shape:'V3',layers:['yellow','blue']}],keys:0},
  sourceHidden:{count:5,area:15,pieces:[['yellow','SINGLE'],['yellow','V3',0,['yellow','blue']],['purple','L3',5],['red','T4',5],['blue','SQ2']]},
  corrections:['424 is the pre-move six-ice opening;425 is after the first clear and therefore all visible counts already fell by1.','451→453 is thawing of the SAME five opening bodies, not a new lift batch. There is only one true reveal after the region empties at464–465.','Final reveal has five bodies, including blue SQ2 omitted from truth-v6; yellow/blue V3 shell is hidden-final, not opening.','476 identifies thawed final T4 as red and final L3 exiting purple. Full source body count22.'],
  adaptation:{sourceVisibleArea:43,preservedPlayable:63,addedOpeningCells:20,reason:'保7×9实际63格；源开局体43格，补20格普通体；源15格升降隐藏层保持5体，无人为添加中间批次。补块实数和形状由逐候选绑定报告计算。',hiddenArea:15,hiddenAdditions:0,carrierShapeChanges:[{source:'red T4 ice5',authored:'native red L4 shape10 ice5',reason:'源五体在原向素材下穷尽40节点无5×3铺法；同面积只替换一个载体，保颜色/冰5/隐藏批次/4格/M11，72节点发现2种原向全铺。',proof:'native-hidden-packing.json'}],precision:'source-based original adaptation'}
 },
 {id:67,status:'direct-frame-reviewed',evidence:evidence([486,496,501,502,517,518,519,520,521,522,523]),
  sourceOpening:{count:12,area:33,histogram:{H2:3,V2:3,H3:1,V3:2,SQ2:3},colors:['red','green','blue','yellow','purple','cyan'],ice:[['purple','V3',10],['blue','V3',5],['yellow','H2',5],['red','SQ2',5]]},
  sourceMechanisms:{physicalLiftCount:2,sourceRegions:[{name:'left',rectangle:[1,6,1,3],layersIncludingOpening:2},{name:'right',rectangle:[3,6,3,3],layersIncludingOpening:2}],ordinaryGates:[{color:'green'}],frozenGates:[['yellow',1],['red',3],['purple',5],['cyan',4],['blue',5]],countdownCovers:[{count:3,hidden:{color:'cyan',shape:'H3'}}],keys:0,shells:0},
  sourceHidden:{count:5,area:15,batches:[{id:'left',pieces:[['green','V3']]},{id:'right',pieces:[['blue','V2'],['green','L3'],['yellow','T4']]},{id:'cover',pieces:[['cyan','H3']]}]},
  corrections:['501–502 is thawing, not a lift reveal.','517–519 proves left purple ice10 V3 belongs to a separate real lift: purple exits, shutters slide, green V3 appears.','521–523 proves right final batch is blueV2+greenL3+yellowT4, three bodies covering9 cells; redSQ2 above the frame was an existing moved body.','496 shows the countdown cover reveals a cyanH3, not aV2. Full body count17 rather than21.'],
  adaptation:{preservedPlayable:58,sourceVisibleArea:33,authoredCoverArea:3,addedOpeningCells:22,reason:'保当前58格原创轮廓，普通帘改为真实3×1足迹覆盖已核cyanH3；其余22格用普通合法多格体补满；左右两升降保持1×3/3×3且不合并。',carrierShapeChanges:[{source:'green L3 in 3×3 final right lift',authored:'two independent green bodies H2 + SINGLE',reason:'native q0 L3+T4+V2穷尽4节点不能铺3×3；仅拆一个3格载体成两个真实独立块，保黄色T4/蓝色V2及9格区域/色/批次。原向新库存18节点得2种全铺，不是渲染拼接。',proof:'native-hidden-packing.json'}],precision:'source-based original adaptation'}
 }
];
fs.writeFileSync(root+'/source-corrections.json',JSON.stringify({createdAt:new Date().toISOString(),source:'C:/Users/Administrator/Desktop/block out/参考视频/61-70.mp4',truthV6Policy:'The old immutable truth file remains unchanged; direct-image corrections are recorded separately.',levels},null,2)+'\n');
console.log(JSON.stringify({out:root+'/source-corrections.json',levels:levels.map(l=>l.id)}));
