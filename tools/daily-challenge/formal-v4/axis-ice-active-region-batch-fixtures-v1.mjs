/** Tiny definitions only. These partial boards are qualification dispatch
 * fixtures, never production factory outputs or reused mainline layouts. */
function recipe(id,label){return{recipeId:label,sourceLevelId:id,targetDifficulty:1,qualificationOnly:true,
 source:{width:4,height:2,playableCells:8},
 authoredInventory:{bodyCount:4,shapeAreaMaximum:6},
 witnessEnvelope:{maximumDrags:96,maximumUnitSteps:256,exitEvents:4},
 fixtureScope:'Synthetic <=16-cell exact-kernel and original-double-replay qualification only.'};}
function level(id,dead){return{id,name:'Private axis numeric-ice graph',difficulty:'super',reward:0,timeSeconds:180,
 mechanismRules:'revised-2026-09-27-v1.5',width:4,height:2,
 blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red',...(dead?{movementAxis:'horizontal'}:{})},
 {id:'b',x:1,y:0,shape:[[0,0]],color:'blue',movementAxis:'horizontal'},
 {id:'c',x:2,y:1,shape:[[0,0]],color:'yellow',movementAxis:'horizontal',frozen:2},
 {id:'d',x:3,y:1,shape:[[0,0]],color:'cyan',frozen:3}],
 gates:[{id:'red',side:'right',offset:0,size:1,color:'red',frozen:1},
 {id:'blue',side:'left',offset:0,size:1,color:'blue'},
 {id:'yellow',side:'left',offset:1,size:1,color:'yellow'},
 {id:'cyan',side:'right',offset:1,size:1,color:'cyan'}]};}
export function makePositiveActiveIceFixture(){return{level:level(997992,false),recipe:recipe(997992,'private-axis-numeric-ice-one'),
 drags:[{blockId:'a',path:[[0,1]]},{blockId:'b',path:[[0,0]],exitSide:'left'},
 {blockId:'a',path:[[1,1],[1,0],[2,0],[3,0]],exitSide:'right'},
 {blockId:'c',path:[[1,1],[0,1]],exitSide:'left'},{blockId:'d',path:[],exitSide:'right'}],
 coordinateReason:'Initially every exit is blocked or frozen; parking a below permits b clear, then a clears and thaws c at2, whose clear thaws d at3. A supplied witness and necessary first parking, not an executed proof.',
 proofExecuted:false};}
export function makeDeadActiveIceFixture(){return{level:level(997993,true),recipe:recipe(997993,'private-axis-numeric-ice-dead'),
 drags:null,coordinateReason:'a and b are both horizontal, mutually block their exits; the other two bodies remain frozen.',proofExecuted:false};}
