/**
 * Get the opponent's index given a player index.
 * Consolidates the pattern: playerIndex === 0 ? 1 : 0
 */
export function getOpponentIndex(playerIndex: 0 | 1): 0 | 1 {
  return playerIndex === 0 ? 1 : 0;
}
