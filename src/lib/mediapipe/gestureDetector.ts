import {
  Landmark,
  WRIST,
  INDEX_TIP,
  INDEX_DIP,
  INDEX_PIP,
  INDEX_MCP,
  MIDDLE_TIP,
  MIDDLE_DIP,
  MIDDLE_PIP,
  MIDDLE_MCP,
  RING_TIP,
  RING_DIP,
  RING_PIP,
  RING_MCP,
  PINKY_TIP,
  PINKY_DIP,
  PINKY_PIP,
  PINKY_MCP,
  THUMB_TIP,
  THUMB_IP,
  THUMB_MCP,
  isFingerExtended,
  isFingerCurled,
  smoothLandmarks,
  computeVelocityY,
} from "./landmarkUtils";

export interface GestureResult {
  isFingerGun: boolean;
  flickVelocity: number;
  indexTipX: number;
  indexTipY: number;
}

// Hysteresis: require N consecutive agreeing frames before switching state
const POSE_ON_FRAMES = 2;   // frames to confirm gun pose
const POSE_OFF_FRAMES = 4;  // frames to confirm gun pose lost (more lenient)

// EMA smoothing factor for landmarks (0 = frozen, 1 = raw/no smoothing)
// Higher = more responsive but jittery, lower = smoother but laggy
const LANDMARK_SMOOTH_ALPHA = 0.55;

export class GestureDetector {
  private yHistory: number[] = [];
  private readonly maxHistory = 7;
  private smoothedLandmarks: Landmark[] | null = null;
  private poseState = false;          // current confirmed pose state
  private poseCandidate = false;      // what the raw detection is saying
  private poseCandidateFrames = 0;    // how many frames candidate has been consistent

  update(landmarks: Landmark[]): GestureResult {
    if (!landmarks || landmarks.length < 21) {
      this.smoothedLandmarks = null;
      return { isFingerGun: false, flickVelocity: 0, indexTipX: 0.5, indexTipY: 0.5 };
    }

    // Smooth landmarks to reduce jitter
    const smoothed = smoothLandmarks(this.smoothedLandmarks, landmarks, LANDMARK_SMOOTH_ALPHA);
    this.smoothedLandmarks = smoothed;

    const wrist = smoothed[WRIST];

    // Check finger-gun pose using joint angles
    const indexExtended = isFingerExtended(
      smoothed[INDEX_TIP], smoothed[INDEX_DIP], smoothed[INDEX_PIP], smoothed[INDEX_MCP], wrist
    );

    const middleCurled = isFingerCurled(
      smoothed[MIDDLE_TIP], smoothed[MIDDLE_DIP], smoothed[MIDDLE_PIP], smoothed[MIDDLE_MCP], wrist
    );
    const ringCurled = isFingerCurled(
      smoothed[RING_TIP], smoothed[RING_DIP], smoothed[RING_PIP], smoothed[RING_MCP], wrist
    );
    const pinkyCurled = isFingerCurled(
      smoothed[PINKY_TIP], smoothed[PINKY_DIP], smoothed[PINKY_PIP], smoothed[PINKY_MCP], wrist
    );

    // Thumb check: thumb should be extended upward/sideways (like a real gun grip)
    // Use relative distance: thumb tip should be away from index MCP but not too far
    // Also accept thumb alongside index (thumb tip above wrist)
    const thumbTip = smoothed[THUMB_TIP];
    const thumbMcp = smoothed[THUMB_MCP];
    const indexMcp = smoothed[INDEX_MCP];

    // Relative distance: use hand scale (wrist to index MCP distance) as reference
    const handScale = Math.sqrt(
      (indexMcp.x - wrist.x) ** 2 + (indexMcp.y - wrist.y) ** 2 + (indexMcp.z - wrist.z) ** 2
    );
    const thumbToIndexBase = Math.sqrt(
      (thumbTip.x - indexMcp.x) ** 2 + (thumbTip.y - indexMcp.y) ** 2 + (thumbTip.z - indexMcp.z) ** 2
    );

    // Thumb should be within 2x hand scale of index MCP (generous — just not way off)
    // AND thumb should be somewhat extended (thumb tip far from thumb MCP)
    const thumbExtension = Math.sqrt(
      (thumbTip.x - thumbMcp.x) ** 2 + (thumbTip.y - thumbMcp.y) ** 2 + (thumbTip.z - thumbMcp.z) ** 2
    );
    const thumbAcceptable = thumbToIndexBase < handScale * 2.0 && thumbExtension > handScale * 0.25;

    const rawPose = indexExtended && middleCurled && ringCurled && pinkyCurled && thumbAcceptable;

    // Apply hysteresis to avoid flickering
    const isFingerGun = this.applyHysteresis(rawPose);

    // Track Y history for flick velocity (use smoothed position relative to wrist for stability)
    const indexTip = smoothed[INDEX_TIP];
    // Use wrist-relative Y to cancel out hand movement vs flick
    const relativeY = indexTip.y - wrist.y;
    this.yHistory.push(relativeY);
    if (this.yHistory.length > this.maxHistory) {
      this.yHistory.shift();
    }

    const flickVelocity = computeVelocityY(this.yHistory);

    return {
      isFingerGun,
      flickVelocity,
      indexTipX: indexTip.x,
      indexTipY: indexTip.y,
    };
  }

  private applyHysteresis(rawPose: boolean): boolean {
    if (rawPose === this.poseCandidate) {
      this.poseCandidateFrames++;
    } else {
      this.poseCandidate = rawPose;
      this.poseCandidateFrames = 1;
    }

    // Transition to ON requires fewer frames (responsive)
    // Transition to OFF requires more frames (sticky — avoids flicker)
    if (rawPose && !this.poseState && this.poseCandidateFrames >= POSE_ON_FRAMES) {
      this.poseState = true;
    } else if (!rawPose && this.poseState && this.poseCandidateFrames >= POSE_OFF_FRAMES) {
      this.poseState = false;
    }

    return this.poseState;
  }

  shouldFire(
    isFingerGun: boolean,
    vy: number,
    lastFireTime: number,
    cooldownMs: number,
    sensitivity: number
  ): boolean {
    return (
      isFingerGun &&
      vy <= sensitivity &&
      Date.now() - lastFireTime >= cooldownMs
    );
  }

  reset(): void {
    this.yHistory = [];
    this.smoothedLandmarks = null;
    this.poseState = false;
    this.poseCandidate = false;
    this.poseCandidateFrames = 0;
  }
}
