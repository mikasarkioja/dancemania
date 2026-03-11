/**
 * Engines: comparison and beat-sync logic.
 * Operate on PoseData / MotionDNA (no raw video).
 */

export { compareMotion } from "./compare-motion";
export { getBeatSyncMetrics } from "./beat-sync";
export {
  getMidHip,
  findBestMatch,
  LEFT_HIP_KEY,
  RIGHT_HIP_KEY,
} from "./mid-hip";
export type { MidHipPoint } from "./mid-hip";
export {
  mockFetchMovesByKeyword,
  findMatchingMove,
  suggestPendingMove,
} from "./scout";
export type {
  ScrapedMove,
  MotionClusterSignature,
  PendingMoveSuggestion,
} from "./scout";
export {
  computeAverageJointAngles,
  computeVelocityCurves,
  computeHipTiltCurve,
  computeFootVelocityCurve,
  computeMoveSignature,
  dtwSimilarity,
  compareSignatureToRegistry,
} from "./signature-calculator";
export type {
  AverageJointAngles,
  VelocityCurve,
  MoveSignature,
} from "./signature-calculator";
export {
  identifyCandidateMoves,
} from "./candidate-move-job";
export type { RegistryReference, CandidateMoveResult } from "./candidate-move-job";
export {
  ribcageCircleMagnitude,
  pelvicDropCurve,
  headSpotVariance,
  lateralAnkleVelocityCurve,
  leadFollowDistanceCurve,
  compressionTensionRate,
  classifyKineticChain,
} from "./kinetic-chain-metrics";
