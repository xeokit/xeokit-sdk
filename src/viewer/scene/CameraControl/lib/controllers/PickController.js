import {math} from "../../../math/math.js";

/**
 *
 * @private
 */
class PickController {

    constructor(cameraControl, configs) {

        this._scene = cameraControl.scene;

        this._cameraControl = cameraControl;

        this._scene.canvas.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        this._configs = configs;

        /**
         * Set true to schedule picking of an Entity.
         * @type {boolean}
         */
        this.schedulePickEntity = false;

        /**
         * Set true to schedule picking of a position on teh surface of an Entity.
         * @type {boolean}
         */
        this.schedulePickSurface = false;

        /**
         * The canvas position at which to do the next scheduled pick.
         * @type {Number[]}
         */
        this.pickCursorPos = math.vec2();

        /**
         * Will be true after picking to indicate that something was picked.
         * @type {boolean}
         */
        this.picked = false;

        /**
         * Will be true after picking to indicate that a position on the surface of an Entity was picked.
         * @type {boolean}
         */
        this.pickedSurface = false;

        /**
         * Will hold the PickResult after after picking.
         * @type {PickResult}
         */
        this.pickResult = null;

        this._lastPickedEntityId = null;

        this._onTick = this._scene.on("tick", () => {
            this.update()
        });
    }

    /**
     * Immediately attempts a pick, if scheduled.
     */
    update() {

        if (!this._configs.pointerEnabled) {
            return;
        }

        if (!this.schedulePickEntity && !this.schedulePickSurface) {
            return;
        }

        this.picked = false;
        this.pickedSurface = false;

        if (this.schedulePickSurface || this._cameraControl.hasSubs("hoverSurface")) {
            this.pickResult = this._scene.pick({
                pickSurface: true,
                pickSurfaceNormal: true,
                canvasPos: this.pickCursorPos
            });
        } else { // schedulePickEntity == true
            this.pickResult = this._scene.pick({
                canvasPos: this.pickCursorPos
            });
        }

        if (this.pickResult) {

            this.picked = true;

            const pickedEntityId = this.pickResult.entity.id;

            if (this._lastPickedEntityId !== pickedEntityId) {
                if (this._lastPickedEntityId !== undefined) {

                    this._cameraControl.fire("hoverOut", {
                        entity: this._scene.objects[this._lastPickedEntityId]
                    }, true);
                }
                this._cameraControl.fire("hoverEnter", this.pickResult, true);
                this._lastPickedEntityId = pickedEntityId;
            }

            this._cameraControl.fire("hover", this.pickResult, true);

            if (this.pickResult.worldPos) {
                this.pickedSurface = true;
                this._cameraControl.fire("hoverSurface", this.pickResult, true);
            }

        } else {

            if (this._lastPickedEntityId !== undefined) {
                this._cameraControl.fire("hoverOut", {
                    entity: this._scene.objects[this._lastPickedEntityId]
                }, true);
                this._lastPickedEntityId = undefined;
            }

            this._cameraControl.fire("hoverOff", {
                canvasPos: this.pickCursorPos
            }, true);
        }

        this.schedulePickEntity = false;
        this.schedulePickSurface = false;
    }

    destroy() {
        this._scene.off(this._onTick);
    }
}

export {PickController};
