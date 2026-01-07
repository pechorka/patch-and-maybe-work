const STORAGE_KEY = 'patchwork_player_names';
const FIRST_PLAYER_KEY = 'patchwork_first_player';
const AUTO_SKIP_KEY = 'patchwork_auto_skip';
const FACE_TO_FACE_KEY = 'patchwork_face_to_face';
const ANIMATIONS_DISABLED_KEY = 'patchwork_animations_disabled';

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

export function loadAutoSkipPref(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_SKIP_KEY);
    return stored === 'true';
  } catch (e) {
    console.error('Failed to load auto-skip preference from localStorage:', e);
  }
  return false;
}

export function saveAutoSkipPref(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SKIP_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to save auto-skip preference to localStorage:', e);
  }
}

export function loadFaceToFaceModePref(): boolean {
  try {
    const stored = localStorage.getItem(FACE_TO_FACE_KEY);
    return stored === 'true';
  } catch (e) {
    console.error('Failed to load face-to-face preference from localStorage:', e);
  }
  return false;
}

export function saveFaceToFaceModePref(enabled: boolean): void {
  try {
    localStorage.setItem(FACE_TO_FACE_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to save face-to-face preference to localStorage:', e);
  }
}

export function loadAnimationsDisabledPref(): boolean {
  try {
    const stored = localStorage.getItem(ANIMATIONS_DISABLED_KEY);
    return stored === 'true';
  } catch (e) {
    console.error('Failed to load animations disabled preference from localStorage:', e);
  }
  return false;
}

export function saveAnimationsDisabledPref(disabled: boolean): void {
  try {
    localStorage.setItem(ANIMATIONS_DISABLED_KEY, String(disabled));
  } catch (e) {
    console.error('Failed to save animations disabled preference to localStorage:', e);
  }
}
