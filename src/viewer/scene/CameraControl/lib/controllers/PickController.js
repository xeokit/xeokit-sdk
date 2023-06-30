import {math} from "../../../math/math.js";

const DEFAULT_SNAP_PICK_RADIUS = 45;

/**
 * PickController's job is to :
 *
 *  - schedule various types of pick actions
 *  - perform scheduled pick actions
 *  - fire events with pick results
 *
 * Furthermore, PickController also ensures that pick actions are performed as sparingly
 * as possible, since picking is expensive. To achieve this, PickController will cache
 * the results of each pick action, and if those results are still valid on the next time a pick
 * action is scheduled, will reuse those results in fired events, instead of redundant repeating
 * that picking.
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
         * Set true to schedule picking of an Entity, without attempting to pick a surface position or
         * snapping to a vertex.
         */
        this.schedulePickEntity = false;

        /**
         * Set true to schedule picking of a position on the surface of an Entity, without first attempting to pick
         * a vertex.
         */
        this.schedulePickEntitySurface = false;

        /**
         * Set true to schedule picking of the nearest vertex to the cursor, and
         * then if that fails, picking a position on the surface of an Entity as a fallback.
         */
        this.schedulePickVertex = false;

        /**
         * Set true to schedule picking of the nearest edge to the cursor, and
         * then if that fails, picking a position on the surface of an Entity as a fallback.
         */
        this.schedulePickEdge = false;

        /**
         * The canvas position at which to do the next scheduled pick.
         */
        this.pickCursorPos = math.vec2();

        /**
         * Will be true after picking to indicate that something was picked.
         */
        this.pickedEntity = false;

        /**
         * Will be true after picking to indicate that a position on the surface of an Entity was picked.
         */
        this.pickedEntitySurface = false;

        /**
         * Will be true after empty speace was picked.
         */
        this.pickedNothing = false;

        // /**
        //  * Will be true after hovering over empty space.
        //  */
        // this.hoverOverNothing = false;

        /**
         * Will hold the result after successfully picking an entity.
         */
        this.pickEntityResult = null;

        /**
         * Will hold the result after successfully picking a position on the surface of an entity.
         */
        this.pickEntitySurfaceResult = null;

        /**
         * Will hold the result after successfully picking a vertex.
         */
        this.pickVertexResult = null;

        /**
         * Will hold the result after picking nothing.
         */
        this.pickedNothingResult = null;

        /**
         * Will hold the result after successfully picking an edge.
         */
        this.pickEdgeResult = null;

        this._lastPickedEntityId = null;
        this._lastPickedEntitySurfaceId = null;
        this._needFireEvents = false;
    }

    /**
     * Immediately attempts a pick, if scheduled.
     */
    update() {

        if (!this._configs.pointerEnabled) {
            return;
        }

        if (!this.schedulePickEntity && !this.schedulePickEntitySurface) {
            return;
        }

        this.pickedNothing = false;
        this.pickedEntity = false;
        this.pickedEntitySurface = false;
        this.pickedVertex = false;
        this.pickedEdge = false;

        this._needFireEvents = false;

        // Attempt to reuse cached pick results

        if (this.schedulePickEntity &&
            this.pickEntityResult &&
            this.pickEntityResult.entity) {
            const pickResultCanvasPos = this.pickEntityResult.canvasPos;
            if (pickResultCanvasPos[0] === this.pickCursorPos[0] &&
                pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                this.pickedEntity = true;
                this.schedulePickEntity = false;
                this._needFireEvents = true;
            }
        }

        if (this.schedulePickEntitySurface &&
            this.pickEntitySurfaceResult &&
            this.pickEntitySurfaceResult.entity &&
            this.pickEntitySurfaceResult.worldPos) {
            const pickResultCanvasPos = this.pickEntitySurfaceResult.canvasPos;
            if (pickResultCanvasPos[0] === this.pickCursorPos[0] &&
                pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                this.pickedEntitySurface = true;
                this.schedulePickEntitySurface = false;
                this._needFireEvents = true;
            }
        }

        if (this.schedulePickVertex &&
            this.pickVertexResult &&
            this.pickVertexResult.snappedCanvasPos) {
            const pickResultCanvasPos = this.pickVertexResult.snappedCanvasPos;
            if (pickResultCanvasPos[0] === this.pickCursorPos[0] &&
                pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                this.pickedVertex = true;
                this.schedulePickVertex = false;
                this._needFireEvents = false;
            }
        }

        if (this.schedulePickEdge &&
            this.pickEdgeResult &&
            this.pickEdgeResult.snappedCanvasPos) {
            const pickResultCanvasPos = this.pickEdgeResult.snappedCanvasPos;
            if (pickResultCanvasPos[0] === this.pickCursorPos[0] &&
                pickResultCanvasPos[1] === this.pickCursorPos[1]) {
                this.pickedEdge = true;
                this.schedulePickEdge = false;
                this._needFireEvents = false;
            }
        }

        // Perform scheduled picks for which we can't reuse cached results

        if (this.schedulePickEntity) {
            this.schedulePickEntity = false;
            this.pickEntityResult = this._scene.pick({
                pickSurface: false,
                pickSurfaceNormal: false,
                canvasPos: this.pickCursorPos
            });
            if (this.pickEntityResult && this.pickEntityResult.entity) { // Success, schedule event
                this.pickedEntity = true;
                this._needFireEvents = true;
            } else {
                this.pickedNothing = true;
                this.pickedNothingResult = {
                    canvasPos: this.pickCursorPos
                }
                this._needFireEvents = true;
            }
        }

        if (this.schedulePickVertex) {
            this.schedulePickVertex = false;
            this.pickVertexResult = this._scene.snapPick({
                canvasPos: this.pickCursorPos,
                snapRadius: DEFAULT_SNAP_PICK_RADIUS,
                snapType: "vertex",
            });
            if (this.pickVertexResult &&
                this.pickVertexResult.snappedCanvasPos &&
                this.pickVertexResult.snappedWorldPos) { // Vertex pick succeeded, so schedule event
                this.pickedVertex = true;
                this._needFireEvents = true;
            }
            if (!this.pickedVertex) { // Vertex pick failed, attempt surface pick as fallback
                this.pickEntitySurfaceResult = this._scene.pick({
                    pickSurface: true,
                    pickSurfaceNormal: false,
                    canvasPos: this.pickCursorPos
                });
                if (this.pickEntitySurfaceResult &&
                    this.pickEntitySurfaceResult.entity &&
                    this.pickEntitySurfaceResult.worldPos) { // Entity surface pick succeeded, so schedule event
                    this.pickedEntitySurface = true;
                    this.schedulePickEntitySurface = false;
                    this._needFireEvents = true;
                } else {
                    this.pickedNothing = true;
                    this.pickedNothingResult = {
                        canvasPos: this.pickCursorPos
                    }
                    this._needFireEvents = true;
                }
            }
        }

        if (this.schedulePickEntitySurface) {
            this.schedulePickEntitySurface = false;
            this.pickEntitySurfaceResult = this._scene.pick({
                pickSurface: true,
                pickSurfaceNormal: false,
                canvasPos: this.pickCursorPos
            });
            if (this.pickEntitySurfaceResult &&
                this.pickEntitySurfaceResult.entity &&
                this.pickEntitySurfaceResult.worldPos) { // Pick entity surface succeeded, schedule event
                this.pickedEntitySurface = true;
                this._needFireEvents = true;
            } else {
                this.pickedNothing = true;
                this.pickedNothingResult = {
                    canvasPos: this.pickCursorPos
                }
                this._needFireEvents = true;
            }
        }

        this.schedulePickEntity = false;
        this.schedulePickEntitySurface = false;
        this.schedulePickVertex = false;
        this.schedulePickEdge = false;
    }

    fireEvents() {
        if (!this._needFireEvents) {
            return;
        }
        if (this.pickedNothing) {
            this._cameraControl.fire("pickedNothing", {
                canvasPos: this.pickedNothingResult.canvasPos
            }, true);
            this._cameraControl.fire("hoverNothing", {
                canvasPos: this.pickedNothingResult.canvasPos
            }, true);
        } else {
            let hoverLeaveEntityFired = false;
            let hoverEnterEntityFired = false;
            if (this.pickedEntity) {
                this._cameraControl.fire("pickedEntity", this.pickEntityResult, true);
                this._cameraControl.fire("hoverOverEntity", {
                    entity: this.pickEntityResult.entity.id,
                    canvasPos: this.pickEntityResult.canvasPos
                }, true);
                if (this._lastPickedEntityId !== null && this._lastPickedEntityId !== this.pickEntityResult.entity.id) { // Hover off old Entity
                    this._cameraControl.fire("hoverLeaveEntity", {
                        entity: this._scene.objects[this._lastPickedEntityId],
                        canvasPos: this.pickEntityResult.canvasPos
                    }, true);
                    hoverLeaveEntityFired = true;
                    this._lastPickedEntityId = this.pickEntityResult.entity.id;
                }
                if (this._lastPickedEntityId !== this.pickEntityResult.entity.id) { // Hover onto new Entity
                    this._cameraControl.fire("hoverEnterEntity", {
                        entity: this.pickEntityResult.entity,
                        canvasPos: this.pickEntityResult.canvasPos
                    }, true);
                    hoverEnterEntityFired = true;
                }
                this._lastPickedEntityId = this.pickEntityResult.entity.id;
            }
            if (this.pickedEntitySurface) {
                this._cameraControl.fire("pickedEntitySurface", this.pickEntitySurfaceResult, true);
                this._cameraControl.fire("hoverOverEntitySurface", {
                    entity: this.pickEntitySurfaceResult.entity.id,
                    worldPos: this.pickEntitySurfaceResult.worldPos,
                    canvasPos: this.pickEntitySurfaceResult.canvasPos
                }, true);
                if (this._lastPickedEntitySurfaceId !== null) {
                    if (hoverLeaveEntityFired) {
                        this._cameraControl.fire("hoverLeaveEntity", {
                            entity: this._scene.objects[this._lastPickedEntitySurfaceId],
                            canvasPos: this.pickEntitySurfaceResult.canvasPos
                        }, true);
                    }
                    this._lastPickedEntitySurfaceId = null;
                }
                if (this._lastPickedEntitySurfaceId !== this.pickEntitySurfaceResult.entity.id) { // Hover onto new Entity
                    if (hoverEnterEntityFired) {
                        this._cameraControl.fire("hoverEnterEntity", {
                            entity: this.pickEntitySurfaceResult.entity,
                            canvasPos: this.pickEntitySurfaceResult.canvasPos
                        }, true);
                    }
                }
                this._lastPickedEntitySurfaceId = this.pickEntitySurfaceResult.entity.id;
            }
            if (this.pickedVertex) {
                this._cameraControl.fire("pickedVertex", this.pickVertexResult, true);
            }
            if (this.pickedEdge) {
                this._cameraControl.fire("pickedEdge", this.pickEdgeResult, true);
            }
        }
        this._needFireEvents = false;
    }

    destroy() {
    }
}

export {PickController};
