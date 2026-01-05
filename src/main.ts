import type { AppState, BoardSize } from './types';
import { buyPatch, createGameState, getAvailablePatches, isGameOver, skipAhead } from './game';
import { initInput } from './input';
import { rotatePatch } from './patches';
import { initRenderer, render } from './renderer';

// App state
const state: AppState = {
  screen: 'setup',
  gameState: null,
  placementState: null,
  selectedBoardSize: 9,
};

function handleAction(action: string): void {
  const [cmd, arg] = action.split(':');

  switch (cmd) {
    case 'selectSize':
      state.selectedBoardSize = parseInt(arg) as BoardSize;
      break;

    case 'startGame':
      state.gameState = createGameState(state.selectedBoardSize);
      state.screen = 'game';
      break;

    case 'selectPatch':
      if (state.gameState) {
        const patchIndex = parseInt(arg);
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
          };
          state.screen = 'placement';
        }
      }
      break;

    case 'skip':
      if (state.gameState) {
        skipAhead(state.gameState);
        checkGameEnd();
      }
      break;

    case 'cancelPlacement':
      state.placementState = null;
      state.screen = 'game';
      break;

    case 'confirmPlacement':
      if (state.gameState && state.placementState) {
        const success = buyPatch(
          state.gameState,
          state.placementState.patchIndex,
          state.placementState.x,
          state.placementState.y,
          state.placementState.rotation
        );
        if (success) {
          state.placementState = null;
          state.screen = 'game';
          checkGameEnd();
        }
      }
      break;

    case 'moveLeft':
      if (state.placementState) {
        state.placementState.x = Math.max(-getMaxNegativeX(), state.placementState.x - 1);
      }
      break;

    case 'moveRight':
      if (state.placementState && state.gameState) {
        const maxX = state.gameState.boardSize - 1;
        state.placementState.x = Math.min(maxX, state.placementState.x + 1);
      }
      break;

    case 'moveUp':
      if (state.placementState) {
        state.placementState.y = Math.max(-getMaxNegativeY(), state.placementState.y - 1);
      }
      break;

    case 'moveDown':
      if (state.placementState && state.gameState) {
        const maxY = state.gameState.boardSize - 1;
        state.placementState.y = Math.min(maxY, state.placementState.y + 1);
      }
      break;

    case 'rotate':
      if (state.placementState) {
        state.placementState.rotation = (state.placementState.rotation + 1) % 4;
      }
      break;

    case 'playAgain':
      state.gameState = null;
      state.placementState = null;
      state.screen = 'setup';
      break;
  }

  render(state);
}

function getRotatedShape(): boolean[][] {
  if (!state.gameState || !state.placementState) return [[]];
  const patches = getAvailablePatches(state.gameState);
  const patch = patches[state.placementState.patchIndex];
  if (!patch) return [[]];
  return rotatePatch(patch.shape, state.placementState.rotation);
}

function getMaxNegativeX(): number {
  const shape = getRotatedShape();
  // Find leftmost filled column
  for (let col = 0; col < shape[0].length; col++) {
    for (let row = 0; row < shape.length; row++) {
      if (shape[row][col]) return col;
    }
  }
  return 0;
}

function getMaxNegativeY(): number {
  const shape = getRotatedShape();
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
  initInput(canvas, handleAction);
  gameLoop();
}

init();
