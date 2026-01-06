import type { Patch, PlacementState, Player, Shape } from '../types';
import { COLORS, getPatchColor } from '../colors';
import { getTransformedShape } from '../shape-utils';

export interface GhostOptions {
  patch: Patch;
  placement: PlacementState;
  canPlace: boolean;
}

/**
 * Render a player's board with optional ghost patch overlay.
 * Consolidates renderBoard and renderBoardWithGhost into a single function.
 */
export function renderBoard(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  size: number,
  ghost?: GhostOptions
): void {
  const boardSize = player.board.length;
  const cellSize = size / boardSize;

  // Background
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(x, y, size, size);

  // Draw grid lines
  ctx.strokeStyle = COLORS.boardGrid;
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      ctx.strokeRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
    }
  }

  // Draw placed patches with button indicators
  for (const placed of player.placedPatches) {
    const shape = getTransformedShape(placed.patch.shape, placed.rotation, placed.reflected);
    const patchColor = getPatchColor(placed.patch.id);

    ctx.fillStyle = patchColor;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const cellX = x + (placed.x + col) * cellSize;
          const cellY = y + (placed.y + row) * cellSize;
          ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    drawButtonIndicators(ctx, shape, placed.patch.buttonIncome, x + placed.x * cellSize, y + placed.y * cellSize, cellSize);
  }

  // Draw 7x7 bonus highlight if player has earned it
  if (player.bonus7x7Area !== null) {
    const bonusX = x + player.bonus7x7Area.x * cellSize;
    const bonusY = y + player.bonus7x7Area.y * cellSize;
    const bonusSize = 7 * cellSize;

    ctx.strokeStyle = COLORS.bonus7x7;
    ctx.lineWidth = 3;
    ctx.strokeRect(bonusX, bonusY, bonusSize, bonusSize);
    ctx.lineWidth = 1;
  }

  // Draw ghost patch if provided
  if (ghost) {
    const ghostShape = getTransformedShape(ghost.patch.shape, ghost.placement.rotation, ghost.placement.reflected);
    ctx.fillStyle = ghost.canPlace ? COLORS.ghostValid : COLORS.ghostInvalid;

    for (let row = 0; row < ghostShape.length; row++) {
      for (let col = 0; col < ghostShape[row].length; col++) {
        if (ghostShape[row][col]) {
          const cellX = x + (ghost.placement.x + col) * cellSize;
          const cellY = y + (ghost.placement.y + row) * cellSize;
          ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    drawButtonIndicators(ctx, ghostShape, ghost.patch.buttonIncome, x + ghost.placement.x * cellSize, y + ghost.placement.y * cellSize, cellSize);
  }
}

/**
 * Draw button indicators on a patch shape.
 */
function drawButtonIndicators(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  buttonIncome: number,
  startX: number,
  startY: number,
  cellSize: number
): void {
  if (buttonIncome === 0) return;

  const filledCells = getFilledCells(shape);
  const indicatorCells = filledCells.slice(0, buttonIncome);

  ctx.fillStyle = COLORS.buttonIndicator;
  const indicatorSize = cellSize * 0.3;

  for (const [row, col] of indicatorCells) {
    const cellCenterX = startX + col * cellSize + cellSize / 2;
    const cellCenterY = startY + row * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(cellCenterX, cellCenterY, indicatorSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Get filled cell coordinates for a shape.
 */
function getFilledCells(shape: Shape): [number, number][] {
  const cells: [number, number][] = [];
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        cells.push([row, col]);
      }
    }
  }
  return cells;
}
