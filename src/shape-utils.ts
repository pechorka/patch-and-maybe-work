import { reflectPatch, rotatePatch } from './patches';
import type { Shape } from './types';

/**
 * Apply rotation and reflection transformations to a patch shape.
 * Consolidates the repeated pattern found across main.ts, game.ts, and renderer.ts.
 */
export function getTransformedShape(
  shape: Shape,
  rotation: number,
  reflected: boolean
): Shape {
  let result = rotatePatch(shape, rotation);
  if (reflected) {
    result = reflectPatch(result);
  }
  return result;
}
