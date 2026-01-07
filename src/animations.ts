export const PLACEMENT_ANIMATION_DURATION = 400;

// Easing function for bouncy landing effect
function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export interface AnimationParams {
  scale: number;
  rotation: number;
  offsetY: number;
  glowIntensity: number;
  opacity: number;
}

// Drop animation: patch starts big and falls to land on the board
export function calculateAnimationParams(progress: number): AnimationParams {
  const eased = easeOutBounce(progress);
  return {
    scale: 2 - eased,           // 2.0 → 1.0 (big to normal)
    rotation: 0,
    offsetY: -0.5 * (1 - eased), // Above → landing
    glowIntensity: 0,
    opacity: 1,
  };
}
