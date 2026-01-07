import type { GameHistory } from './history';
import { createGameState, buyPatch, skipAhead, placeLeatherPatch, collectLeatherPatch } from './game';

export interface GameStats {
  totalTurns: number;
  turnsByPlayer: [number, number];
  patchesBought: [number, number];
  skips: [number, number];
  leatherPatches: [number, number];
  buttonsFromSkips: [number, number];
  finalScores: [number, number];
}

// Time series data for charts
export interface TimeSeriesPoint {
  turn: number;
  buttons: [number, number];
  income: [number, number];
  cellsFilled: [number, number];
  position: [number, number];
}

export interface ChartData {
  series: TimeSeriesPoint[];
  playerNames: [string, string];
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

// Count filled cells on a player's board
function countFilledCells(board: (number | null)[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

// Calculate time series data for charts by replaying the game
export function calculateChartData(history: GameHistory): ChartData {
  // Create initial game state using the seed
  const { state } = createGameState(
    history.boardSize,
    history.playerNames,
    history.firstPlayerIndex,
    history.seed
  );

  const series: TimeSeriesPoint[] = [];
  let turnNumber = 0;

  // Record initial state (turn 0)
  series.push({
    turn: turnNumber,
    buttons: [state.players[0].buttons, state.players[1].buttons],
    income: [state.players[0].income, state.players[1].income],
    cellsFilled: [
      countFilledCells(state.players[0].board),
      countFilledCells(state.players[1].board),
    ],
    position: [state.players[0].position, state.players[1].position],
  });

  // Replay each action
  for (const action of history.actions) {
    switch (action.type) {
      case 'buyPatch':
        buyPatch(
          state,
          action.patchIndex,
          action.placement.x,
          action.placement.y,
          action.placement.rotation,
          action.placement.reflected
        );
        turnNumber++;
        // Record state after this turn
        series.push({
          turn: turnNumber,
          buttons: [state.players[0].buttons, state.players[1].buttons],
          income: [state.players[0].income, state.players[1].income],
          cellsFilled: [
            countFilledCells(state.players[0].board),
            countFilledCells(state.players[1].board),
          ],
          position: [state.players[0].position, state.players[1].position],
        });
        break;

      case 'skip':
        skipAhead(state);
        turnNumber++;
        // Record state after this turn
        series.push({
          turn: turnNumber,
          buttons: [state.players[0].buttons, state.players[1].buttons],
          income: [state.players[0].income, state.players[1].income],
          cellsFilled: [
            countFilledCells(state.players[0].board),
            countFilledCells(state.players[1].board),
          ],
          position: [state.players[0].position, state.players[1].position],
        });
        break;

      case 'leatherPatch':
        // Collect and place leather patch
        const patch = collectLeatherPatch(state, action.trackPosition);
        if (patch) {
          placeLeatherPatch(
            state,
            patch,
            action.placement.x,
            action.placement.y,
            action.placement.rotation,
            action.placement.reflected
          );
          // Update the last recorded point with new cell count
          // (leather patches are part of the previous turn)
          if (series.length > 0) {
            const lastPoint = series[series.length - 1];
            lastPoint.cellsFilled = [
              countFilledCells(state.players[0].board),
              countFilledCells(state.players[1].board),
            ];
          }
        }
        break;
    }
  }

  return {
    series,
    playerNames: history.playerNames,
  };
}
