/**
 * Admin feature: upload and label teacher videos (dance_library).
 * Export components and server actions used by /admin routes.
 */

export { AdminVideoUpload } from "./admin-video-upload";
export { AdminUpload } from "./components/AdminUpload";
export { PartnerOverlay } from "./components/PartnerOverlay";
export { VideoLabeler } from "./components/VideoLabeler";
export { VideoReviewer } from "./components/VideoReviewer";
export {
  AdminVerificationTinder,
  suggestedLabelToProposal,
  suggestedSegmentToProposal,
  type AI_PROPOSAL,
} from "./components/AdminVerificationTinder";
export { LabelVerificationCard } from "./components/LabelVerificationCard";
export { LabelVerificationStack } from "./components/LabelVerificationStack";
export { LabelVerificationStackMAL } from "./components/LabelVerificationStackMAL";
