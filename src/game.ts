import type { BoardSize, GameState, Patch, Player } from './types';
import { PATCH_DEFINITIONS, rotatePatch } from './patches';

const STARTING_BUTTONS = 5;

export function createGameState(boardSize: BoardSize): GameState {
  const timeTrackLength = getTimeTrackLength(boardSize);

  // Shuffle patches
  const patches = shuffleArray([...PATCH_DEFINITIONS]);

  return {
    boardSize,
    players: [
      createPlayer('Player 1', boardSize),
      createPlayer('Player 2', boardSize),
    ],
    patches,
    marketPosition: 0,
    timeTrackLength,
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
  };
}

function getTimeTrackLength(boardSize: BoardSize): number {
  switch (boardSize) {
    case 7: return 35;
    case 9: return 53;
    case 11: return 70;
  }
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
  board: (number | null)[][],
  patch: Patch,
  x: number,
  y: number,
  rotation: number
): void {
  const shape = rotatePatch(patch.shape, rotation);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        board[y + row][x + col] = patch.id;
      }
    }
  }
}

export function buyPatch(
  state: GameState,
  patchIndex: number,
  x: number,
  y: number,
  rotation: number
): boolean {
  const patches = getAvailablePatches(state);
  const patch = patches[patchIndex];
  if (!patch) return false;

  const playerIndex = getCurrentPlayerIndex(state);
  const player = state.players[playerIndex];

  if (player.buttons < patch.buttonCost) return false;

  const shape = rotatePatch(patch.shape, rotation);
  if (!canPlacePatch(player.board, shape, x, y)) return false;

  // Deduct buttons
  player.buttons -= patch.buttonCost;

  // Add income
  player.income += patch.buttonIncome;

  // Advance on time track
  player.position = Math.min(player.position + patch.timeCost, state.timeTrackLength);

  // Place patch on board
  placePatchOnBoard(player.board, patch, x, y, rotation);

  // Remove patch from market and advance market position
  const actualIndex = (state.marketPosition + patchIndex) % state.patches.length;
  state.patches.splice(actualIndex, 1);

  // Adjust market position if needed
  if (actualIndex < state.marketPosition) {
    state.marketPosition--;
  }
  if (state.patches.length > 0) {
    state.marketPosition = state.marketPosition % state.patches.length;
  }

  return true;
}

export function skipAhead(state: GameState): void {
  const playerIndex = getCurrentPlayerIndex(state);
  const player = state.players[playerIndex];
  const opponent = state.players[playerIndex === 0 ? 1 : 0];

  // Move just ahead of opponent
  const spacesToMove = opponent.position - player.position + 1;

  if (spacesToMove > 0) {
    // Earn buttons equal to spaces moved
    player.buttons += spacesToMove;
    player.position = Math.min(opponent.position + 1, state.timeTrackLength);
  }
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
