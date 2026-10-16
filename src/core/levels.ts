import { applyRemake171to180 } from './remake171to180';
import { applyRemake191to200 } from './remake191to200';
import { applyRemake161to170 } from './remake161to170';
import { applyRemake151to160 } from './remake151to160';
import { applyRemake141to150 } from './remake141to150';
import { applyRemake121to130 } from './remake121to130';
import { applyRemake131to140 } from './remake131to140';
import { applyRemake51to60 } from "./remake51to60";
import { applyRemake101to110 } from './remake101to110';
import { applyRemake111to120 } from './remake111to120';
import { applyRemake81to90 } from './remake81to90';
import { applyRemake91to100 } from './remake91to100';
import { applyNativeRemake31to40 } from "./nativeRemake31to40";
import { applyRemake41to50 } from "./remake41to50";
import { rect, shape, type LevelSpec } from "./types";
import { ACTIVE_MECHANISM_PROFILE } from "./mechanismRules";
import { applyLevel21Reposition } from "./level21Reposition";
import { applyMechanismFocusRemake } from "./mechanismFocusRemake";
import { applyMultiBlockRemake } from "./multiBlockRemake";
import { applyRhythmRemake } from "./rhythmRemake";
import { applyRhythmRemake31to40 } from "./rhythmRemake31to40";
import { applyMechanismPracticeRemake } from "./mechanismPracticeRemake";
import { applyLayoutOriginalityRemake } from "./layoutOriginalityRemake";
import { applyNativeBlockRepair } from "./nativeBlockRepair";
import { applyRemake181to190 } from "./remake181to190";
import { applyRemake71to80 } from "./remake71to80";
import { applyRemake61to70 } from "./remake61to70";
import { campaignRepositionFloor, campaignTargetD1 } from "./campaignDifficultyTargets";
import { normalizeRuntimeLevel } from "./runtimeLevelNormalization";
import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";
import { getVideoParityGeneratorRimGeometry } from "./videoParityGeneratorRimGeometry";
import { repairLevelForSolvability } from "./solvabilityRepairOverrides";
import { applySingleBlockAdjacencyRepair } from "./singleBlockAdjacencyOverrides";
import { applyLevel19Regeneration } from "./level19Regeneration";
import { applyLevel20Regeneration } from "./level20Regeneration";
import { applyAllBlockAdjacencyRepair } from "./allBlockAdjacencyOverrides";
import { applyLevel21ShutterRepair } from "./level21ShutterRepair";
import { applyPost100ShutterCoverageRepair } from "./post100ShutterCoverageRepairs";
import { applyShutterRegionRepair } from "./shutterRegionRepairs";
import { applyMechanismParityRepair1To100 } from "./mechanismParityRepairs1To100";
import { applyMechanismParityRepair101To200 } from "./mechanismParityRepairs101To200";
import { applyMechanismParityShutterRegionRepair } from "./mechanismParityShutterRegions";
import { applyAxisRectangularRepairs } from "./axisRectangularRepairs";
import { applyLevel43Repair } from "./level43Repair";
import { applyLevel63Repair } from "./level63Repair";
import { applyLevel66Repair, applyLevel93Repair, applyLevel97Repair } from "./levels66_93_97Repair";
import { applyLevel66LateLiftRepair } from "./level66LateLiftRepair";
import { applyLevel9OriginalRemake } from "./level9OriginalRemake";
import { applyLevel11OriginalRemake } from "./level11OriginalRemake";
import { applyLevel12OriginalRemake } from "./level12OriginalRemake";
import { applyLevel15OriginalRemake } from "./level15OriginalRemake";
import { applyLevel16OriginalRemake } from "./level16OriginalRemake";
import { applyLevel20OriginalRemake } from "./level20OriginalRemake";
import { applyLevel70GeneratorRemake } from "./level70GeneratorRemake";
import { applyLevel78LateLiftRepair } from "./level78LateLiftRepair";
import { applyLevel72Repair } from "./level72Repair";
import { applyMechanismAttributeRepair } from "./mechanismAttributeRepairs";
import { applyPaletteAwareExitContracts } from "./paletteAwareExitContracts";
import { applyOpeningVisibilityCohortRepair } from "./openingVisibilityCohortRepairs";
import { applyFinalGeneratorContracts } from "./finalGeneratorContracts";
import { applyOpeningBlockCountRepair } from "./openingBlockCountRepairs";
import { applyAllBlockOpeningSolvabilityRepair } from "./allBlockOpeningSolvabilityRepairs";
import { applyPlayerFacingShutterCountContract } from "./playerFacingShutterCountContracts";
import { applyMechanismAttributeStructuralRepair } from "./mechanismAttributeStructuralRepairs";
import { applyBoardTopologyRepair } from "./boardTopologyRepairs";
import { applyShutterGeometryCoverageRepair } from "./shutterGeometryCoverageRepairs";
import { applyCompetitorExactShutterGeometryRepairPost100 } from "./competitorExactShutterGeometryRepairsPost100";
import { applyGeneratorSpawnAlignmentRepair } from "./generatorSpawnAlignmentRepairs";
import { applyOpeningBlockCountExpansionRepair } from "./openingBlockCountExpansionRepairs";
import { applyOpeningBlockCountSecondBatchRepair } from "./openingBlockCountSecondBatchRepairs";
import { applyLevel41GeneratorOpeningBridgeRepair } from "./level41GeneratorOpeningBridgeRepair";
import { applyGeneratorRouteSolvabilityRepair } from "./generatorRouteSolvabilityRepairs";
import { applyGeneratorOpeningBridgeRepair } from "./generatorOpeningBridgeRepairs";
import { applyCompetitorBoardOutlineRepair } from "./competitorBoardOutlineRepairs";
import { applyCompetitorEarlyJointMaskRepair } from "./competitorEarlyJointMaskRepairs";
import { applyCompetitorLevel33DiamondMaskRepair } from "./competitorLevel33DiamondMaskRepair";
import { applyCompetitorLateBoardMaskRepair } from "./competitorLateBoardMaskRepairs";
import { applyCompetitorShutterContractRepair } from "./competitorShutterContractRepairs";
import { applyCompetitorHardBoardMaskRepair } from "./competitorHardBoardMaskRepairs";
import { applyCompetitorExactShutterTruthRepair } from "./competitorExactShutterTruthRepairs";
import { applyCompetitorCertifiedExactGeometryRepair } from "./competitorCertifiedExactGeometryRepairs";
import { applyCompetitorLocalPortalRepair } from "./competitorLocalPortalRepairs";
import { applyCompetitorDisconnectedBoardRepair } from "./competitorDisconnectedBoardRepairs";
import { applyCompetitorLateMechanismRepair } from "./competitorLateMechanismRepairs";
import { applyCompetitorLateExitContract1To100 } from "./competitorLateExitContracts1To100";
import { applyCompetitorExitStructuralBatchA } from "./competitorExitStructuralBatchA";
import { applyCompetitorShutterStructuralBatchA } from "./competitorShutterStructuralBatchA";
import { applyOpeningCompositionBatchBRepair } from "./openingCompositionBatchBRepairs";
import { applyCompetitorLevel75ShellRepair } from "./competitorLevel75ShellRepair";
import { applyCompetitorShutterStructuralBatchB } from "./competitorShutterStructuralBatchB";
import { applyOpeningCompositionBatchCRepair } from "./openingCompositionBatchCRepairs";
import { applyCompetitorLateFlipDoorStructuralBatch } from "./competitorLateFlipDoorStructuralBatch";
import { applyCompetitorNumericIceStructuralBatchA } from "./competitorNumericIceStructuralBatchA";
import { applyCompetitorStarExitStructuralBatch } from "./competitorStarExitStructuralBatch";
import { applyCompetitorEarlyExitStructuralBatchB } from "./competitorEarlyExitStructuralBatchB";
import { applyCompetitorEarlyMidResidualBatchP } from "./competitorEarlyMidResidualBatchP";
import { applyCompetitorMidExitStructuralBatchC } from "./competitorMidExitStructuralBatchC";
import { applyCompetitorMidExitStructuralBatchD } from "./competitorMidExitStructuralBatchD";
import { applyCompetitorLateExitStructuralBatchJ } from "./competitorLateExitStructuralBatchJ";
import { applyCompetitorLateMechanismStructuralBatchL } from "./competitorLateMechanismStructuralBatchL";
import { applyCompetitorLateStructuralBatchM } from "./competitorLateStructuralBatchM";
import { applyFinalOutlineOnlyBoardRepair } from "./finalOutlineOnlyBoardRepairs";
import { applyGeneratorFrozenCargoRepair } from "./generatorFrozenCargoRepairs";
import { applyEarlyExitDifficultyRepair } from "./earlyExitDifficultyRepairs";
import { applyRevisedReviewedLevel } from "./revisedReviewedLevels";
import { applyRevisedContinuationLevel } from "./revisedContinuationLevels";

export const BASE_LEVELS: LevelSpec[] = [
  {
    id: 1,
    name: "新手教程",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 2,
    width: 5,
    height: 5,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 3, color: "blue" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 3, shape: rect(2, 2), color: "red" },
      { id: "blue-a", x: 3, y: 0, shape: rect(2, 2), color: "blue" },
    ],
  },
  {
    id: 2,
    name: "转个弯",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 3,
    width: 6,
    height: 6,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "yellow-left", side: "left", offset: 1, size: 3, color: "yellow" },
      { id: "blue-bottom", side: "bottom", offset: 3, size: 3, color: "blue" },
    ],
    blocks: [
      { id: "red-l", x: 0, y: 1, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-t", x: 1, y: 2, shape: shape(".X.", "XXX"), color: "yellow" },
      { id: "blue-l", x: 4, y: 1, shape: shape("XX", ".X"), color: "blue" },
    ],
  },
  {
    id: 3,
    name: "四面出口",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 4,
    width: 6,
    height: 7,
    gates: [
      { id: "green-top", side: "top", offset: 0, size: 4, color: "green" },
      { id: "yellow-right", side: "right", offset: 2, size: 4, color: "yellow" },
      { id: "red-bottom", side: "bottom", offset: 0, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 2, color: "blue" },
    ],
    blocks: [
      { id: "green-a", x: 0, y: 0, shape: rect(3, 1), color: "green" },
      { id: "red-a", x: 0, y: 2, shape: rect(2, 3), color: "red" },
      { id: "yellow-a", x: 2, y: 2, shape: rect(1, 4), color: "yellow" },
      { id: "blue-a", x: 3, y: 2, shape: rect(2, 4), color: "blue" },
    ],
  },
  {
    id: 4,
    name: "颜色迷阵",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 4,
    width: 6,
    height: 6,
    gates: [
      { id: "green-top", side: "top", offset: 0, size: 2, color: "green" },
      { id: "yellow-top", side: "top", offset: 4, size: 2, color: "yellow" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue" },
      { id: "red-bottom", side: "bottom", offset: 3, size: 3, color: "red" },
    ],
    blocks: [
      { id: "green-a", x: 0, y: 0, shape: rect(2, 2), color: "green" },
      { id: "yellow-a", x: 4, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 0, y: 4, shape: rect(2, 2), color: "blue" },
      { id: "red-a", x: 4, y: 4, shape: rect(2, 2), color: "red" },
    ],
  },
  {
    id: 5,
    name: "冰封出口",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 30,
    parMoves: 4,
    width: 6,
    height: 7,
    featureIntro: {
      title: "冰封出口！",
      description: "每送出一个方块，冰层都会减一。先走能用的出口！",
      kind: "ice-door",
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red", frozen: 1 },
      { id: "blue-right", side: "right", offset: 0, size: 3, color: "blue", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 3 },
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 2, shape: rect(3, 1), color: "yellow" },
      { id: "red-a", x: 0, y: 4, shape: rect(3, 1), color: "red" },
      { id: "blue-a", x: 3, y: 0, shape: rect(2, 3), color: "blue" },
      { id: "green-a", x: 3, y: 3, shape: rect(2, 3), color: "green" },
    ],
  },
  {
    id: 6,
    name: "融冰顺序",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 30,
    parMoves: 4,
    width: 7,
    height: 7,
    gates: [
      { id: "orange-left", side: "left", offset: 1, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 2, size: 3, color: "purple", frozen: 1 },
      { id: "blue-right", side: "right", offset: 3, size: 3, color: "blue", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 0, size: 3, color: "green", frozen: 3 },
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 1, shape: rect(3, 2), color: "orange" },
      { id: "purple-a", x: 2, y: 4, shape: rect(3, 1), color: "purple" },
      { id: "blue-a", x: 5, y: 3, shape: rect(2, 2), color: "blue" },
      { id: "green-a", x: 0, y: 5, shape: rect(3, 2), color: "green" },
    ],
  },
  {
    id: 7,
    name: "峡谷通道",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 60,
    parMoves: 4,
    width: 7,
    height: 9,
    blocked: [[1, 2], [5, 3], [1, 5], [5, 5]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 3, color: "blue" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 1), color: "yellow" },
      { id: "green-a", x: 3, y: 4, shape: rect(2, 1), color: "green" },
      { id: "blue-a", x: 5, y: 6, shape: shape(".X", "XX"), color: "blue" },
    ],
  },
  {
    id: 8,
    name: "冰中方块",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 40,
    parMoves: 4,
    width: 7,
    height: 7,
    featureIntro: {
      title: "冰冻方块！",
      description: "清除其他方块来降低冰块数字，归零后才能拖动。",
      kind: "ice-block",
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 3, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-right", side: "right", offset: 2, size: 3, color: "blue" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" },
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "red-ice", x: 2, y: 0, shape: rect(2, 2), color: "red", frozen: 1 },
      { id: "blue-ice", x: 5, y: 2, shape: rect(2, 2), color: "blue", frozen: 2 },
      { id: "green-ice", x: 3, y: 5, shape: rect(2, 2), color: "green", frozen: 3 },
    ],
  },
  {
    id: 9,
    name: "碎冰连锁",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 60,
    parMoves: 4,
    width: 7,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 2, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "cyan-bottom", side: "bottom", offset: 2, size: 3, color: "cyan" },
    ],
    blocks: [
      { id: "purple-a", x: 2, y: 0, shape: rect(3, 1), color: "purple" },
      { id: "orange-a", x: 0, y: 2, shape: rect(2, 2), color: "orange", frozen: 1 },
      { id: "pink-a", x: 5, y: 3, shape: rect(2, 2), color: "pink", frozen: 2 },
      { id: "cyan-a", x: 2, y: 6, shape: rect(3, 2), color: "cyan", frozen: 3 },
    ],
  },
  {
    id: 10,
    name: "双层伪装",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 50,
    parMoves: 4,
    width: 7,
    height: 7,
    featureIntro: {
      title: "双层方块！",
      description: "先把外层送进同色出口，里面的颜色才会显露。",
      kind: "layer",
    },
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 3, color: "blue" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "red-right", side: "right", offset: 1, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" },
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "yellow"] },
      { id: "layer-b", x: 4, y: 1, shape: rect(2, 2), color: "red", layers: ["red", "green"] },
    ],
  },
  {
    id: 11,
    name: "层层突围",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 80,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 3, color: "purple" },
      { id: "orange-top", side: "top", offset: 5, size: 3, color: "orange" },
      { id: "cyan-left", side: "left", offset: 2, size: 3, color: "cyan" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 2, size: 4, color: "green" },
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "cyan"] },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "pink"] },
      { id: "green-a", x: 2, y: 5, shape: shape("XXXX", ".XX."), color: "green" },
    ],
  },
  {
    id: 12,
    name: "卷帘初识",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 9,
    featureIntro: {
      title: "神秘卷帘！",
      description: "完成卷帘上的清除数，隐藏区域才会打开。",
      kind: "shutter",
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 4, size: 4, color: "green" },
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 6, height: 4, count: 2 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 6, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "red-hidden", x: 1, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "green-hidden", x: 4, y: 2, shape: rect(3, 2), color: "green", shutterId: "shutter-a" },
    ],
  },
  {
    id: 13,
    name: "冰火交错",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 8,
    blocked: [[3, 2], [4, 2], [3, 5], [4, 5]],
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 3, size: 2, color: "purple", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 1, size: 3, color: "cyan", frozen: 2 },
      { id: "pink-bottom", side: "bottom", offset: 4, size: 3, color: "pink", frozen: 3 },
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "purple-a", x: 3, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "cyan-a", x: 6, y: 1, shape: rect(2, 2), color: "cyan" },
      { id: "pink-a", x: 4, y: 6, shape: rect(3, 2), color: "pink" },
    ],
  },
  {
    id: 14,
    name: "双道峡谷",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 9,
    blocked: [[3, 2], [4, 2], [3, 6], [4, 6]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 5, size: 3, color: "blue" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 2), color: "yellow" },
      { id: "green-a", x: 4, y: 4, shape: rect(2, 2), color: "green" },
      { id: "blue-a", x: 5, y: 7, shape: rect(3, 2), color: "blue" },
    ],
  },
  {
    id: 15,
    name: "内外换色",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 70,
    parMoves: 6,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 2, color: "purple" },
      { id: "cyan-top", side: "top", offset: 3, size: 2, color: "cyan" },
      { id: "orange-top", side: "top", offset: 6, size: 2, color: "orange" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" },
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "yellow"] },
      { id: "layer-b", x: 3, y: 0, shape: rect(2, 2), color: "cyan", layers: ["cyan", "green"] },
      { id: "layer-c", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "pink"] },
    ],
  },
  {
    id: 16,
    name: "冰层伪装",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 90,
    parMoves: 4,
    width: 8,
    height: 8,
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 2, color: "yellow" },
      { id: "blue-top", side: "top", offset: 2, size: 2, color: "blue", frozen: 1 },
      { id: "red-right", side: "right", offset: 3, size: 2, color: "red", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 3 },
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "layer-a", x: 2, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "red"] },
      { id: "green-ice", x: 3, y: 6, shape: rect(3, 2), color: "green", frozen: 3 },
    ],
  },
  {
    id: 17,
    name: "卷帘初战",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 90,
    parMoves: 5,
    width: 8,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "orange-bottom", side: "bottom", offset: 0, size: 3, color: "orange" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 4, size: 4, color: "green" },
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 6, height: 4, count: 3 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 6, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "orange-a", x: 0, y: 7, shape: rect(3, 2), color: "orange" },
      { id: "red-hidden", x: 1, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "green-hidden", x: 4, y: 2, shape: rect(3, 2), color: "green", shutterId: "shutter-a" },
    ],
  },
  {
    id: 18,
    name: "十字枢纽",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 80,
    parMoves: 5,
    width: 9,
    height: 9,
    blocked: [[4, 2], [4, 3], [4, 5], [4, 6]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 3, size: 3, color: "blue" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: rect(2, 2), color: "red" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 1), color: "yellow" },
      { id: "green-a", x: 5, y: 4, shape: rect(2, 1), color: "green" },
      { id: "blue-a", x: 3, y: 7, shape: rect(3, 2), color: "blue" },
    ],
  },
  {
    id: 19,
    name: "冷冻双门",
    difficulty: "super",
    timeSeconds: 120,
    reward: 110,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 2, size: 2, color: "purple", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 1, size: 3, color: "cyan", frozen: 2 },
      { id: "pink-bottom", side: "bottom", offset: 4, size: 3, color: "pink", frozen: 3 },
      { id: "green-left", side: "left", offset: 5, size: 3, color: "green", frozen: 4 },
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "purple-a", x: 2, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "cyan-a", x: 6, y: 1, shape: rect(2, 2), color: "cyan" },
      { id: "pink-a", x: 4, y: 6, shape: rect(3, 2), color: "pink" },
      { id: "green-a", x: 0, y: 5, shape: rect(2, 2), color: "green" },
    ],
  },
  {
    id: 20,
    name: "双重卷帘",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 110,
    parMoves: 5,
    width: 9,
    height: 10,
    gates: [
      { id: "yellow-left", side: "left", offset: 6, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 6, size: 3, color: "blue" },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 3, color: "purple" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "orange-top", side: "top", offset: 6, size: 3, color: "orange" },
    ],
    shutters: [
      { id: "shutter-a", x: 0, y: 0, width: 4, height: 4, count: 2 },
      { id: "shutter-b", x: 5, y: 0, width: 4, height: 4, count: 3 },
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 6, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 6, shape: rect(2, 2), color: "blue" },
      { id: "purple-a", x: 3, y: 8, shape: rect(3, 2), color: "purple" },
      { id: "red-hidden", x: 0, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "orange-hidden", x: 7, y: 0, shape: rect(2, 2), color: "orange", shutterId: "shutter-b" },
    ],
  },
  {
    id: 21,
    name: "双层换轨",
    difficulty: "super",
    timeSeconds: 120,
    reward: 130,
    parMoves: 4,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 2, color: "purple" },
      { id: "orange-top", side: "top", offset: 6, size: 2, color: "orange" },
      { id: "cyan-left", side: "left", offset: 2, size: 3, color: "cyan" },
      { id: "pink-right", side: "right", offset: 2, size: 3, color: "pink" },
      { id: "yellow-bottom", side: "bottom", offset: 0, size: 3, color: "yellow" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 3, color: "green" },
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "yellow"] },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "green"] },
    ],
  },
  {
    id: 22,
    name: "冻结双层",
    difficulty: "super",
    timeSeconds: 120,
    reward: 140,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "blue-left", side: "left", offset: 0, size: 2, color: "blue" },
      { id: "red-top", side: "top", offset: 2, size: 2, color: "red" },
      { id: "purple-right", side: "right", offset: 2, size: 2, color: "purple" },
      { id: "cyan-bottom", side: "bottom", offset: 4, size: 3, color: "cyan" },
      { id: "green-bottom", side: "bottom", offset: 0, size: 2, color: "green" },
    ],
    blocks: [
      { id: "blue-a", x: 0, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "cyan"] },
      { id: "layer-a", x: 2, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "purple"], frozen: 1 },
      { id: "green-ice", x: 0, y: 6, shape: rect(2, 2), color: "green", frozen: 4 },
    ],
  },
  {
    id: 23,
    name: "环形石柱",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 100,
    parMoves: 5,
    width: 9,
    height: 10,
    blocked: [[4, 2], [4, 3], [4, 6], [4, 7]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "orange-left", side: "left", offset: 3, size: 3, color: "orange" },
      { id: "cyan-right", side: "right", offset: 4, size: 3, color: "cyan" },
      { id: "pink-bottom", side: "bottom", offset: 0, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 6, size: 3, color: "green" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "orange-a", x: 2, y: 3, shape: shape("XX", "X."), color: "orange" },
      { id: "cyan-a", x: 5, y: 4, shape: shape("XX", ".X"), color: "cyan" },
      { id: "pink-a", x: 0, y: 8, shape: rect(3, 2), color: "pink" },
      { id: "green-a", x: 6, y: 8, shape: rect(3, 2), color: "green" },
    ],
  },
  {
    id: 24,
    name: "帘后换色",
    difficulty: "super",
    timeSeconds: 120,
    reward: 150,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" },
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 2 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "layer-a", x: 1, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "orange"], shutterId: "shutter-a" },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "green"], shutterId: "shutter-a" },
    ],
  },
  {
    id: 25,
    name: "彩色检阅",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 80,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 2, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 3, color: "blue" },
      { id: "pink-bottom", side: "bottom", offset: 6, size: 3, color: "pink" },
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: rect(2, 2), color: "red" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "yellow-a", x: 0, y: 2, shape: rect(2, 2), color: "yellow" },
      { id: "green-a", x: 7, y: 2, shape: rect(2, 2), color: "green" },
      { id: "blue-a", x: 0, y: 7, shape: rect(2, 2), color: "blue" },
      { id: "pink-a", x: 7, y: 7, shape: rect(2, 2), color: "pink" },
    ],
  },
  {
    id: 26,
    name: "冰封迷宫",
    difficulty: "super",
    timeSeconds: 120,
    reward: 150,
    parMoves: 5,
    width: 9,
    height: 9,
    blocked: [[4, 2], [4, 3], [4, 5], [4, 6]],
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan", frozen: 2 },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple", frozen: 3 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 4 },
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "red-a", x: 2, y: 0, shape: rect(2, 2), color: "red" },
      { id: "cyan-a", x: 5, y: 3, shape: rect(2, 2), color: "cyan" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "green-a", x: 3, y: 7, shape: rect(3, 2), color: "green" },
    ],
  },
  {
    id: 27,
    name: "双层接力",
    difficulty: "super",
    timeSeconds: 120,
    reward: 160,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "orange-top", side: "top", offset: 3, size: 2, color: "orange" },
      { id: "purple-top", side: "top", offset: 7, size: 2, color: "purple" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" },
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "yellow"] },
      { id: "layer-b", x: 3, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "green"] },
      { id: "layer-c", x: 7, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "cyan"] },
    ],
  },
  {
    id: 28,
    name: "六门倒计时",
    difficulty: "super",
    timeSeconds: 120,
    reward: 170,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 2, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red", frozen: 1 },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 },
      { id: "purple-top", side: "top", offset: 7, size: 2, color: "purple", frozen: 3 },
      { id: "pink-bottom", side: "bottom", offset: 7, size: 2, color: "pink", frozen: 4 },
      { id: "green-right", side: "right", offset: 4, size: 3, color: "green", frozen: 5 },
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "red-a", x: 2, y: 0, shape: rect(2, 2), color: "red" },
      { id: "blue-a", x: 0, y: 7, shape: rect(2, 2), color: "blue" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "pink-a", x: 7, y: 7, shape: rect(2, 2), color: "pink" },
      { id: "green-a", x: 7, y: 4, shape: rect(2, 2), color: "green" },
    ],
  },
  {
    id: 29,
    name: "帘幕核心",
    difficulty: "super",
    timeSeconds: 120,
    reward: 180,
    parMoves: 5,
    width: 9,
    height: 9,
    gates: [
      { id: "orange-left", side: "left", offset: 5, size: 3, color: "orange" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue", frozen: 1 },
      { id: "purple-top", side: "top", offset: 0, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" },
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 2 }],
    blocks: [
      { id: "orange-a", x: 0, y: 5, shape: rect(2, 2), color: "orange" },
      { id: "blue-a", x: 7, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "layer-hidden", x: 1, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "yellow"], shutterId: "shutter-a" },
      { id: "green-hidden", x: 5, y: 2, shape: rect(3, 2), color: "green", frozen: 4, shutterId: "shutter-a" },
    ],
  },
  {
    id: 30,
    name: "总控核心",
    difficulty: "super",
    timeSeconds: 120,
    reward: 250,
    parMoves: 8,
    width: 9,
    height: 10,
    gates: [
      { id: "yellow-left", side: "left", offset: 6, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 6, size: 3, color: "blue", frozen: 1 },
      { id: "pink-bottom", side: "bottom", offset: 2, size: 3, color: "pink", frozen: 2 },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan" },
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 3 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 6, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 6, shape: rect(2, 2), color: "blue" },
      { id: "pink-a", x: 2, y: 8, shape: rect(3, 2), color: "pink" },
      { id: "layer-a", x: 1, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "orange"], shutterId: "shutter-a" },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "green"], shutterId: "shutter-a" },
      { id: "cyan-final", x: 7, y: 4, shape: rect(2, 2), color: "cyan", frozen: 7 },
    ],
  },
];

/**
 * The executable campaign is the single v8 competitor-video parity data set.
 * BASE_LEVELS above remains only as a legacy prototype fixture for its
 * separately authored solution test; it is not composed into production.
 */
// Runtime level ids now map directly to the same competitor level ids.  The
// former Lv2/Lv5 swap made both levels fail their exact opening/full inventory
// contracts even though each authored source was already correct.
export const VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER = Array.from(
  { length: 100 },
  (_, index) => index + 1,
);

const VIDEO_PARITY_CAMPAIGN_LEVELS_1_TO_100: LevelSpec[] = VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER.map((sourceId, index) => {
  const id = index + 1;
  const source = VIDEO_PARITY_LEVELS[sourceId - 1];
  if (!source) throw new Error(`Missing video-parity source Lv${sourceId}`);
  const level = normalizeRuntimeLevel({
    ...source,
    id,
    designTargets: {
      formulaVersion: "blockout-d1",
      calibratedDifficulty: campaignTargetD1(id),
      minimumRepositionOverhead: campaignRepositionFloor(id),
    },
  });
  return {
    ...level,
    generators: level.generators?.map((generator) => {
      const geometry = getVideoParityGeneratorRimGeometry(level.id, generator.id);
      if (!geometry) return generator;
      return {
        ...generator,
        side: geometry.side,
        offset: geometry.offset,
        rimSpan: geometry.rimSpan,
        rimMount: geometry.rimMount,
        ...(geometry.anchor ? { rimAnchor: { ...geometry.anchor } } : {}),
      };
    }),
  };
});

/**
 * Lv101–200 is a deterministic structural projection of the supplied
 * competitor videos. It intentionally carries no solver witness or inferred
 * difficulty target; the generated audit records every geometry/design fill.
 */
export const LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY: LevelSpec[] = [
  ...VIDEO_PARITY_CAMPAIGN_LEVELS_1_TO_100,
  ...VIDEO_PARITY_LEVELS_101_TO_200.map(normalizeRuntimeLevel),
].map(repairLevelForSolvability);

export const LEVELS_BEFORE_SHUTTER_REGION_REPAIR: LevelSpec[] = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY
  .map(applySingleBlockAdjacencyRepair)
  .map(applyLevel19Regeneration)
  .map(applyLevel20Regeneration)
  .map(applyAllBlockAdjacencyRepair)
  .map(applyLevel21ShutterRepair)
  .map(applyPost100ShutterCoverageRepair);

export const LEVELS_BEFORE_MECHANISM_ATTRIBUTE_REPAIR: LevelSpec[] = LEVELS_BEFORE_SHUTTER_REGION_REPAIR
  .map(applyShutterRegionRepair)
  .map(applyMechanismParityRepair1To100)
  .map(applyMechanismParityRepair101To200)
  .map(applyMechanismParityShutterRegionRepair);

export const LEVELS_BEFORE_PALETTE_AWARE_EXIT_CONTRACT: LevelSpec[] = LEVELS_BEFORE_MECHANISM_ATTRIBUTE_REPAIR
  .map(applyMechanismAttributeRepair)
  .map(applyOpeningVisibilityCohortRepair)
  .map(applyFinalGeneratorContracts);

export const LEVELS_BEFORE_ALL_BLOCK_OPENING_SOLVABILITY_REPAIR: LevelSpec[] = LEVELS_BEFORE_PALETTE_AWARE_EXIT_CONTRACT
  .map(applyPaletteAwareExitContracts);

export const LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR: LevelSpec[] = LEVELS_BEFORE_ALL_BLOCK_OPENING_SOLVABILITY_REPAIR
  .map(applyAllBlockOpeningSolvabilityRepair);

export const LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT: LevelSpec[] = LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR
  .map(applyOpeningBlockCountRepair);

export const LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR: LevelSpec[] = LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT
  .map(applyPlayerFacingShutterCountContract);

export const LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR: LevelSpec[] = LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR
  .map(applyMechanismAttributeStructuralRepair);

export const LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR: LevelSpec[] = LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR
  .map(applyBoardTopologyRepair);

export const LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100: LevelSpec[] = LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR
  .map(applyShutterGeometryCoverageRepair);

export const LEVELS_BEFORE_GENERATOR_ROUTE_SOLVABILITY_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100
  .map(applyCompetitorExactShutterGeometryRepairPost100);

export const LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR: LevelSpec[] = LEVELS_BEFORE_GENERATOR_ROUTE_SOLVABILITY_REPAIR
  .map(applyGeneratorRouteSolvabilityRepair);

export const LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR: LevelSpec[] = LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR
  .map(applyGeneratorSpawnAlignmentRepair);

export const LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR: LevelSpec[] = LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR
  .map(applyOpeningBlockCountExpansionRepair);

export const LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR: LevelSpec[] = LEVELS_BEFORE_OPENING_BLOCK_COUNT_SECOND_BATCH_REPAIR
  .map(applyOpeningBlockCountSecondBatchRepair);

export const LEVELS_BEFORE_GENERATOR_OPENING_BRIDGE_REPAIR: LevelSpec[] = LEVELS_BEFORE_LEVEL41_GENERATOR_OPENING_BRIDGE_REPAIR
  .map(applyLevel41GeneratorOpeningBridgeRepair);

export const LEVELS_BEFORE_COMPETITOR_BOARD_OUTLINE_REPAIR: LevelSpec[] = LEVELS_BEFORE_GENERATOR_OPENING_BRIDGE_REPAIR
  .map(applyGeneratorOpeningBridgeRepair);

export const LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_BOARD_OUTLINE_REPAIR
  .map(applyCompetitorBoardOutlineRepair);

export const LEVELS_BEFORE_COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR
  .map(applyCompetitorEarlyJointMaskRepair);

export const LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR
  .map(applyCompetitorLevel33DiamondMaskRepair);

export const LEVELS_BEFORE_COMPETITOR_SHUTTER_CONTRACT_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR
  .map(applyCompetitorLateBoardMaskRepair);

export const LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_SHUTTER_CONTRACT_REPAIR
  .map(applyCompetitorShutterContractRepair);

export const LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_HARD_BOARD_MASK_REPAIR
  .map(applyCompetitorHardBoardMaskRepair);

export const LEVELS_BEFORE_COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR
  .map(applyCompetitorExactShutterTruthRepair);

export const LEVELS_BEFORE_COMPETITOR_LOCAL_PORTAL_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR
  .map(applyCompetitorCertifiedExactGeometryRepair);

export const LEVELS_BEFORE_COMPETITOR_DISCONNECTED_BOARD_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LOCAL_PORTAL_REPAIR
  .map(applyCompetitorLocalPortalRepair);

export const LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_DISCONNECTED_BOARD_REPAIR
  .map(applyCompetitorDisconnectedBoardRepair);

export const LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_REPAIR
  .map(applyCompetitorLateMechanismRepair);

export const LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_EXIT_CONTRACTS_1_TO_100
  .map(applyCompetitorLateExitContract1To100);

export const LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EXIT_STRUCTURAL_BATCH_A
  .map(applyCompetitorExitStructuralBatchA);

export const LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_B_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A
  .map(applyCompetitorShutterStructuralBatchA);

export const LEVELS_BEFORE_COMPETITOR_LEVEL_75_SHELL_REPAIR: LevelSpec[] = LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_B_REPAIR
  .map(applyOpeningCompositionBatchBRepair);

export const LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LEVEL_75_SHELL_REPAIR
  .map(applyCompetitorLevel75ShellRepair);

export const LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_C_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B
  .map(applyCompetitorShutterStructuralBatchB);

export const LEVELS_BEFORE_COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH: LevelSpec[] = LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_C_REPAIR
  .map(applyOpeningCompositionBatchCRepair);

export const LEVELS_BEFORE_COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH
  .map(applyCompetitorLateFlipDoorStructuralBatch);

export const LEVELS_BEFORE_COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A
  .map(applyCompetitorNumericIceStructuralBatchA);

export const LEVELS_BEFORE_COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH
  .map(applyCompetitorStarExitStructuralBatch);

export const LEVELS_BEFORE_COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B
  .map(applyCompetitorEarlyExitStructuralBatchB);

export const LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P
  .map(applyCompetitorEarlyMidResidualBatchP);

export const LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C
  .map(applyCompetitorMidExitStructuralBatchC);

export const LEVELS_BEFORE_COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D
  .map(applyCompetitorMidExitStructuralBatchD);

export const LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J
  .map(applyCompetitorLateExitStructuralBatchJ);

export const LEVELS_BEFORE_COMPETITOR_LATE_STRUCTURAL_BATCH_M: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L
  .map(applyCompetitorLateMechanismStructuralBatchL);

export const LEVELS_BEFORE_FINAL_OUTLINE_ONLY_BOARD_REPAIR: LevelSpec[] = LEVELS_BEFORE_COMPETITOR_LATE_STRUCTURAL_BATCH_M
  .map(applyCompetitorLateStructuralBatchM);

export const LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR: LevelSpec[] = LEVELS_BEFORE_FINAL_OUTLINE_ONLY_BOARD_REPAIR
  .map(applyFinalOutlineOnlyBoardRepair);

export const LEVELS_BEFORE_EARLY_EXIT_DIFFICULTY_REPAIR: LevelSpec[] = LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR
  .map(applyGeneratorFrozenCargoRepair);

export const LEVELS_BEFORE_LEVEL_ORDER_SWAP: LevelSpec[] = LEVELS_BEFORE_EARLY_EXIT_DIFFICULTY_REPAIR
  .map(applyEarlyExitDifficultyRepair);

// Apply player-facing order changes after all source-ID-specific repairs.
// The puzzle, rewards, introductions and star targets travel together; save
// progress and navigation remain attached to the destination level number.
export const LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION: LevelSpec[] = LEVELS_BEFORE_LEVEL_ORDER_SWAP.map((level, _index, levels) => {
  const sourceId = level.id === 2 ? 5 : level.id === 5 ? 2 : level.id;
  if (sourceId === level.id) return level;
  return { ...levels.find((source) => source.id === sourceId)!, id: level.id };
});

// User-authorized v1.10 integration must run after every legacy ID-specific
// repair. Unreviewed levels and Lv1–20 retain the exact existing data.
export const LEVELS_BEFORE_REVISED_CONTINUATION: LevelSpec[] = LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION.map(applyRevisedReviewedLevel);
export const LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION: LevelSpec[] = LEVELS_BEFORE_REVISED_CONTINUATION.map(applyRevisedContinuationLevel);
// v1.13 changes only when flip-door events settle. Preserve every authored
// layout, time, reward and star target, and keep Lv1–20 on their old profile.
export const LEVELS_BEFORE_TIME_FREEZE: LevelSpec[] = LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION.map((level) => (
  level.id >= 21 && level.id <= 200
    ? { ...level, mechanismRules: "revised-2026-09-23-v1.3" }
    : level
));
// v1.14 replaces the time item with a ten-second clock/bomb freeze. Keep
// authored puzzle data and legacy spatial rules intact during migration.
export const LEVELS_BEFORE_LEVEL21_REPOSITION: LevelSpec[] = LEVELS_BEFORE_TIME_FREEZE.map((level) => (
  level.id >= 21 && level.id <= 200
    ? { ...level, mechanismRules: "revised-2026-09-23-v1.4" }
    : level
));

// v1.15: the newly authorized Lv21 block-only redesign has its own bound and
// full input-route evidence; preserve every earlier stage for old certificates.
export const LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL21_REPOSITION.map(applyLevel21Reposition);

// v1.20: the complete authorized 21–30 remake comes after every historical
// repair; old layouts remain available for their independently pinned tests.
export const LEVELS_BEFORE_MULTI_BLOCK_REMAKE: LevelSpec[] = LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE.map(applyMechanismFocusRemake);

// v1.21 replaces the single-cell-heavy draft with reviewed multi-cell spatial
// decisions and unlocked mechanism combinations. Preserve historical stages.
export const LEVELS_BEFORE_RHYTHM_REMAKE: LevelSpec[] = LEVELS_BEFORE_MULTI_BLOCK_REMAKE.map(applyMultiBlockRemake);

// v1.25–v1.27: four-band cadence, fully filled hidden regions and independently
// verified raised mechanism counts. All other 190 levels retain their identity.
export const LEVELS_BEFORE_RHYTHM31_40_REMAKE: LevelSpec[] = LEVELS_BEFORE_RHYTHM_REMAKE.map(applyRhythmRemake);

// v1.28 continues into31-40. Generator teaching35 shifts the old super slot
// beyond this batch; retain the original physical boards and actual star goals.
// Keep the completed historical campaign stage available to its own regression
// fixtures when the separately verified v1.39 21–30 replacement is adopted.
export const LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE: LevelSpec[] = LEVELS_BEFORE_RHYTHM31_40_REMAKE.map(applyRhythmRemake31to40);
export const LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE: LevelSpec[] = LEVELS_BEFORE_MECHANISM_PRACTICE_REMAKE.map(applyMechanismPracticeRemake);
// v1.40 changes only the four named layouts; retain the v1.39 stage for its witnesses.
export const LEVELS_BEFORE_NATIVE_BLOCK_REPAIR: LevelSpec[] = LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE.map(applyLayoutOriginalityRemake);
// v1.43 only replaces the twelve authorized native-art footprints; Lv5 stays legacy.
export const LEVELS_BEFORE_181_190_REMAKE: LevelSpec[] = LEVELS_BEFORE_NATIVE_BLOCK_REPAIR.map(applyNativeBlockRepair);
export const LEVELS_BEFORE_31_40_NATIVE_REMAKE: LevelSpec[] = LEVELS_BEFORE_181_190_REMAKE.map(applyRemake181to190);
export const LEVELS_BEFORE_71_80_REMAKE: LevelSpec[] = LEVELS_BEFORE_31_40_NATIVE_REMAKE.map(applyNativeRemake31to40);
export const LEVELS_BEFORE_61_70_REMAKE: LevelSpec[] = LEVELS_BEFORE_71_80_REMAKE.map(applyRemake71to80);
// v1.45: independently validated 61–70; preserve preceding batches verbatim.
export const LEVELS_BEFORE_41_50_REMAKE: LevelSpec[] = LEVELS_BEFORE_61_70_REMAKE.map(applyRemake61to70);
export const LEVELS_BEFORE_51_60_REMAKE: LevelSpec[] = LEVELS_BEFORE_41_50_REMAKE.map(applyRemake41to50);
export const LEVELS_BEFORE_91_100_REMAKE: LevelSpec[] = LEVELS_BEFORE_51_60_REMAKE.map(applyRemake51to60);
export const LEVELS_BEFORE_81_90_REMAKE: LevelSpec[] = LEVELS_BEFORE_91_100_REMAKE.map(applyRemake91to100);
export const LEVELS_BEFORE_111_120_REMAKE: LevelSpec[] = LEVELS_BEFORE_81_90_REMAKE.map(applyRemake81to90);
export const LEVELS_BEFORE_101_110_REMAKE: LevelSpec[] = LEVELS_BEFORE_111_120_REMAKE.map(applyRemake111to120);
export const LEVELS_BEFORE_AXIS_RECTANGULAR_REPAIR: LevelSpec[] = LEVELS_BEFORE_101_110_REMAKE.map(applyRemake101to110);
// v1.60 repairs the ten axis-on-irregular blocks after every level-specific
// remake, so the audit and the solver both consume the final production object.
export const LEVELS_BEFORE_LEVEL43_REPAIR: LevelSpec[] = LEVELS_BEFORE_AXIS_RECTANGULAR_REPAIR.map(applyAxisRectangularRepairs);
// v1.63: repair only the structurally deadlocked Lv43 opening chain.
export const LEVELS_BEFORE_LEVEL63_REPAIR: LevelSpec[] = LEVELS_BEFORE_LEVEL43_REPAIR.map(applyLevel43Repair);
// v1.64: regenerate Lv63 after the corrected green opening-exit contract.
export const LEVELS_BEFORE_LEVEL66_93_97_REPAIR: LevelSpec[] = LEVELS_BEFORE_LEVEL63_REPAIR
  .map(applyLevel63Repair)
  .map(applyLevel66Repair)
  .map(applyLevel93Repair)
  .map(applyLevel97Repair);
// v1.67: resolve the current Lv72 parking deadlock without changing its board contract.
export const LEVELS_BEFORE_LEVEL72_REPAIR: LevelSpec[] = LEVELS_BEFORE_LEVEL66_93_97_REPAIR.map(applyLevel72Repair);
// v1.72: validated 131–140 members are applied after historical repairs.
export const LEVELS_BEFORE_131_140_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL72_REPAIR;
export const LEVELS_BEFORE_121_130_REMAKE: LevelSpec[] = LEVELS_BEFORE_131_140_REMAKE.map(applyRemake131to140);
export const LEVELS_BEFORE_141_150_REMAKE: LevelSpec[] = LEVELS_BEFORE_121_130_REMAKE.map(applyRemake121to130);
export const LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR: LevelSpec[] = LEVELS_BEFORE_141_150_REMAKE.map(applyRemake141to150);
// v1.76: the hidden lift layer supplies its own ice-thaw events, even when revealed last.
export const LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR.map(applyLevel66LateLiftRepair);
// v1.77: only Lv9 adopts the original outline and its verified 26-drag star target.
export const LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE.map(applyLevel9OriginalRemake);
// v1.80: only Lv11 adopts the original outline and verified 12-setup-drag exception.
export const LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE.map(applyLevel11OriginalRemake);
// v1.82: only Lv12 adopts the source-colored tower and verified 28-drag star target.
export const LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE.map(applyLevel12OriginalRemake);
// v1.83: only Lv15 adopts the original hammer and simple single-shell teaching.
export const LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL15_ORIGINAL_REMAKE.map(applyLevel15OriginalRemake);
// v1.84: only Lv16 adopts its original outline, complete source inventory and normal band.
export const LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL16_ORIGINAL_REMAKE.map(applyLevel16OriginalRemake);
// v1.87: original Lv20 rectangle, unique colors and certified five repositions.
export const LEVELS_BEFORE_FROZEN_FLIP: LevelSpec[] = LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE.map(applyLevel20OriginalRemake);
// v1.90: freeze pauses a flip door's phase. Only affected final levels adopt
// the new profile; historical stages, layouts and all other levels stay intact.
export const LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE: LevelSpec[] = LEVELS_BEFORE_FROZEN_FLIP.map((level) => (
  level.flipDoors?.some((door) => (door.frozen ?? 0) > 0)
    ? { ...level, mechanismRules: ACTIVE_MECHANISM_PROFILE }
    : level
));

// v1.93: only Lv70 gains two midgame generators and the verified 51-drag star target.
export const LEVELS_BEFORE_151_160_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE.map(applyLevel70GeneratorRemake);
export const LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR: LevelSpec[] = LEVELS_BEFORE_151_160_REMAKE.map(applyRemake151to160);
// v1.104: only Lv78's hidden cargo changes; retain the prior stage and evidence.
export const LEVELS_BEFORE_161_170_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.map(applyLevel78LateLiftRepair);
export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);
export const LEVELS_BEFORE_171_180_REMAKE: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);
// The accepted 201–210 formal-data registry remains separate from production.
// The campaign, meta and saved-progress boundaries stay at 200 levels.
const applyLevelOneCornerTutorial = (level: LevelSpec): LevelSpec => {
  if (level.id !== 1) return level;

  // Keep the first lesson visually simple: three authored square pieces sit
  // in three board corners. The blue piece starts in the upper-left and the
  // hand traces its verified horizontal opening route to the right exit;
  // the other two pieces provide the follow-up moves.
  return {
    ...level,
    blocks: level.blocks.map((block) => (
      block.id === "cc-001-b1-01" ? { ...block, x: 0, y: 0 }
        : block.id === "cc-001-b1-02" ? { ...block, x: 0, y: 3 }
          : block.id === "cc-001-b1-03" ? { ...block, x: 3, y: 3 }
            : block
    )),
    onboardingHint: {
      blockId: "cc-001-b1-01",
      path: [[1, 0], [2, 0], [3, 0]],
    },
  };
};

export const LEVELS: LevelSpec[] = LEVELS_BEFORE_171_180_REMAKE
  .map(applyRemake171to180)
  .map((level) => level.id === 7
    ? {
      ...level,
      // v1.139: make the authored rescue state a real layout deadlock. Move
      // the red blocker into the upper lane and park the second pink block at
      // the far edge; after the pink opener leaves, no pink block can reach
      // the top exit until the red 2x2 rescue target is removed.
      blocks: level.blocks.map((block) => block.id === "strategy-guard-05"
        ? { ...block, x: 4, y: 0 }
        : block.id === "cc-piece-06"
          ? { ...block, x: 2, y: 0 }
          : block),
      // Lv7 intentionally reaches a no-exit deadlock as soon as the opening
      // pink departure settles. The rocket rescue removes the authored red
      // 2x2 (four-cell) target and leaves the verified completion route.
      rocketRescue: {
        trigger: "no-exit-deadlock" as const,
        targetBlockId: "strategy-guard-12",
        deadlockBlockId: "cc-piece-03",
        deadlockPosition: [1, 0] as const,
      },
    }
    : level.id === 10
      ? {
        ...level,
        // Lv10's lower-left frozen block is intentionally held at one by the
        // model until the pulse rescue is used. This makes the authored pulse
        // tutorial mandatory while preserving the verified completion route.
        blocks: level.blocks.map((block) => block.id === "cc-010-b1-15"
          ? { ...block, frozen: 25 }
          : block),
        pulseRescue: {
          trigger: "frozen-one" as const,
          targetBlockId: "cc-010-b1-15",
          targetPosition: [0, 6] as const,
          requiredFrozen: 25,
        },
      }
      : level)
  .map(applyLevelOneCornerTutorial);

// Expose continuation records without widening the production campaign.
export {
  REMADE_201_210_LEVELS,
  CONTINUATION_LEVELS_201_210,
  FORMAL_201_210_LEVELS,
  FORMAL_ISOLATED_201_210_LEVELS,
  FORMAL_201_210_EVIDENCE,
  getFormal201to210LevelStrict,
} from './remake201to210';
export { REMADE_211_220_LEVELS, CONTINUATION_LEVELS_211_220, FORMAL_211_220_LEVELS, FORMAL_211_220_EVIDENCE, getFormal211to220LevelStrict } from './remake211to220';
export { REMADE_221_230_LEVELS, CONTINUATION_LEVELS_221_230, FORMAL_221_230_LEVELS, FORMAL_221_230_EVIDENCE, getFormal221to230LevelStrict } from './remake221to230';

export const getLevelStrict = (id: number): LevelSpec => {
  const normalized = Number(id);
  if (!Number.isInteger(normalized)) throw new RangeError(`Unknown level id ${id}; expected an integer from 1-${LEVELS.length}`);
  const level = LEVELS.find((candidate) => candidate.id === normalized);
  if (!level) throw new RangeError(`Unknown level id ${id}; expected 1-${LEVELS.length}`);
  return level;
};

export const getLevel = (id: number): LevelSpec => getLevelStrict(
  Math.max(1, Math.min(LEVELS.length, Math.floor(Number(id)) || 1)),
);
