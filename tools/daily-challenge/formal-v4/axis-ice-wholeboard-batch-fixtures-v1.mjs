/** Definitions only. Importing this module runs no model, graph, replay,
 * domain enumeration or filesystem operation. The task private tests must
 * independently replay the supplied first-contact witness and bind their own
 * L1 result; the historical graph is identified explicitly, never relabelled. */
export const FIXTURE_EVIDENCE=Object.freeze({
 path:'deliverables/daily-formal-v4-20261008/proof/bounded-axis-ice-private-02/tiny-graph-results.json',
 sha256:'0eb54c3337ee86896660f10c1781f6f0ae7f04a5fa101d1383b07fb41d2b760a',
 report:{path:'deliverables/daily-formal-v4-20261008/proof/bounded-axis-ice-private-02/report.json',sha256:'b385d80bd55bcb4fdd7cec9e0afba1cc0bace9b5dcb4c5cee55de6f916a114c1'},
 positiveLabel:'grid-0-1-undefined-horizontal-2',deadLabel:'grid-0-1-horizontal-horizontal-2',
 originalId:199,fixtureIdIsOnlyMetadataChange:true,
});

function level(id,redAxis){return{id,name:'Private axis ice tiny graph',difficulty:'super',reward:0,timeSeconds:180,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red',...(redAxis?{movementAxis:'horizontal'}:{})},
  {id:'b',x:1,y:0,shape:[[0,0]],color:'blue',movementAxis:'horizontal'}],
 gates:[{id:'red',side:'right',offset:0,size:1,color:'red',frozen:1},{id:'blue',side:'left',offset:0,size:1,color:'blue'}]};}
function recipe(id,label){return{recipeId:label,sourceLevelId:id,targetDifficulty:1,qualificationOnly:true,
 authoredInventory:{bodyCount:2},
 witnessEnvelope:{maximumDrags:96,maximumUnitSteps:256,exitEvents:2},
 proposedWholeWorldBudget:{hardLimit:10000,firstFullReservation:1,staticAuditReservation:16,compileAndValidationReservation:16,
  dualReplayReservation:3872,unregisteredTerminalGuard:1,jointRawSetLimit:6094,exactCountClaimed:false},
 fixtureScope:'Tiny mathematics dispatch fixture only. Not a full-board factory output, production recipe, 4-axis intensity fixture or newly certified result.'};}

export function makePositiveAxisIceFixture(){return{
 level:level(997982,false),
 recipe:recipe(997982,'private-known-axis-ice-parking-one'),
 drags:[{blockId:'a',path:[[0,1]]},{blockId:'b',path:[[0,0]],exitSide:'left'},
  {blockId:'a',path:[[1,1],[1,0]],exitSide:'right'}],
 knownPositiveL1:{historicalOptimalParking:1,historicalOracleStates:10,historicalProofRaw:4,
  proofRow:FIXTURE_EVIDENCE.positiveLabel,newGraphRun:false,newReplayRun:false,
  explanation:'Initially red cannot clear its ice-1 gate and blocks the blue horizontal exit, so a non-clearing move is necessary. Park red below; blue moves left and clears, thawing red; red turns across the lower row then up to the right exit. Blue actually moves on its axis.'},
 evidence:FIXTURE_EVIDENCE,
 witnessStatus:'Coordinate-inspected supplied witness; canonical and independent task-private replay still required.',
};}

export function makeDeadAxisIceFixture(){return{
 level:level(997983,true),recipe:recipe(997983,'private-known-axis-ice-no-route'),drags:null,
 knownNoRoute:{historicalOracleCost:null,historicalOracleStates:1,historicalExhausted:true,historicalProofRaw:1,
  proofRow:FIXTURE_EVIDENCE.deadLabel,newGraphRun:false,newReplayRun:false,
  explanation:'Both bodies are horizontal-only and mutually block their opposite exits; the red gate is frozen. No initial displacement or removal is legal.'},
 evidence:FIXTURE_EVIDENCE,
};}

/** Exact declaration used by the saved factory private03 receipts. This is
 * metadata only; it neither reconstructs their level nor invokes the factory. */
export function makeSavedFactoryTinyRecipe(){
 const pins={G0:{side:'left',size:1},G1:{side:'top',size:2},G2:{side:'right',size:1},G3:{side:'top',size:2},G4:{side:'right',size:1},G5:{side:'left',size:1},G6:{side:'right',size:1},G7:{side:'bottom',size:2}};
 return{recipeId:'private-synthetic-wholeboard-01',sourceLevelId:997981,seed:171,colourSeed:313,
  authoredInventory:{bodyCount:8,shapeAreaMaximum:6,nativeOrientation:'q0-only',maximumSingleCellBodies:0,allowedRectangleDimensions:[[2,1]]},
  labels:{bodyPrefix:'tiny-',axisRoles:[{body:'b01',axis:'vertical',gateRole:'G1'},{body:'b02',axis:'horizontal',gateRole:'G2'},{body:'b05',axis:'horizontal',gateRole:'G5'},{body:'b07',axis:'vertical',gateRole:'G7'}],
   gateRoles:Array.from({length:8},(_,i)=>({id:'G'+i,allowedSides:[pins['G'+i].side],sizeRange:[pins['G'+i].size,pins['G'+i].size],...(i===5?{frozen:1}:i===7?{frozen:2}:{})}))},
  openingRelations:[{first:'b00',second:'b01',firstGateRole:'G0',firstIsInitiallyOrdinaryClear:true,secondInitiallyClearable:false,secondMoveUnitSteps:1,secondNewOccupiedCellsSubsetOfFirstFootprint:true,secondShiftMatchesActualAxis:true,secondShiftEndsAtItsOrdinaryGate:true}],
  redesignRequirements:{minimumSourceBodiesWhoseFootprintDisappears:2,minimumOriginalOpeningFootprintAreaChangedFraction:.5,minimumChangedPhysicalGateApertures:2},
  finiteLimits:{maximumFullWorlds:1,maximumCspSessions:1,maximumRestarts:0,firstFullIsTerminal:true}};
}
