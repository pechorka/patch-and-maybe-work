import type { AppState, BoardSize } from './types';
import { buyPatch, canPlacePatch, createGameState, getAvailablePatches, getCurrentPlayerIndex, isGameOver, skipAhead } from './game';
import { initInput } from './input';
import { getTransformedShape } from './shape-utils';
import { centerShapeOnCell, clearTappedTrackPosition, getPlacementBoardLayout, initRenderer, render, screenToCellCoords, setTappedTrackPosition } from './renderer';
import { loadPlayerNames, savePlayerNames } from './storage';

// App state
const state: AppState = {
  screen: 'setup',
  gameState: null,
  placementState: null,
  dragState: null,
  selectedBoardSize: 9,
  playerNames: loadPlayerNames(),
  previewPlayerIdx: null,
};

// Setup screen actions
export function selectSize(size: BoardSize): void {
  state.selectedBoardSize = size;
  render(state);
}

export function editName(playerIdx: 0 | 1): void {
  const currentName = state.playerNames[playerIdx];
  const newName = prompt(`Enter name for Player ${playerIdx + 1}:`, currentName);
  if (newName !== null && newName.trim() !== '') {
    state.playerNames[playerIdx] = newName.trim().slice(0, 20);
    savePlayerNames(state.playerNames);
  }
  render(state);
}

export function startGame(): void {
  state.gameState = createGameState(state.selectedBoardSize, state.playerNames);
  state.screen = 'game';
  render(state);
}

// Game screen actions
export function selectPatch(patchIndex: number, screenX: number, screenY: number): void {
  if (state.gameState) {
    const patches = getAvailablePatches(state.gameState);
    const patch = patches[patchIndex];
    if (patch) {
      const layout = getPlacementBoardLayout(state.gameState);
      const { cellX, cellY } = screenToCellCoords(screenX, screenY, layout);
      const { x, y } = centerShapeOnCell(cellX, cellY, patch.shape);

      state.placementState = {
        patchIndex,
        x,
        y,
        rotation: 0,
        reflected: false,
      };
      state.screen = 'placement';

      // Start drag immediately
      state.dragState = {
        startScreenX: screenX,
        startScreenY: screenY,
        startCellX: x,
        startCellY: y,
      };
    }
  }
  render(state);
}

export function skip(): void {
  if (state.gameState) {
    skipAhead(state.gameState);
    checkGameEnd();
  }
  render(state);
}

export function openMapView(): void {
  if (state.gameState) {
    clearTappedTrackPosition();
    state.screen = 'mapView';
  }
  render(state);
}

// Placement screen actions
export function cancelPlacement(): void {
  state.placementState = null;
  state.dragState = null;
  state.screen = 'game';
  render(state);
}

export function confirmPlacement(): void {
  if (state.gameState && state.placementState) {
    const success = buyPatch(
      state.gameState,
      state.placementState.patchIndex,
      state.placementState.x,
      state.placementState.y,
      state.placementState.rotation,
      state.placementState.reflected
    );
    if (success) {
      state.placementState = null;
      state.dragState = null;
      state.screen = 'game';
      checkGameEnd();
    }
  }
  render(state);
}

export function moveLeft(): void {
  if (state.placementState) {
    state.placementState.x = Math.max(-getMaxNegativeX(), state.placementState.x - 1);
  }
  render(state);
}

export function moveRight(): void {
  if (state.placementState && state.gameState) {
    const maxX = state.gameState.boardSize - 1;
    state.placementState.x = Math.min(maxX, state.placementState.x + 1);
  }
  render(state);
}

export function moveUp(): void {
  if (state.placementState) {
    state.placementState.y = Math.max(-getMaxNegativeY(), state.placementState.y - 1);
  }
  render(state);
}

export function moveDown(): void {
  if (state.placementState && state.gameState) {
    const maxY = state.gameState.boardSize - 1;
    state.placementState.y = Math.min(maxY, state.placementState.y + 1);
  }
  render(state);
}

export function rotate(): void {
  if (state.placementState) {
    state.placementState.rotation = (state.placementState.rotation + 1) % 4;
  }
  render(state);
}

export function reflect(): void {
  if (state.placementState) {
    state.placementState.reflected = !state.placementState.reflected;
  }
  render(state);
}

// Game end screen actions
export function playAgain(): void {
  state.gameState = null;
  state.placementState = null;
  state.screen = 'setup';
  render(state);
}

export function previewBoard(playerIdx: number): void {
  state.previewPlayerIdx = playerIdx;
  state.screen = 'boardPreview';
  render(state);
}

export function backToGameEnd(): void {
  state.previewPlayerIdx = null;
  state.screen = 'gameEnd';
  render(state);
}

// Map view screen actions
export function closeMapView(): void {
  clearTappedTrackPosition();
  state.screen = 'game';
  render(state);
}

export function trackPosition(pos: number): void {
  setTappedTrackPosition(pos);
  render(state);
}

export function trackPositionRelease(): void {
  clearTappedTrackPosition();
  render(state);
}

// Drag and drop functions for patch placement
export function getAppState(): AppState {
  return state;
}

export function isDragging(): boolean {
  return state.dragState !== null;
}

export function startDrag(screenX: number, screenY: number): void {
  if (!state.placementState || state.screen !== 'placement') return;

  state.dragState = {
    startScreenX: screenX,
    startScreenY: screenY,
    startCellX: state.placementState.x,
    startCellY: state.placementState.y,
  };
  render(state);
}

export function spawnPatchAt(screenX: number, screenY: number): void {
  if (!state.placementState || !state.gameState || state.screen !== 'placement') return;

  const layout = getPlacementBoardLayout(state.gameState);
  const patches = getAvailablePatches(state.gameState);
  const patch = patches[state.placementState.patchIndex];
  if (!patch) return;

  // Get current transformed shape and center on touch point
  const shape = getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
  const { cellX, cellY } = screenToCellCoords(screenX, screenY, layout);
  const pos = centerShapeOnCell(cellX, cellY, shape);

  state.placementState.x = pos.x;
  state.placementState.y = pos.y;

  // Start drag immediately
  startDrag(screenX, screenY);
}

export function updateDrag(screenX: number, screenY: number): void {
  if (!state.dragState || !state.placementState || !state.gameState) return;

  const layout = getPlacementBoardLayout(state.gameState);

  // Calculate pixel delta from drag start
  const deltaPixelsX = screenX - state.dragState.startScreenX;
  const deltaPixelsY = screenY - state.dragState.startScreenY;

  // Convert to cell delta
  const deltaCellsX = Math.round(deltaPixelsX / layout.cellSize);
  const deltaCellsY = Math.round(deltaPixelsY / layout.cellSize);

  // No clamping - allow off-board positioning
  state.placementState.x = state.dragState.startCellX + deltaCellsX;
  state.placementState.y = state.dragState.startCellY + deltaCellsY;

  render(state);
}

export function endDrag(): void {
  // Check if placement is valid
  if (state.placementState && state.gameState) {
    const patches = getAvailablePatches(state.gameState);
    const patch = patches[state.placementState.patchIndex];
    if (patch) {
      const shape = getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
      const playerIdx = getCurrentPlayerIndex(state.gameState);
      const player = state.gameState.players[playerIdx];
      const valid = canPlacePatch(player.board, shape, state.placementState.x, state.placementState.y);

      if (!valid) {
        cancelPlacement();  // Auto-cancel on invalid release
        return;
      }
    }
  }
  state.dragState = null;
  render(state);
}

function getCurrentTransformedShape(): boolean[][] {
  if (!state.gameState || !state.placementState) return [[]];
  const patches = getAvailablePatches(state.gameState);
  const patch = patches[state.placementState.patchIndex];
  if (!patch) return [[]];
  return getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
}

function getMaxNegativeX(): number {
  const shape = getCurrentTransformedShape();
  // Find leftmost filled column
  for (let col = 0; col < shape[0].length; col++) {
    for (let row = 0; row < shape.length; row++) {
      if (shape[row][col]) return col;
    }
  }
  return 0;
}

function getMaxNegativeY(): number {
  const shape = getCurrentTransformedShape();
  // Find topmost filled row
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) return row;
    }
  }
  return 0;
}

function checkGameEnd(): void {
  if (state.gameState && isGameOver(state.gameState)) {
    state.screen = 'gameEnd';
  }
}

function gameLoop(): void {
  render(state);
  requestAnimationFrame(gameLoop);
}

function init(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  initRenderer(canvas);
  initInput(canvas);
  gameLoop();
}

init();
