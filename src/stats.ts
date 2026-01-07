import type { GameHistory } from './history';

export interface GameStats {
  totalTurns: number;
  turnsByPlayer: [number, number];
  patchesBought: [number, number];
  skips: [number, number];
  leatherPatches: [number, number];
  buttonsFromSkips: [number, number];
  finalScores: [number, number];
}

export function calculateStats(history: GameHistory): GameStats {
  const stats: GameStats = {
    totalTurns: 0,
    turnsByPlayer: [0, 0],
    patchesBought: [0, 0],
    skips: [0, 0],
    leatherPatches: [0, 0],
    buttonsFromSkips: [0, 0],
    finalScores: history.finalScores ?? [0, 0],
  };

  for (const action of history.actions) {
    const p = action.playerIndex;

    switch (action.type) {
      case 'buyPatch':
        stats.totalTurns++;
        stats.turnsByPlayer[p]++;
        stats.patchesBought[p]++;
        break;
      case 'skip':
        stats.totalTurns++;
        stats.turnsByPlayer[p]++;
        stats.skips[p]++;
        stats.buttonsFromSkips[p] += action.spacesSkipped;
        break;
      case 'leatherPatch':
        // Leather patches don't count as separate turns (part of the move that triggered them)
        stats.leatherPatches[p]++;
        break;
    }
  }

  return stats;
}
