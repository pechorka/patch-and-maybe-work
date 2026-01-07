import type { PlacementAnimationType } from './types';

export const PLACEMENT_ANIMATION_DURATION = 400;

const ANIMATION_TYPES: PlacementAnimationType[] = ['pop', 'glow', 'slideIn'];

export function getRandomAnimationType(): PlacementAnimationType {
  const index = Math.floor(Math.random() * ANIMATION_TYPES.length);
  return ANIMATION_TYPES[index];
}

// Easing functions
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface AnimationParams {
  scale: number;
  rotation: number;
  offsetY: number;
  glowIntensity: number;
  opacity: number;
}

export function calculateAnimationParams(
  type: PlacementAnimationType,
  progress: number
): AnimationParams {
  const params: AnimationParams = {
    scale: 1,
    rotation: 0,
    offsetY: 0,
    glowIntensity: 0,
    opacity: 1,
  };

  switch (type) {
    case 'pop':
      // Scale from 0 to 1 with overshoot
      params.scale = easeOutBack(progress);
      break;

    case 'glow':
      // Start with intense glow, fade to normal
      params.glowIntensity = 1 - easeOutCubic(progress);
      params.scale = easeOutBounce(progress);
      break;

    case 'slideIn':
      // Slide from above to final position
      params.offsetY = -1 * (1 - easeOutCubic(progress));
      params.opacity = easeOutCubic(progress);
      break;
  }

  return params;
}
