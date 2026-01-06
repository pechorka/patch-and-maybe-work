import type { BoardSize, GameState, LeatherPatchOnTrack, Patch, Player } from './types';
import { createLeatherPatch, getLeatherPatchPositions, PATCH_DEFINITIONS } from './patches';
import { getOpponentIndex } from './player-utils';
import { getTransformedShape } from './shape-utils';

export interface MoveResult {
  crossedLeatherPositions: number[];
}

const STARTING_BUTTONS = 5;

export function createGameState(boardSize: BoardSize, playerNames: [string, string]): GameState {
  const timeTrackLength = getTimeTrackLength(boardSize);
  const incomePositions = getIncomePositions(boardSize);
  const leatherPositions = getLeatherPatchPositions(boardSize);

  // Shuffle patches (PATCH_DEFINITIONS no longer includes 1-cell patches)
  const patches = shuffleArray([...PATCH_DEFINITIONS]);

  // Initialize leather patches on time track
  const leatherPatches: LeatherPatchOnTrack[] = leatherPositions.map((pos, idx) => ({
    position: pos,
    collected: false,
    patchId: -(idx + 1),  // Negative IDs: -1, -2, -3, -4, -5
  }));

  return {
    boardSize,
    players: [
      createPlayer(playerNames[0], boardSize),
      createPlayer(playerNames[1], boardSize),
    ],
    patches,
    marketPosition: 0,
    timeTrackLength,
    incomePositions,
    leatherPatches,
  };
}

function createPlayer(name: string, boardSize: BoardSize): Player {
  const board: (number | null)[][] = [];
  for (let i = 0; i < boardSize; i++) {
    board.push(new Array(boardSize).fill(null));
  }
  return {
    name,
    buttons: STARTING_BUTTONS,
    income: 0,
    position: 0,
    board,
    placedPatches: [],
  };
}

function getTimeTrackLength(boardSize: BoardSize): number {
  switch (boardSize) {
    case 7: return 35;
    case 9: return 53;
    case 11: return 70;
  }
}

function getIncomePositions(boardSize: BoardSize): number[] {
  switch (boardSize) {
    case 7: return [5, 11, 17, 23, 29, 35];
    case 9: return [5, 11, 17, 23, 29, 35, 41, 47, 53];
    case 11: return [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 70];
  }
}

function movePlayer(state: GameState, playerIndex: 0 | 1, spaces: number): MoveResult {
  const player = state.players[playerIndex];
  const oldPosition = player.position;
  const newPosition = Math.min(oldPosition + spaces, state.timeTrackLength);

  // Check for income checkpoints crossed
  const checkpointsCrossed = state.incomePositions.filter(
    pos => pos > oldPosition && pos <= newPosition
  );

  // Collect income for each checkpoint
  player.buttons += checkpointsCrossed.length * player.income;

  // Check for leather patches crossed (uncollected only)
  const crossedLeatherPositions = state.leatherPatches
    .filter(lp => !lp.collected && lp.position > oldPosition && lp.position <= newPosition)
    .map(lp => lp.position);

  // Update position
  player.position = newPosition;

  return { crossedLeatherPositions };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCurrentPlayerIndex(state: GameState): 0 | 1 {
  // Player furthest behind goes next
  // If tied, player 0 goes (they were placed "on top" in the original game)
  if (state.players[0].position <= state.players[1].position) {
    return 0;
  }
  return 1;
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[getCurrentPlayerIndex(state)];
}

export function getAvailablePatches(state: GameState): Patch[] {
  const available: Patch[] = [];
  for (let i = 0; i < 3; i++) {
    const index = (state.marketPosition + i) % state.patches.length;
    if (state.patches[index]) {
      available.push(state.patches[index]);
    }
  }
  return available;
}

export function canAfford(state: GameState, patchIndex: number): boolean {
  const patches = getAvailablePatches(state);
  const patch = patches[patchIndex];
  if (!patch) return false;

  const player = getCurrentPlayer(state);
  return player.buttons >= patch.buttonCost;
}

export function canPlacePatch(
  board: (number | null)[][],
  shape: boolean[][],
  x: number,
  y: number
): boolean {
  const boardSize = board.length;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardX = x + col;
        const boardY = y + row;

        // Check bounds
        if (boardX < 0 || boardX >= boardSize || boardY < 0 || boardY >= boardSize) {
          return false;
        }

        // Check if cell is already occupied
        if (board[boardY][boardX] !== null) {
          return false;
        }
      }
    }
  }

  return true;
}

export function placePatchOnBoard(
  player: Player,
  patch: Patch,
  x: number,
  y: number,
  rotation: number,
  reflected: boolean
): void {
  const shape = getTransformedShape(patch.shape, rotation, reflected);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        player.board[y + row][x + col] = patch.id;
      }
    }
  }

  player.placedPatches.push({ patch, x, y, rotation, reflected });
}

export interface BuyPatchResult {
  success: boolean;
  crossedLeatherPositions: number[];
}

export function buyPatch(
  state: GameState,
  patchIndex: number,
  x: number,
  y: number,
  rotation: number,
  reflected: boolean
): BuyPatchResult {
  const patches = getAvailablePatches(state);
  const patch = patches[patchIndex];
  if (!patch) return { success: false, crossedLeatherPositions: [] };

  const playerIndex = getCurrentPlayerIndex(state);
  const player = state.players[playerIndex];

  if (player.buttons < patch.buttonCost) return { success: false, crossedLeatherPositions: [] };

  const shape = getTransformedShape(patch.shape, rotation, reflected);
  if (!canPlacePatch(player.board, shape, x, y)) return { success: false, crossedLeatherPositions: [] };

  // Deduct buttons
  player.buttons -= patch.buttonCost;

  // Add income
  player.income += patch.buttonIncome;

  // Advance on time track (handles income collection)
  const moveResult = movePlayer(state, playerIndex, patch.timeCost);

  // Place patch on board
  placePatchOnBoard(player, patch, x, y, rotation, reflected);

  // Remove patch from market and move token to where bought patch was
  const actualIndex = (state.marketPosition + patchIndex) % state.patches.length;
  state.patches.splice(actualIndex, 1);

  // Token moves to where the bought patch was (now points to next patch in circle)
  if (state.patches.length > 0) {
    state.marketPosition = actualIndex % state.patches.length;
  }

  return { success: true, crossedLeatherPositions: moveResult.crossedLeatherPositions };
}

export interface SkipResult {
  crossedLeatherPositions: number[];
}

export function skipAhead(state: GameState): SkipResult {
  const playerIndex = getCurrentPlayerIndex(state);
  const player = state.players[playerIndex];
  const opponent = state.players[getOpponentIndex(playerIndex)];

  // Move just ahead of opponent
  const spacesToMove = opponent.position - player.position + 1;

  if (spacesToMove > 0) {
    // Earn buttons equal to spaces moved
    player.buttons += spacesToMove;
    // Advance on time track (handles income collection)
    const moveResult = movePlayer(state, playerIndex, spacesToMove);
    return { crossedLeatherPositions: moveResult.crossedLeatherPositions };
  }

  return { crossedLeatherPositions: [] };
}

export function isGameOver(state: GameState): boolean {
  return state.players.every(p => p.position >= state.timeTrackLength);
}

export function calculateScore(player: Player): number {
  const boardSize = player.board.length;
  let emptySpaces = 0;

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (player.board[y][x] === null) {
        emptySpaces++;
      }
    }
  }

  return player.buttons - (emptySpaces * 2);
}

export function getWinner(state: GameState): 0 | 1 | 'tie' {
  const score0 = calculateScore(state.players[0]);
  const score1 = calculateScore(state.players[1]);

  if (score0 > score1) return 0;
  if (score1 > score0) return 1;
  return 'tie';
}

export function getNextIncomeDistance(state: GameState, playerIndex: 0 | 1): number | null {
  const player = state.players[playerIndex];
  const nextCheckpoint = state.incomePositions.find(pos => pos > player.position);
  if (nextCheckpoint === undefined) return null;
  return nextCheckpoint - player.position;
}

export function getOvertakeDistance(state: GameState): number {
  const currentIdx = getCurrentPlayerIndex(state);
  const currentPlayer = state.players[currentIdx];
  const opponent = state.players[getOpponentIndex(currentIdx)];
  return opponent.position - currentPlayer.position + 1;
}

export function collectLeatherPatch(state: GameState, trackPosition: number): Patch | null {
  const leatherPatch = state.leatherPatches.find(
    lp => lp.position === trackPosition && !lp.collected
  );

  if (!leatherPatch) return null;

  // Mark as collected
  leatherPatch.collected = true;

  // Return the patch object for placement
  return createLeatherPatch(leatherPatch.patchId);
}

export function placeLeatherPatch(
  state: GameState,
  patch: Patch,
  x: number,
  y: number,
  rotation: number,
  reflected: boolean
): boolean {
  const playerIndex = getCurrentPlayerIndex(state);
  const player = state.players[playerIndex];

  const shape = getTransformedShape(patch.shape, rotation, reflected);
  if (!canPlacePatch(player.board, shape, x, y)) return false;

  // No button cost, no time cost, no income - just place on board
  placePatchOnBoard(player, patch, x, y, rotation, reflected);

  return true;
}
