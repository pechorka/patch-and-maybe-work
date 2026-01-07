import type { AppState, Button } from '../../types';
import { COLORS, getPlayerColor, drawPlayerGradient } from '../../colors';
import { font, LAYOUT, scale } from '../../layout';
import { calculateScore, getWinner } from '../../game';
import { calculateStats, calculateChartData } from '../../stats';
import { renderCharts } from '../chart-renderer';
import { playAgain, previewBoard, setGameEndTab } from '../../main';

export function renderGameEndScreen(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  width: number,
  height: number,
  minDim: number
): Button[] {
  const buttons: Button[] = [];

  if (!state.gameState) return buttons;

  const game = state.gameState;
  const winner = getWinner(game);
  const centerX = width / 2;

  // Fill background with winner's color or gradient if tie
  if (winner === 'tie') {
    drawPlayerGradient(ctx, 0, 0, width, height);
  } else {
    ctx.fillStyle = getPlayerColor(winner, false);
    ctx.fillRect(0, 0, width, height);
  }

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'heading', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', centerX, height * 0.08);

  // Player score panels (compact)
  const panelWidth = scale(minDim, LAYOUT.scorePanel.width);
  const panelHeight = scale(minDim, LAYOUT.scorePanel.height);
  const panelGap = scale(minDim, LAYOUT.scorePanel.gap);

  for (let i = 0; i < 2; i++) {
    const player = game.players[i];
    const score = calculateScore(player);
    const isWinner = winner === i;

    const yPos = height * 0.15 + i * panelGap;
    const panelX = centerX - panelWidth / 2;
    const panelY = yPos - scale(minDim, LAYOUT.gap.large);

    ctx.fillStyle = isWinner ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isWinner ? font(minDim, 'normal', 'bold') : font(minDim, 'normal');
    ctx.fillText(`${player.name}: ${score} points`, centerX, yPos);

    ctx.font = font(minDim, 'tiny');
    const emptySpaces = countEmptySpaces(player.board);
    ctx.fillText(`(${player.buttons} btns - ${emptySpaces * 2} penalty) · Tap to preview`, centerX, yPos + scale(minDim, LAYOUT.gap.large));

    const playerIdx = i;
    buttons.push({
      x: panelX, y: panelY, width: panelWidth, height: panelHeight,
      label: `Preview ${player.name}`,
      action: () => previewBoard(playerIdx),
      type: 'standard',
    });
  }

  // Tie message
  let tabY = height * 0.32;
  if (winner === 'tie') {
    ctx.fillStyle = COLORS.text;
    ctx.font = font(minDim, 'normal', 'bold');
    ctx.fillText("It's a tie!", centerX, tabY - scale(minDim, LAYOUT.gap.medium));
    tabY += scale(minDim, LAYOUT.admin.buttonGap);
  }

  // Tab buttons
  const tabWidth = scale(minDim, LAYOUT.tab.width);
  const tabHeight = scale(minDim, LAYOUT.tab.height);
  const tabGap = scale(minDim, LAYOUT.tab.gap);
  const tabsWidth = tabWidth * 2 + tabGap;
  const tabsX = centerX - tabsWidth / 2;

  const tabs: Array<{ label: string; value: 'summary' | 'charts' }> = [
    { label: 'Summary', value: 'summary' },
    { label: 'Charts', value: 'charts' },
  ];

  tabs.forEach((tab, i) => {
    const tx = tabsX + i * (tabWidth + tabGap);
    const isActive = state.gameEndTab === tab.value;

    ctx.fillStyle = isActive ? COLORS.panelActive : COLORS.panel;
    ctx.fillRect(tx, tabY, tabWidth, tabHeight);

    ctx.fillStyle = COLORS.text;
    ctx.font = isActive ? font(minDim, 'small', 'bold') : font(minDim, 'small');
    ctx.textAlign = 'center';
    ctx.fillText(tab.label, tx + tabWidth / 2, tabY + tabHeight / 2 + scale(minDim, 0.00625));

    buttons.push({
      x: tx, y: tabY, width: tabWidth, height: tabHeight,
      label: tab.label,
      action: () => setGameEndTab(tab.value),
      type: 'standard',
    });
  });

  // Tab content area
  const contentY = tabY + tabHeight + scale(minDim, LAYOUT.admin.buttonGap);
  const playBtnHeight = scale(minDim, LAYOUT.buttonHeight.medium);
  const contentHeight = height * 0.82 - contentY - playBtnHeight - scale(minDim, LAYOUT.gap.large);

  if (state.gameEndTab === 'summary') {
    // Summary stats
    if (state.historyManager) {
      const stats = calculateStats(state.historyManager.history);

      ctx.fillStyle = COLORS.text;
      ctx.font = font(minDim, 'small', 'bold');
      ctx.textAlign = 'center';
      ctx.fillText('Game Stats', centerX, contentY + scale(minDim, LAYOUT.gap.large));

      ctx.font = font(minDim, 'info');
      const lineHeight = scale(minDim, 0.0275);
      let y = contentY + scale(minDim, 0.0625);

      ctx.fillText(`Total turns: ${stats.totalTurns}`, centerX, y);
      y += lineHeight;

      ctx.fillText(
        `Patches: ${game.players[0].name} ${stats.patchesBought[0]} | ${game.players[1].name} ${stats.patchesBought[1]}`,
        centerX, y
      );
      y += lineHeight;

      ctx.fillText(
        `Skips: ${game.players[0].name} ${stats.skips[0]} (+${stats.buttonsFromSkips[0]}) | ${game.players[1].name} ${stats.skips[1]} (+${stats.buttonsFromSkips[1]})`,
        centerX, y
      );
      y += lineHeight;

      ctx.fillText(
        `Leather: ${game.players[0].name} ${stats.leatherPatches[0]} | ${game.players[1].name} ${stats.leatherPatches[1]}`,
        centerX, y
      );
    }
  } else {
    // Charts tab
    if (state.historyManager) {
      const chartData = calculateChartData(state.historyManager.history);
      const chartWidth = Math.min(width - scale(minDim, LAYOUT.boardPadding * 2), scale(minDim, 0.5));
      const chartX = centerX - chartWidth / 2;
      renderCharts(ctx, chartData, chartX, contentY, chartWidth, contentHeight, minDim);
    }
  }

  // Play again button
  const btnWidth = scale(minDim, LAYOUT.buttonWidth.large);
  const btnHeight = playBtnHeight;
  const btnX = centerX - btnWidth / 2;
  const btnY = height - btnHeight - scale(minDim, LAYOUT.gap.large);

  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  ctx.fillStyle = COLORS.text;
  ctx.font = font(minDim, 'button', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('PLAY AGAIN', centerX, btnY + btnHeight / 2 + scale(minDim, 0.00875));

  buttons.push({
    x: btnX, y: btnY, width: btnWidth, height: btnHeight,
    label: 'Play Again',
    action: playAgain,
    type: 'standard',
  });

  return buttons;
}

function countEmptySpaces(board: (number | null)[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) count++;
    }
  }
  return count;
}
