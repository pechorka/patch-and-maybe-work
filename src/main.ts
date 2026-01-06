import type { AppState, BoardSize } from './types';
import { buyPatch, createGameState, getAvailablePatches, isGameOver, skipAhead } from './game';
import { initInput } from './input';
import { reflectPatch, rotatePatch } from './patches';
import { clearTappedTrackPosition, initRenderer, render, setTappedTrackPosition } from './renderer';
import { loadPlayerNames, savePlayerNames } from './storage';

// App state
const state: AppState = {
  screen: 'setup',
  gameState: null,
  placementState: null,
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
export function selectPatch(patchIndex: number): void {
  if (state.gameState) {
    const patches = getAvailablePatches(state.gameState);
    const patch = patches[patchIndex];
    if (patch) {
      // Center the patch on the board initially
      const shape = patch.shape;
      const boardSize = state.gameState.boardSize;
      const x = Math.floor((boardSize - shape[0].length) / 2);
      const y = Math.floor((boardSize - shape.length) / 2);

      state.placementState = {
        patchIndex,
        x,
        y,
        rotation: 0,
        reflected: false,
      };
      state.screen = 'placement';
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

function getTransformedShape(): boolean[][] {
  if (!state.gameState || !state.placementState) return [[]];
  const patches = getAvailablePatches(state.gameState);
  const patch = patches[state.placementState.patchIndex];
  if (!patch) return [[]];
  let shape = rotatePatch(patch.shape, state.placementState.rotation);
  if (state.placementState.reflected) {
    shape = reflectPatch(shape);
  }
  return shape;
}

function getMaxNegativeX(): number {
  const shape = getTransformedShape();
  // Find leftmost filled column
  for (let col = 0; col < shape[0].length; col++) {
    for (let row = 0; row < shape.length; row++) {
      if (shape[row][col]) return col;
    }
  }
  return 0;
}

function getMaxNegativeY(): number {
  const shape = getTransformedShape();
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
