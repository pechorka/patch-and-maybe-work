import type { AppState, Button } from '../../types';
import { COLORS } from '../../colors';
import { font, LAYOUT, scale } from '../../layout';
import {
  backToSetup,
  loadTestGame1Patch,
  loadTestGame2Patches,
  loadTestGameNearIncome,
  loadTestGameNearLastIncome,
  loadTestGameInfiniteMoney,
  loadTestGameNearLeatherPatch,
  loadTestGameOver,
} from '../../main';

export function renderAdminTestScreen(
  ctx: CanvasRenderingContext2D,
  _state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];
  const centerX = width / 2;

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'heading', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('ADMIN TEST SCREEN', centerX, height * 0.12);

  // Test scenario buttons
  const btnWidth = Math.min(scale(minDim, LAYOUT.admin.buttonWidth), width - scale(minDim, LAYOUT.boardPadding * 2));
  const btnHeight = scale(minDim, LAYOUT.admin.buttonHeight);
  const btnGap = scale(minDim, LAYOUT.admin.buttonGap);
  const startY = height * 0.22;

  const testScenarios = [
    { label: '1 Patch in Shop', action: loadTestGame1Patch },
    { label: '2 Patches in Shop', action: loadTestGame2Patches },
    { label: 'Near Income Checkpoint', action: loadTestGameNearIncome },
    { label: 'Near Last Income (53)', action: loadTestGameNearLastIncome },
    { label: 'Infinite Money', action: loadTestGameInfiniteMoney },
    { label: 'Near Leather Patch', action: loadTestGameNearLeatherPatch },
    { label: 'Game Over Screen', action: loadTestGameOver },
  ];

  testScenarios.forEach((scenario, i) => {
    const btnX = centerX - btnWidth / 2;
    const btnY = startY + i * (btnHeight + btnGap);

    ctx.fillStyle = COLORS.button;
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'button', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(scenario.label, centerX, btnY + btnHeight / 2 + scale(minDim, 0.00875));

    buttons.push({
      x: btnX, y: btnY, width: btnWidth, height: btnHeight,
      label: scenario.label,
      action: scenario.action,
      type: 'standard',
    });
  });

  // Back button
  const backBtnWidth = scale(minDim, LAYOUT.buttonWidth.small);
  const backBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const backBtnX = centerX - backBtnWidth / 2;
  const backBtnY = height - backBtnHeight - scale(minDim, LAYOUT.gap.large * 1.5);

  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(backBtnX, backBtnY, backBtnWidth, backBtnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'normal', 'bold');
  ctx.fillText('BACK', centerX, backBtnY + backBtnHeight / 2 + scale(minDim, 0.0075));

  buttons.push({
    x: backBtnX, y: backBtnY, width: backBtnWidth, height: backBtnHeight,
    label: 'Back',
    action: backToSetup,
    type: 'standard',
  });

  return buttons;
}
