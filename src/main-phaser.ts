import Phaser from 'phaser';
import type { AppState, Patch, Shape } from './types';
import { buyPatch, calculateScore, check7x7Bonus, collectLeatherPatch, createGameState, getAvailablePatches, getCurrentPlayerIndex, getOvertakeDistance, isGameOver, placeLeatherPatch, skipAhead, createTestGameWith1Patch, createTestGameWith2Patches, createTestGameNearIncome, createTestGameInfiniteMoney, createTestGameNearLeatherPatch, createTestGameNearLastIncome, createTestGameOver, canAffordAnyPatch } from './game';
import { getTransformedShape } from './shape-utils';
import { loadPlayerNames, savePlayerNames, loadFirstPlayerPref, saveFirstPlayerPref, loadAutoSkipPref, saveAutoSkipPref, loadFaceToFaceModePref, saveFaceToFaceModePref, loadAnimationsDisabledPref, saveAnimationsDisabledPref } from './storage';
import { createHistoryManager, recordAction, finalizeHistory, type BuyPatchAction, type SkipAction, type LeatherPatchAction } from './history';
import { gameConfig } from './config';
import { SetupScene } from './scenes/SetupScene';
import { GameScene } from './scenes/GameScene';
import { PlacementScene } from './scenes/PlacementScene';
import { GameEndScene } from './scenes/GameEndScene';
import { MapViewScene } from './scenes/MapViewScene';
import { BoardPreviewScene } from './scenes/BoardPreviewScene';
import { AdminTestScene } from './scenes/AdminTestScene';

// Check for admin mode via query parameter
function isAdminMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('admin');
}

// App state
const state: AppState = {
  screen: 'setup',
  gameState: null,
  placementState: null,
  dragState: null,
  selectedBoardSize: 9,
  playerNames: loadPlayerNames(),
  firstPlayerIndex: loadFirstPlayerPref(),
  previewPlayerIdx: null,
  pendingLeatherPatches: [],
  placingLeatherPatch: null,
  previewingOpponentBoard: false,
  confirmingSkip: false,
  autoSkipEnabled: loadAutoSkipPref(),
  toasts: [],
  faceToFaceMode: loadFaceToFaceModePref(),
  historyManager: null,
  gameEndTab: 'summary',
  placementAnimationsEnabled: !loadAnimationsDisabledPref(),
  placementAnimation: null,
};

// Toast functions
const TOAST_DURATION_MS = 2000;

export function showToast(message: string): void {
  state.toasts.push({
    message,
    createdAt: Date.now(),
  });
}

function clearExpiredToasts(): void {
  const now = Date.now();
  state.toasts = state.toasts.filter(
    toast => now - toast.createdAt <= TOAST_DURATION_MS
  );
}

// Setup screen actions
export function editName(playerIdx: 0 | 1): void {
  const currentName = state.playerNames[playerIdx];
  const newName = prompt(`Enter name for Player ${playerIdx + 1}:`, currentName);
  if (newName !== null && newName.trim() !== '') {
    state.playerNames[playerIdx] = newName.trim().slice(0, 20);
    savePlayerNames(state.playerNames);
  }
}

export function selectFirstPlayer(playerIdx: 0 | 1): void {
  state.firstPlayerIndex = playerIdx;
  saveFirstPlayerPref(playerIdx);
}

export function toggleAutoSkip(): void {
  state.autoSkipEnabled = !state.autoSkipEnabled;
  saveAutoSkipPref(state.autoSkipEnabled);
}

export function toggleFaceToFaceMode(): void {
  state.faceToFaceMode = !state.faceToFaceMode;
  saveFaceToFaceModePref(state.faceToFaceMode);
}

export function togglePlacementAnimations(): void {
  state.placementAnimationsEnabled = !state.placementAnimationsEnabled;
  saveAnimationsDisabledPref(!state.placementAnimationsEnabled);
}

export function startGame(): void {
  const { state: gameState, seed } = createGameState(state.selectedBoardSize, state.playerNames, state.firstPlayerIndex);
  state.gameState = gameState;
  state.historyManager = createHistoryManager(
    seed,
    state.playerNames,
    state.firstPlayerIndex,
    state.selectedBoardSize
  );
  state.screen = 'game';
  checkGameEnd();
}

// Admin test screen actions
export function getIsAdminMode(): boolean {
  return isAdminMode();
}

export function openAdminTestScreen(): void {
  state.screen = 'adminTest';
}

export function backToSetup(): void {
  state.screen = 'setup';
}

export function loadTestGame1Patch(): void {
  state.gameState = createTestGameWith1Patch(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGame2Patches(): void {
  state.gameState = createTestGameWith2Patches(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGameNearIncome(): void {
  state.gameState = createTestGameNearIncome(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGameInfiniteMoney(): void {
  state.gameState = createTestGameInfiniteMoney(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGameNearLeatherPatch(): void {
  state.gameState = createTestGameNearLeatherPatch(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGameNearLastIncome(): void {
  state.gameState = createTestGameNearLastIncome(state.playerNames, state.firstPlayerIndex);
  state.screen = 'game';
}

export function loadTestGameOver(): void {
  state.gameState = createTestGameOver(state.playerNames, state.firstPlayerIndex);
  state.screen = 'gameEnd';
}

// Game screen actions (will be used by GameScene)
export function selectPatch(patchIndex: number): void {
  if (state.gameState) {
    state.previewingOpponentBoard = false;
    state.confirmingSkip = false;
    const patches = getAvailablePatches(state.gameState);
    const patch = patches[patchIndex];
    if (patch) {
      // This will be handled differently in Phaser - navigation via scene.start()
      state.placementState = {
        patchIndex,
        x: Math.floor(state.gameState.boardSize / 2),
        y: Math.floor(state.gameState.boardSize / 2),
        rotation: 0,
        reflected: false,
      };
      state.screen = 'placement';
    }
  }
}

export function skip(): void {
  if (state.gameState) {
    state.previewingOpponentBoard = false;

    if (!state.confirmingSkip) {
      state.confirmingSkip = true;
      return;
    }

    state.confirmingSkip = false;

    const playerIndex = getCurrentPlayerIndex(state.gameState);
    const spacesSkipped = getOvertakeDistance(state.gameState);

    const result = skipAhead(state.gameState);

    if (state.historyManager) {
      const action: SkipAction = {
        type: 'skip',
        playerIndex,
        spacesSkipped,
      };
      recordAction(state.historyManager, action);
    }

    if (result.crossedLeatherPositions.length > 0) {
      state.pendingLeatherPatches = result.crossedLeatherPositions;
      processNextLeatherPatch();
    } else {
      checkGameEnd();
    }
  }
}

export function openMapView(): void {
  if (state.gameState) {
    state.previewingOpponentBoard = false;
    state.confirmingSkip = false;
    state.screen = 'mapView';
  }
}

// Placement screen actions
export function cancelPlacement(): void {
  if (state.placingLeatherPatch && state.gameState) {
    if (state.placementState) {
      state.placementState.x = Math.floor(state.gameState.boardSize / 2);
      state.placementState.y = Math.floor(state.gameState.boardSize / 2);
    }
    state.dragState = null;
    return;
  }

  state.placementState = null;
  state.dragState = null;
  state.screen = 'game';
}

export function confirmPlacement(): void {
  if (state.gameState && state.placementState) {
    state.previewingOpponentBoard = false;
    const playerIdx = getCurrentPlayerIndex(state.gameState);
    if (state.placingLeatherPatch) {
      const leatherPatch = state.gameState.leatherPatches.find(
        lp => lp.patchId === state.placingLeatherPatch!.id
      );
      const trackPosition = leatherPatch?.position ?? 0;

      const success = placeLeatherPatch(
        state.gameState,
        state.placingLeatherPatch,
        state.placementState.x,
        state.placementState.y,
        state.placementState.rotation,
        state.placementState.reflected
      );
      if (success) {
        if (state.historyManager) {
          const action: LeatherPatchAction = {
            type: 'leatherPatch',
            playerIndex: playerIdx,
            trackPosition,
            placement: {
              x: state.placementState.x,
              y: state.placementState.y,
              rotation: state.placementState.rotation,
              reflected: state.placementState.reflected,
            },
          };
          recordAction(state.historyManager, action);
        }

        check7x7Bonus(state.gameState, playerIdx);

        state.placementState = null;
        state.dragState = null;
        state.placingLeatherPatch = null;
        processNextLeatherPatch();
      }
    } else {
      const patches = getAvailablePatches(state.gameState);
      const patch = patches[state.placementState.patchIndex];
      const patchId = patch?.id ?? 0;

      const result = buyPatch(
        state.gameState,
        state.placementState.patchIndex,
        state.placementState.x,
        state.placementState.y,
        state.placementState.rotation,
        state.placementState.reflected
      );
      if (result.success) {
        if (state.historyManager) {
          const action: BuyPatchAction = {
            type: 'buyPatch',
            playerIndex: playerIdx,
            patchIndex: state.placementState.patchIndex,
            patchId,
            placement: {
              x: state.placementState.x,
              y: state.placementState.y,
              rotation: state.placementState.rotation,
              reflected: state.placementState.reflected,
            },
          };
          recordAction(state.historyManager, action);
        }

        check7x7Bonus(state.gameState, playerIdx);

        state.placementState = null;
        state.dragState = null;

        if (result.crossedLeatherPositions.length > 0) {
          state.pendingLeatherPatches = result.crossedLeatherPositions;
          processNextLeatherPatch();
        } else {
          state.screen = 'game';
          checkGameEnd();
        }
      }
    }
  }
}

export function moveLeft(): void {
  if (state.placementState) {
    state.placementState.x = Math.max(-getMaxNegativeX(), state.placementState.x - 1);
  }
}

export function moveRight(): void {
  if (state.placementState && state.gameState) {
    const maxX = state.gameState.boardSize - 1;
    state.placementState.x = Math.min(maxX, state.placementState.x + 1);
  }
}

export function moveUp(): void {
  if (state.placementState) {
    state.placementState.y = Math.max(-getMaxNegativeY(), state.placementState.y - 1);
  }
}

export function moveDown(): void {
  if (state.placementState && state.gameState) {
    const maxY = state.gameState.boardSize - 1;
    state.placementState.y = Math.min(maxY, state.placementState.y + 1);
  }
}

export function rotate(): void {
  if (state.placementState) {
    state.placementState.rotation = (state.placementState.rotation + 1) % 4;
  }
}

export function reflect(): void {
  if (state.placementState) {
    state.placementState.reflected = !state.placementState.reflected;
  }
}

// Game end screen actions
export function playAgain(): void {
  state.gameState = null;
  state.placementState = null;
  state.pendingLeatherPatches = [];
  state.placingLeatherPatch = null;
  state.historyManager = null;
  state.gameEndTab = 'summary';
  state.screen = 'setup';
}

export function setGameEndTab(tab: 'summary' | 'charts'): void {
  state.gameEndTab = tab;
}

export function previewBoard(playerIdx: number): void {
  state.previewPlayerIdx = playerIdx;
  state.screen = 'boardPreview';
}

export function backToGameEnd(): void {
  state.previewPlayerIdx = null;
  state.screen = 'gameEnd';
}

export function startOpponentBoardPreview(): void {
  if (state.screen === 'game') {
    state.previewingOpponentBoard = true;
  }
}

export function stopOpponentBoardPreview(): void {
  if (state.previewingOpponentBoard) {
    state.previewingOpponentBoard = false;
  }
}

export function closeMapView(): void {
  state.screen = 'game';
}

export function trackPosition(_pos: number): void {
  // This will be handled by MapViewScene
}

export function trackPositionRelease(): void {
  // This will be handled by MapViewScene
}

export function getAppState(): AppState {
  return state;
}

export function isDragging(): boolean {
  return state.dragState !== null;
}

export function startDrag(_screenX: number, _screenY: number): void {
  // This will be handled by PlacementScene
}

export function updateDrag(_screenX: number, _screenY: number): void {
  // This will be handled by PlacementScene
}

export function endDrag(): void {
  state.dragState = null;
}

function getCurrentPlacementPatch(): Patch | undefined {
  if (!state.gameState || !state.placementState) return undefined;
  if (state.placingLeatherPatch) {
    return state.placingLeatherPatch;
  }
  const patches = getAvailablePatches(state.gameState);
  return patches[state.placementState.patchIndex];
}

function getCurrentTransformedShape(): Shape {
  const patch = getCurrentPlacementPatch();
  if (!patch || !state.placementState) return [[]];
  return getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
}

function getMaxNegativeX(): number {
  const shape = getCurrentTransformedShape();
  for (let col = 0; col < shape[0].length; col++) {
    for (let row = 0; row < shape.length; row++) {
      if (shape[row][col]) return col;
    }
  }
  return 0;
}

function getMaxNegativeY(): number {
  const shape = getCurrentTransformedShape();
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) return row;
    }
  }
  return 0;
}

function processNextLeatherPatch(): void {
  if (!state.gameState) return;

  if (state.pendingLeatherPatches.length === 0) {
    state.screen = 'game';
    checkGameEnd();
    return;
  }

  const nextPosition = state.pendingLeatherPatches.shift()!;
  const patch = collectLeatherPatch(state.gameState, nextPosition);

  if (patch) {
    state.placingLeatherPatch = patch;
    state.placementState = {
      patchIndex: -1,
      x: Math.floor(state.gameState.boardSize / 2),
      y: Math.floor(state.gameState.boardSize / 2),
      rotation: 0,
      reflected: false,
    };
    state.screen = 'placement';
  } else {
    processNextLeatherPatch();
  }
}

function checkGameEnd(): void {
  if (!state.gameState) return;

  if (isGameOver(state.gameState)) {
    if (state.historyManager) {
      const scores: [number, number] = [
        calculateScore(state.gameState.players[0]),
        calculateScore(state.gameState.players[1]),
      ];
      finalizeHistory(state.historyManager, scores);
    }
    state.screen = 'gameEnd';
    return;
  }

  while (state.autoSkipEnabled &&
         state.gameState &&
         !isGameOver(state.gameState) &&
         !canAffordAnyPatch(state.gameState)) {
    const playerIndex = getCurrentPlayerIndex(state.gameState);
    const spacesSkipped = getOvertakeDistance(state.gameState);

    const skippedPlayer = state.gameState.players[playerIndex];
    showToast(`Auto-skipped ${skippedPlayer.name}`);

    const result = skipAhead(state.gameState);

    if (state.historyManager) {
      const action: SkipAction = {
        type: 'skip',
        playerIndex,
        spacesSkipped,
      };
      recordAction(state.historyManager, action);
    }

    if (result.crossedLeatherPositions.length > 0) {
      state.pendingLeatherPatches = result.crossedLeatherPositions;
      processNextLeatherPatch();
      return;
    }
  }

  if (state.gameState && isGameOver(state.gameState)) {
    if (state.historyManager) {
      const scores: [number, number] = [
        calculateScore(state.gameState.players[0]),
        calculateScore(state.gameState.players[1]),
      ];
      finalizeHistory(state.historyManager, scores);
    }
    state.screen = 'gameEnd';
    return;
  }

  if (state.gameState) {
    const currentPlayer = state.gameState.players[getCurrentPlayerIndex(state.gameState)];
    showToast(`${currentPlayer.name}'s turn`);
  }
}

function init(): void {
  // Configure Phaser with all scenes
  const config = {
    ...gameConfig,
    scene: [
      SetupScene,
      GameScene,
      PlacementScene,
      GameEndScene,
      MapViewScene,
      BoardPreviewScene,
      AdminTestScene,
    ],
  };

  // Create Phaser game
  new Phaser.Game(config);

  // Start with setup scene
  // Note: Phaser will automatically start the first scene in the list
}

// Tick function for toast management (not needed for Phaser, but kept for compatibility)
function tick(): void {
  clearExpiredToasts();
  requestAnimationFrame(tick);
}

init();
tick();
