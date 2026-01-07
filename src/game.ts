import type { BoardSize, GameState, LeatherPatchOnTrack, Patch, Player, Shape } from './types';
import { createLeatherPatch, getLeatherPatchPositions, PATCH_DEFINITIONS } from './patches';
import { getOpponentIndex } from './player-utils';
import { getTransformedShape } from './shape-utils';

export interface MoveResult {
  crossedLeatherPositions: number[];
}

const STARTING_BUTTONS = 5;

export function createGameState(boardSize: BoardSize, playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const timeTrackLength = getTimeTrackLength(boardSize);
  const incomePositions = getIncomePositions(boardSize);
  const leatherPositions = getLeatherPatchPositions(boardSize);

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
    firstPlayerIndex,
    bonus7x7Claimed: false,
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
    bonus7x7Area: null,
  };
}

function getTimeTrackLength(_boardSize: BoardSize): number {
  return 53;
}

function getIncomePositions(_boardSize: BoardSize): number[] {
  return [5, 11, 17, 23, 29, 35, 41, 47, 53];
}

function movePlayer(state: GameState, playerIndex: 0 | 1, spaces: number): MoveResult {
  const player = state.players[playerIndex];
  const oldPosition = player.position;
  const newPosition = Math.min(oldPosition + spaces, state.timeTrackLength);

  // Check for income checkpoints crossed (triggered when landing on or passing through)
  const checkpointsCrossed = state.incomePositions.filter(
    pos => oldPosition < pos && newPosition >= pos
  );

  // Collect income for each checkpoint
  player.buttons += checkpointsCrossed.length * player.income;

  // Check for leather patches crossed (uncollected only)
  const crossedLeatherPositions = state.leatherPatches
    .filter(lp => !lp.collected && oldPosition < lp.position && newPosition >= lp.position)
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
  if (state.players[0].position < state.players[1].position) {
    return 0;
  }
  if (state.players[1].position < state.players[0].position) {
    return 1;
  }
  // Tied - use firstPlayerIndex preference
  return state.firstPlayerIndex;
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[getCurrentPlayerIndex(state)];
}

export function getAvailablePatches(state: GameState): Patch[] {
  const available: Patch[] = [];
  const maxPatches = Math.min(3, state.patches.length);
  for (let i = 0; i < maxPatches; i++) {
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
  shape: Shape,
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

  const bonus7x7Points = player.bonus7x7Area !== null ? 7 : 0;
  return player.buttons - (emptySpaces * 2) + bonus7x7Points;
}

export function find7x7FilledArea(board: (number | null)[][]): { x: number; y: number } | null {
  const boardSize = board.length;
  // Iterate all possible 7x7 starting positions
  for (let y = 0; y <= boardSize - 7; y++) {
    for (let x = 0; x <= boardSize - 7; x++) {
      let allFilled = true;
      outer: for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          if (board[y + dy][x + dx] === null) {
            allFilled = false;
            break outer;
          }
        }
      }
      if (allFilled) {
        return { x, y };
      }
    }
  }
  return null;
}

export function check7x7Bonus(state: GameState, playerIndex: 0 | 1): boolean {
  if (state.bonus7x7Claimed) {
    return false;
  }

  const player = state.players[playerIndex];
  const area = find7x7FilledArea(player.board);

  if (area !== null) {
    player.bonus7x7Area = area;
    state.bonus7x7Claimed = true;
    return true;
  }

  return false;
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

// Test helper functions for admin test screen
export function createTestGameWith1Patch(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  // Keep only 1 patch in the market
  state.patches = state.patches.slice(0, 1);
  state.marketPosition = 0;
  return state;
}

export function createTestGameWith2Patches(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  // Keep only 2 patches in the market
  state.patches = state.patches.slice(0, 2);
  state.marketPosition = 0;
  return state;
}

export function createTestGameNearIncome(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  const currentPlayer = state.players[firstPlayerIndex];
  const opponent = state.players[firstPlayerIndex === 0 ? 1 : 0];

  // Position current player just before first income checkpoint (position 5)
  currentPlayer.position = 4;
  currentPlayer.income = 3; // Give them some income to collect

  // Put opponent ahead so current player stays current
  opponent.position = 10;

  return state;
}

export function createTestGameInfiniteMoney(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  const currentPlayer = state.players[firstPlayerIndex];
  const opponent = state.players[firstPlayerIndex === 0 ? 1 : 0];

  // Give current player a huge amount of buttons
  currentPlayer.buttons = 99999;

  // Keep both at position 0, so firstPlayerIndex determines who goes first
  currentPlayer.position = 0;
  opponent.position = 0;

  return state;
}

export function createTestGameNearLeatherPatch(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  const currentPlayer = state.players[firstPlayerIndex];
  const opponent = state.players[firstPlayerIndex === 0 ? 1 : 0];

  // Get first leather patch position and position current player just before it
  const firstLeatherPos = state.leatherPatches[0]?.position ?? 8;
  currentPlayer.position = Math.max(0, firstLeatherPos - 1);
  currentPlayer.buttons = 50; // Give enough buttons to buy patches

  // Put opponent ahead so current player stays current
  opponent.position = firstLeatherPos + 5;

  return state;
}

export function createTestGameNearLastIncome(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  const currentPlayer = state.players[firstPlayerIndex];
  const opponent = state.players[firstPlayerIndex === 0 ? 1 : 0];

  // Position current player just before last income checkpoint (position 53)
  currentPlayer.position = 52;
  currentPlayer.income = 5; // Give them income to verify it's collected

  // Put opponent behind so current player goes first
  opponent.position = 50;

  return state;
}

export function createTestGameOver(playerNames: [string, string], firstPlayerIndex: 0 | 1 = 0): GameState {
  const state = createGameState(9, playerNames, firstPlayerIndex);
  const player1 = state.players[0];
  const player2 = state.players[1];

  // Both players at end of track
  player1.position = state.timeTrackLength;
  player2.position = state.timeTrackLength;

  // Give different scores for testing
  player1.buttons = 15;
  player2.buttons = 12;

  // Fill some board cells to create different penalties
  player1.board[0][0] = 0;
  player1.board[0][1] = 0;
  player1.board[1][0] = 0;

  player2.board[0][0] = 1;
  player2.board[0][1] = 1;

  return state;
}
