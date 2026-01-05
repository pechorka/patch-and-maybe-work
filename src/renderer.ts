import type { AppState, BoardSize, Button, GameState, Patch, PlacementState } from './types';
import { calculateScore, canPlacePatch, getAvailablePatches, getCurrentPlayerIndex, getWinner } from './game';
import { rotatePatch } from './patches';

// Colors
const COLORS = {
  background: '#2c3e50',
  panel: '#34495e',
  panelActive: '#3498db',
  text: '#ecf0f1',
  textDim: '#95a5a6',
  button: '#27ae60',
  buttonDisabled: '#7f8c8d',
  boardBg: '#1a252f',
  boardGrid: '#2c3e50',
  patchColors: [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#8bc34a',
    '#ff5722', '#795548', '#607d8b', '#673ab7', '#009688'
  ],
  ghostValid: 'rgba(46, 204, 113, 0.5)',
  ghostInvalid: 'rgba(231, 76, 60, 0.5)',
};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;

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
  }
}

function renderSetupScreen(state: AppState): void {
  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PATCHWORK', centerX, height * 0.25);

  // Board size label
  ctx.font = '24px sans-serif';
  ctx.fillText('Board Size:', centerX, height * 0.4);

  // Board size buttons
  const sizes: BoardSize[] = [7, 9, 11];
  const buttonWidth = 80;
  const buttonHeight = 50;
  const gap = 20;
  const totalWidth = sizes.length * buttonWidth + (sizes.length - 1) * gap;
  const startX = centerX - totalWidth / 2;

  sizes.forEach((size, i) => {
    const x = startX + i * (buttonWidth + gap);
    const y = height * 0.45;
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
  const startBtnY = height * 0.6;

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

  renderBoard(game.players[currentPlayerIdx].board, boardLeft, boardTop, boardSize);

  // Available patches
  const patchesTop = boardTop + boardSize + 20;
  renderAvailablePatches(game, boardLeft, patchesTop, boardSize);

  // Skip button
  const skipBtnWidth = boardSize;
  const skipBtnHeight = 50;
  const skipBtnX = boardLeft;
  const skipBtnY = height - skipBtnHeight - 20;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(skipBtnX, skipBtnY, skipBtnWidth, skipBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SKIP & MOVE AHEAD', skipBtnX + skipBtnWidth / 2, skipBtnY + skipBtnHeight / 2 + 7);

  buttons.push({
    x: skipBtnX, y: skipBtnY, width: skipBtnWidth, height: skipBtnHeight,
    label: 'Skip',
    action: 'skip',
  });
}

function renderPlayerPanels(game: GameState, currentPlayerIdx: number, panelHeight: number): void {
  const panelWidth = width / 2;

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const x = i * panelWidth;
    const isActive = i === currentPlayerIdx;

    ctx.fillStyle = isActive ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(x, 0, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isActive ? 'bold 18px sans-serif' : '18px sans-serif';
    ctx.textAlign = 'center';

    const centerX = x + panelWidth / 2;
    ctx.fillText(player.name, centerX, 25);
    ctx.fillText(`Buttons: ${player.buttons}`, centerX, 50);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px sans-serif';
    ctx.fillText(`+${player.income}/turn`, centerX, 70);
  }
}

function renderBoard(board: (number | null)[][], x: number, y: number, size: number): void {
  const boardSize = board.length;
  const cellSize = size / boardSize;

  // Background
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(x, y, size, size);

  // Grid and patches
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cellX = x + col * cellSize;
      const cellY = y + row * cellSize;
      const patchId = board[row][col];

      if (patchId !== null) {
        ctx.fillStyle = COLORS.patchColors[(patchId - 1) % COLORS.patchColors.length];
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
      }

      // Grid lines
      ctx.strokeStyle = COLORS.boardGrid;
      ctx.strokeRect(cellX, cellY, cellSize, cellSize);
    }
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
  const shape = rotatePatch(patch.shape, placement.rotation);
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

  renderBoardWithGhost(player.board, boardLeft, boardTop, boardSize, patch, placement, canPlace);

  // Control buttons at bottom
  const controlY = boardTop + boardSize + 20;
  const controlBtnSize = 60;
  const controlGap = 10;
  const controlsWidth = controlBtnSize * 5 + controlGap * 4;
  const controlsStartX = (width - controlsWidth) / 2;

  const controls = [
    { label: '<', action: 'moveLeft' },
    { label: '^', action: 'moveUp' },
    { label: 'R', action: 'rotate' },
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
  board: (number | null)[][],
  x: number,
  y: number,
  size: number,
  patch: Patch,
  placement: PlacementState,
  canPlace: boolean
): void {
  const boardSize = board.length;
  const cellSize = size / boardSize;

  // Background
  ctx.fillStyle = COLORS.boardBg;
  ctx.fillRect(x, y, size, size);

  // Grid and patches
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cellX = x + col * cellSize;
      const cellY = y + row * cellSize;
      const patchId = board[row][col];

      if (patchId !== null) {
        ctx.fillStyle = COLORS.patchColors[(patchId - 1) % COLORS.patchColors.length];
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
      }

      // Grid lines
      ctx.strokeStyle = COLORS.boardGrid;
      ctx.strokeRect(cellX, cellY, cellSize, cellSize);
    }
  }

  // Draw ghost patch
  const shape = rotatePatch(patch.shape, placement.rotation);
  ctx.fillStyle = canPlace ? COLORS.ghostValid : COLORS.ghostInvalid;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const cellX = x + (placement.x + col) * cellSize;
        const cellY = y + (placement.y + row) * cellSize;
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
      }
    }
  }
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
    ctx.fillStyle = COLORS.textDim;

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
