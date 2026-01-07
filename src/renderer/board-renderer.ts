import type { Patch, PlacementState, Player, Shape } from '../types';
import { COLORS, getPatchColor } from '../colors';
import { getTransformedShape } from '../shape-utils';
import type { AnimationParams } from '../animations';

export interface GhostOptions {
  patch: Patch;
  placement: PlacementState;
  canPlace: boolean;
  scale?: number;  // Animation scale (0-1), defaults to 1
}

export interface AnimatedPatchOptions {
  patchId: number;
  params: AnimationParams;
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
  ghost?: GhostOptions,
  animatedPatch?: AnimatedPatchOptions
): void {
  const boardSize = player.board.length;
  const cellSize = size / boardSize;

  // Cell padding as percentage of cell size (2%)
  const cellPadding = Math.max(1, cellSize * 0.02);

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
    const isLeatherPatch = placed.patch.id < 0;
    const isAnimated = animatedPatch && placed.patch.id === animatedPatch.patchId;
    const params = isAnimated ? animatedPatch.params : null;

    // Calculate patch center for animation transforms
    const patchCenterX = x + (placed.x + shape[0].length / 2) * cellSize;
    const patchCenterY = y + (placed.y + shape.length / 2) * cellSize;

    // Apply animation transforms if this is the animated patch
    if (params) {
      ctx.save();
      ctx.globalAlpha = params.opacity;

      // Translate to center, apply transforms, translate back
      ctx.translate(patchCenterX, patchCenterY + params.offsetY * size);
      ctx.rotate(params.rotation);
      ctx.scale(params.scale, params.scale);
      ctx.translate(-patchCenterX, -patchCenterY);

      // Apply glow effect - leather patches always glow, others based on animation
      if (isLeatherPatch) {
        ctx.shadowColor = COLORS.leatherPatchGlow;
        ctx.shadowBlur = Math.max(cellSize * 0.4, cellSize * 0.8 * params.glowIntensity);
      } else if (params.glowIntensity > 0) {
        ctx.shadowColor = '#f1c40f';  // Gold glow
        ctx.shadowBlur = cellSize * 0.8 * params.glowIntensity;
      }
    }

    // Add glow effect for leather patches (when not animating)
    if (isLeatherPatch && !params) {
      ctx.shadowColor = COLORS.leatherPatchGlow;
      ctx.shadowBlur = cellSize * 0.4;
    }

    ctx.fillStyle = patchColor;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const cellX = x + (placed.x + col) * cellSize;
          const cellY = y + (placed.y + row) * cellSize;
          ctx.fillRect(cellX + cellPadding, cellY + cellPadding, cellSize - cellPadding * 2, cellSize - cellPadding * 2);
        }
      }
    }

    // Reset shadow and restore transform
    if (isLeatherPatch && !params) {
      ctx.shadowBlur = 0;
    }
    if (params) {
      ctx.restore();
    }

    // Draw button indicators (skip during early animation when scale is too small)
    if (!params || params.scale >= 0.5) {
      drawButtonIndicators(ctx, shape, placed.patch.buttonIncome, x + placed.x * cellSize, y + placed.y * cellSize, cellSize);
    }
  }

  // Draw 7x7 bonus highlight if player has earned it
  if (player.bonus7x7Area !== null) {
    const bonusX = x + player.bonus7x7Area.x * cellSize;
    const bonusY = y + player.bonus7x7Area.y * cellSize;
    const bonusSize = 7 * cellSize;

    // Add glow effect
    ctx.shadowColor = COLORS.bonus7x7;
    ctx.shadowBlur = cellSize * 0.4;

    ctx.strokeStyle = COLORS.bonus7x7;
    // Stroke width as percentage of cell size (5%)
    ctx.lineWidth = Math.max(2, cellSize * 0.05);
    ctx.strokeRect(bonusX, bonusY, bonusSize, bonusSize);
    ctx.lineWidth = 1;

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  // Draw ghost patch if provided
  if (ghost) {
    const ghostShape = getTransformedShape(ghost.patch.shape, ghost.placement.rotation, ghost.placement.reflected);
    const isLeatherPatch = ghost.patch.id < 0;
    const animScale = ghost.scale ?? 1;

    // Add glow effect for leather patches
    if (isLeatherPatch) {
      ctx.shadowColor = COLORS.leatherPatchGlow;
      ctx.shadowBlur = cellSize * 0.4 * animScale;
    }

    ctx.fillStyle = ghost.canPlace ? COLORS.ghostValid : COLORS.ghostInvalid;

    // Calculate ghost center for scale animation
    const ghostCenterX = x + (ghost.placement.x + ghostShape[0].length / 2) * cellSize;
    const ghostCenterY = y + (ghost.placement.y + ghostShape.length / 2) * cellSize;

    // Apply scale transform if animating
    if (animScale < 1) {
      ctx.save();
      ctx.translate(ghostCenterX, ghostCenterY);
      ctx.scale(animScale, animScale);
      ctx.translate(-ghostCenterX, -ghostCenterY);
    }

    for (let row = 0; row < ghostShape.length; row++) {
      for (let col = 0; col < ghostShape[row].length; col++) {
        if (ghostShape[row][col]) {
          const cellX = x + (ghost.placement.x + col) * cellSize;
          const cellY = y + (ghost.placement.y + row) * cellSize;
          ctx.fillRect(cellX + cellPadding, cellY + cellPadding, cellSize - cellPadding * 2, cellSize - cellPadding * 2);
        }
      }
    }

    // Reset shadow and restore transform
    if (isLeatherPatch) {
      ctx.shadowBlur = 0;
    }
    if (animScale < 1) {
      ctx.restore();
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
