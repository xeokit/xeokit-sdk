import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";
import {Frustum, frustumIntersectsAABB3, setFrustum} from "../../viewer/scene/math/Frustum.js";

/**
 * Picks a {@link Viewer}'s {@link Entity}s with a canvas-space 2D marquee box.
 *
 * [<img src="https://xeokit.github.io/xeokit-sdk/assets/images/MarqueeSelect.gif">](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_select)
 *
 * * [[Example 1: Select Objects with Marquee](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_select)]
 * * [[Example 2: View-Fit Objects with Marquee](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_viewFit)]
 *
 * # Usage
 *
 * In the example below, we
 *
 * 1. Create a {@link Viewer}, arrange the {@link Camera}
 * 2. Use an {@link XKTLoaderPlugin} to load a BIM model,
 * 3. Create a {@link ObjectsKdTree3} to automatically index the `Viewer's` {@link Entity}s for fast spatial lookup,
 * 4. Create a `MarqueePicker` to pick {@link Entity}s in the {@link Viewer}, using the {@link ObjectsKdTree3} to accelerate picking
 * 5. Create a {@link MarqueePickerMouseControl} to perform the marquee-picking with the `MarqueePicker`, using mouse input to draw the marquee box on the `Viewer's` canvas.
 *
 * When the {@link MarqueePickerMouseControl} is active:
 *
 * * Long-click, drag and release on the canvas to define a marque box that picks {@link Entity}s.
 * * Drag left-to-right to pick {@link Entity}s that intersect the box.
 * * Drag right-to-left to pick {@link Entity}s that are fully inside the box.
 * * On release, the `MarqueePicker` will fire a "picked" event with IDs of the picked {@link Entity}s, if any.
 * * Handling that event, we mark the {@link Entity}s as selected.
 * * Hold down CTRL to multi-pick.
 *
 * ````javascript
 * import {
 *         Viewer,
 *         XKTLoaderPlugin,
 *         ObjectsKdTree3,
 *         MarqueePicker,
 *         MarqueePickerMouseControl
 * } from "xeokit-sdk.es.js";
 *
 * // 1
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.scene.camera.eye = [14.9, 14.3, 5.4];
 * viewer.scene.camera.look = [6.5, 8.3, -4.1];
 * viewer.scene.camera.up = [-0.28, 0.9, -0.3];
 *
 * // 2
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "../../assets/models/xkt/v8/ifc/HolterTower.ifc.xkt"
 * });
 *
 * // 3
 *
 * const objectsKdTree3 = new ObjectsKdTree3({viewer});
 *
 * // 4
 *
 * const marqueePicker = new MarqueePicker({viewer, objectsKdTree3});
 *
 * // 5
 *
 * const marqueePickerMouseControl = new MarqueePickerMouseControl({marqueePicker});
 *
 * marqueePicker.on("clear", () => {
 *     viewer.scene.setObjectsSelected(viewer.scene.selectedObjectIds, false);
 * });
 *
 * marqueePicker.on("picked", (objectIds) => {
 *     viewer.scene.setObjectsSelected(objectIds, true);
 * });
 *
 * marqueePickerMouseControl.setActive(true);
 * ````
 *
 * # Design Notes
 *
 * * The {@link ObjectsKdTree3} can be shared with any other components that want to use it to spatially search for {@link Entity}s.
 * * The {@link MarqueePickerMouseControl} can be replaced with other types of controllers (i.e. touch), or used alongside them.
 * * The `MarqueePicker` has no input handlers of its own, and provides an API through which to programmatically control marquee picking. By firing the "picked" events, `MarqueePicker` implements the *Blackboard Pattern*.
 */
export class MarqueePicker extends Component {

    /**
     * Creates a MarqueePicker.
     *
     * @param {*} cfg Configuration
     * @param {Viewer} cfg.viewer The Viewer to pick Entities from.
     * @param {ObjectsKdTree3} cfg.objectsKdTree3 A k-d tree that indexes the Entities in the Viewer for fast spatial lookup.
     */
    constructor(cfg = {}) {

        if (!cfg.viewer) {
            throw "[MarqueePicker] Missing config: viewer";
        }

        if (!cfg.objectsKdTree3) {
            throw "[MarqueePicker] Missing config: objectsKdTree3";
        }

        super(cfg.viewer.scene, cfg);

        this.viewer = cfg.viewer;
        this._objectsKdTree3 = cfg.objectsKdTree3;
        this._canvasMarqueeCorner1 = math.vec2();
        this._canvasMarqueeCorner2 = math.vec2();
        this._canvasMarquee = math.AABB2();
        this._marqueeFrustum = new Frustum();
        this._marqueeFrustumProjMat = math.mat4();
        this._pickMode = false;

        this._marqueeElement = document.createElement('div');
        document.body.appendChild(this._marqueeElement);

        this._marqueeElement.style.position = "absolute";
        this._marqueeElement.style["z-index"] = "40000005";
        this._marqueeElement.style.width = 8 + "px";
        this._marqueeElement.style.height = 8 + "px";
        this._marqueeElement.style.visibility = "hidden";
        this._marqueeElement.style.top = 0 + "px";
        this._marqueeElement.style.left = 0 + "px";
        this._marqueeElement.style["box-shadow"] = "0 2px 5px 0 #182A3D;";
        this._marqueeElement.style["opacity"] = 1.0;
        this._marqueeElement.style["pointer-events"] = "none";
    }

    /**
     * Sets the canvas-space position of the first marquee box corner.
     *
     * @param corner1
     */
    setMarqueeCorner1(corner1) {
        this._canvasMarqueeCorner1.set(corner1);
        this._canvasMarqueeCorner2.set(corner1);
        this._updateMarquee();
    }

    /**
     * Sets the canvas-space position of the second marquee box corner.
     *
     * @param corner2
     */
    setMarqueeCorner2(corner2) {
        this._canvasMarqueeCorner2.set(corner2);
        this._updateMarquee();
    }

    /**
     * Sets both canvas-space corner positions of the marquee box.
     *
     * @param corner1
     * @param corner2
     */
    setMarquee(corner1, corner2) {
        this._canvasMarqueeCorner1.set(corner1);
        this._canvasMarqueeCorner2.set(corner2);
        this._updateMarquee();
    }

    /**
     * Sets if the marquee box is visible.
     *
     * @param {boolean} visible True if the marquee box is to be visible, else false.
     */
    setMarqueeVisible(visible) {
        this._marqueVisible = visible;
        this._marqueeElement.style.visibility = visible ? "visible" : "hidden";
    }

    /**
     * Gets if the marquee box is visible.
     *
     * @returns {boolean} True if the marquee box is visible, else false.
     */
    getMarqueeVisible() {
        return this._marqueVisible;
    }

    /**
     * Sets the pick mode.
     *
     * Supported pick modes are:
     *
     * * MarqueePicker.PICK_MODE_INSIDE - picks {@link Entity}s that are completely inside the marquee box.
     * * MarqueePicker.PICK_MODE_INTERSECTS - picks {@link Entity}s that intersect the marquee box.
     *
     * @param {number} pickMode The pick mode.
     */
    setPickMode(pickMode) {
        if (pickMode !== MarqueePicker.PICK_MODE_INSIDE && pickMode !== MarqueePicker.PICK_MODE_INTERSECTS) {
            throw "Illegal MarqueePicker pickMode: must be MarqueePicker.PICK_MODE_INSIDE or MarqueePicker.PICK_MODE_INTERSECTS";
        }
        if (pickMode !== this._pickMode) {
            this._marqueeElement.style["background-image"] =
                pickMode === MarqueePicker.PICK_MODE_INSIDE
                    /* Solid */ ? "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23333' stroke-width='4'/%3e%3c/svg%3e\")"
                    /* Dashed */ : "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23333' stroke-width='4' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")";
            this._pickMode = pickMode;
        }
    }

    /**
     * Gets the pick mode.
     *
     * Supported pick modes are:
     *
     * * MarqueePicker.PICK_MODE_INSIDE - picks {@link Entity}s that are completely inside the marquee box.
     * * MarqueePicker.PICK_MODE_INTERSECTS - picks {@link Entity}s that intersect the marquee box.
     *
     * @returns {number} The pick mode.
     */
    getPickMode() {
        return this._pickMode;
    }

    /**
     * Fires a "clear" event on this MarqueePicker.
     */
    clear() {
        this.fire("clear", {})
    }

    /**
     * Attempts to pick {@link Entity}s, using the current MarquePicker settings.
     *
     * Fires a "picked" event with the IDs of the {@link Entity}s that were picked, if any.
     *
     * @returns {string[]} IDs of the {@link Entity}s that were picked, if any
     */
    pick() {
        this._updateMarquee();
        this._buildMarqueeFrustum();
        const entityIds = [];
        const visitNode = (node, intersects = Frustum.INTERSECT) => {
            if (intersects === Frustum.INTERSECT) {
                intersects = frustumIntersectsAABB3(this._marqueeFrustum, node.aabb);
            }
            if (intersects === Frustum.OUTSIDE) {
                return;
            }
            if (node.entities) {
                const entities = node.entities;
                for (let i = 0, len = entities.length; i < len; i++) {
                    const entity = entities[i];
                    if (!entity.visible) {
                        continue;
                    }
                    const entityAABB = entity.aabb;
                    if (this._pickMode === MarqueePicker.PICK_MODE_INSIDE) {
                        // Select entities that are completely inside marquee
                        const intersection = frustumIntersectsAABB3(this._marqueeFrustum, entityAABB);
                        if (intersection === Frustum.INSIDE) {
                            entityIds.push(entity.id);
                        }
                    } else {
                        // Select entities that are partially inside marquee
                        const intersection = frustumIntersectsAABB3(this._marqueeFrustum, entityAABB);
                        if (intersection !== Frustum.OUTSIDE) {
                            entityIds.push(entity.id);
                        }
                    }
                }
            }
            if (node.left) {
                visitNode(node.left, intersects);
            }
            if (node.right) {
                visitNode(node.right, intersects);
            }
        }
        if (this._canvasMarquee[2] - this._canvasMarquee[0] > 3 || this._canvasMarquee[3] - this._canvasMarquee[1] > 3) { // Marquee pick if rectangle big enough
            visitNode(this._objectsKdTree3.root);
        }
        this.fire("picked", entityIds);
        return entityIds;
    }

    _updateMarquee() {
        this._canvasMarquee[0] = Math.min(this._canvasMarqueeCorner1[0], this._canvasMarqueeCorner2[0]);
        this._canvasMarquee[1] = Math.min(this._canvasMarqueeCorner1[1], this._canvasMarqueeCorner2[1]);
        this._canvasMarquee[2] = Math.max(this._canvasMarqueeCorner1[0], this._canvasMarqueeCorner2[0]);
        this._canvasMarquee[3] = Math.max(this._canvasMarqueeCorner1[1], this._canvasMarqueeCorner2[1]);
        this._marqueeElement.style.width = `${this._canvasMarquee[2] - this._canvasMarquee[0]}px`;
        this._marqueeElement.style.height = `${this._canvasMarquee[3] - this._canvasMarquee[1]}px`;
        this._marqueeElement.style.left = `${this._canvasMarquee[0]}px`;
        this._marqueeElement.style.top = `${this._canvasMarquee[1]}px`;
    }

    _buildMarqueeFrustum() { // https://github.com/xeokit/xeokit-sdk/issues/869#issuecomment-1165375770
        const canvas = this.viewer.scene.canvas.canvas;
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        const canvasLeft = canvas.clientLeft;
        const canvasTop = canvas.clientTop;
        const xCanvasToClip = 2.0 / canvasWidth;
        const yCanvasToClip = 2.0 / canvasHeight;
        const NEAR_SCALING = 17;
        const ratio = canvas.clientHeight / canvas.clientWidth;
        const FAR_PLANE = 10000;
        const left = (this._canvasMarquee[0] - canvasLeft) * xCanvasToClip + -1;
        const right = (this._canvasMarquee[2] - canvasLeft) * xCanvasToClip + -1;
        const bottom = -(this._canvasMarquee[3] - canvasTop) * yCanvasToClip + 1;
        const top = -(this._canvasMarquee[1] - canvasTop) * yCanvasToClip + 1;
        const near = this.viewer.scene.camera.frustum.near * (NEAR_SCALING * ratio);
        const far = FAR_PLANE;
        math.frustumMat4(
            left,
            right,
            bottom * ratio,
            top * ratio,
            near,
            far,
            this._marqueeFrustumProjMat,
        );
        setFrustum(this._marqueeFrustum, this.viewer.scene.camera.viewMatrix, this._marqueeFrustumProjMat);
    }

    /**
     * Destroys this MarqueePicker.
     *
     * Does not destroy the {@link Viewer} or the {@link ObjectsKdTree3} provided to the constructor of this MarqueePicker.
     */
    destroy() {
        super.destroy();
        if (this._marqueeElement.parentElement) {
            this._marqueeElement.parentElement.removeChild(this._marqueeElement);
            this._marqueeElement = null;
            this._objectsKdTree3 = null;
        }
    }
}

/**
 * Pick mode that picks {@link Entity}s that intersect the marquee box.
 *
 * @type {number}
 */
MarqueePicker.PICK_MODE_INTERSECTS = 0;

/**
 * Pick mode that picks {@link Entity}s that are completely inside the marquee box.
 *
 * @type {number}
 */
MarqueePicker.PICK_MODE_INSIDE = 1;
