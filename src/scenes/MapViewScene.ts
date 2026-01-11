import Phaser from 'phaser';
import { COLORS, getPlayerColor } from '../colors';
import { LAYOUT, getBoardLayout } from '../layout';
import { getAppState, closeMapView } from '../main-phaser';
import { getCurrentPlayerIndex } from '../game';

export class MapViewScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapViewScene' });
  }

  create() {
    const state = getAppState();
    if (!state.gameState) {
      this.scene.start('GameScene');
      return;
    }

    const game = state.gameState;
    const currentPlayerIdx = getCurrentPlayerIndex(game);
    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;

    // Background
    const bgRect = this.add.rectangle(
      0,
      0,
      width,
      height,
      parseInt(getPlayerColor(currentPlayerIdx as 0 | 1, false).replace('#', ''), 16)
    );
    bgRect.setOrigin(0, 0);

    // Simplified map view - just show player positions on time track
    const trackRadius = minDim * LAYOUT.map.trackRadius;

    // Draw square background
    const bgPadding = minDim * 0.075;
    const bgSize = trackRadius * 2 + bgPadding;
    this.add.rectangle(centerX, centerY, bgSize, bgSize, parseInt(COLORS.boardBg.replace('#', ''), 16));

    // Draw track circle
    const graphics = this.add.graphics();
    graphics.lineStyle(minDim * LAYOUT.map.trackLineWidth, parseInt(COLORS.boardGrid.replace('#', ''), 16));
    graphics.strokeCircle(centerX, centerY, trackRadius);

    // Draw player tokens
    const playerTokenRadius = minDim * LAYOUT.map.playerTokenRadius;
    const tokenOffset = playerTokenRadius;
    const trackLength = game.timeTrackLength;

    for (let i = 0; i < 2; i++) {
      const player = game.players[i];
      const pos = Math.min(player.position, trackLength);
      const angle = (pos / trackLength) * Math.PI * 2 - Math.PI / 2;

      const samePos = game.players[0].position === game.players[1].position;
      const offset = samePos ? (i === 0 ? -tokenOffset : tokenOffset) : 0;
      const tokenRadiusPos = trackRadius + offset;

      const x = centerX + Math.cos(angle) * tokenRadiusPos;
      const y = centerY + Math.sin(angle) * tokenRadiusPos;

      this.add.circle(
        x,
        y,
        playerTokenRadius,
        parseInt((i === 0 ? COLORS.player1 : COLORS.player2).replace('#', ''), 16)
      );

      const numberText = this.add.text(x, y, String(i + 1), {
        fontSize: Math.round(minDim * LAYOUT.fontSize.info) + 'px',
        color: COLORS.text,
        fontStyle: 'bold',
      });
      numberText.setOrigin(0.5);
    }

    // Track length in center
    const trackText = this.add.text(centerX, centerY - minDim * 0.005, `${trackLength}`, {
      fontSize: Math.round(minDim * LAYOUT.fontSize.normal) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    trackText.setOrigin(0.5);

    const spacesText = this.add.text(centerX, centerY + minDim * LAYOUT.gap.large, 'spaces', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.tiny) + 'px',
      color: COLORS.text,
    });
    spacesText.setOrigin(0.5);

    // Back button
    const layout = getBoardLayout(width, height, game.boardSize);
    const { boardLeft, boardSize } = layout;
    const skipBtnHeight = minDim * LAYOUT.buttonHeight.medium;
    const skipBtnY = height - skipBtnHeight - minDim * LAYOUT.gap.large;
    const mapBtnHeight = minDim * LAYOUT.buttonHeight.small;
    const mapBtnGap = minDim * LAYOUT.gap.medium;
    const mapBtnX = boardLeft;
    const mapBtnY = skipBtnY - mapBtnHeight - mapBtnGap;
    const mapBtnWidth = boardSize;

    const backBtn = this.add.rectangle(
      mapBtnX,
      mapBtnY,
      mapBtnWidth,
      mapBtnHeight,
      parseInt(COLORS.panel.replace('#', ''), 16)
    );
    backBtn.setOrigin(0, 0);
    backBtn.setInteractive({ useHandCursor: true });

    const backLabel = this.add.text(mapBtnX + mapBtnWidth / 2, mapBtnY + mapBtnHeight / 2, 'TOGGLE MAP', {
      fontSize: Math.round(minDim * LAYOUT.fontSize.info) + 'px',
      color: COLORS.text,
      fontStyle: 'bold',
    });
    backLabel.setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      closeMapView();
      this.scene.start('GameScene');
    });
  }
}
