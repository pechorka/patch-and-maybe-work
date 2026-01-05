import type { Patch } from './types';

// Each shape is a 2D boolean array
// true = filled, false = empty
export const PATCH_DEFINITIONS: Patch[] = [
  // 1x1 single square
  {
    id: 1,
    shape: [[true]],
    buttonCost: 1,
    timeCost: 1,
    buttonIncome: 0,
  },
  // 2x1 horizontal
  {
    id: 2,
    shape: [[true, true]],
    buttonCost: 2,
    timeCost: 1,
    buttonIncome: 0,
  },
  // 3x1 horizontal
  {
    id: 3,
    shape: [[true, true, true]],
    buttonCost: 2,
    timeCost: 2,
    buttonIncome: 0,
  },
  // 4x1 horizontal
  {
    id: 4,
    shape: [[true, true, true, true]],
    buttonCost: 3,
    timeCost: 3,
    buttonIncome: 1,
  },
  // 2x2 square
  {
    id: 5,
    shape: [
      [true, true],
      [true, true],
    ],
    buttonCost: 4,
    timeCost: 2,
    buttonIncome: 1,
  },
  // L-shape
  {
    id: 6,
    shape: [
      [true, false],
      [true, false],
      [true, true],
    ],
    buttonCost: 3,
    timeCost: 2,
    buttonIncome: 0,
  },
  // T-shape
  {
    id: 7,
    shape: [
      [true, true, true],
      [false, true, false],
    ],
    buttonCost: 4,
    timeCost: 2,
    buttonIncome: 1,
  },
  // S-shape
  {
    id: 8,
    shape: [
      [false, true, true],
      [true, true, false],
    ],
    buttonCost: 3,
    timeCost: 2,
    buttonIncome: 0,
  },
  // Z-shape
  {
    id: 9,
    shape: [
      [true, true, false],
      [false, true, true],
    ],
    buttonCost: 3,
    timeCost: 2,
    buttonIncome: 0,
  },
  // Plus shape
  {
    id: 10,
    shape: [
      [false, true, false],
      [true, true, true],
      [false, true, false],
    ],
    buttonCost: 5,
    timeCost: 3,
    buttonIncome: 2,
  },
  // Large L
  {
    id: 11,
    shape: [
      [true, false, false],
      [true, false, false],
      [true, true, true],
    ],
    buttonCost: 5,
    timeCost: 3,
    buttonIncome: 1,
  },
  // U-shape
  {
    id: 12,
    shape: [
      [true, false, true],
      [true, true, true],
    ],
    buttonCost: 4,
    timeCost: 2,
    buttonIncome: 1,
  },
  // Corner
  {
    id: 13,
    shape: [
      [true, true],
      [true, false],
    ],
    buttonCost: 2,
    timeCost: 1,
    buttonIncome: 0,
  },
  // Small T
  {
    id: 14,
    shape: [
      [true, true, true],
      [false, true, false],
      [false, true, false],
    ],
    buttonCost: 5,
    timeCost: 3,
    buttonIncome: 2,
  },
  // 5-block line
  {
    id: 15,
    shape: [[true, true, true, true, true]],
    buttonCost: 4,
    timeCost: 4,
    buttonIncome: 2,
  },
];

export function rotatePatch(shape: boolean[][], times: number): boolean[][] {
  let result = shape;
  for (let i = 0; i < times % 4; i++) {
    result = rotateOnce(result);
  }
  return result;
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
