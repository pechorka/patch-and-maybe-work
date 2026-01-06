// Action string constants
export const ACTIONS = {
  // Setup screen
  SELECT_SIZE: 'selectSize',
  EDIT_NAME: 'editName',
  START_GAME: 'startGame',

  // Game screen
  SELECT_PATCH: 'selectPatch',
  SKIP: 'skip',
  OPEN_MAP_VIEW: 'openMapView',

  // Placement screen
  CANCEL_PLACEMENT: 'cancelPlacement',
  CONFIRM_PLACEMENT: 'confirmPlacement',
  MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight',
  MOVE_UP: 'moveUp',
  MOVE_DOWN: 'moveDown',
  ROTATE: 'rotate',
  REFLECT: 'reflect',

  // Game end screen
  PLAY_AGAIN: 'playAgain',

  // Map view screen
  CLOSE_MAP_VIEW: 'closeMapView',
  TRACK_POSITION: 'trackPosition',
  TRACK_POSITION_RELEASE: 'trackPositionRelease',
} as const;

// Helper to create parameterized actions
export function action(name: string, param: string | number): string {
  return `${name}:${param}`;
}
