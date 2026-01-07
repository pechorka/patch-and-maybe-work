import type { AppState, Button, GameState, Player, Shape } from '../../types';
import { COLORS, getPlayerColor, getPatchColor, adjustColorOpacity } from '../../colors';
import { font, LAYOUT, scale, getBoardLayout } from '../../layout';
import { getCurrentPlayerIndex, getAvailablePatches, getNextIncomeDistance, getOvertakeDistance } from '../../game';
import { getOpponentIndex } from '../../player-utils';
import { renderBoard as renderBoardNew } from '../board-renderer';
import { skip, openMapView } from '../../main';

export function renderGameScreen(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];

  if (!state.gameState) return buttons;

  const game = state.gameState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);

  // Determine which player's board to display (current or opponent when previewing)
  const displayPlayerIdx = state.previewingOpponentBoard
    ? getOpponentIndex(currentPlayerIdx)
    : currentPlayerIdx;

  // Player panels at top
  const panelHeight = scale(minDim, LAYOUT.panelHeight);
  renderPlayerPanels(ctx, game, currentPlayerIdx, panelHeight, width, minDim, buttons);

  // Board display - use centralized layout
  const layout = getBoardLayout(width, height, game.boardSize);
  const { boardLeft, boardTop, boardSize } = layout;

  // Fill background below panels with displayed player's color
  ctx.fillStyle = getPlayerColor(displayPlayerIdx as 0 | 1, false);
  ctx.fillRect(0, panelHeight, width, height - panelHeight);

  // Draw player color border around the board (brighter)
  const borderWidth = scale(minDim, LAYOUT.boardBorderWidth);
  ctx.fillStyle = getPlayerColor(displayPlayerIdx as 0 | 1, true);
  ctx.fillRect(
    boardLeft - borderWidth,
    boardTop - borderWidth,
    boardSize + borderWidth * 2,
    boardSize + borderWidth * 2
  );

  renderBoard(ctx, game.players[displayPlayerIdx], boardLeft, boardTop, boardSize);

  // Available patches
  const patchesTop = boardTop + boardSize + scale(minDim, LAYOUT.gap.large);
  renderAvailablePatches(ctx, game, boardLeft, patchesTop, boardSize, minDim, buttons);

  // Skip button
  const skipBtnWidth = boardSize;
  const skipBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const skipBtnX = boardLeft;
  const skipBtnY = height - skipBtnHeight - scale(minDim, LAYOUT.gap.large);

  // Calculate skip amount
  const currentPlayer = game.players[currentPlayerIdx];
  const opponent = game.players[getOpponentIndex(currentPlayerIdx)];
  const spacesToSkip = opponent.position - currentPlayer.position + 1;

  const isConfirming = state.confirmingSkip;
  ctx.fillStyle = isConfirming ? '#e67e22' : COLORS.button;  // Orange when confirming
  ctx.fillRect(skipBtnX, skipBtnY, skipBtnWidth, skipBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'button', 'bold');
  ctx.textAlign = 'center';
  const skipText = isConfirming
    ? 'TAP AGAIN TO CONFIRM'
    : `SKIP & MOVE AHEAD (+${spacesToSkip})`;
  ctx.fillText(skipText, skipBtnX + skipBtnWidth / 2, skipBtnY + skipBtnHeight / 2 + scale(minDim, 0.00875));

  buttons.push({
    x: skipBtnX, y: skipBtnY, width: skipBtnWidth, height: skipBtnHeight,
    label: 'Skip',
    action: skip,
    type: 'standard',
  });

  // Toggle map button (above skip button)
  const mapBtnHeight = scale(minDim, LAYOUT.buttonHeight.small);
  const mapBtnGap = scale(minDim, LAYOUT.gap.medium);
  const mapBtnX = skipBtnX;
  const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
  const mapBtnWidth = skipBtnWidth;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'info', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2 + scale(minDim, 0.00625));

  buttons.push({
    x: mapBtnX, y: mapBtnY, width: mapBtnWidth, height: mapBtnHeight,
    label: 'Toggle Map',
    action: openMapView,
    type: 'standard',
  });

  return buttons;
}

function renderPlayerPanels(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  currentPlayerIdx: number,
  panelHeight: number,
  width: number,
  minDim: number,
  buttons: Button[]
): void {
  const panelWidth = width / 2;
  const overtakeDistance = getOvertakeDistance(game);

  // Y positions relative to panel height
  const nameY = panelHeight * 0.225;
  const buttonsY = panelHeight * 0.475;
  const incomeY = panelHeight * 0.6875;
  const turnY = panelHeight * 0.9;

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const x = i * panelWidth;
    const isActive = i === currentPlayerIdx;
    const playerIdx = i as 0 | 1;

    ctx.fillStyle = getPlayerColor(playerIdx, isActive);
    ctx.fillRect(x, 0, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isActive ? font(minDim, 'small', 'bold') : font(minDim, 'small');
    ctx.textAlign = 'center';

    const centerX = x + panelWidth / 2;
    ctx.fillText(player.name, centerX, nameY);
    ctx.fillText(`Buttons: ${player.buttons}   Pos: ${player.position}/${game.timeTrackLength}`, centerX, buttonsY);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'tiny');

    // Income info
    const incomeDistance = getNextIncomeDistance(game, playerIdx);
    const incomeText = incomeDistance !== null ? `+${player.income} in ${incomeDistance}` : `+${player.income} (done)`;
    ctx.fillText(incomeText, centerX, incomeY);

    // Turn ends info (only for current player) or 7x7 bonus indicator
    if (isActive) {
      ctx.fillText(`Turn ends in: ${overtakeDistance}`, centerX, turnY);
    }

    // 7x7 bonus indicator
    if (player.bonus7x7Area !== null) {
      ctx.fillStyle = COLORS.bonus7x7;
      ctx.font = font(minDim, 'tiny', 'bold');
      const bonusOffset = isActive ? scale(minDim, 0.075) : 0;
      ctx.fillText('+7 Bonus', centerX + bonusOffset, turnY);
      ctx.fillStyle = COLORS.text;
      ctx.font = font(minDim, 'tiny');
    }

    // Register button for opponent's panel (tap and hold to preview their board)
    if (!isActive) {
      buttons.push({
        x,
        y: 0,
        width: panelWidth,
        height: panelHeight,
        label: `Preview ${player.name}'s board`,
        action: () => {},
        type: 'player-panel',
        metadata: { playerIndex: i },
      });
    }
  }
}

function getFilledCells(shape: Shape): {row: number, col: number}[] {
  const cells: {row: number, col: number}[] = [];
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) cells.push({row, col});
    }
  }
  return cells;
}

function drawButtonIndicators(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  buttonIncome: number,
  startX: number,
  startY: number,
  cellSize: number
): void {
  if (buttonIncome === 0) return;
  const cells = getFilledCells(shape);
  const indicatorCells = cells.slice(0, buttonIncome);

  ctx.fillStyle = COLORS.buttonIndicator;
  const radius = cellSize * 0.25; // 25% of cell size
  for (const {row, col} of indicatorCells) {
    const cx = startX + col * cellSize + cellSize / 2;
    const cy = startY + row * cellSize + cellSize / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderBoard(ctx: CanvasRenderingContext2D, player: Player, x: number, y: number, size: number): void {
  renderBoardNew(ctx, player, x, y, size);
}

function renderAvailablePatches(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  x: number,
  y: number,
  totalWidth: number,
  minDim: number,
  buttons: Button[]
): void {
  const patches = getAvailablePatches(game);
  const patchAreaWidth = totalWidth / 3;
  const patchAreaHeight = scale(minDim, LAYOUT.patchPanelHeight);
  const patchMargin = scale(minDim, LAYOUT.gap.small);

  patches.forEach((patch, i) => {
    const patchX = x + i * patchAreaWidth;
    const canBuy = game.players[getCurrentPlayerIndex(game)].buttons >= patch.buttonCost;

    // Background
    ctx.fillStyle = canBuy ? COLORS.panel : COLORS.buttonDisabled;
    ctx.fillRect(patchX + patchMargin, y, patchAreaWidth - patchMargin * 2, patchAreaHeight);

    // Draw patch shape
    const shape = patch.shape;
    const maxDim = Math.max(shape.length, shape[0].length);
    const maxCellSize = scale(minDim, LAYOUT.patch.maxCellSize);
    const availableWidth = patchAreaWidth - scale(minDim, 0.0375);
    const cellSize = Math.min(maxCellSize, availableWidth / maxDim, scale(minDim, 0.0625) / maxDim);
    // Cell padding must be relative to cell size, not minDim
    const cellPadding = Math.max(1, cellSize * 0.02);
    const shapeWidth = shape[0].length * cellSize;
    const shapeX = patchX + (patchAreaWidth - shapeWidth) / 2;
    const shapeY = y + scale(minDim, LAYOUT.gap.medium);

    const patchColor = getPatchColor(patch.id);
    ctx.fillStyle = canBuy ? patchColor : adjustColorOpacity(patchColor, 0.4);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          ctx.fillRect(
            shapeX + col * cellSize + cellPadding,
            shapeY + row * cellSize + cellPadding,
            cellSize - cellPadding * 2,
            cellSize - cellPadding * 2
          );
        }
      }
    }

    // Draw button indicators
    drawButtonIndicators(ctx, shape, patch.buttonIncome, shapeX, shapeY, cellSize);

    // Cost info
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'tiny');
    ctx.textAlign = 'center';
    const infoY = y + patchAreaHeight - scale(minDim, LAYOUT.gap.medium);
    ctx.fillText(`Cost: ${patch.buttonCost}  Time: ${patch.timeCost}`, patchX + patchAreaWidth / 2, infoY);

    if (canBuy) {
      buttons.push({
        x: patchX + patchMargin, y, width: patchAreaWidth - patchMargin * 2, height: patchAreaHeight,
        label: `Patch ${i + 1}`,
        action: () => {}, // Handled by mousedown/touchstart in input.ts
        type: 'patch',
        metadata: { patchIndex: i },
      });
    }
  });
}
