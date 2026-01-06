import type { BoardSize, Patch, PatchDefinition, Shape } from './types';

// Leather patch shape - 1x1 single square (placed on time track, not in market)
export const LEATHER_PATCH_SHAPE: Shape = [[1]];

// Leather patch positions on time track for each board size
export function getLeatherPatchPositions(boardSize: BoardSize): number[] {
  switch (boardSize) {
    case 7: return [8, 14, 20, 26, 32];
    case 9: return [8, 18, 28, 38, 48];
    case 11: return [10, 24, 38, 52, 64];
  }
}

// Create a leather patch with the given ID (use negative IDs to distinguish from market patches)
export function createLeatherPatch(id: number): Patch {
  return {
    id,
    shape: LEATHER_PATCH_SHAPE,
    buttonCost: 0,
    timeCost: 0,
    buttonIncome: 0,
  };
}

// Original Patchwork game patches (33 total)
// Each shape is a 2D array: 1 = filled, 0 = empty
// Patches with same shape but different costs are grouped as variants
export const PATCH_SHAPE_DEFINITIONS: PatchDefinition[] = [
  {
    shape: [
      [1],
      [1],
      [1],
    ],
    variants: [
      { buttonCost: 2, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    variants: [
      { buttonCost: 3, timeCost: 2, buttonIncome: 1 },
      { buttonCost: 7, timeCost: 6, buttonIncome: 3 },
    ],
  },
  {
    shape: [
      [1, 0],
      [1, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 2, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
    ],
    variants: [
      { buttonCost: 1, timeCost: 4, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [1],
      [1],
    ],
    variants: [
      { buttonCost: 2, timeCost: 1, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 1, timeCost: 3, buttonIncome: 0 }, { buttonCost: 3, timeCost: 1, buttonIncome: 0 },],
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    variants: [
      { buttonCost: 0, timeCost: 3, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [1, 0],
      [1, 1],
      [1, 1],
      [0, 1],
    ],
    variants: [
      { buttonCost: 4, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [1, 1],
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 1, timeCost: 5, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [1],
      [1],
      [1],
      [1],
    ],
    variants: [
      { buttonCost: 3, timeCost: 3, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
    variants: [
      { buttonCost: 2, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 6, timeCost: 5, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    variants: [
      { buttonCost: 3, timeCost: 4, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [1, 0],
      [1, 1],
      [1, 1],
      [1, 0],
    ],
    variants: [
      { buttonCost: 7, timeCost: 4, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    variants: [
      { buttonCost: 2, timeCost: 1, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    variants: [
      { buttonCost: 3, timeCost: 6, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [1, 1, 1, 1, 1],
    ],
    variants: [
      { buttonCost: 7, timeCost: 1, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
    ],
    variants: [
      { buttonCost: 5, timeCost: 3, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [0, 1],
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 10, timeCost: 3, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    variants: [
      { buttonCost: 4, timeCost: 6, buttonIncome: 2 },
      { buttonCost: 4, timeCost: 2, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    variants: [
      { buttonCost: 5, timeCost: 4, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 0, 1],
    ],
    variants: [
      { buttonCost: 2, timeCost: 3, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 1],
    ],
    variants: [
      { buttonCost: 5, timeCost: 5, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [1, 1],
      [1, 1],
      [0, 1],
      [0, 1],
    ],
    variants: [
      { buttonCost: 10, timeCost: 5, buttonIncome: 3 },
    ],
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    variants: [
      { buttonCost: 1, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 1],
    ],
    variants: [
      { buttonCost: 7, timeCost: 2, buttonIncome: 2 },
    ],
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    variants: [
      { buttonCost: 10, timeCost: 4, buttonIncome: 3 },
    ],
  },
  {
    shape: [
      [1, 0, 1],
      [1, 1, 1],
    ],
    variants: [
      { buttonCost: 1, timeCost: 2, buttonIncome: 0 },
    ],
  },
  {
    shape: [
      [0, 1],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    variants: [
      { buttonCost: 2, timeCost: 3, buttonIncome: 1 },
    ],
  },
  {
    shape: [
      [0, 1, 1],
      [0, 1, 1],
      [1, 1, 0],
    ],
    variants: [
      { buttonCost: 8, timeCost: 6, buttonIncome: 3 },
    ],
  },
];

function shapeToString(shape: Shape): string {
  return shape.map(row => row.map(cell => cell ? '1' : '0').join('')).join('|');
}

function variantToString(v: { buttonCost: number; timeCost: number; buttonIncome: number }): string {
  return `${v.buttonCost}:${v.timeCost}:${v.buttonIncome}`;
}

// Generate all patches from definitions
export function createPatchesFromDefinitions(definitions: PatchDefinition[]): Patch[] {
  // Validate all shapes are unique and variants within each shape are unique
  const seenShapes = new Set<string>();
  for (const definition of definitions) {
    const shapeKey = shapeToString(definition.shape);
    if (seenShapes.has(shapeKey)) {
      throw new Error(`Duplicate shape found in PATCH_SHAPE_DEFINITIONS: ${shapeKey}`);
    }

    const seenVariants = new Set<string>();
    for (const variant of definition.variants) {
      const variantKey = variantToString(variant);
      if (seenVariants.has(variantKey)) {
        throw new Error(`Duplicate variant found for shape ${shapeKey}: ${variantKey}`);
      }
      seenVariants.add(variantKey);
    }

    seenShapes.add(shapeKey);
  }

  const patches: Patch[] = [];
  let id = 1;

  for (const definition of PATCH_SHAPE_DEFINITIONS) {
    for (const variant of definition.variants) {
      patches.push({
        id: id++,
        shape: definition.shape,
        buttonCost: variant.buttonCost,
        timeCost: variant.timeCost,
        buttonIncome: variant.buttonIncome,
      });
    }
  }

  return patches;
}

// Keep PATCH_DEFINITIONS for backwards compatibility
export const PATCH_DEFINITIONS: Patch[] = createPatchesFromDefinitions(PATCH_SHAPE_DEFINITIONS);

export function rotatePatch(shape: Shape, times: number): Shape {
  let result = shape;
  for (let i = 0; i < times % 4; i++) {
    result = rotateOnce(result);
  }
  return result;
}

export function reflectPatch(shape: Shape): Shape {
  return shape.map(row => [...row].reverse());
}

function rotateOnce(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: Shape = [];

  for (let c = 0; c < cols; c++) {
    const newRow: (0 | 1)[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(shape[r][c]);
    }
    rotated.push(newRow);
  }

  return rotated;
}

export function getPatchDimensions(shape: Shape): { width: number; height: number } {
  return {
    height: shape.length,
    width: shape[0]?.length ?? 0,
  };
}
