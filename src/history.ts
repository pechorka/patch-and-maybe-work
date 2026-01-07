import type { BoardSize } from './types';

// Seed for deterministic replay
export type GameSeed = number;

// Placement info shared by buy and leather patch actions
export interface PlacementInfo {
  x: number;
  y: number;
  rotation: number;
  reflected: boolean;
}

// Action types
export interface BuyPatchAction {
  type: 'buyPatch';
  playerIndex: 0 | 1;
  patchIndex: number;      // 0-2 (market position)
  patchId: number;
  placement: PlacementInfo;
}

export interface SkipAction {
  type: 'skip';
  playerIndex: 0 | 1;
  spacesSkipped: number;
}

export interface LeatherPatchAction {
  type: 'leatherPatch';
  playerIndex: 0 | 1;
  trackPosition: number;
  placement: PlacementInfo;
}

export type GameAction = BuyPatchAction | SkipAction | LeatherPatchAction;

// Complete game history
export interface GameHistory {
  version: number;
  seed: GameSeed;
  playerNames: [string, string];
  firstPlayerIndex: 0 | 1;
  boardSize: BoardSize;
  actions: GameAction[];
  finalScores?: [number, number];
}

// Manager holds history
export interface HistoryManager {
  history: GameHistory;
}

// Seeded PRNG (mulberry32 implementation)
export function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate a random seed
export function generateSeed(): GameSeed {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

// Create a new history manager
export function createHistoryManager(
  seed: GameSeed,
  playerNames: [string, string],
  firstPlayerIndex: 0 | 1,
  boardSize: BoardSize
): HistoryManager {
  return {
    history: {
      version: 1,
      seed,
      playerNames,
      firstPlayerIndex,
      boardSize,
      actions: [],
    },
  };
}

// Record an action to history
export function recordAction(manager: HistoryManager, action: GameAction): void {
  manager.history.actions.push(action);
}

// Finalize history with final scores
export function finalizeHistory(manager: HistoryManager, scores: [number, number]): void {
  manager.history.finalScores = scores;
}
