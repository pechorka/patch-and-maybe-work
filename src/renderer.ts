import type { AppState, BoardSize, Button, GameState, Patch, PlacementState, Player } from './types';
import { calculateScore, canPlacePatch, getAvailablePatches, getCurrentPlayerIndex, getNextIncomeDistance, getOvertakeDistance, getWinner } from './game';
import {
  selectSize, editName, startGame,
  skip, openMapView,
  cancelPlacement, confirmPlacement, rotate, reflect,
  playAgain, previewBoard, backToGameEnd,
  closeMapView, trackPosition,
} from './main';
import { getTransformedShape } from './shape-utils';
import { COLORS, getPatchColor, adjustColorOpacity } from './colors';
import { getOpponentIndex } from './player-utils';
import { renderBoard as renderBoardNew } from './renderer/board-renderer';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;

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
  const btnHeight = 50;
  const boardTop = btnHeight + 20;
  const boardPixelSize = Math.min(width - 40, height - btnHeight - 150);
  const boardLeft = (width - boardPixelSize) / 2;
  const cellSize = boardPixelSize / gameState.boardSize;

  return {
    boardLeft,
    boardTop,
    boardSize: boardPixelSize,
    cellSize,
    boardCells: gameState.boardSize,
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
  shape: boolean[][]
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

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);
}

export function render(state: AppState): void {
  buttons = [];

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  switch (state.screen) {
    case 'setup':
      renderSetupScreen(state);
      break;
    case 'game':
      renderGameScreen(state);
      break;
    case 'placement':
      renderPlacementScreen(state);
      break;
    case 'gameEnd':
      renderGameEndScreen(state);
      break;
    case 'mapView':
      renderMapViewScreen(state);
      break;
    case 'boardPreview':
      renderBoardPreview(state);
      break;
  }
}

function renderSetupScreen(state: AppState): void {
  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PATCHWORK', centerX, height * 0.18);

  // Players label
  ctx.font = '24px sans-serif';
  ctx.fillText('Players:', centerX, height * 0.30);

  // Player name buttons
  const nameButtonWidth = 160;
  const nameButtonHeight = 40;
  const nameGap = 20;
  const totalNameWidth = 2 * nameButtonWidth + nameGap;
  const nameStartX = centerX - totalNameWidth / 2;
  const nameY = height * 0.34;

  for (let i = 0; i < 2; i++) {
    const x = nameStartX + i * (nameButtonWidth + nameGap);

    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, nameY, nameButtonWidth, nameButtonHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    const displayName = state.playerNames[i].length > 12
      ? state.playerNames[i].slice(0, 12) + '...'
      : state.playerNames[i];
    ctx.fillText(displayName, x + nameButtonWidth / 2, nameY + nameButtonHeight / 2 + 6);

    buttons.push({
      x, y: nameY, width: nameButtonWidth, height: nameButtonHeight,
      label: state.playerNames[i],
      action: () => editName(i as 0 | 1),
      type: 'standard',
    });
  }

  // Board size label
  ctx.font = '24px sans-serif';
  ctx.fillText('Board Size:', centerX, height * 0.48);

  // Board size buttons
  const sizes: BoardSize[] = [7, 9, 11];
  const buttonWidth = 80;
  const buttonHeight = 50;
  const gap = 20;
  const totalWidth = sizes.length * buttonWidth + (sizes.length - 1) * gap;
  const startX = centerX - totalWidth / 2;

  sizes.forEach((size, i) => {
    const x = startX + i * (buttonWidth + gap);
    const y = height * 0.52;
    const isSelected = state.selectedBoardSize === size;

    ctx.fillStyle = isSelected ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(x, y, buttonWidth, buttonHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${size}x${size}`, x + buttonWidth / 2, y + buttonHeight / 2 + 7);

    buttons.push({
      x, y, width: buttonWidth, height: buttonHeight,
      label: `${size}x${size}`,
      action: () => selectSize(size),
      type: 'standard',
    });
  });

  // Start button
  const startBtnWidth = 200;
  const startBtnHeight = 60;
  const startBtnX = centerX - startBtnWidth / 2;
  const startBtnY = height * 0.66;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(startBtnX, startBtnY, startBtnWidth, startBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('START GAME', centerX, startBtnY + startBtnHeight / 2 + 8);

  buttons.push({
    x: startBtnX, y: startBtnY, width: startBtnWidth, height: startBtnHeight,
    label: 'Start Game',
    action: startGame,
    type: 'standard',
  });
}

function renderGameScreen(state: AppState): void {
  if (!state.gameState) return;

  const game = state.gameState;
  const currentPlayerIdx = getCurrentPlayerIndex(game);

  // Player panels at top
  const panelHeight = 80;
  renderPlayerPanels(game, currentPlayerIdx, panelHeight);

  // Current player's board
  const boardTop = panelHeight + 20;
  const boardSize = Math.min(width - 40, height - panelHeight - 270);
  const boardLeft = (width - boardSize) / 2;

  renderBoard(game.players[currentPlayerIdx], boardLeft, boardTop, boardSize);

  // Available patches
  const patchesTop = boardTop + boardSize + 20;
  renderAvailablePatches(game, boardLeft, patchesTop, boardSize);

  // Skip button
  const skipBtnWidth = boardSize;
  const skipBtnHeight = 50;
  const skipBtnX = boardLeft;
  const skipBtnY = height - skipBtnHeight - 20;

  // Calculate skip amount
  const currentPlayer = game.players[currentPlayerIdx];
  const opponent = game.players[getOpponentIndex(currentPlayerIdx)];
  const spacesToSkip = opponent.position - currentPlayer.position + 1;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(skipBtnX, skipBtnY, skipBtnWidth, skipBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SKIP & MOVE AHEAD (+${spacesToSkip})`, skipBtnX + skipBtnWidth / 2, skipBtnY + skipBtnHeight / 2 + 7);

  buttons.push({
    x: skipBtnX, y: skipBtnY, width: skipBtnWidth, height: skipBtnHeight,
    label: 'Skip',
    action: skip,
    type: 'standard',
  });

  // Toggle map button (above skip button)
  const mapBtnHeight = 40;
  const mapBtnGap = 10;
  const mapBtnX = skipBtnX;
  const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
  const mapBtnWidth = skipBtnWidth;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2 + 5);

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

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const x = i * panelWidth;
    const isActive = i === currentPlayerIdx;
    const playerIdx = i as 0 | 1;

    ctx.fillStyle = isActive ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(x, 0, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isActive ? 'bold 16px sans-serif' : '16px sans-serif';
    ctx.textAlign = 'center';

    const centerX = x + panelWidth / 2;
    ctx.fillText(player.name, centerX, 18);
    ctx.fillText(`Buttons: ${player.buttons}   Pos: ${player.position}/${game.timeTrackLength}`, centerX, 38);

    ctx.fillStyle = COLORS.text;
    ctx.font = '12px sans-serif';

    // Income info
    const incomeDistance = getNextIncomeDistance(game, playerIdx);
    const incomeText = incomeDistance !== null ? `+${player.income} in ${incomeDistance}` : `+${player.income} (done)`;
    ctx.fillText(incomeText, centerX, 55);

    // Turn ends info (only for current player)
    if (isActive) {
      ctx.fillText(`Turn ends in: ${overtakeDistance}`, centerX, 72);
    }
  }
}

function getFilledCells(shape: boolean[][]): {row: number, col: number}[] {
  const cells: {row: number, col: number}[] = [];
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) cells.push({row, col});
    }
  }
  return cells;
}

function drawButtonIndicators(
  shape: boolean[][],
  buttonIncome: number,
  startX: number,
  startY: number,
  cellSize: number
): void {
  if (buttonIncome === 0) return;
  const cells = getFilledCells(shape);
  const indicatorCells = cells.slice(0, buttonIncome);

  ctx.fillStyle = COLORS.buttonIndicator;
  for (const {row, col} of indicatorCells) {
    const cx = startX + col * cellSize + cellSize / 2;
    const cy = startY + row * cellSize + cellSize / 2;
    const radius = cellSize * 0.25;
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
  const patchAreaHeight = 100;

  patches.forEach((patch, i) => {
    const patchX = x + i * patchAreaWidth;
    const canBuy = game.players[getCurrentPlayerIndex(game)].buttons >= patch.buttonCost;

    // Background
    ctx.fillStyle = canBuy ? COLORS.panel : COLORS.buttonDisabled;
    ctx.fillRect(patchX + 5, y, patchAreaWidth - 10, patchAreaHeight);

    // Draw patch shape
    const shape = patch.shape;
    const maxDim = Math.max(shape.length, shape[0].length);
    const cellSize = Math.min(40, (patchAreaWidth - 30) / maxDim, 50 / maxDim);
    const shapeWidth = shape[0].length * cellSize;
    const shapeX = patchX + (patchAreaWidth - shapeWidth) / 2;
    const shapeY = y + 10;

    ctx.fillStyle = getPatchColor(patch.id);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          ctx.fillRect(shapeX + col * cellSize + 1, shapeY + row * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // Draw button indicators
    drawButtonIndicators(shape, patch.buttonIncome, shapeX, shapeY, cellSize);

    // Cost info
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const infoY = y + patchAreaHeight - 10;
    ctx.fillText(`Cost: ${patch.buttonCost}  Time: ${patch.timeCost}`, patchX + patchAreaWidth / 2, infoY);

    if (canBuy) {
      buttons.push({
        x: patchX + 5, y, width: patchAreaWidth - 10, height: patchAreaHeight,
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

  // Top buttons
  const btnHeight = 50;
  const btnWidth = width / 2 - 10;

  if (isLeatherPatch) {
    // Show "LEATHER PATCH" label instead of cancel button (can't cancel)
    ctx.fillStyle = COLORS.leatherPatch;
    ctx.fillRect(5, 5, btnWidth, btnHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEATHER PATCH', 5 + btnWidth / 2, 5 + btnHeight / 2 + 7);
    // No button registration - can't cancel leather patch placement
  } else {
    // Cancel button
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(5, 5, btnWidth, btnHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CANCEL', 5 + btnWidth / 2, 5 + btnHeight / 2 + 7);
    buttons.push({ x: 5, y: 5, width: btnWidth, height: btnHeight, label: 'Cancel', action: cancelPlacement, type: 'standard' });
  }

  // Confirm button
  const shape = getTransformedShape(patch.shape, placement.rotation, placement.reflected);
  const canPlace = canPlacePatch(player.board, shape, placement.x, placement.y);

  ctx.fillStyle = canPlace ? COLORS.button : COLORS.buttonDisabled;
  ctx.fillRect(width / 2 + 5, 5, btnWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.fillText('CONFIRM', width / 2 + 5 + btnWidth / 2, 5 + btnHeight / 2 + 7);
  if (canPlace) {
    buttons.push({ x: width / 2 + 5, y: 5, width: btnWidth, height: btnHeight, label: 'Confirm', action: confirmPlacement, type: 'standard' });
  }

  // Board with ghost
  const boardTop = btnHeight + 20;
  const boardSize = Math.min(width - 40, height - btnHeight - 150);
  const boardLeft = (width - boardSize) / 2;

  renderBoardWithGhost(player, boardLeft, boardTop, boardSize, patch, placement, canPlace);

  // Control buttons at bottom (rotate and reflect only)
  const controlY = boardTop + boardSize + 20;
  const controlBtnHeight = 50;
  const controlBtnWidth = 100;
  const controlGap = 20;
  const controlsWidth = controlBtnWidth * 2 + controlGap;
  const controlsStartX = (width - controlsWidth) / 2;

  // Rotate button
  const rotateBtnX = controlsStartX;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(rotateBtnX, controlY, controlBtnWidth, controlBtnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Rotate', rotateBtnX + controlBtnWidth / 2, controlY + controlBtnHeight / 2 + 6);
  buttons.push({ x: rotateBtnX, y: controlY, width: controlBtnWidth, height: controlBtnHeight, label: 'Rotate', action: rotate, type: 'standard' });

  // Reflect button
  const reflectBtnX = controlsStartX + controlBtnWidth + controlGap;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(reflectBtnX, controlY, controlBtnWidth, controlBtnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Reflect', reflectBtnX + controlBtnWidth / 2, controlY + controlBtnHeight / 2 + 6);
  buttons.push({ x: reflectBtnX, y: controlY, width: controlBtnWidth, height: controlBtnHeight, label: 'Reflect', action: reflect, type: 'standard' });
}

function renderBoardWithGhost(
  player: Player,
  x: number,
  y: number,
  size: number,
  patch: Patch,
  placement: PlacementState,
  canPlace: boolean
): void {
  renderBoardNew(ctx, player, x, y, size, { patch, placement, canPlace });
}

function renderGameEndScreen(state: AppState): void {
  if (!state.gameState) return;

  const game = state.gameState;
  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', centerX, height * 0.2);

  // Scores
  const winner = getWinner(game);

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const score = calculateScore(player);
    const isWinner = winner === i;

    const yPos = height * 0.35 + i * 100;
    const panelX = centerX - 150;
    const panelY = yPos - 30;
    const panelWidth = 300;
    const panelHeight = 80;

    ctx.fillStyle = isWinner ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isWinner ? 'bold 24px sans-serif' : '24px sans-serif';
    ctx.fillText(`${player.name}: ${score} points`, centerX, yPos);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.text;

    const emptySpaces = countEmptySpaces(player.board);
    ctx.fillText(`(${player.buttons} buttons - ${emptySpaces * 2} penalty)`, centerX, yPos + 30);

    // Make panel clickable to preview board
    const playerIdx = i;
    buttons.push({
      x: panelX, y: panelY, width: panelWidth, height: panelHeight,
      label: `Preview ${player.name}`,
      action: () => previewBoard(playerIdx),
      type: 'standard',
    });
  }

  if (winner === 'tie') {
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText("It's a tie!", centerX, height * 0.6);
  }

  // Play again button
  const btnWidth = 200;
  const btnHeight = 60;
  const btnX = centerX - btnWidth / 2;
  const btnY = height * 0.75;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PLAY AGAIN', centerX, btnY + btnHeight / 2 + 8);

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

  // Title with player name
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${player.name}'s Board`, centerX, height * 0.08);

  // Score summary
  const score = calculateScore(player);
  const emptySpaces = countEmptySpaces(player.board);
  ctx.font = '20px sans-serif';
  ctx.fillText(`Score: ${score} (${player.buttons} buttons - ${emptySpaces * 2} penalty)`, centerX, height * 0.14);

  // Render board large and centered
  const boardSize = Math.min(width * 0.85, height * 0.65);
  const boardX = centerX - boardSize / 2;
  const boardY = height * 0.18;
  renderBoard(player, boardX, boardY, boardSize);

  // Back button
  const btnWidth = 150;
  const btnHeight = 50;
  const btnX = centerX - btnWidth / 2;
  const btnY = height * 0.9;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('BACK', centerX, btnY + btnHeight / 2 + 7);

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
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate dimensions based on screen size
  const minDim = Math.min(width, height);
  const trackRadius = minDim * 0.18;
  const patchRingRadius = minDim * 0.42;

  // Render circular time track in center
  renderCircularTimeTrack(game, centerX, centerY, trackRadius);

  // Render patches arranged in a circle around the track
  renderPatchRing(game, centerX, centerY, trackRadius + 50, patchRingRadius);

  // Toggle map button (above where skip button would be on game screen)
  const panelHeight = 80;
  const boardSize = Math.min(width - 40, height - panelHeight - 270);
  const boardLeft = (width - boardSize) / 2;
  const skipBtnHeight = 50;
  const skipBtnY = height - skipBtnHeight - 20;

  const mapBtnHeight = 40;
  const mapBtnGap = 10;
  const mapBtnX = boardLeft;
  const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
  const mapBtnWidth = boardSize;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, mapBtnY, mapBtnWidth, mapBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOGGLE MAP', mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2 + 5);

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
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw position markers around the circle and register clickable areas
  const hitRadius = 18; // Clickable area radius
  for (let pos = 0; pos <= trackLength; pos++) {
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2; // Start from top

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Check if this position has an uncollected leather patch
    const leatherPatch = game.leatherPatches.find(
      lp => lp.position === pos && !lp.collected
    );

    if (leatherPatch) {
      // Draw leather patch marker (small brown square)
      ctx.fillStyle = COLORS.leatherPatch;
      const patchSize = 14;
      ctx.fillRect(x - patchSize / 2, y - patchSize / 2, patchSize, patchSize);
    } else {
      // Income checkpoint markers (larger, different color)
      const isIncomePos = game.incomePositions.includes(pos);
      const dotRadius = isIncomePos ? 8 : 3;
      const color = isIncomePos ? COLORS.buttonIndicator : COLORS.text;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

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

  // Draw player tokens
  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const pos = Math.min(player.position, trackLength);
    const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2;

    // Offset tokens if players on same position
    const samePos = game.players[0].position === game.players[1].position;
    const offset = samePos ? (i === 0 ? -16 : 16) : 0;
    const tokenRadius = radius + offset;

    const x = centerX + Math.cos(angle) * tokenRadius;
    const y = centerY + Math.sin(angle) * tokenRadius;

    // Draw player token (colored circle)
    ctx.fillStyle = i === 0 ? '#e74c3c' : '#3498db'; // Red for P1, Blue for P2
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Player number inside token
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x, y + 5);
  }

  // Draw track info in center
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';

  if (lastTappedTrackPos !== null) {
    // Show distance from current player to tapped position
    const distance = lastTappedTrackPos - currentPlayerPos;
    const distanceText = distance > 0 ? `+${distance}` : String(distance);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(distanceText, centerX, centerY - 2);
    ctx.font = '12px sans-serif';
    ctx.fillText('spaces', centerX, centerY + 16);
  } else {
    // Show track length
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${trackLength}`, centerX, centerY - 4);
    ctx.font = '12px sans-serif';
    ctx.fillText('spaces', centerX, centerY + 16);
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

  // Calculate cell size based on patch count
  const maxCellSize = Math.min(25, (outerRadius - innerRadius) * 0.4);

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
    const markerRadius = innerRadius - 15;
    const mx = centerX + Math.cos(marketAngle) * markerRadius;
    const my = centerY + Math.sin(marketAngle) * markerRadius;

    // Draw arrow pointing outward
    ctx.fillStyle = COLORS.button;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(marketAngle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 4);
    ctx.lineTo(-6, 4);
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

  const startX = centerX - (patchWidth * cellSize) / 2;
  const startY = centerY - (patchHeight * cellSize) / 2;

  // Highlight available patches
  if (isAvailable) {
    ctx.strokeStyle = COLORS.button;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      startX - 4,
      startY - 12,
      patchWidth * cellSize + 8,
      patchHeight * cellSize + 24
    );

    // Show availability number (1, 2, or 3)
    ctx.fillStyle = COLORS.button;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(availableIndex + 1), centerX, startY - 3);
  }

  // Draw patch cells
  const patchColor = getPatchColor(patch.id);
  ctx.fillStyle = isAvailable ? patchColor : adjustColorOpacity(patchColor, 0.4);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        ctx.fillRect(
          startX + col * cellSize + 1,
          startY + row * cellSize + 1,
          cellSize - 2,
          cellSize - 2
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
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${patch.buttonCost}/${patch.timeCost}`, centerX, startY + patchHeight * cellSize + 8);
}

