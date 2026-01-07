import type { AppState, Button } from '../../types';
import { COLORS, drawPlayerGradient } from '../../colors';
import { font, LAYOUT, scale } from '../../layout';
import {
  editName,
  startGame,
  selectFirstPlayer,
  toggleAutoSkip,
  toggleFaceToFaceMode,
  togglePlacementAnimations,
  getIsAdminMode,
  openAdminTestScreen,
} from '../../main';

export function renderSetupScreen(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];

  // Draw gradient background
  drawPlayerGradient(ctx, 0, 0, width, height);

  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'title', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('PATCHWORK', centerX, height * 0.18);

  // Players label
  ctx.font = font(minDim, 'large');
  ctx.fillText('Players:', centerX, height * 0.30);

  // Player name buttons
  const nameButtonWidth = scale(minDim, LAYOUT.nameButton.width);
  const nameButtonHeight = scale(minDim, LAYOUT.nameButton.height);
  const nameGap = scale(minDim, LAYOUT.nameButton.gap);
  const totalNameWidth = 2 * nameButtonWidth + nameGap;
  const nameStartX = centerX - totalNameWidth / 2;
  const nameY = height * 0.34;

  for (let i = 0; i < 2; i++) {
    const x = nameStartX + i * (nameButtonWidth + nameGap);

    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, nameY, nameButtonWidth, nameButtonHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal');
    ctx.textAlign = 'center';
    const displayName = state.playerNames[i].length > 12
      ? state.playerNames[i].slice(0, 12) + '...'
      : state.playerNames[i];
    ctx.fillText(displayName, x + nameButtonWidth / 2, nameY + nameButtonHeight / 2 + scale(minDim, 0.0075));

    buttons.push({
      x, y: nameY, width: nameButtonWidth, height: nameButtonHeight,
      label: state.playerNames[i],
      action: () => editName(i as 0 | 1),
      type: 'standard',
    });
  }

  // First player checkboxes
  const checkboxWidth = scale(minDim, LAYOUT.checkbox.firstPlayer.width);
  const checkboxHeight = scale(minDim, LAYOUT.checkbox.firstPlayer.height);
  const checkboxY = height * 0.42;

  for (let i = 0; i < 2; i++) {
    const x = nameStartX + i * (nameButtonWidth + nameGap) + (nameButtonWidth - checkboxWidth) / 2;
    const isSelected = state.firstPlayerIndex === i;

    if (isSelected) {
      ctx.fillStyle = COLORS.panelActive;
      ctx.fillRect(x, checkboxY, checkboxWidth, checkboxHeight);
    } else {
      ctx.strokeStyle = COLORS.panel;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, checkboxY, checkboxWidth, checkboxHeight);
    }

    buttons.push({
      x, y: checkboxY, width: checkboxWidth, height: checkboxHeight,
      label: `First Player ${i + 1}`,
      action: () => selectFirstPlayer(i as 0 | 1),
      type: 'standard',
    });
  }

  // Auto-skip toggle
  const autoSkipY = height * 0.50;
  const checkboxSize = scale(minDim, LAYOUT.checkbox.size);
  const checkboxX = centerX - scale(minDim, 0.1875);
  const labelX = checkboxX + checkboxSize + scale(minDim, LAYOUT.gap.medium);

  // Checkbox
  if (state.autoSkipEnabled) {
    ctx.fillStyle = COLORS.panelActive;
    ctx.fillRect(checkboxX, autoSkipY, checkboxSize, checkboxSize);
    // Checkmark - positions relative to checkbox size
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(checkboxX + checkboxSize * 0.2, autoSkipY + checkboxSize * 0.5);
    ctx.lineTo(checkboxX + checkboxSize * 0.4, autoSkipY + checkboxSize * 0.73);
    ctx.lineTo(checkboxX + checkboxSize * 0.8, autoSkipY + checkboxSize * 0.27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 2;
    ctx.strokeRect(checkboxX, autoSkipY, checkboxSize, checkboxSize);
  }

  // Label
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'left';
  ctx.fillText("Auto-skip when can't buy", labelX, autoSkipY + checkboxSize / 2 + scale(minDim, 0.00625));

  const checkboxHitWidth = scale(minDim, 0.375);
  buttons.push({
    x: checkboxX, y: autoSkipY, width: checkboxHitWidth, height: checkboxSize,
    label: 'Toggle Auto-skip',
    action: toggleAutoSkip,
    type: 'standard',
  });

  // Face-to-face mode toggle
  const faceToFaceY = height * 0.56;

  // Checkbox
  if (state.faceToFaceMode) {
    ctx.fillStyle = COLORS.panelActive;
    ctx.fillRect(checkboxX, faceToFaceY, checkboxSize, checkboxSize);
    // Checkmark - positions relative to checkbox size
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(checkboxX + checkboxSize * 0.2, faceToFaceY + checkboxSize * 0.5);
    ctx.lineTo(checkboxX + checkboxSize * 0.4, faceToFaceY + checkboxSize * 0.73);
    ctx.lineTo(checkboxX + checkboxSize * 0.8, faceToFaceY + checkboxSize * 0.27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 2;
    ctx.strokeRect(checkboxX, faceToFaceY, checkboxSize, checkboxSize);
  }

  // Label
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'left';
  ctx.fillText('Face-to-face mode', labelX, faceToFaceY + checkboxSize / 2 + scale(minDim, 0.00625));
  ctx.textAlign = 'center';

  buttons.push({
    x: checkboxX, y: faceToFaceY, width: checkboxHitWidth, height: checkboxSize,
    label: 'Toggle Face-to-face',
    action: toggleFaceToFaceMode,
    type: 'standard',
  });

  // Placement animations toggle
  const animationsY = height * 0.61;

  // Checkbox
  if (state.placementAnimationsEnabled) {
    ctx.fillStyle = COLORS.panelActive;
    ctx.fillRect(checkboxX, animationsY, checkboxSize, checkboxSize);
    // Checkmark - positions relative to checkbox size
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(checkboxX + checkboxSize * 0.2, animationsY + checkboxSize * 0.5);
    ctx.lineTo(checkboxX + checkboxSize * 0.4, animationsY + checkboxSize * 0.73);
    ctx.lineTo(checkboxX + checkboxSize * 0.8, animationsY + checkboxSize * 0.27);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 2;
    ctx.strokeRect(checkboxX, animationsY, checkboxSize, checkboxSize);
  }

  // Label
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'small');
  ctx.textAlign = 'left';
  ctx.fillText('Placement animations', labelX, animationsY + checkboxSize / 2 + scale(minDim, 0.00625));
  ctx.textAlign = 'center';

  buttons.push({
    x: checkboxX, y: animationsY, width: checkboxHitWidth, height: checkboxSize,
    label: 'Toggle Placement Animations',
    action: togglePlacementAnimations,
    type: 'standard',
  });

  // Start button
  const startBtnWidth = scale(minDim, LAYOUT.buttonWidth.large);
  const startBtnHeight = scale(minDim, LAYOUT.buttonHeight.large);
  const startBtnX = centerX - startBtnWidth / 2;
  const startBtnY = height * 0.66;

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(startBtnX, startBtnY, startBtnWidth, startBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'large', 'bold');
  ctx.fillText('START GAME', centerX, startBtnY + startBtnHeight / 2 + scale(minDim, 0.01));

  buttons.push({
    x: startBtnX, y: startBtnY, width: startBtnWidth, height: startBtnHeight,
    label: 'Start Game',
    action: startGame,
    type: 'standard',
  });

  // Admin test button (only visible if admin query param is present)
  if (getIsAdminMode()) {
    const adminBtnWidth = scale(minDim, LAYOUT.buttonWidth.large);
    const adminBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
    const adminBtnX = centerX - adminBtnWidth / 2;
    const adminBtnY = startBtnY + startBtnHeight + scale(minDim, LAYOUT.gap.large);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(adminBtnX, adminBtnY, adminBtnWidth, adminBtnHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText('ADMIN TESTS', centerX, adminBtnY + adminBtnHeight / 2 + scale(minDim, 0.0075));

    buttons.push({
      x: adminBtnX, y: adminBtnY, width: adminBtnWidth, height: adminBtnHeight,
      label: 'Admin Tests',
      action: openAdminTestScreen,
      type: 'standard',
    });
  }

  return buttons;
}
