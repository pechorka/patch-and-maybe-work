import type { AppState, BoardSize } from './types';
import { ACTIONS } from './actions';
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
};

function handleAction(action: string): void {
  const [cmd, arg] = action.split(':');

  switch (cmd) {
    case ACTIONS.SELECT_SIZE:
      state.selectedBoardSize = parseInt(arg) as BoardSize;
      break;

    case ACTIONS.EDIT_NAME: {
      const playerIdx = parseInt(arg) as 0 | 1;
      const currentName = state.playerNames[playerIdx];
      const newName = prompt(`Enter name for Player ${playerIdx + 1}:`, currentName);
      if (newName !== null && newName.trim() !== '') {
        state.playerNames[playerIdx] = newName.trim().slice(0, 20);
        savePlayerNames(state.playerNames);
      }
      break;
    }

    case ACTIONS.START_GAME:
      state.gameState = createGameState(state.selectedBoardSize, state.playerNames);
      state.screen = 'game';
      break;

    case ACTIONS.SELECT_PATCH:
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
            reflected: false,
          };
          state.screen = 'placement';
        }
      }
      break;

    case ACTIONS.SKIP:
      if (state.gameState) {
        skipAhead(state.gameState);
        checkGameEnd();
      }
      break;

    case ACTIONS.CANCEL_PLACEMENT:
      state.placementState = null;
      state.screen = 'game';
      break;

    case ACTIONS.CONFIRM_PLACEMENT:
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
      break;

    case ACTIONS.MOVE_LEFT:
      if (state.placementState) {
        state.placementState.x = Math.max(-getMaxNegativeX(), state.placementState.x - 1);
      }
      break;

    case ACTIONS.MOVE_RIGHT:
      if (state.placementState && state.gameState) {
        const maxX = state.gameState.boardSize - 1;
        state.placementState.x = Math.min(maxX, state.placementState.x + 1);
      }
      break;

    case ACTIONS.MOVE_UP:
      if (state.placementState) {
        state.placementState.y = Math.max(-getMaxNegativeY(), state.placementState.y - 1);
      }
      break;

    case ACTIONS.MOVE_DOWN:
      if (state.placementState && state.gameState) {
        const maxY = state.gameState.boardSize - 1;
        state.placementState.y = Math.min(maxY, state.placementState.y + 1);
      }
      break;

    case ACTIONS.ROTATE:
      if (state.placementState) {
        state.placementState.rotation = (state.placementState.rotation + 1) % 4;
      }
      break;

    case ACTIONS.REFLECT:
      if (state.placementState) {
        state.placementState.reflected = !state.placementState.reflected;
      }
      break;

    case ACTIONS.PLAY_AGAIN:
      state.gameState = null;
      state.placementState = null;
      state.screen = 'setup';
      break;

    case ACTIONS.OPEN_MAP_VIEW:
      if (state.gameState) {
        clearTappedTrackPosition();
        state.screen = 'mapView';
      }
      break;

    case ACTIONS.CLOSE_MAP_VIEW:
      clearTappedTrackPosition();
      state.screen = 'game';
      break;

    case ACTIONS.TRACK_POSITION:
      setTappedTrackPosition(parseInt(arg));
      break;

    case ACTIONS.TRACK_POSITION_RELEASE:
      clearTappedTrackPosition();
      break;
  }

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
  initInput(canvas, handleAction);
  gameLoop();
}

init();
