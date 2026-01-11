import Phaser from 'phaser';
import { COLORS, getPlayerColor } from '../colors';
import { LAYOUT } from '../layout';
import { getAppState, playAgain, previewBoard } from '../main-phaser';
import { calculateScore, getWinner } from '../game';

export class GameEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameEndScene' });
  }

  create() {
    const state = getAppState();
    if (!state.gameState) {
      this.scene.start('SetupScene');
      return;
    }

    const game = state.gameState;
    const winner = getWinner(game);
    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);
    const centerX = width / 2;

    // Background
    if (winner === 'tie') {
      // Gradient for tie
      const graphics = this.add.graphics();
      graphics.fillGradientStyle(
        parseInt(COLORS.player1.replace('#', ''), 16),
        parseInt(COLORS.player1.replace('#', ''), 16),
        parseInt(COLORS.player2.replace('#', ''), 16),
        parseInt(COLORS.player2.replace('#', ''), 16),
        1
      );
      graphics.fillRect(0, 0, width, height);
    } else {
      const bgRect = this.add.rectangle(
        0,
        0,
        width,
        height,
        parseInt(getPlayerColor(winner, false).replace('#', ''), 16)
      );
      bgRect.setOrigin(0, 0);
    }

    // Title
    const title = this.add.text(centerX, height * 0.08, 'GAME OVER', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.heading) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Player scores
    const panelWidth = minDim * LAYOUT.scorePanel.width;
    const panelHeight = minDim * LAYOUT.scorePanel.height;
    const panelGap = minDim * LAYOUT.scorePanel.gap;

    for (let i = 0; i < 2; i++) {
      const player = game.players[i];
      const score = calculateScore(player);
      const isWinner = winner === i;

      const yPos = height * 0.15 + i * panelGap;
      const panelX = centerX - panelWidth / 2;
      const panelY = yPos - minDim * LAYOUT.gap.large;

      const panel = this.add.rectangle(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        parseInt((isWinner ? COLORS.panelActive : COLORS.panel).replace('#', ''), 16)
      );
      panel.setOrigin(0, 0);
      panel.setInteractive({ useHandCursor: true });

      const scoreText = this.add.text(centerX, yPos, `${player.name}: ${score} points`, {
        fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
        color: COLORS.text,
        fontStyle: isWinner ? 'bold' : 'normal',
      });
      scoreText.setOrigin(0.5);

      const emptySpaces = player.board.flat().filter(cell => cell === null).length;
      const detailText = this.add.text(
        centerX,
        yPos + minDim * LAYOUT.gap.large,
        `(${player.buttons} btns - ${emptySpaces * 2} penalty) · Tap to preview`,
        {
          fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
          color: COLORS.text,
        }
      );
      detailText.setOrigin(0.5);

      panel.on('pointerdown', () => {
        previewBoard(i);
        this.scene.start('BoardPreviewScene');
      });
    }

    // Tie message
    if (winner === 'tie') {
      const tieText = this.add.text(centerX, height * 0.30, "It's a tie!", {
        fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
        color: COLORS.text,
        fontStyle: 'bold',
      });
      tieText.setOrigin(0.5);
    }

    // Play again button
    const btnWidth = minDim * LAYOUT.buttonWidth.large;
    const btnHeight = minDim * LAYOUT.buttonHeight.medium;
    const btnX = centerX - btnWidth / 2;
    const btnY = height - btnHeight - minDim * LAYOUT.gap.large;

    const playBtn = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, parseInt(COLORS.button.replace('#', ''), 16));
    playBtn.setOrigin(0, 0);
    playBtn.setInteractive({ useHandCursor: true });

    const playLabel = this.add.text(centerX, btnY + btnHeight / 2, 'PLAY AGAIN', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.button) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    playLabel.setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      playAgain();
      this.scene.start('SetupScene');
    });
  }
}
