import type { AppState, Button, Patch, PlacementState, Player } from '../../types';
import { COLORS, getPlayerColor } from '../../colors';
import { font, LAYOUT, scale, getBoardLayout } from '../../layout';
import { getCurrentPlayerIndex, getAvailablePatches, canPlacePatch } from '../../game';
import { getTransformedShape } from '../../shape-utils';
import { renderBoard as renderBoardNew } from '../board-renderer';
import { calculateAnimationParams, PLACEMENT_ANIMATION_DURATION } from '../../animations';
import { cancelPlacement, confirmPlacement, rotate, reflect, openMapView } from '../../main';

export function renderPlacementScreen(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  // If there's an active placement animation, render that instead
  if (state.placementAnimation && state.gameState) {
    renderPlacementAnimation(ctx, state, width, height, minDim);
    return [];  // No buttons during animation
  }

  const buttons: Button[] = [];

  if (!state.gameState || !state.placementState) return buttons;

  const game = state.gameState;
  const placement = state.placementState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);
  const player = game.players[currentPlayerIdx];
  const isLeatherPatch = state.placingLeatherPatch !== null;

  // Get patch - either from market or leather patch being placed
  let patch: Patch | undefined;
  if (isLeatherPatch) {
    patch = state.placingLeatherPatch!;
  } else {
    const patches = getAvailablePatches(game);
    patch = patches[placement.patchIndex];
  }

  if (!patch) return buttons;

  // Fill background with player color
  ctx.fillStyle = getPlayerColor(currentPlayerIdx as 0 | 1, false);
  ctx.fillRect(0, 0, width, height);

  // Top panel (same height as player panels to maintain board position)
  const panelHeight = scale(minDim, LAYOUT.panelHeight);

  if (isLeatherPatch) {
    // Show "LEATHER PATCH" label at top
    ctx.fillStyle = COLORS.leatherPatch;
    ctx.fillRect(0, 0, width, panelHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('LEATHER PATCH', width / 2, panelHeight / 2 + scale(minDim, 0.00875));
  } else {
    // Show player name at top (matching game screen panel style)
    ctx.fillStyle = getPlayerColor(currentPlayerIdx as 0 | 1, true);
    ctx.fillRect(0, 0, width, panelHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`${player.name} - Place Patch`, width / 2, panelHeight / 2 + scale(minDim, 0.00875));
  }

  const shape = getTransformedShape(patch.shape, placement.rotation, placement.reflected);
  const canPlace = canPlacePatch(player.board, shape, placement.x, placement.y);

  // Board with ghost (same size and position as game screen)
  const layout = getBoardLayout(width, height, game.boardSize);
  const { boardLeft, boardTop, boardSize } = layout;

  renderBoardWithGhost(ctx, player, boardLeft, boardTop, boardSize, patch, placement, canPlace);

  // Patch info panel (below board)
  const infoY = boardTop + boardSize + scale(minDim, 0.03125);
  const filledCells = shape.flat().filter(cell => cell === 1).length;
  const scoreDelta = (filledCells * 2) - patch.buttonCost;
  const infoText = isLeatherPatch
    ? 'Score: +2'
    : `Cells: ${filledCells} | Cost: ${patch.buttonCost} | Time: ${patch.timeCost} | Income: ${patch.buttonIncome} | Score: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`;

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'center';
  ctx.fillText(infoText, width / 2, infoY);

  // Button dimensions
  const btnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const btnGap = scale(minDim, LAYOUT.gap.medium);
  const btnWidth = (boardSize - btnGap) / 2;

  // Rotate/Reflect buttons right under patch info
  const rotateRowY = infoY + scale(minDim, LAYOUT.gap.large);

  // Rotate button (left)
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(boardLeft, rotateRowY, btnWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'normal', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('ROTATE', boardLeft + btnWidth / 2, rotateRowY + btnHeight / 2 + scale(minDim, 0.0075));
  buttons.push({ x: boardLeft, y: rotateRowY, width: btnWidth, height: btnHeight, label: 'Rotate', action: rotate, type: 'standard' });

  // Reflect button (right)
  const reflectX = boardLeft + btnWidth + btnGap;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(reflectX, rotateRowY, btnWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.fillText('REFLECT', reflectX + btnWidth / 2, rotateRowY + btnHeight / 2 + scale(minDim, 0.0075));
  buttons.push({ x: reflectX, y: rotateRowY, width: btnWidth, height: btnHeight, label: 'Reflect', action: reflect, type: 'standard' });

  // Cancel/Confirm buttons at bottom
  const bottomRowY = height - btnHeight - scale(minDim, LAYOUT.gap.large);

  // Toggle map button (above cancel/confirm)
  const mapBtnHeight = scale(minDim, LAYOUT.buttonHeight.small);
  const mapBtnY = bottomRowY - mapBtnHeight - btnGap;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(boardLeft, mapBtnY, boardSize, mapBtnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'info', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', boardLeft + boardSize / 2, mapBtnY + mapBtnHeight / 2 + scale(minDim, 0.00625));
  buttons.push({
    x: boardLeft, y: mapBtnY, width: boardSize, height: mapBtnHeight,
    label: 'Toggle Map',
    action: openMapView,
    type: 'standard',
  });

  // Cancel button (left) - only for non-leather patches
  if (!isLeatherPatch) {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(boardLeft, bottomRowY, btnWidth, btnHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('CANCEL', boardLeft + btnWidth / 2, bottomRowY + btnHeight / 2 + scale(minDim, 0.0075));
    buttons.push({ x: boardLeft, y: bottomRowY, width: btnWidth, height: btnHeight, label: 'Cancel', action: cancelPlacement, type: 'standard' });
  }

  // Confirm button (right, or full width for leather patch)
  const confirmX = isLeatherPatch ? boardLeft : boardLeft + btnWidth + btnGap;
  const confirmWidth = isLeatherPatch ? boardSize : btnWidth;
  ctx.fillStyle = canPlace ? COLORS.button : COLORS.buttonDisabled;
  ctx.fillRect(confirmX, bottomRowY, confirmWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'normal', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('CONFIRM', confirmX + confirmWidth / 2, bottomRowY + btnHeight / 2 + scale(minDim, 0.0075));
  if (canPlace) {
    buttons.push({ x: confirmX, y: bottomRowY, width: confirmWidth, height: btnHeight, label: 'Confirm', action: confirmPlacement, type: 'standard' });
  }

  return buttons;
}

function renderPlacementAnimation(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): void {
  if (!state.gameState || !state.placementAnimation) return;

  const game = state.gameState;
  const anim = state.placementAnimation;
  const player = game.players[anim.playerIndex];

  // Calculate animation progress
  const elapsed = Date.now() - anim.startTime;
  const progress = Math.min(1, elapsed / PLACEMENT_ANIMATION_DURATION);
  const animParams = calculateAnimationParams(anim.type, progress);

  const isLeatherPatch = anim.patchId < 0;

  // Fill background with player color
  ctx.fillStyle = getPlayerColor(anim.playerIndex, false);
  ctx.fillRect(0, 0, width, height);

  // Top panel
  const panelHeight = scale(minDim, LAYOUT.panelHeight);
  if (isLeatherPatch) {
    // Show "LEATHER PATCH" label for leather patches
    ctx.fillStyle = COLORS.leatherPatch;
    ctx.fillRect(0, 0, width, panelHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('LEATHER PATCH', width / 2, panelHeight / 2 + scale(minDim, 0.00875));
  } else {
    // Show player name for regular patches
    ctx.fillStyle = getPlayerColor(anim.playerIndex, true);
    ctx.fillRect(0, 0, width, panelHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`${player.name}`, width / 2, panelHeight / 2 + scale(minDim, 0.00875));
  }

  // Board with animated patch (same size and position as game screen)
  const layout = getBoardLayout(width, height, game.boardSize);
  const { boardLeft, boardTop, boardSize } = layout;

  // Render board with the animated patch
  renderBoardNew(ctx, player, boardLeft, boardTop, boardSize, undefined, {
    patchId: anim.patchId,
    params: animParams,
  });
}

function renderBoardWithGhost(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  size: number,
  patch: Patch,
  placement: PlacementState,
  canPlace: boolean,
  scale?: number
): void {
  renderBoardNew(ctx, player, x, y, size, { patch, placement, canPlace, scale });
}
