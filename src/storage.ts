const STORAGE_KEY = 'patchwork_player_names';

export function loadPlayerNames(): [string, string] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const names = JSON.parse(stored);
      if (Array.isArray(names) && names.length === 2) {
        return [String(names[0]), String(names[1])];
      }
    }
  } catch (e) {
    console.error('Failed to load player names from localStorage:', e);
  }
  return ['Player 1', 'Player 2'];
}

export function savePlayerNames(names: [string, string]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch (e) {
    console.error('Failed to save player names to localStorage:', e);
  }
}
