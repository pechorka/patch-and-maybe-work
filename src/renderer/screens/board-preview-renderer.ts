import type { AppState, Button } from '../../types';
import { COLORS, getPlayerColor } from '../../colors';
import { font, LAYOUT, scale } from '../../layout';
import { calculateScore } from '../../game';
import { renderBoard as renderBoardNew } from '../board-renderer';
import { backToGameEnd } from '../../main';

export function renderBoardPreview(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];

  if (!state.gameState || state.previewPlayerIdx === null) return buttons;

  const game = state.gameState;
  const player = game.players[state.previewPlayerIdx];
  const centerX = width / 2;

  // Fill background with previewed player's color
  ctx.fillStyle = getPlayerColor(state.previewPlayerIdx as 0 | 1, false);
  ctx.fillRect(0, 0, width, height);

  // Title with player name
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'heading', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(`${player.name}'s Board`, centerX, height * 0.08);

  // Score summary
  const score = calculateScore(player);
  const emptySpaces = countEmptySpaces(player.board);
  ctx.font = font(minDim, 'button');
  ctx.fillText(`Score: ${score} (${player.buttons} buttons - ${emptySpaces * 2} penalty)`, centerX, height * 0.14);

  // Render board large and centered (85% of width, 65% of height)
  const boardSize = Math.min(width * 0.85, height * 0.65);
  const boardX = centerX - boardSize / 2;
  const boardY = height * 0.18;
  renderBoard(ctx, player, boardX, boardY, boardSize);

  // Back button
  const btnWidth = scale(minDim, LAYOUT.buttonWidth.small);
  const btnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const btnX = centerX - btnWidth / 2;
  const btnY = height * 0.9;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'button', 'bold');
  ctx.fillText('BACK', centerX, btnY + btnHeight / 2 + scale(minDim, 0.00875));

  buttons.push({
    x: btnX, y: btnY, width: btnWidth, height: btnHeight,
    label: 'Back',
    action: backToGameEnd,
    type: 'standard',
  });

  return buttons;
}

function countEmptySpaces(board: (number | null)[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) count++;
    }
  }
  return count;
}

function renderBoard(
  ctx: CanvasRenderingContext2D,
  player: import('../../types').Player,
  x: number,
  y: number,
  size: number
): void {
  renderBoardNew(ctx, player, x, y, size);
}
