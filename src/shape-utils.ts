import { reflectPatch, rotatePatch } from './patches';

/**
 * Apply rotation and reflection transformations to a patch shape.
 * Consolidates the repeated pattern found across main.ts, game.ts, and renderer.ts.
 */
export function getTransformedShape(
  shape: boolean[][],
  rotation: number,
  reflected: boolean
): boolean[][] {
  let result = rotatePatch(shape, rotation);
  if (reflected) {
    result = reflectPatch(result);
  }
  return result;
}
