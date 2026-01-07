import type { AppState, Button, GameState, Patch, PlacementState, Player, Shape, Toast } from './types';
import { calculateScore, canPlacePatch, getAvailablePatches, getCurrentPlayerIndex, getNextIncomeDistance, getOvertakeDistance, getWinner } from './game';
import {
  editName, startGame, selectFirstPlayer, toggleAutoSkip, toggleFaceToFaceMode,
  skip, openMapView,
  cancelPlacement, confirmPlacement, rotate, reflect,
  playAgain, previewBoard, backToGameEnd, setGameEndTab,
  closeMapView, trackPosition,
  getIsAdminMode, openAdminTestScreen, backToSetup,
  loadTestGame1Patch, loadTestGame2Patches,
  loadTestGameNearIncome, loadTestGameInfiniteMoney, loadTestGameNearLeatherPatch,
  loadTestGameNearLastIncome, loadTestGameOver,
} from './main';
import { getTransformedShape } from './shape-utils';
import { COLORS, getPatchColor, adjustColorOpacity, getPlayerColor, drawPlayerGradient } from './colors';
import { getOpponentIndex } from './player-utils';
import { renderBoard as renderBoardNew } from './renderer/board-renderer';
import { calculateStats, calculateChartData } from './stats';
import { renderCharts } from './renderer/chart-renderer';
import { getMinDim, LAYOUT, scale, font, getBoardLayout } from './layout';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;
let minDim: number;

// Track tapped position on time track (for distance display)
let lastTappedTrackPos: number | null = null;

// Store button positions for hit detection
export let buttons: Button[] = [];

// Board layout info for coordinate calculations
export interface BoardLayout {
  boardLeft: number;
  boardTop: number;
  boardSize: number;     // pixels
  cellSize: number;
  boardCells: number;    // 7, 9, or 11
}

export function getPlacementBoardLayout(gameState: GameState): BoardLayout {
  const layout = getBoardLayout(width, height, gameState.boardSize);
  return {
    boardLeft: layout.boardLeft,
    boardTop: layout.boardTop,
    boardSize: layout.boardSize,
    cellSize: layout.cellSize,
    boardCells: layout.boardCells,
  };
}

/**
 * Convert screen coordinates to cell coordinates.
 */
export function screenToCellCoords(
  screenX: number,
  screenY: number,
  layout: BoardLayout
): { cellX: number; cellY: number } {
  return {
    cellX: (screenX - layout.boardLeft) / layout.cellSize,
    cellY: (screenY - layout.boardTop) / layout.cellSize,
  };
}

/**
 * Calculate the cell position to center a shape on a given cell coordinate.
 */
export function centerShapeOnCell(
  cellX: number,
  cellY: number,
  shape: Shape
): { x: number; y: number } {
  return {
    x: Math.round(cellX - shape[0].length / 2),
    y: Math.round(cellY - shape.length / 2),
  };
}

export function initRenderer(canvasElement: HTMLCanvasElement): void {
  canvas = canvasElement;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2D context');
  ctx = context;

  resize();
  window.addEventListener('resize', resize);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  minDim = getMinDim(width, height);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);
}

function ctxTransaction(body: () => void): void {
  ctx.save();
  body();
  ctx.restore();
}

// Track if current render is rotated (for input coordinate transformation)
let isScreenRotated = false;

export function getIsScreenRotated(): boolean {
  return isScreenRotated;
}

export function getCanvasDimensions(): { width: number; height: number } {
  return { width, height };
}

export function render(state: AppState): void {
  buttons = [];

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Determine if screen should be rotated (face-to-face mode + player 2's turn + game/placement screen)
  const shouldRotate = state.faceToFaceMode &&
    (state.screen === 'game' || state.screen === 'placement') &&
    state.gameState !== null &&
    getCurrentPlayerIndex(state.gameState) === 1;

  isScreenRotated = shouldRotate;

  // Get the appropriate render function for the current screen
  let renderScreen: () => void;
  switch (state.screen) {
    case 'setup':
      renderScreen = () => renderSetupScreen(state);
      break;
    case 'adminTest':
      renderScreen = () => renderAdminTestScreen(state);
      break;
    case 'game':
      renderScreen = () => renderGameScreen(state);
      break;
    case 'placement':
      renderScreen = () => renderPlacementScreen(state);
      break;
    case 'gameEnd':
      renderScreen = () => renderGameEndScreen(state);
      break;
    case 'mapView':
      renderScreen = () => renderMapViewScreen(state);
      break;
    case 'boardPreview':
      renderScreen = () => renderBoardPreview(state);
      break;
    default:
      renderScreen = () => {};
  }

  // Apply rotation if needed
  if (shouldRotate) {
    const originalRender = renderScreen;
    renderScreen = () => {
      ctxTransaction(() => {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-width / 2, -height / 2);
        originalRender();
      });
    };
  }

  renderScreen();

  // Render toast overlay (on top of everything, not rotated)
  if (state.toasts.length > 0) {
    renderToasts(state.toasts);
  }
}

function renderSetupScreen(state: AppState): void {
  // Draw gradient background
  drawPlayerGradient(ctx, 0, 0, width, height);

  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'title', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('PATCHWORK', centerX, height * 0.18);

  // Players label
  ctx.font = font(minDim, 'large');
  ctx.fillText('Players:', centerX, height * 0.30);

  // Player name buttons
  const nameButtonWidth = scale(minDim, LAYOUT.nameButton.width);
  const nameButtonHeight = scale(minDim, LAYOUT.nameButton.height);
  const nameGap = scale(minDim, LAYOUT.nameButton.gap);
  const totalNameWidth = 2 * nameButtonWidth + nameGap;
  const nameStartX = centerX - totalNameWidth / 2;
  const nameY = height * 0.34;

  for (let i = 0; i < 2; i++) {
    const x = nameStartX + i * (nameButtonWidth + nameGap);

    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, nameY, nameButtonWidth, nameButtonHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal');
    ctx.textAlign = 'center';
    const displayName = state.playerNames[i].length > 12
      ? state.playerNames[i].slice(0, 12) + '...'
      : state.playerNames[i];
    ctx.fillText(displayName, x + nameButtonWidth / 2, nameY + nameButtonHeight / 2 + scale(minDim, 0.0075));

    buttons.push({
      x, y: nameY, width: nameButtonWidth, height: nameButtonHeight,
      label: state.playerNames[i],
      action: () => editName(i as 0 | 1),
      type: 'standard',
    });
  }

  // First player checkboxes
  const checkboxWidth = scale(minDim, LAYOUT.checkbox.firstPlayer.width);
  const checkboxHeight = scale(minDim, LAYOUT.checkbox.firstPlayer.height);
  const checkboxY = height * 0.42;

  for (let i = 0; i < 2; i++) {
    const x = nameStartX + i * (nameButtonWidth + nameGap) + (nameButtonWidth - checkboxWidth) / 2;
    const isSelected = state.firstPlayerIndex === i;

    if (isSelected) {
      ctx.fillStyle = COLORS.panelActive;
      ctx.fillRect(x, checkboxY, checkboxWidth, checkboxHeight);
    } else {
      ctx.strokeStyle = COLORS.panel;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, checkboxY, checkboxWidth, checkboxHeight);
    }

    buttons.push({
      x, y: checkboxY, width: checkboxWidth, height: checkboxHeight,
      label: `First Player ${i + 1}`,
      action: () => selectFirstPlayer(i as 0 | 1),
      type: 'standard',
    });
  }

  // Auto-skip toggle
  const autoSkipY = height * 0.50;
  const checkboxSize = scale(minDim, LAYOUT.checkbox.size);
  const checkboxX = centerX - scale(minDim, 0.1875);
  const labelX = checkboxX + checkboxSize + scale(minDim, LAYOUT.gap.medium);

  // Checkbox
  if (state.autoSkipEnabled) {
    ctx.fillStyle = COLORS.panelActive;
    ctx.fillRect(checkboxX, autoSkipY, checkboxSize, checkboxSize);
    // Checkmark - positions relative to checkbox size
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(checkboxX + checkboxSize * 0.2, autoSkipY + checkboxSize * 0.5);
    ctx.lineTo(checkboxX + checkboxSize * 0.4, autoSkipY + checkboxSize * 0.73);
    ctx.lineTo(checkboxX + checkboxSize * 0.8, autoSkipY + checkboxSize * 0.27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 2;
    ctx.strokeRect(checkboxX, autoSkipY, checkboxSize, checkboxSize);
  }

  // Label
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'left';
  ctx.fillText("Auto-skip when can't buy", labelX, autoSkipY + checkboxSize / 2 + scale(minDim, 0.00625));

  const checkboxHitWidth = scale(minDim, 0.375);
  buttons.push({
    x: checkboxX, y: autoSkipY, width: checkboxHitWidth, height: checkboxSize,
    label: 'Toggle Auto-skip',
    action: toggleAutoSkip,
    type: 'standard',
  });

  // Face-to-face mode toggle
  const faceToFaceY = height * 0.56;

  // Checkbox
  if (state.faceToFaceMode) {
    ctx.fillStyle = COLORS.panelActive;
    ctx.fillRect(checkboxX, faceToFaceY, checkboxSize, checkboxSize);
    // Checkmark - positions relative to checkbox size
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(checkboxX + checkboxSize * 0.2, faceToFaceY + checkboxSize * 0.5);
    ctx.lineTo(checkboxX + checkboxSize * 0.4, faceToFaceY + checkboxSize * 0.73);
    ctx.lineTo(checkboxX + checkboxSize * 0.8, faceToFaceY + checkboxSize * 0.27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 2;
    ctx.strokeRect(checkboxX, faceToFaceY, checkboxSize, checkboxSize);
  }

  // Label
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'left';
  ctx.fillText('Face-to-face mode', labelX, faceToFaceY + checkboxSize / 2 + scale(minDim, 0.00625));
  ctx.textAlign = 'center';

  buttons.push({
    x: checkboxX, y: faceToFaceY, width: checkboxHitWidth, height: checkboxSize,
    label: 'Toggle Face-to-face',
    action: toggleFaceToFaceMode,
    type: 'standard',
  });

  // Start button
  const startBtnWidth = scale(minDim, LAYOUT.buttonWidth.large);
  const startBtnHeight = scale(minDim, LAYOUT.buttonHeight.large);
  const startBtnX = centerX - startBtnWidth / 2;
  const startBtnY = height * 0.66;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(startBtnX, startBtnY, startBtnWidth, startBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'large', 'bold');
  ctx.fillText('START GAME', centerX, startBtnY + startBtnHeight / 2 + scale(minDim, 0.01));

  buttons.push({
    x: startBtnX, y: startBtnY, width: startBtnWidth, height: startBtnHeight,
    label: 'Start Game',
    action: startGame,
    type: 'standard',
  });

  // Admin test button (only visible if admin query param is present)
  if (getIsAdminMode()) {
    const adminBtnWidth = scale(minDim, LAYOUT.buttonWidth.large);
    const adminBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
    const adminBtnX = centerX - adminBtnWidth / 2;
    const adminBtnY = startBtnY + startBtnHeight + scale(minDim, LAYOUT.gap.large);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(adminBtnX, adminBtnY, adminBtnWidth, adminBtnHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText('ADMIN TESTS', centerX, adminBtnY + adminBtnHeight / 2 + scale(minDim, 0.0075));

    buttons.push({
      x: adminBtnX, y: adminBtnY, width: adminBtnWidth, height: adminBtnHeight,
      label: 'Admin Tests',
      action: openAdminTestScreen,
      type: 'standard',
    });
  }
}

function renderAdminTestScreen(_state: AppState): void {
  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'heading', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('ADMIN TEST SCREEN', centerX, height * 0.12);

  // Test scenario buttons
  const btnWidth = Math.min(scale(minDim, LAYOUT.admin.buttonWidth), width - scale(minDim, LAYOUT.boardPadding * 2));
  const btnHeight = scale(minDim, LAYOUT.admin.buttonHeight);
  const btnGap = scale(minDim, LAYOUT.admin.buttonGap);
  const startY = height * 0.22;

  const testScenarios = [
    { label: '1 Patch in Shop', action: loadTestGame1Patch },
    { label: '2 Patches in Shop', action: loadTestGame2Patches },
    { label: 'Near Income Checkpoint', action: loadTestGameNearIncome },
    { label: 'Near Last Income (53)', action: loadTestGameNearLastIncome },
    { label: 'Infinite Money', action: loadTestGameInfiniteMoney },
    { label: 'Near Leather Patch', action: loadTestGameNearLeatherPatch },
    { label: 'Game Over Screen', action: loadTestGameOver },
  ];

  testScenarios.forEach((scenario, i) => {
    const btnX = centerX - btnWidth / 2;
    const btnY = startY + i * (btnHeight + btnGap);

    ctx.fillStyle = COLORS.button;
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'button', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(scenario.label, centerX, btnY + btnHeight / 2 + scale(minDim, 0.00875));

    buttons.push({
      x: btnX, y: btnY, width: btnWidth, height: btnHeight,
      label: scenario.label,
      action: scenario.action,
      type: 'standard',
    });
  });

  // Back button
  const backBtnWidth = scale(minDim, LAYOUT.buttonWidth.small);
  const backBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const backBtnX = centerX - backBtnWidth / 2;
  const backBtnY = height - backBtnHeight - scale(minDim, LAYOUT.gap.large * 1.5);

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(backBtnX, backBtnY, backBtnWidth, backBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'normal', 'bold');
  ctx.fillText('BACK', centerX, backBtnY + backBtnHeight / 2 + scale(minDim, 0.0075));

  buttons.push({
    x: backBtnX, y: backBtnY, width: backBtnWidth, height: backBtnHeight,
    label: 'Back',
    action: backToSetup,
    type: 'standard',
  });
}

function renderGameScreen(state: AppState): void {
  if (!state.gameState) return;

  const game = state.gameState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);

  // Determine which player's board to display (current or opponent when previewing)
  const displayPlayerIdx = state.previewingOpponentBoard
    ? getOpponentIndex(currentPlayerIdx)
    : currentPlayerIdx;

  // Player panels at top
  const panelHeight = scale(minDim, LAYOUT.panelHeight);
  renderPlayerPanels(game, currentPlayerIdx, panelHeight);

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

  renderBoard(game.players[displayPlayerIdx], boardLeft, boardTop, boardSize);

  // Available patches
  const patchesTop = boardTop + boardSize + scale(minDim, LAYOUT.gap.large);
  renderAvailablePatches(game, boardLeft, patchesTop, boardSize);

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
}

function renderPlayerPanels(game: GameState, currentPlayerIdx: number, panelHeight: number): void {
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

function renderBoard(player: Player, x: number, y: number, size: number): void {
  renderBoardNew(ctx, player, x, y, size);
}

function renderAvailablePatches(game: GameState, x: number, y: number, totalWidth: number): void {
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
    drawButtonIndicators(shape, patch.buttonIncome, shapeX, shapeY, cellSize);

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

function renderPlacementScreen(state: AppState): void {
  if (!state.gameState || !state.placementState) return;

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

  if (!patch) return;

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

  // Calculate animation scale for leather patch spawn animation
  let animScale: number | undefined;
  if (isLeatherPatch && state.leatherPatchAnimationStart !== null) {
    const ANIMATION_DURATION_MS = 300;
    const elapsed = Date.now() - state.leatherPatchAnimationStart;
    const progress = Math.min(1, elapsed / ANIMATION_DURATION_MS);
    // easeOutBack for a pop effect (starts small, overshoots slightly, settles at 1)
    const c1 = 1.70158;
    const c3 = c1 + 1;
    animScale = progress < 1
      ? 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2)
      : 1;
  }

  renderBoardWithGhost(player, boardLeft, boardTop, boardSize, patch, placement, canPlace, animScale);

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
}

function renderBoardWithGhost(
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

function renderGameEndScreen(state: AppState): void {
  if (!state.gameState) return;

  const game = state.gameState;
  const winner = getWinner(game);
  const centerX = width / 2;

  // Fill background with winner's color or gradient if tie
  if (winner === 'tie') {
    drawPlayerGradient(ctx, 0, 0, width, height);
  } else {
    ctx.fillStyle = getPlayerColor(winner, false);
    ctx.fillRect(0, 0, width, height);
  }

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'heading', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', centerX, height * 0.08);

  // Player score panels (compact)
  const panelWidth = scale(minDim, LAYOUT.scorePanel.width);
  const panelHeight = scale(minDim, LAYOUT.scorePanel.height);
  const panelGap = scale(minDim, LAYOUT.scorePanel.gap);

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const score = calculateScore(player);
    const isWinner = winner === i;

    const yPos = height * 0.15 + i * panelGap;
    const panelX = centerX - panelWidth / 2;
    const panelY = yPos - scale(minDim, LAYOUT.gap.large);

    ctx.fillStyle = isWinner ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isWinner ? font(minDim, 'normal', 'bold') : font(minDim, 'normal');
    ctx.fillText(`${player.name}: ${score} points`, centerX, yPos);

    ctx.font = font(minDim, 'tiny');
    const emptySpaces = countEmptySpaces(player.board);
    ctx.fillText(`(${player.buttons} btns - ${emptySpaces * 2} penalty) · Tap to preview`, centerX, yPos + scale(minDim, LAYOUT.gap.large));

    const playerIdx = i;
    buttons.push({
      x: panelX, y: panelY, width: panelWidth, height: panelHeight,
      label: `Preview ${player.name}`,
      action: () => previewBoard(playerIdx),
      type: 'standard',
    });
  }

  // Tie message
  let tabY = height * 0.32;
  if (winner === 'tie') {
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText("It's a tie!", centerX, tabY - scale(minDim, LAYOUT.gap.medium));
    tabY += scale(minDim, LAYOUT.admin.buttonGap);
  }

  // Tab buttons
  const tabWidth = scale(minDim, LAYOUT.tab.width);
  const tabHeight = scale(minDim, LAYOUT.tab.height);
  const tabGap = scale(minDim, LAYOUT.tab.gap);
  const tabsWidth = tabWidth * 2 + tabGap;
  const tabsX = centerX - tabsWidth / 2;

  const tabs: Array<{ label: string; value: 'summary' | 'charts' }> = [
    { label: 'Summary', value: 'summary' },
    { label: 'Charts', value: 'charts' },
  ];

  tabs.forEach((tab, i) => {
    const tx = tabsX + i * (tabWidth + tabGap);
    const isActive = state.gameEndTab === tab.value;

    ctx.fillStyle = isActive ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(tx, tabY, tabWidth, tabHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isActive ? font(minDim, 'small', 'bold') : font(minDim, 'small');
    ctx.textAlign = 'center';
    ctx.fillText(tab.label, tx + tabWidth / 2, tabY + tabHeight / 2 + scale(minDim, 0.00625));

    buttons.push({
      x: tx, y: tabY, width: tabWidth, height: tabHeight,
      label: tab.label,
      action: () => setGameEndTab(tab.value),
      type: 'standard',
    });
  });

  // Tab content area
  const contentY = tabY + tabHeight + scale(minDim, LAYOUT.admin.buttonGap);
  const playBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const contentHeight = height * 0.82 - contentY - playBtnHeight - scale(minDim, LAYOUT.gap.large);

  if (state.gameEndTab === 'summary') {
    // Summary stats
    if (state.historyManager) {
      const stats = calculateStats(state.historyManager.history);

      ctx.fillStyle = COLORS.text;
      ctx.font = font(minDim, 'small', 'bold');
      ctx.textAlign = 'center';
      ctx.fillText('Game Stats', centerX, contentY + scale(minDim, LAYOUT.gap.large));

      ctx.font = font(minDim, 'info');
      const lineHeight = scale(minDim, 0.0275);
      let y = contentY + scale(minDim, 0.0625);

      ctx.fillText(`Total turns: ${stats.totalTurns}`, centerX, y);
      y += lineHeight;

      ctx.fillText(
        `Patches: ${game.players[0].name} ${stats.patchesBought[0]} | ${game.players[1].name} ${stats.patchesBought[1]}`,
        centerX, y
      );
      y += lineHeight;

      ctx.fillText(
        `Skips: ${game.players[0].name} ${stats.skips[0]} (+${stats.buttonsFromSkips[0]}) | ${game.players[1].name} ${stats.skips[1]} (+${stats.buttonsFromSkips[1]})`,
        centerX, y
      );
      y += lineHeight;

      ctx.fillText(
        `Leather: ${game.players[0].name} ${stats.leatherPatches[0]} | ${game.players[1].name} ${stats.leatherPatches[1]}`,
        centerX, y
      );
    }
  } else {
    // Charts tab
    if (state.historyManager) {
      const chartData = calculateChartData(state.historyManager.history);
      const chartWidth = Math.min(width - scale(minDim, LAYOUT.boardPadding * 2), scale(minDim, 0.5));
      const chartX = centerX - chartWidth / 2;
      renderCharts(ctx, chartData, chartX, contentY, chartWidth, contentHeight, minDim);
    }
  }

  // Play again button
  const btnWidth = scale(minDim, LAYOUT.buttonWidth.large);
  const btnHeight = playBtnHeight;
  const btnX = centerX - btnWidth / 2;
  const btnY = height - btnHeight - scale(minDim, LAYOUT.gap.large);

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'button', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('PLAY AGAIN', centerX, btnY + btnHeight / 2 + scale(minDim, 0.00875));

  buttons.push({
    x: btnX, y: btnY, width: btnWidth, height: btnHeight,
    label: 'Play Again',
    action: playAgain,
    type: 'standard',
  });
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

function renderBoardPreview(state: AppState): void {
  if (!state.gameState || state.previewPlayerIdx === null) return;

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
  renderBoard(player, boardX, boardY, boardSize);

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
}

function renderMapViewScreen(state: AppState): void {
  if (!state.gameState) return;

  const game = state.gameState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);
  const centerX = width / 2;
  const centerY = height / 2;

  // Fill background with current player's color
  ctx.fillStyle = getPlayerColor(currentPlayerIdx as 0 | 1, false);
  ctx.fillRect(0, 0, width, height);

  // Calculate dimensions based on screen size
  const trackRadius = scale(minDim, LAYOUT.map.trackRadius);
  const patchRingRadius = scale(minDim, LAYOUT.map.patchRingRadius);

  // Draw square background behind the patch ring area
  const bgPadding = scale(minDim, 0.075);
  const bgSize = patchRingRadius * 2 + bgPadding;
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(centerX - bgSize / 2, centerY - bgSize / 2, bgSize, bgSize);

  // Render circular time track in center
  renderCircularTimeTrack(game, centerX, centerY, trackRadius);

  // Render patches arranged in a circle around the track
  const innerRadius = trackRadius + scale(minDim, 0.0625);
  renderPatchRing(game, centerX, centerY, innerRadius, patchRingRadius);

  // Toggle map button (same position as game screen)
  const layout = getBoardLayout(width, height, game.boardSize);
  const { boardLeft, boardSize } = layout;
  const skipBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const skipBtnY = height - skipBtnHeight - scale(minDim, LAYOUT.gap.large);

  const mapBtnHeight = scale(minDim, LAYOUT.buttonHeight.small);
  const mapBtnGap = scale(minDim, LAYOUT.gap.medium);
  const mapBtnX = boardLeft;
  const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
  const mapBtnWidth = boardSize;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'info', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2 + scale(minDim, 0.00625));

  buttons.push({
    x: mapBtnX, y: mapBtnY, width: mapBtnWidth, height: mapBtnHeight,
    label: 'Toggle Map',
    action: closeMapView,
    type: 'standard',
  });
}

function renderCircularTimeTrack(
  game: GameState,
  centerX: number,
  centerY: number,
  radius: number
): void {
  const trackLength = game.timeTrackLength;
  const currentPlayerIdx = getCurrentPlayerIndex(game);
  const currentPlayerPos = game.players[currentPlayerIdx].position;

  // Draw track circle background
  ctx.strokeStyle = COLORS.boardGrid;
  ctx.lineWidth = scale(minDim, LAYOUT.map.trackLineWidth);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw position markers around the circle and register clickable areas
  const hitRadius = scale(minDim, LAYOUT.map.hitRadius);
  const positionMarkerRadius = scale(minDim, LAYOUT.map.positionMarkerRadius);

  for (let pos = 0; pos <= trackLength; pos++) {
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2; // Start from top

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Draw regular position marker (small dot)
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(x, y, positionMarkerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Register clickable area for this position
    buttons.push({
      x: x - hitRadius,
      y: y - hitRadius,
      width: hitRadius * 2,
      height: hitRadius * 2,
      label: `Position ${pos}`,
      action: () => trackPosition(pos),
      type: 'track-position',
      metadata: { trackPosition: pos },
    });
  }

  // Draw markers BETWEEN cells (at position + 0.5)
  // Income checkpoints
  const incomeCheckpointRadius = scale(minDim, LAYOUT.map.incomeCheckpointRadius);
  for (const incomePos of game.incomePositions) {
    const angle = ((incomePos + 0.5) / trackLength) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.fillStyle = COLORS.buttonIndicator;
    ctx.beginPath();
    ctx.arc(x, y, incomeCheckpointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Leather patches (uncollected only)
  const leatherPatchSize = scale(minDim, LAYOUT.map.leatherPatchSize);
  for (const lp of game.leatherPatches) {
    if (lp.collected) continue;
    const angle = ((lp.position + 0.5) / trackLength) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.fillStyle = COLORS.leatherPatch;
    ctx.fillRect(x - leatherPatchSize / 2, y - leatherPatchSize / 2, leatherPatchSize, leatherPatchSize);
  }

  // Draw player tokens
  const playerTokenRadius = scale(minDim, LAYOUT.map.playerTokenRadius);
  const tokenOffset = playerTokenRadius;
  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const pos = Math.min(player.position, trackLength);
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2;

    // Offset tokens if players on same position
    const samePos = game.players[0].position === game.players[1].position;
    const offset = samePos ? (i === 0 ? -tokenOffset : tokenOffset) : 0;
    const tokenRadiusPos = radius + offset;

    const x = centerX + Math.cos(angle) * tokenRadiusPos;
    const y = centerY + Math.sin(angle) * tokenRadiusPos;

    // Draw player token (colored circle)
    ctx.fillStyle = i === 0 ? COLORS.player1 : COLORS.player2;
    ctx.beginPath();
    ctx.arc(x, y, playerTokenRadius, 0, Math.PI * 2);
    ctx.fill();

    // Player number inside token
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'info', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x, y + scale(minDim, 0.00625));
  }

  // Draw track info in center
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';

  if (lastTappedTrackPos !== null) {
    // Show distance from current player to tapped position
    const distance = lastTappedTrackPos - currentPlayerPos;
    const distanceText = distance > 0 ? `+${distance}` : String(distance);
    ctx.font = font(minDim, 'large', 'bold');
    ctx.fillText(distanceText, centerX, centerY - scale(minDim, 0.0025));
    ctx.font = font(minDim, 'tiny');
    ctx.fillText('spaces', centerX, centerY + scale(minDim, LAYOUT.gap.large));
  } else {
    // Show track length
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText(`${trackLength}`, centerX, centerY - scale(minDim, 0.005));
    ctx.font = font(minDim, 'tiny');
    ctx.fillText('spaces', centerX, centerY + scale(minDim, LAYOUT.gap.large));
  }
}

// Export function to set tapped track position
export function setTappedTrackPosition(pos: number | null): void {
  lastTappedTrackPos = pos;
}

// Export function to clear tapped position (called when leaving map view)
export function clearTappedTrackPosition(): void {
  lastTappedTrackPos = null;
}

function renderPatchRing(
  game: GameState,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number
): void {
  const patches = game.patches;
  const patchCount = patches.length;

  if (patchCount === 0) return;

  const availablePatches = getAvailablePatches(game);
  const availablePatchIds = new Set(availablePatches.map(p => p.id));

  // Calculate cell size based on patch count (relative to radius difference)
  const maxCellSize = Math.min(scale(minDim, 0.03125), (outerRadius - innerRadius) * 0.4);

  for (let i = 0; i < patchCount; i++) {
    const angle = (i / patchCount) * Math.PI * 2 - Math.PI / 2; // Start from top
    const patchRadius = (innerRadius + outerRadius) / 2;

    const x = centerX + Math.cos(angle) * patchRadius;
    const y = centerY + Math.sin(angle) * patchRadius;

    const patch = patches[i];
    const isAvailable = availablePatchIds.has(patch.id);
    const availableIndex = isAvailable ? availablePatches.findIndex(p => p.id === patch.id) : -1;

    renderPatchInRing(patch, x, y, maxCellSize, isAvailable, availableIndex);
  }

  // Draw market position indicator (arrow pointing to first available)
  if (patchCount > 0) {
    const marketAngle = (game.marketPosition / patchCount) * Math.PI * 2 - Math.PI / 2;
    const markerOffset = scale(minDim, 0.01875);
    const markerRadius = innerRadius - markerOffset;
    const mx = centerX + Math.cos(marketAngle) * markerRadius;
    const my = centerY + Math.sin(marketAngle) * markerRadius;

    // Draw arrow pointing outward (size relative to minDim)
    const arrowSize = scale(minDim, 0.01);
    ctx.fillStyle = COLORS.button;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(marketAngle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize);
    ctx.lineTo(arrowSize * 0.75, arrowSize * 0.5);
    ctx.lineTo(-arrowSize * 0.75, arrowSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function renderPatchInRing(
  patch: Patch,
  centerX: number,
  centerY: number,
  maxCellSize: number,
  isAvailable: boolean,
  availableIndex: number
): void {
  const shape = patch.shape;
  const patchHeight = shape.length;
  const patchWidth = shape[0].length;

  // Scale cell size to fit patch
  const cellSize = Math.min(maxCellSize, maxCellSize / Math.max(patchWidth, patchHeight) * 2);
  const cellPadding = Math.max(1, cellSize * 0.1);

  const startX = centerX - (patchWidth * cellSize) / 2;
  const startY = centerY - (patchHeight * cellSize) / 2;

  // Highlight available patches
  if (isAvailable) {
    const highlightPadding = scale(minDim, 0.005);
    const highlightTopPadding = scale(minDim, 0.015);
    ctx.strokeStyle = COLORS.button;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      startX - highlightPadding,
      startY - highlightTopPadding,
      patchWidth * cellSize + highlightPadding * 2,
      patchHeight * cellSize + highlightTopPadding + scale(minDim, 0.015)
    );

    // Show availability number (1, 2, or 3)
    ctx.fillStyle = COLORS.button;
    ctx.font = font(minDim, 'micro', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(availableIndex + 1), centerX, startY - scale(minDim, 0.00375));
  }

  // Draw patch cells
  const patchColor = getPatchColor(patch.id);
  ctx.fillStyle = isAvailable ? patchColor : adjustColorOpacity(patchColor, 0.4);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        ctx.fillRect(
          startX + col * cellSize + cellPadding,
          startY + row * cellSize + cellPadding,
          cellSize - cellPadding * 2,
          cellSize - cellPadding * 2
        );
      }
    }
  }

  // Draw button indicators for income
  if (patch.buttonIncome > 0) {
    drawButtonIndicators(shape, patch.buttonIncome, startX, startY, cellSize);
  }

  // Cost info below patch (compact)
  ctx.fillStyle = isAvailable ? COLORS.text : adjustColorOpacity(COLORS.text, 0.5);
  ctx.font = font(minDim, 'micro');
  ctx.textAlign = 'center';
  ctx.fillText(`${patch.buttonCost}/${patch.timeCost}`, centerX, startY + patchHeight * cellSize + scale(minDim, 0.01));
}

function renderToasts(toasts: Toast[]): void {
  const centerX = width / 2;
  const toastHeight = scale(minDim, LAYOUT.toast.height);
  const toastGap = scale(minDim, LAYOUT.toast.gap);
  const totalHeight = toasts.length * toastHeight + (toasts.length - 1) * toastGap;
  const startY = height / 2 - totalHeight / 2 + toastHeight / 2;

  toasts.forEach((toast, index) => {
    const y = startY + index * (toastHeight + toastGap);
    const age = Date.now() - toast.createdAt;
    const opacity = calculateToastOpacity(age);
    renderSingleToast(toast.message, centerX, y, opacity);
  });
}

function calculateToastOpacity(age: number): number {
  const FADE_START = 1500;  // Start fading at 1.5s
  const FADE_DURATION = 500;  // Fade over 0.5s

  if (age < FADE_START) return 1;
  const fadeProgress = (age - FADE_START) / FADE_DURATION;
  return Math.max(0, 1 - fadeProgress);
}

function renderSingleToast(message: string, centerX: number, centerY: number, opacity: number): void {
  // Measure text to size the background
  ctx.font = font(minDim, 'normal', 'bold');
  const textMetrics = ctx.measureText(message);
  const textWidth = textMetrics.width;
  const padding = scale(minDim, LAYOUT.toast.padding);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = scale(minDim, LAYOUT.toast.height);

  // Semi-transparent dark background with rounded corners
  ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * opacity})`;
  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;
  const radius = scale(minDim, LAYOUT.toast.borderRadius);

  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
  ctx.lineTo(boxX + radius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();

  // White text with opacity
  ctx.fillStyle = `rgba(236, 240, 241, ${opacity})`;
  ctx.textAlign = 'center';
  ctx.fillText(message, centerX, centerY + scale(minDim, 0.0075));
}

