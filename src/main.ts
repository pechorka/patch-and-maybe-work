import type { AppState, Patch, Shape } from './types';
import { buyPatch, calculateScore, check7x7Bonus, collectLeatherPatch, createGameState, getAvailablePatches, getCurrentPlayerIndex, getOvertakeDistance, isGameOver, placeLeatherPatch, skipAhead, createTestGameWith1Patch, createTestGameWith2Patches, createTestGameNearIncome, createTestGameInfiniteMoney, createTestGameNearLeatherPatch, createTestGameNearLastIncome, createTestGameOver, canAffordAnyPatch } from './game';
import { initInput } from './input';
import { getTransformedShape } from './shape-utils';
import { centerShapeOnCell, clearTappedTrackPosition, getPlacementBoardLayout, initRenderer, render, screenToCellCoords, setTappedTrackPosition } from './renderer';
import { loadPlayerNames, savePlayerNames, loadFirstPlayerPref, saveFirstPlayerPref, loadAutoSkipPref, saveAutoSkipPref, loadFaceToFaceModePref, saveFaceToFaceModePref } from './storage';
import { createHistoryManager, recordAction, finalizeHistory, type BuyPatchAction, type SkipAction, type LeatherPatchAction } from './history';

// TODO:  - Add non-color cues (patterns/overlays/edge styles) for patches and player identity to reduce
//    reliance on color alone, especially on small screens.
// TODO: original game balance (placement of letter and income checkboxes)
// TODO: ability to customize colors (patch colors, player colors)
// TODO: persist player scores
// TODO: draw on game over graphs with stats (button count, cells taken, income over time)
// TODO: label to player order selection
// TODO: move confirm and cancel button to the bottom (all button at the bottom)
// TODO: show map button on placement screen
// TODO: add animation for leather patch arrival
// TODO: better leather patch visibility
// TODO: congratulate player on 7x7 dorogo bogato
// TODO: audio and haptic feedback
// TODO: patch placement animation
// TODO: total game time
// TODO: optional timer per turn

// ============================================================================
// TURN HISTORY / REPLAY / UNDO SYSTEM
// ============================================================================
// The turn tracing system is implemented in history.ts and stats.ts.
// Game actions are recorded during play and stats are displayed at game end.
//
// DEFERRED FEATURES:
//
// TODO: Undo feature
//   - Single-step undo that restores the entire turn (buy/skip + triggered leather patches)
//   - Store a TurnSnapshot (deep clone of game state) before each turn starts
//   - On undo: restore from snapshot, truncate actions array, clear snapshot
//   - UI: Add "Undo" button on game screen (visible only when undo is available)
//   - Clear undo availability when turn changes to a different player
//
// TODO: Replay system
//   - Playback recorded games step-by-step for screen recording/sharing
//   - Add new screen 'replay' with playback controls (play/pause, step forward/back, speed)
//   - ReplayState: { history, currentActionIndex, gameState, isPlaying, playbackSpeed }
//   - initReplay(history): Initialize replay from a GameHistory
//   - stepForward(): Execute next action, increment index
//   - stepBackward(): Re-initialize game and replay up to currentIndex - 1
//   - Render: Reuse existing board rendering with replay controls overlay
//
// TODO: localStorage persistence
//   - Store completed game histories in localStorage (last N games)
//   - Add "Recent Games" section to setup screen to view past replays
//   - Auto-save in-progress game history for recovery on page reload
//
// TODO: Clipboard export
//   - Add "Copy Replay" button on game end screen
//   - Compact JSON format: { v, p (patchOrder), n (names), f (firstPlayer), b (boardSize), a (actions) }
//   - Use navigator.clipboard.writeText() to copy to clipboard
// ============================================================================


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
  checkGameEnd();  // Handle auto-skip if player can't afford anything
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

// Game screen actions
export function selectPatch(patchIndex: number, screenX: number, screenY: number): void {
  if (state.gameState) {
    state.previewingOpponentBoard = false;
    state.confirmingSkip = false;
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
}

export function skip(): void {
  if (state.gameState) {
    state.previewingOpponentBoard = false;

    // Require confirmation before skipping
    if (!state.confirmingSkip) {
      state.confirmingSkip = true;
      return;
    }

    state.confirmingSkip = false;

    // Record action before state changes
    const playerIndex = getCurrentPlayerIndex(state.gameState);
    const spacesSkipped = getOvertakeDistance(state.gameState);

    const result = skipAhead(state.gameState);

    // Record skip action
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
    clearTappedTrackPosition();
    state.screen = 'mapView';
  }
}

// Placement screen actions
export function cancelPlacement(): void {
  // Can't cancel leather patch placement - it's mandatory
  if (state.placingLeatherPatch && state.gameState) {
    // Just reset position to center
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
      // Placing a leather patch (free, no market removal)
      // Find the track position for this leather patch
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
        // Record leather patch action
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

        // Check for 7x7 bonus after placing patch
        check7x7Bonus(state.gameState, playerIdx);
        state.placementState = null;
        state.dragState = null;
        state.placingLeatherPatch = null;
        // Check for more pending leather patches
        processNextLeatherPatch();
      }
    } else {
      // Regular market patch purchase
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
        // Record buy patch action
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

        // Check for 7x7 bonus after placing patch
        check7x7Bonus(state.gameState, playerIdx);
        state.placementState = null;
        state.dragState = null;
        // Queue leather patches for collection
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

// Opponent board preview (tap and hold)
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

// Map view screen actions
export function closeMapView(): void {
  clearTappedTrackPosition();
  state.screen = 'game';
}

export function trackPosition(pos: number): void {
  setTappedTrackPosition(pos);
}

export function trackPositionRelease(): void {
  clearTappedTrackPosition();
}

// Drag and drop functions for patch placement
export function getAppState(): AppState {
  return state;
}

export function isDragging(): boolean {
  return state.dragState !== null;
}

export function isInsidePlacedPatch(screenX: number, screenY: number): boolean {
  if (!state.placementState || !state.gameState) return false;

  const layout = getPlacementBoardLayout(state.gameState);
  const patch = getCurrentPlacementPatch();
  if (!patch) return false;

  const shape = getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);

  // Calculate patch bounding box in screen coordinates
  const patchLeft = layout.boardLeft + state.placementState.x * layout.cellSize;
  const patchTop = layout.boardTop + state.placementState.y * layout.cellSize;
  const patchWidth = shape[0].length * layout.cellSize;
  const patchHeight = shape.length * layout.cellSize;

  return screenX >= patchLeft && screenX <= patchLeft + patchWidth &&
    screenY >= patchTop && screenY <= patchTop + patchHeight;
}

export function startDrag(screenX: number, screenY: number): void {
  if (!state.placementState || state.screen !== 'placement') return;

  state.dragState = {
    startScreenX: screenX,
    startScreenY: screenY,
    startCellX: state.placementState.x,
    startCellY: state.placementState.y,
  };
}

export function spawnPatchAt(screenX: number, screenY: number): void {
  if (!state.placementState || !state.gameState || state.screen !== 'placement') return;

  const layout = getPlacementBoardLayout(state.gameState);
  const patch = getCurrentPlacementPatch();
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
}

export function endDrag(): void {
  if (!state.placementState || !state.gameState) {
    state.dragState = null;
    return;
  }

  // Check if patch is completely outside board bounds - then cancel
  const patch = getCurrentPlacementPatch();
  if (patch) {
    const shape = getTransformedShape(patch.shape, state.placementState.rotation, state.placementState.reflected);
    const boardCells = state.gameState.boardSize;

    // Calculate if any part of the patch is on the board
    const patchRight = state.placementState.x + shape[0].length;
    const patchBottom = state.placementState.y + shape.length;

    const isCompletelyOutside =
      patchRight <= 0 ||  // entirely to the left
      state.placementState.x >= boardCells ||  // entirely to the right
      patchBottom <= 0 ||  // entirely above
      state.placementState.y >= boardCells;  // entirely below

    if (isCompletelyOutside) {
      // For leather patches, reset to center instead of cancel
      if (state.placingLeatherPatch) {
        state.placementState.x = Math.floor(boardCells / 2);
        state.placementState.y = Math.floor(boardCells / 2);
        state.dragState = null;
        return;
      }
      cancelPlacement();
      return;
    }
  }

  // Patch is at least partially on board - just end drag (don't cancel even if invalid)
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

function processNextLeatherPatch(): void {
  if (!state.gameState) return;

  if (state.pendingLeatherPatches.length === 0) {
    state.screen = 'game';
    checkGameEnd();
    return;
  }

  // Get next leather patch position
  const nextPosition = state.pendingLeatherPatches.shift()!;
  const patch = collectLeatherPatch(state.gameState, nextPosition);

  if (patch) {
    // Set up placement screen for leather patch
    state.placingLeatherPatch = patch;
    state.placementState = {
      patchIndex: -1,  // Not from market
      x: Math.floor(state.gameState.boardSize / 2),
      y: Math.floor(state.gameState.boardSize / 2),
      rotation: 0,
      reflected: false,
    };
    state.screen = 'placement';
  } else {
    // Patch already collected, move to next
    processNextLeatherPatch();
  }
}

function checkGameEnd(): void {
  if (!state.gameState) return;

  if (isGameOver(state.gameState)) {
    // Finalize history with final scores
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

  // Auto-skip if enabled and current player can't afford any patches
  while (state.autoSkipEnabled &&
         state.gameState &&
         !isGameOver(state.gameState) &&
         !canAffordAnyPatch(state.gameState)) {
    // Record action before state changes
    const playerIndex = getCurrentPlayerIndex(state.gameState);
    const spacesSkipped = getOvertakeDistance(state.gameState);

    // Show toast for who is being skipped
    const skippedPlayer = state.gameState.players[playerIndex];
    showToast(`Auto-skipped ${skippedPlayer.name}`);

    const result = skipAhead(state.gameState);

    // Record skip action
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
      return;  // Will continue auto-skipping after leather patch placement via checkGameEnd()
    }
  }

  // Check for game end after auto-skips
  if (state.gameState && isGameOver(state.gameState)) {
    // Finalize history with final scores
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

  // Show whose turn it is now
  if (state.gameState) {
    const currentPlayer = state.gameState.players[getCurrentPlayerIndex(state.gameState)];
    showToast(`${currentPlayer.name}'s turn`);
  }
}

function gameLoop(): void {
  clearExpiredToasts();
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
