import Phaser from 'phaser';
import { getMinDim, scale, font } from '../layout';
import { COLORS } from '../colors';

export class BaseScene extends Phaser.Scene {
  protected width!: number;
  protected height!: number;
  protected minDim!: number;

  create() {
    this.updateDimensions();
    this.scale.on('resize', this.handleResize, this);
  }

  protected updateDimensions(): void {
    this.width = this.scale.width;
    this.height = this.scale.height;
    this.minDim = getMinDim(this.width, this.height);
  }

  protected handleResize(gameSize: Phaser.Structs.Size): void {
    this.width = gameSize.width;
    this.height = gameSize.height;
    this.minDim = getMinDim(this.width, this.height);
    this.refresh();
  }

  protected refresh(): void {
    // Override in subclasses to handle refresh
  }

  protected scaleValue(percentage: number): number {
    return scale(this.minDim, percentage);
  }

  protected getFont(size: keyof typeof import('../layout').LAYOUT.fontSize, weight?: 'normal' | 'bold'): string {
    return font(this.minDim, size, weight);
  }

  protected addButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    callback: () => void,
    color: number | string = COLORS.button
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height,
      typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color);
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(width / 2, height / 2, text, {
      fontSize: this.getFont('normal'),
      color: COLORS.text,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    button.add([bg, bg]);
    button.add(label);

    bg.on('pointerdown', callback);

    return button;
  }
}
