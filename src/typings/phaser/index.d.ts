import "phaser";

declare module "phaser" {
	namespace GameObjects {
    interface GameObject {
      width: number;

      height: number;

      originX: number;

      originY: number;

      x: number;

      y: number;
    }

		interface Container {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
		interface Sprite {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
		interface Image {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
		interface NineSlice {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
		interface Text {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
		interface Rectangle {
      /**
       * Sets this object's position relative to another object with a given offset
       */
			setPositionRelative(guideObject: any, x: number, y: number): this;
		}
	}

   namespace Input {
    namespace Gamepad {
      interface GamepadPlugin {
        /**
         * Refreshes the list of connected Gamepads.
         * This is called automatically when a gamepad is connected or disconnected, and during the update loop.
         */
        refreshPads(): void;
      }
    }
  }
}
