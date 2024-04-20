import {math} from "../../../math/math.js";
import {Scene} from "../../../scene/Scene.js";
import {PickResult} from "../../../webgl/PickResult.js";

const DEFAULT_SNAP_PICK_RADIUS = 45;
const DEFAULT_SNAP_MODE = "vertex";

/**
 *
 * @private
 */
class PickController {

    constructor(cameraControl, configs) {
        /**
         * @type {Scene}
         */
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
         * Set true to schedule snap-picking with surface picking as a fallback - used for measurement.
         * @type {boolean}
         */
        this.scheduleSnapOrPick = false;

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

        this._lastHash = null;

        this._needFireEvents = 0;
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

        const hash = `${~~this.pickCursorPos[0]}-${~~this.pickCursorPos[1]}-${this.scheduleSnapOrPick}-${this.schedulePickSurface}-${this.schedulePickEntity}`;
        if (this._lastHash === hash) {
            return;
        }

        this.picked = false;
        this.pickedSurface = false;
        this.snappedOrPicked = false;
        this.hoveredSnappedOrSurfaceOff = false;

        const hasHoverSurfaceSubs = this._cameraControl.hasSubs("hoverSurface");

        if (this.scheduleSnapOrPick) {
            const snapPickResult = this._scene.pick({
                canvasPos: this.pickCursorPos,
                snapRadius: this._configs.snapRadius,
                snapToVertex: this._configs.snapToVertex,
                snapToEdge: this._configs.snapToEdge,
            });
            if (snapPickResult && (snapPickResult.snappedToEdge || snapPickResult.snappedToVertex)) {
                this.snapPickResult = snapPickResult;
                this.snappedOrPicked = true;
                this._needFireEvents++;
            } else {
                this.schedulePickSurface = true; // Fallback
                this.snapPickResult = null;
            }
        }

        if (this.schedulePickSurface) {
            if (this.pickResult && this.pickResult.worldPos) {
                const pickResultCanvasPos = this.pickResult.canvasPos;
                if (pickResultCanvasPos[0] === this.pickCursorPos[0] && pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                    this.picked = true;
                    this.pickedSurface = true;
                    this._needFireEvents += hasHoverSurfaceSubs ? 1 : 0;
                    this.schedulePickEntity = false;
                    this.schedulePickSurface = false;
                    if (this.scheduleSnapOrPick) {
                        this.snappedOrPicked = true;
                    } else {
                        this.hoveredSnappedOrSurfaceOff = true;
                    }
                    this.scheduleSnapOrPick = false;
                    return;
                }
            }
        }

        if (this.schedulePickEntity) {
            if (this.pickResult && (this.pickResult.canvasPos || this.pickResult.snappedCanvasPos)) {
                const pickResultCanvasPos = this.pickResult.canvasPos || this.pickResult.snappedCanvasPos;
                if (pickResultCanvasPos[0] === this.pickCursorPos[0] && pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                    this.picked = true;
                    this.pickedSurface = false;
                    this.schedulePickEntity = false;
                    this.schedulePickSurface = false;
                    return;
                }
            }
        }

        if (this.schedulePickSurface || (this.scheduleSnapOrPick && !this.snapPickResult)) {
            this.pickResult = this._scene.pick({
                pickSurface: true,
                pickSurfaceNormal: false,
                canvasPos: this.pickCursorPos
            });
            if (this.pickResult) {
                this.picked = true;
                if (this.scheduleSnapOrPick) {
                    this.snappedOrPicked = true;
                } else {
                    this.pickedSurface = true;
                }
                this._needFireEvents++;
            } else if (this.scheduleSnapOrPick) {
                this.hoveredSnappedOrSurfaceOff = true;
                this._needFireEvents++;
            }

        } else { // schedulePickEntity == true

            this.pickResult = this._scene.pick({
                canvasPos: this.pickCursorPos
            });

            if (this.pickResult) {
                this.picked = true;
                this.pickedSurface = false;
                this._needFireEvents++;
            }
        }

        this.scheduleSnapOrPick = false;
        this.schedulePickEntity = false;
        this.schedulePickSurface = false;
    }

    fireEvents() {

        if (this._needFireEvents === 0) {
            return;
        }

        if (this.hoveredSnappedOrSurfaceOff) {
            this._cameraControl.fire("hoverSnapOrSurfaceOff", {
                canvasPos: this.pickCursorPos,
                pointerPos : this.pickCursorPos
            }, true);
        }

        if (this.snappedOrPicked) {
            if (this.snapPickResult) {
                const pickResult = new PickResult();
                pickResult.entity = this.snapPickResult.entity;
                pickResult.snappedToVertex = this.snapPickResult.snappedToVertex;
                pickResult.snappedToEdge = this.snapPickResult.snappedToEdge;
                pickResult.worldPos = this.snapPickResult.worldPos;
                pickResult.canvasPos = this.pickCursorPos
                pickResult.snappedCanvasPos = this.snapPickResult.snappedCanvasPos;
                this._cameraControl.fire("hoverSnapOrSurface", pickResult, true);
                this.snapPickResult = null;
            } else {
                this._cameraControl.fire("hoverSnapOrSurface", this.pickResult, true);
            }
        } else {

        }

        if (this.picked && this.pickResult && (this.pickResult.entity || this.pickResult.worldPos)) {

            if (this.pickResult.entity) {

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

        this.pickResult = null;

        this._needFireEvents = 0;
    }
}

export {PickController};
