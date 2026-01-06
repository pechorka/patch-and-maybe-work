import type { BoardSize, Patch, PatchDefinition } from './types';

// Leather patch shape - 1x1 single square (placed on time track, not in market)
export const LEATHER_PATCH_SHAPE: boolean[][] = [[true]];

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

// Each shape is a 2D boolean array
// true = filled, false = empty
// Small shapes (<5 cells) have 2 variants, big shapes (>=5 cells) have 1 variant
// Note: 1x1 patches are now leather patches on the time track, not in the market
export const PATCH_SHAPE_DEFINITIONS: PatchDefinition[] = [
  // 2x1 horizontal (2 cells) - 2 variants
  {
    shape: [[true, true]],
    variants: [
      { buttonCost: 2, timeCost: 1, buttonIncome: 0 },
      { buttonCost: 3, timeCost: 2, buttonIncome: 1 },
    ],
  },
  // 3x1 horizontal (3 cells) - 2 variants
  {
    shape: [[true, true, true]],
    variants: [
      { buttonCost: 2, timeCost: 2, buttonIncome: 0 },
      { buttonCost: 4, timeCost: 3, buttonIncome: 1 },
    ],
  },
  // 4x1 horizontal (4 cells) - 2 variants
  {
    shape: [[true, true, true, true]],
    variants: [
      { buttonCost: 3, timeCost: 3, buttonIncome: 1 },
      { buttonCost: 5, timeCost: 4, buttonIncome: 2 },
    ],
  },
  // 2x2 square (4 cells) - 2 variants
  {
    shape: [
      [true, true],
      [true, true],
    ],
    variants: [
      { buttonCost: 4, timeCost: 2, buttonIncome: 1 },
      { buttonCost: 6, timeCost: 3, buttonIncome: 2 },
    ],
  },
  // L-shape (4 cells) - 2 variants
  {
    shape: [
      [true, false],
      [true, false],
      [true, true],
    ],
    variants: [
      { buttonCost: 3, timeCost: 2, buttonIncome: 0 },
      { buttonCost: 5, timeCost: 3, buttonIncome: 1 },
    ],
  },
  // T-shape (4 cells) - 2 variants
  {
    shape: [
      [true, true, true],
      [false, true, false],
    ],
    variants: [
      { buttonCost: 4, timeCost: 2, buttonIncome: 1 },
      { buttonCost: 2, timeCost: 3, buttonIncome: 0 },
    ],
  },
  // S-shape (4 cells) - 2 variants (Z-shape removed as it's a reflection)
  {
    shape: [
      [false, true, true],
      [true, true, false],
    ],
    variants: [
      { buttonCost: 3, timeCost: 2, buttonIncome: 0 },
      { buttonCost: 5, timeCost: 3, buttonIncome: 1 },
    ],
  },
  // Corner (3 cells) - 2 variants
  {
    shape: [
      [true, true],
      [true, false],
    ],
    variants: [
      { buttonCost: 2, timeCost: 1, buttonIncome: 0 },
      { buttonCost: 4, timeCost: 2, buttonIncome: 1 },
    ],
  },
  // Plus shape (5 cells) - 1 variant
  {
    shape: [
      [false, true, false],
      [true, true, true],
      [false, true, false],
    ],
    variants: [
      { buttonCost: 5, timeCost: 3, buttonIncome: 2 },
    ],
  },
  // Large L (5 cells) - 1 variant
  {
    shape: [
      [true, false, false],
      [true, false, false],
      [true, true, true],
    ],
    variants: [
      { buttonCost: 5, timeCost: 3, buttonIncome: 1 },
    ],
  },
  // U-shape (5 cells) - 1 variant
  {
    shape: [
      [true, false, true],
      [true, true, true],
    ],
    variants: [
      { buttonCost: 4, timeCost: 2, buttonIncome: 1 },
    ],
  },
  // Small T (5 cells) - 1 variant
  {
    shape: [
      [true, true, true],
      [false, true, false],
      [false, true, false],
    ],
    variants: [
      { buttonCost: 5, timeCost: 3, buttonIncome: 2 },
    ],
  },
  // 5-block line (5 cells) - 1 variant
  {
    shape: [[true, true, true, true, true]],
    variants: [
      { buttonCost: 4, timeCost: 4, buttonIncome: 2 },
    ],
  },
];

function shapeToString(shape: boolean[][]): string {
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

export function rotatePatch(shape: boolean[][], times: number): boolean[][] {
  let result = shape;
  for (let i = 0; i < times % 4; i++) {
    result = rotateOnce(result);
  }
  return result;
}

export function reflectPatch(shape: boolean[][]): boolean[][] {
  return shape.map(row => [...row].reverse());
}

function rotateOnce(shape: boolean[][]): boolean[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: boolean[][] = [];

  for (let c = 0; c < cols; c++) {
    const newRow: boolean[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(shape[r][c]);
    }
    rotated.push(newRow);
  }

  return rotated;
}

export function getPatchDimensions(shape: boolean[][]): { width: number; height: number } {
  return {
    height: shape.length,
    width: shape[0]?.length ?? 0,
  };
}
