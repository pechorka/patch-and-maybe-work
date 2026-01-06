import type { AppState, BoardSize, Button, GameState, Patch, PlacementState, Player } from './types';
import { calculateScore, canPlacePatch, getAvailablePatches, getCurrentPlayerIndex, getNextIncomeDistance, getOvertakeDistance, getWinner } from './game';
import { reflectPatch, rotatePatch } from './patches';

// Colors
const COLORS = {
  background: '#2c3e50',
  panel: '#34495e',
  panelActive: '#3498db',
  text: '#ecf0f1',
  button: '#27ae60',
  buttonDisabled: '#7f8c8d',
  boardBg: '#1a252f',
  boardGrid: '#2c3e50',
  buttonIndicator: '#3498db',
  patchColors: [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#c0392b', '#9b59b6', '#e91e63', '#00bcd4', '#8bc34a',
    '#ff5722', '#795548', '#607d8b', '#673ab7', '#009688'
  ],
  ghostValid: 'rgba(46, 204, 113, 0.5)',
  ghostInvalid: 'rgba(231, 76, 60, 0.5)',
};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;

// Toggle map button constants
const TOGGLE_MAP_BTN = {
  width: 80,
  height: 36,
  y: 10,
};

// Track tapped position on time track (for distance display)
let lastTappedTrackPos: number | null = null;

// Store button positions for hit detection
export let buttons: Button[] = [];

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
      action: `editName:${i}`,
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
      action: `selectSize:${size}`,
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
    action: 'startGame',
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
  const boardSize = Math.min(width - 40, height - panelHeight - 220);
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
  const opponent = game.players[currentPlayerIdx === 0 ? 1 : 0];
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
    action: 'skip',
  });

  // Toggle map button (top right corner)
  const mapBtnX = width - TOGGLE_MAP_BTN.width - 10;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, TOGGLE_MAP_BTN.y, TOGGLE_MAP_BTN.width, TOGGLE_MAP_BTN.height);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('toggle map', mapBtnX + TOGGLE_MAP_BTN.width / 2, TOGGLE_MAP_BTN.y + TOGGLE_MAP_BTN.height / 2 + 4);

  buttons.push({
    x: mapBtnX, y: TOGGLE_MAP_BTN.y, width: TOGGLE_MAP_BTN.width, height: TOGGLE_MAP_BTN.height,
    label: 'Toggle Map',
    action: 'openMapView',
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
    let shape = rotatePatch(placed.patch.shape, placed.rotation);
    if (placed.reflected) {
      shape = reflectPatch(shape);
    }
    const patchColor = COLORS.patchColors[(placed.patch.id - 1) % COLORS.patchColors.length];

    // Draw patch cells
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

    // Draw button indicators
    const startX = x + placed.x * cellSize;
    const startY = y + placed.y * cellSize;
    drawButtonIndicators(shape, placed.patch.buttonIncome, startX, startY, cellSize);
  }
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

    ctx.fillStyle = COLORS.patchColors[(patch.id - 1) % COLORS.patchColors.length];
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
        action: `selectPatch:${i}`,
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
  const patches = getAvailablePatches(game);
  const patch = patches[placement.patchIndex];

  if (!patch) return;

  // Top buttons
  const btnHeight = 50;
  const btnWidth = width / 2 - 10;

  // Cancel button
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(5, 5, btnWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CANCEL', 5 + btnWidth / 2, 5 + btnHeight / 2 + 7);
  buttons.push({ x: 5, y: 5, width: btnWidth, height: btnHeight, label: 'Cancel', action: 'cancelPlacement' });

  // Confirm button
  let shape = rotatePatch(patch.shape, placement.rotation);
  if (placement.reflected) {
    shape = reflectPatch(shape);
  }
  const canPlace = canPlacePatch(player.board, shape, placement.x, placement.y);

  ctx.fillStyle = canPlace ? COLORS.button : COLORS.buttonDisabled;
  ctx.fillRect(width / 2 + 5, 5, btnWidth, btnHeight);
  ctx.fillStyle = COLORS.text;
  ctx.fillText('CONFIRM', width / 2 + 5 + btnWidth / 2, 5 + btnHeight / 2 + 7);
  if (canPlace) {
    buttons.push({ x: width / 2 + 5, y: 5, width: btnWidth, height: btnHeight, label: 'Confirm', action: 'confirmPlacement' });
  }

  // Board with ghost
  const boardTop = btnHeight + 20;
  const boardSize = Math.min(width - 40, height - btnHeight - 150);
  const boardLeft = (width - boardSize) / 2;

  renderBoardWithGhost(player, boardLeft, boardTop, boardSize, patch, placement, canPlace);

  // Control buttons at bottom
  const controlY = boardTop + boardSize + 20;
  const controlBtnSize = 60;
  const controlGap = 10;
  const controlsWidth = controlBtnSize * 6 + controlGap * 5;
  const controlsStartX = (width - controlsWidth) / 2;

  const controls = [
    { label: '<', action: 'moveLeft' },
    { label: '^', action: 'moveUp' },
    { label: 'R', action: 'rotate' },
    { label: 'F', action: 'reflect' },
    { label: 'v', action: 'moveDown' },
    { label: '>', action: 'moveRight' },
  ];

  controls.forEach((ctrl, i) => {
    const btnX = controlsStartX + i * (controlBtnSize + controlGap);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(btnX, controlY, controlBtnSize, controlBtnSize);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ctrl.label, btnX + controlBtnSize / 2, controlY + controlBtnSize / 2 + 8);
    buttons.push({ x: btnX, y: controlY, width: controlBtnSize, height: controlBtnSize, label: ctrl.label, action: ctrl.action });
  });
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
    let placedShape = rotatePatch(placed.patch.shape, placed.rotation);
    if (placed.reflected) {
      placedShape = reflectPatch(placedShape);
    }
    const patchColor = COLORS.patchColors[(placed.patch.id - 1) % COLORS.patchColors.length];

    ctx.fillStyle = patchColor;
    for (let row = 0; row < placedShape.length; row++) {
      for (let col = 0; col < placedShape[row].length; col++) {
        if (placedShape[row][col]) {
          const cellX = x + (placed.x + col) * cellSize;
          const cellY = y + (placed.y + row) * cellSize;
          ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    drawButtonIndicators(placedShape, placed.patch.buttonIncome, x + placed.x * cellSize, y + placed.y * cellSize, cellSize);
  }

  // Draw ghost patch
  let ghostShape = rotatePatch(patch.shape, placement.rotation);
  if (placement.reflected) {
    ghostShape = reflectPatch(ghostShape);
  }
  ctx.fillStyle = canPlace ? COLORS.ghostValid : COLORS.ghostInvalid;

  for (let row = 0; row < ghostShape.length; row++) {
    for (let col = 0; col < ghostShape[row].length; col++) {
      if (ghostShape[row][col]) {
        const cellX = x + (placement.x + col) * cellSize;
        const cellY = y + (placement.y + row) * cellSize;
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
      }
    }
  }

  // Draw button indicators on ghost
  drawButtonIndicators(ghostShape, patch.buttonIncome, x + placement.x * cellSize, y + placement.y * cellSize, cellSize);
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

    ctx.fillStyle = isWinner ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(centerX - 150, yPos - 30, 300, 80);

    ctx.fillStyle = COLORS.text;
    ctx.font = isWinner ? 'bold 24px sans-serif' : '24px sans-serif';
    ctx.fillText(`${player.name}: ${score} points`, centerX, yPos);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.text;

    const emptySpaces = countEmptySpaces(player.board);
    ctx.fillText(`(${player.buttons} buttons - ${emptySpaces * 2} penalty)`, centerX, yPos + 30);
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
    action: 'playAgain',
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

  // Toggle map button (top right corner, same position as game screen)
  const mapBtnX = width - TOGGLE_MAP_BTN.width - 10;

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBtnX, TOGGLE_MAP_BTN.y, TOGGLE_MAP_BTN.width, TOGGLE_MAP_BTN.height);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('toggle map', mapBtnX + TOGGLE_MAP_BTN.width / 2, TOGGLE_MAP_BTN.y + TOGGLE_MAP_BTN.height / 2 + 4);

  buttons.push({
    x: mapBtnX, y: TOGGLE_MAP_BTN.y, width: TOGGLE_MAP_BTN.width, height: TOGGLE_MAP_BTN.height,
    label: 'Toggle Map',
    action: 'closeMapView',
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

    // Income checkpoint markers (larger, different color)
    const isIncomePos = game.incomePositions.includes(pos);
    const dotRadius = isIncomePos ? 8 : 3;
    const color = isIncomePos ? COLORS.buttonIndicator : COLORS.text;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Register clickable area for this position
    buttons.push({
      x: x - hitRadius,
      y: y - hitRadius,
      width: hitRadius * 2,
      height: hitRadius * 2,
      label: `Position ${pos}`,
      action: `trackPosition:${pos}`,
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
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x, y);
  }

  // Draw track info in center
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (lastTappedTrackPos !== null) {
    // Show distance from current player to tapped position
    const distance = lastTappedTrackPos - currentPlayerPos;
    const distanceText = distance > 0 ? `+${distance}` : String(distance);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(distanceText, centerX, centerY - 10);
    ctx.font = '12px sans-serif';
    ctx.fillText('spaces', centerX, centerY + 12);
  } else {
    // Show track length
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${trackLength}`, centerX, centerY - 10);
    ctx.font = '12px sans-serif';
    ctx.fillText('spaces', centerX, centerY + 12);
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
    ctx.textBaseline = 'middle';
    ctx.fillText(String(availableIndex + 1), centerX, startY - 6);
  }

  // Draw patch cells
  const patchColor = COLORS.patchColors[(patch.id - 1) % COLORS.patchColors.length];
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
  ctx.textBaseline = 'top';
  ctx.fillText(`${patch.buttonCost}/${patch.timeCost}`, centerX, startY + patchHeight * cellSize + 2);
}

function adjustColorOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Return as-is if not hex
  return color;
}
