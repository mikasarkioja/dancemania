/**
 * Practice feature: student webcam capture and analysis.
 * Export components and hooks used by /practice routes.
 */

export { PracticeCapture } from "./components/PracticeCapture";
export { PracticePlayer } from "./components/PracticePlayer";
export {
  getSessionCoachingFeedback,
  type SessionCoachingFeedback,
  type ComparisonJointGroup,
} from "./actions/session-actions";
