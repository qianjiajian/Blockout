import fs from 'node:fs';
import {createHash} from 'node:crypto';
const DIR='deliverables/continue211-220-20260930/design212-new/source213',output=`${DIR}/source-facts-v2.json`;
if(fs.existsSync(output))throw Error('Never overwrite prior source evidence');
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]],Q2=[[0,0],[1,0],[0,1],[1,1]],Q3=Array.from({length:9},(_,p)=>[p%3,Math.floor(p/3)]),T4=[[1,0],[0,1],[1,1],[2,1]];
const B=(id,color,x,y,shape,more={})=>({id,color,x,y,shape,...more});
const ref=(file,nominalVideoSeconds)=>({file,nominalVideoSeconds,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hashAlgorithm:'sha256-file-bytes'});
const upper=[B('ice-a','cyan',0,0,V2,{frozen:5}),B('ice-b','pink',1,0,[[0,0],[1,0],[0,1]],{frozen:5}),B('ice-c','yellow',3,0,V2,{frozen:5}),B('ice-d','pink',4,0,V2,{frozen:5}),B('ice-e','cyan',5,0,V2,{frozen:5}),B('ice-f','green',6,0,V2,{frozen:5}),B('ice-g','orange',2,1,[[0,0],[0,1],[1,1],[2,1]],{frozen:5}),B('a','yellow',0,2,V2),B('b','blue',1,2,V2),B('c','pink',5,2,[[0,0],[1,0],[1,1],[1,2]]),B('d','blue',5,3,V2),B('e','blue',0,4,V2),B('f','cyan',1,4,V2),B('g','pink',3,4,V2),B('h','cyan',5,5,H2)];
const opening=[B('red-t','red',2,7,T4),B('green-q3','green',0,9,Q3),B('orange-v3','orange',3,9,V3),B('ice1-red','red',4,9,V2,{frozen:1}),B('yellow-q2','yellow',5,9,Q2),B('blue-h2','blue',5,11,H2)];
const lift=[B('yellow-shell-blue','blue',4,9,Q2,{layers:['yellow','blue']}),B('blue-shell-orange','orange',6,9,V2,{layers:['blue','orange']}),B('blue-h2','blue',4,11,H2)];
const facts={schemaVersion:2,levelId:213,status:'SOURCE_RECONSTRUCTED_FROM_OPENING_AND_FIRST_REVEAL',sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/211-220.mp4',coordinateSystem:'zero-based x,y from full 7x12 bounding rectangle; source gold is mapped to yellow',
 frameReferences:[216,220,222,224,226,228,232,268].map(t=>ref(`.codex-temp/video211220/frame-${String(t/2).padStart(4,'0')}-${t.toFixed(2).padStart(7,'0')}s.png`,t)),
 firstLiftReveal:{extraction:{startVideoSeconds:218,durationSeconds:8,fps:4,command:'ffmpeg -ss 218 -i source.mp4 -t 8 -vf fps=4 frame-%03d.png'},frames:[19,20,21,22,23].map(n=>ref(`${DIR}/reveal4fps/frame-${String(n).padStart(3,'0')}.png`,218+(n-1)/4)),observation:'At nominal222.5s the thawed red V2 moves toward the bottom red gate. At nominal223s it is removed, ice counters decrease, and the x4..6,y9..11 lift reveals three bodies together. Nominal223.5/224s still shows the newly revealed arrangement before its later rearrangement. Frame232 is not an initial hidden layout.'},
 board:{width:7,height:12,category:'irregular',regions:[{x:0,y:0,width:7,height:6},{cells:[[3,6]]},{x:0,y:7,width:7,height:5}],internalWalls:[[2,3],[4,3]],playableCells:76},
 sourceTimeSeconds:150,counts:{openingBodies:6,upperHiddenBodies:15,liftHiddenBodies:3,totalBodies:24,sourceShellInstances:2,sourceNumericIceInstances:8,sourceIceGates:6,sourceOrdinaryGates:1,sourceColoredFloorCells:1},
 openingBlocks:opening,upperCurtain:{x:0,y:0,width:7,height:6,count:3,hiddenBlocks:upper,bodyFootprintCells:35,internalWallCells:[[2,3],[4,3]],sourceEmptyPlayableCells:[[3,3],[2,4],[4,4],[2,5],[4,5]],firstRevealNote:'Pink V2 initially x3,y4 from226/228 first reveal; x4,y4 in232 is a later moved pose.'},
 lift:{x:4,y:9,width:3,height:3,skin:'lift',visibleTopBodies:['ice1-red','yellow-q2','blue-h2'],initialEmptyCell:[4,11],hiddenBlocks:lift,hiddenEmptyCell:[6,11],hiddenBodyFootprintCells:8,firstRevealFrame:`${DIR}/reveal4fps/frame-021.png`},
 coloredGrids:[{color:'orange',cells:[[3,3]],evidence:'Fixed thin orange empty-square ground outline at232/268 matches the blue floor rendering in source212 and217, with no count, arrow or movable entity.'}],
 gates:[{color:'orange',side:'top',offset:2,size:3,frozen:10},{color:'cyan',side:'right',offset:0,size:2,frozen:9},{color:'pink',side:'left',offset:3,size:3,frozen:9},{color:'yellow',side:'left',offset:7,size:2,frozen:2},{color:'blue',side:'right',offset:7,size:2},{color:'red',side:'bottom',offset:1,size:3,frozen:1},{color:'green',side:'bottom',offset:4,size:3,frozen:2}],
 unknown:[],
 supersededInterpretations:[
 'The earlier source213() generator is authored geometry/shape/color adaptation, not a source reconstruction. Its added start-blueQ2 does not exist in opening216.',
 'Earlier full23 and lift2x3/two-body interpretation was wrong. The actual lift is3x3/three bodies and full inventory is24.',
 'The opening ice1 belongs to a plain red V2, not a blue-shell orange V2. Both shells are in the lift hidden layer.',
 'Positions inferred from232 were moved poses. First-reveal223 has yellow-shell/blueQ2 at4,9, blue-shell/orangeV2 at6,9, blueH2 at4,11.',
 'Orange floor3,3 was previously markedUNKNOWN and omitted. It is now positively included; omission cannot be retained to preserve an old candidate proof.'
 ],
 mandatoryDesignAdaptations:{coloredFloorShellConflict:'v1.11 item5: retain the one orange colored floor, remove both hidden shell properties, preserve their blue Q2 and orange V2 underlying bodies. Opening red V2 ice1 remains frozen1. Locations/colors/shapes may be adapted under the finite-regeneration authorization but source values remain recorded here.',hiddenFill:'Upper playable hidden cells35/40 and lift8/9 are not full. Authored actual regions must be filled per layer; adaptation must be explicit, never claim source was already full.',internalWalls:'Both source interior walls must be adapted away for the no-interior-wall rule; preserve7x12 irregular category and use an original symmetric authored contour.',nativeArt:'Source pink L3 and ordinary pink L4 may require native q0 shape adaptation; do not rotate sprites to copy their source silhouette.'},
 formalAdopted:false,priorEvidenceRewritten:false};
fs.writeFileSync(output,JSON.stringify(facts,null,2));console.log(JSON.stringify({output,counts:facts.counts,sourceFactsSha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex')}));

