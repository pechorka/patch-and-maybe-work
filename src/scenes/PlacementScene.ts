import Phaser from 'phaser';
import { COLORS } from '../colors';

export class PlacementScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlacementScene' });
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.text(centerX, centerY, 'Placement Scene - Under Construction', {
      fontSize: '32px',
      color: COLORS.text,
    }).setOrigin(0.5);

    const backText = this.add.text(centerX, centerY + 100, 'Back to Game', {
      fontSize: '24px',
      color: COLORS.text,
    }).setOrigin(0.5);
    backText.setInteractive({ useHandCursor: true });
    backText.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
