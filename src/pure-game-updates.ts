/**
 * Pure state update functions that return new state objects instead of mutating.
 * These functions are completely pure and testable without side effects.
 */

import type { GameState, Player, Patch } from './types';
import { getTransformedShape } from './shape-utils';

/**
 * Deeply clone a player board.
 */
export function cloneBoard(board: (number | null)[][]): (number | null)[][] {
  return board.map(row => [...row]);
}

/**
 * Deeply clone a player.
 */
export function clonePlayer(player: Player): Player {
  return {
    ...player,
    board: cloneBoard(player.board),
    placedPatches: [...player.placedPatches],
    bonus7x7Area: player.bonus7x7Area ? { ...player.bonus7x7Area } : null,
  };
}

/**
 * Clone game state deeply.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    players: [clonePlayer(state.players[0]), clonePlayer(state.players[1])],
    patches: [...state.patches],
    incomePositions: [...state.incomePositions],
    leatherPatches: state.leatherPatches.map(lp => ({ ...lp })),
  };
}

/**
 * Pure function to move a player on the time track.
 * Returns a new GameState with the player moved.
 */
export function pureMovePlayerOnTrack(
  state: GameState,
  playerIndex: 0 | 1,
  spaces: number
): { state: GameState; crossedLeatherPositions: number[] } {
  const newState = cloneGameState(state);
  const player = newState.players[playerIndex];
  const oldPosition = player.position;
  const newPosition = Math.min(oldPosition + spaces, state.timeTrackLength);

  // Check for income checkpoints crossed
  const checkpointsCrossed = state.incomePositions.filter(
    pos => oldPosition <= pos && newPosition > pos
  );

  // Collect income for each checkpoint
  const incomeCollected = checkpointsCrossed.length * player.income;
  player.buttons += incomeCollected;
  player.position = newPosition;

  // Check for leather patches crossed
  const crossedLeatherPositions = state.leatherPatches
    .filter(lp => !lp.collected && oldPosition <= lp.position && newPosition > lp.position)
    .map(lp => lp.position);

  return { state: newState, crossedLeatherPositions };
}

/**
 * Pure function to place a patch on a player's board.
 * Returns a new Player with the patch placed.
 */
export function purePlacePatchOnBoard(
  player: Player,
  patch: Patch,
  x: number,
  y: number,
  rotation: number,
  reflected: boolean
): Player {
  const newPlayer = clonePlayer(player);
  const shape = getTransformedShape(patch.shape, rotation, reflected);

  // Place patch on board
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        newPlayer.board[y + row][x + col] = patch.id;
      }
    }
  }

  // Add to placed patches
  newPlayer.placedPatches.push({ patch, x, y, rotation, reflected });

  return newPlayer;
}

/**
 * Pure function to check and award 7x7 bonus.
 * Returns a new GameState with bonus awarded if applicable.
 */
export function pureCheck7x7Bonus(
  state: GameState,
  playerIndex: 0 | 1,
  find7x7Fn: (board: (number | null)[][]) => { x: number; y: number } | null
): GameState {
  if (state.bonus7x7Claimed) {
    return state; // Return same state if already claimed
  }

  const player = state.players[playerIndex];
  const area = find7x7Fn(player.board);

  if (area !== null) {
    const newState = cloneGameState(state);
    newState.players[playerIndex].bonus7x7Area = area;
    newState.bonus7x7Claimed = true;
    return newState;
  }

  return state; // Return same state if no bonus
}

/**
 * Pure function to collect a leather patch.
 * Returns a new GameState with the leather patch marked as collected.
 */
export function pureCollectLeatherPatch(
  state: GameState,
  trackPosition: number
): GameState {
  const leatherPatchIndex = state.leatherPatches.findIndex(
    lp => lp.position === trackPosition && !lp.collected
  );

  if (leatherPatchIndex === -1) {
    return state; // Return same state if patch not found
  }

  const newState = cloneGameState(state);
  newState.leatherPatches[leatherPatchIndex].collected = true;
  return newState;
}
