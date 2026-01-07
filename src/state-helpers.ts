import type { Player, GameState } from './types';

/**
 * Pure helper functions for state updates that return new objects instead of mutating.
 */

/**
 * Create a new Player object with updated properties (immutable update).
 */
export function updatePlayer(player: Player, updates: Partial<Player>): Player {
  return {
    ...player,
    ...updates,
  };
}

/**
 * Update a player's board (immutable - creates new board array).
 */
export function updatePlayerBoard(player: Player, row: number, col: number, value: number | null): Player {
  const newBoard = player.board.map((r, i) =>
    i === row ? [...r.slice(0, col), value, ...r.slice(col + 1)] : [...r]
  );
  return { ...player, board: newBoard };
}

/**
 * Update a player in the game state (immutable).
 */
export function updateGameStatePlayer(state: GameState, playerIndex: 0 | 1, updatedPlayer: Player): GameState {
  const newPlayers: [Player, Player] = [
    playerIndex === 0 ? updatedPlayer : state.players[0],
    playerIndex === 1 ? updatedPlayer : state.players[1],
  ];
  return {
    ...state,
    players: newPlayers,
  };
}

/**
 * Deep clone a player board.
 */
export function cloneBoard(board: (number | null)[][]): (number | null)[][] {
  return board.map(row => [...row]);
}

/**
 * Deep clone a player.
 */
export function clonePlayer(player: Player): Player {
  return {
    ...player,
    board: cloneBoard(player.board),
    placedPatches: [...player.placedPatches],
    bonus7x7Area: player.bonus7x7Area ? { ...player.bonus7x7Area } : null,
  };
}
