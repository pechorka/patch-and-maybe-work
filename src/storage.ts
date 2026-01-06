const STORAGE_KEY = 'patchwork_player_names';
const FIRST_PLAYER_KEY = 'patchwork_first_player';

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

export function loadFirstPlayerPref(): 0 | 1 {
  try {
    const stored = localStorage.getItem(FIRST_PLAYER_KEY);
    if (stored === '1') return 1;
  } catch (e) {
    console.error('Failed to load first player preference from localStorage:', e);
  }
  return 0;
}

export function saveFirstPlayerPref(playerIdx: 0 | 1): void {
  try {
    localStorage.setItem(FIRST_PLAYER_KEY, String(playerIdx));
  } catch (e) {
    console.error('Failed to save first player preference to localStorage:', e);
  }
}
