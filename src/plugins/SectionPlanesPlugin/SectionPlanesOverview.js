import {math} from "../../../src/viewer/scene/math/math.js";
import {Scene} from "../../../src/viewer/scene/scene/Scene.js";
import {DirLight} from "./../../../src/viewer/scene/lights/DirLight.js";
import {SectionPlanesOverviewHelper} from "./SectionPlanesOverviewHelper.js";

/**
 * An overview of the {@link SectionPlane}s managed by a {@link SectionPlanesPlugin}.
 *
 * {@link SectionPlanesPlugin} has one of these on
 */
class SectionPlanesOverview {

    /**
     * @private
     */
    constructor(plugin, cfg) {

        if (!cfg.onClicked || !cfg.onNothingClicked) {
            throw "Missing config(s): onClicked or onNothingClicked";
        }

        this._viewer = plugin.viewer;
        this._onClicked = cfg.onClicked;
        this._onNothingClicked = cfg.onNothingClicked;
        this._sectionPlaneHelpers = {};
        this._visible = true;

        //--------------------------------------------------------------------------------------------------------------
        // Init canvas
        //--------------------------------------------------------------------------------------------------------------

        this._canvas = document.createElement('canvas');
        this._canvas.id = "cubeCanvas" + this._viewer.scene.canvas.canvas.id;
        const size = cfg.size || 250;
        const style = this._canvas.style;
        //style.background = "blue";
        style.height = size + "px";
        style.width = size + "px";
        style.padding = "0";
        style.margin = "0";
        style.top = "0px";
        style.left = "0px";
        style.position = "absolute";
        style["z-index"] = "2000000";
        style.visibility = cfg.visible ? "visible" : "hidden";
        document.body.appendChild(this._canvas);

        //--------------------------------------------------------------------------------------------------------------
        // Init scene
        //--------------------------------------------------------------------------------------------------------------

        this._scene = new Scene({
            canvasId: this._canvas.id,
            transparent: true
        });
        this._scene.clearLights();
        new DirLight(this._scene, {
            dir: [0.4, -0.4, 0.8],
            color: [0.8, 1.0, 1.0],
            intensity: 1.0,
            space: "view"
        });
        new DirLight(this._scene, {
            dir: [-0.8, -0.3, -0.4],
            color: [0.8, 0.8, 0.8],
            intensity: 1.0,
            space: "view"
        });
        new DirLight(this._scene, {
            dir: [0.8, -0.6, -0.8],
            color: [1.0, 1.0, 1.0],
            intensity: 1.0,
            space: "view"
        });

        this._scene.camera;
        this._scene.camera.ortho.scale = 7.0;
        this._scene.camera.ortho.near = 0.1;
        this._scene.camera.ortho.far = 2000;

        this._zUp = false;

        //--------------------------------------------------------------------------------------------------------------
        // Synchronize overview scene camera with viewer camera
        //--------------------------------------------------------------------------------------------------------------

        {
            const camera = this._scene.camera;
            const matrix = math.rotationMat4c(-90 * math.DEGTORAD, 1, 0, 0);
            const eyeLookVec = math.vec3();
            const eyeLookVecOverview = math.vec3();
            const upOverview = math.vec3();

            this._synchCamera = () => {
                const eye = this._viewer.camera.eye;
                const look = this._viewer.camera.look;
                const up = this._viewer.camera.up;
                math.mulVec3Scalar(math.normalizeVec3(math.subVec3(eye, look, eyeLookVec)), 5);
                if (this._zUp) { // +Z up
                    math.transformVec3(matrix, eyeLookVec, eyeLookVecOverview);
                    math.transformVec3(matrix, up, upOverview);
                    camera.look = [0, 0, 0];
                    camera.eye = math.transformVec3(matrix, eyeLookVec, eyeLookVecOverview);
                    camera.up = math.transformPoint3(matrix, up, upOverview);
                } else { // +Y up
                    camera.look = [0, 0, 0];
                    camera.eye = eyeLookVec;
                    camera.up = up;
                }
            };
        }

        this._onViewerCameraMatrix = this._viewer.camera.on("matrix", this._synchCamera);
        this._onViewerCameraWorldAxis = this._viewer.camera.on("worldAxis", this._synchCamera);
        this._onViewerCameraFOV = this._viewer.camera.perspective.on("fov", (fov) => {
            this._scene.camera.perspective.fov = fov;
        });
        this._onViewerCameraProjection = this._viewer.camera.on("projection", (projection) => {
            this._scene.camera.projection = projection;
        });
        this._onViewerCameraWorldAxis = this._viewer.camera.on("worldAxis", (worldAxis) => {
            //   this._scene.camera.worldAxis = worldAxis;
        });
        this._onViewerCanvasBoundary = this._viewer.scene.canvas.on("boundary", () => {
            this._canvasPosDirty = true;
        });

        this._onViewerSceneTick = this._viewer.scene.on("tick", () => {
            if (this._canvasPosDirty) {
                this._updateCanvasPos();
            }
        });

        //--------------------------------------------------------------------------------------------------------------
        // Bind overview canvas events
        //--------------------------------------------------------------------------------------------------------------

        {
            const hoverColorize = [0.0, 1.0, 0.0];

            var hoveredEntity = null;
            var lastColorize = null;

            this._scene.input.on("mousemove", (coords) => {
                const hit = this._scene.pick({
                    canvasPos: coords
                });
                if (hit) {
                    if (!hoveredEntity || hit.entity.id !== hoveredEntity.id) {
                        if (hoveredEntity) {
                            hoveredEntity.colorize = lastColorize;
                        }
                        hoveredEntity = hit.entity;
                        lastColorize = hit.entity.colorize.slice();
                        hit.entity.colorize = hoverColorize;
                    }
                } else {
                    if (hoveredEntity) {
                        hoveredEntity.colorize = lastColorize;
                        hoveredEntity = null;
                    }
                }
            });

            this._scene.canvas.canvas.addEventListener("mouseup", () => {
                if (hoveredEntity) {
                    this._onClicked(hoveredEntity.id);
                } else {
                    this._onNothingClicked();
                }
            });
        }

        //--------------------------------------------------------------------------------------------------------------
        // Configure overview
        //--------------------------------------------------------------------------------------------------------------

        this.setVisible(cfg.visible);
        this.setSize(cfg.size);
        this.setAlignment(cfg.alignment);
        this.setLeftMargin(cfg.leftMargin);
        this.setRightMargin(cfg.rightMargin);
        this.setTopMargin(cfg.topMargin);
        this.setBottomMargin(cfg.bottomMargin);
    }

    _updateCanvasPos() {
        const boundary = this._viewer.scene.canvas.boundary;
        const size = this._size;
        const style = this._canvas.style;
        style.width = size + "px";
        style.height = size + "px";
        switch (this._alignment) {
            case "bottomRight":
                style.top = (boundary[1] + boundary[3] - size - this._bottomMargin) + "px";
                style.left = (boundary[0] + boundary[2] - size - this._rightMargin) + "px";
                break;
            case "bottomLeft":
                style.top = (boundary[1] + boundary[3] - size - this._bottomMargin) + "px";
                style.left = this._leftMargin + "px";
                break;
            case "topLeft":
                style.top = this._topMargin + "px";
                style.left = this._leftMargin + "px";
                break;
            case "topRight":
                style.top = this._topMargin + "px";
                style.left = (boundary[0] + boundary[2] - size - this._rightMargin) + "px";
                break;
        }
        this._canvasPosDirty = false;
    }

    /** Called by SectionPlanesPlugin#createSectionPlane()
     * @private
     */
    _addSectionPlane(sectionPlane) {
        this._sectionPlaneHelpers[sectionPlane.id] = new SectionPlanesOverviewHelper(this._scene, sectionPlane);
    }

    /** Called by SectionPlanesPlugin#createSectionPlane()
     * @private
     */
    _removeSectionPlane(sectionPlane) {
        const sectionPlaneHelper = this._sectionPlaneHelpers[sectionPlane.id];
        if (sectionPlaneHelper) {
            sectionPlaneHelper.destroy();
            delete this._sectionPlaneHelpers[sectionPlane.id];
        }
    }

    /**
     * Sets if the SectionPlanesOverview is visible.
     *
     * @param {Boolean} visible Whether or not the SectionPlanesOverview is visible.
     */
    setVisible(visible = true) {
        this._visible = visible;
        this._canvas.style.visibility = visible ? "visible" : "hidden";
        this._canvasPosDirty = true;
    }

    /**
     * Gets if the SectionPlanesOverview is visible.
     *
     * @return {Boolean} True when the SectionPlanesOverview is visible.
     */
    getVisible() {
        return this._visible;
    }

    /**
     * Sets the canvas size of the SectionPlanesOverview.
     *
     * Since the canvas is square, the size is given for a single dimension. Default value is ````200````.
     *
     * @param {number} size The canvas size, in pixels.
     */
    setSize(size = 200) {
        this._size = size;
        this._canvas.width = size;
        this._canvas.height = size;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the canvas size of the SectionPlanesOverview.
     *
     * Since the canvas is square, the size is given for a single dimension.
     *
     * @returns {number} The canvas size.
     */
    getSize() {
        return this._size;
    };

    /**
     * Sets the alignment of the SectionPlanesOverview within the bounds of the {@link Viewer}'s {@link Canvas}.
     *
     * Default value is "bottomRight".
     *
     * @param {String} alignment The alignment - "bottomRight" (default) | "bottomLeft" | "topLeft" | "topRight"
     */
    setAlignment(alignment = "bottomRight") {
        if (alignment !== "bottomRight" && alignment !== "bottomLeft" && alignment !== "topLeft" && alignment !== "topRight") {
            this.error("Illegal value for alignment - defaulting to `bottomRight'");
            alignment = "bottomRight";
        }
        this._alignment = alignment;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the alignment of the SectionPlanesOverview within the bounds of the {@link Viewer}'s {@link Canvas}.
     *
     * Default value is "bottomRight".
     *
     * @returns {String} The alignment - "bottomRight" (default) | "bottomLeft" | "topLeft" | "topRight"
     */
    getAlignment() {
        return this._alignment;
    }

    /**
     * Sets the margin between the SectionPlanesOverview and the left edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topLeft" or "bottomLeft". Default value is ````10````.
     *
     * @param {Number} leftMargin The left margin value, in pixels.
     */
    setLeftMargin(leftMargin = 10) {
        this._leftMargin = (leftMargin !== null && leftMargin !== undefined) ? leftMargin : 10;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the margin between the SectionPlanesOverview and the left edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topLeft" or "bottomLeft". Default value is ````10````.
     *
     * @return {Number} The left margin value, in pixels.
     */
    getLeftMargin() {
        return this._leftMargin;
    }

    /**
     * Sets the margin between the SectionPlanesOverview and the right edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topRight" or "bottomRight". Default value is ````10````.
     *
     * @param {Number} rightMargin The right margin value, in pixels.
     */
    setRightMargin(rightMargin = 10) {
        this._rightMargin = (rightMargin !== null && rightMargin !== undefined) ? rightMargin : 10;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the margin between the SectionPlanesOverview and the right edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topRight" or "bottomRight". Default value is ````10````.
     *
     * @return {Number} The right margin value, in pixels.
     */
    getRightMargin() {
        return this._rightMargin;
    }

    /**
     * Sets the margin between the SectionPlanesOverview and the top edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topRight" or "topLeft". Default value is ````10````.
     *
     * @param {Number} topMargin The top margin value, in pixels.
     */
    setTopMargin(topMargin = 10) {
        this._topMargin = (topMargin !== null && topMargin !== undefined) ? topMargin : 10;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the margin between the SectionPlanesOverview and the top edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "topRight" or "topLeft". Default value is ````10````.
     *
     * @return {Number} The top margin value, in pixels.
     */
    getTopMargin() {
        return this._topMargin;
    }

    /**
     * Sets the margin between the SectionPlanesOverview and the bottom edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "bottomRight" or "bottomLeft". Default value is ````10````.
     *
     * @param {Number} bottomMargin The bottom margin value, in pixels.
     */
    setBottomMargin(bottomMargin = 10) {
        this._bottomMargin = (bottomMargin !== null && bottomMargin !== undefined) ? bottomMargin : 10;
        this._canvasPosDirty = true;
    }

    /**
     * Gets the margin between the SectionPlanesOverview and the bottom edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the SectionPlanesOverview's alignment is "bottomRight" or "bottomLeft". Default value is ````10````.
     *
     * @return {Number} The bottom margin value, in pixels.
     */
    getBottomMargin() {
        return this._bottomMargin;
    }

    /** Called by SectionPlanesPlugin#destroySsectionPlane()
     * @private
     */
    _destroy() {
        this._viewer.scene.canvas.off(this._onViewerCanvasBoundary);
        this._viewer.scene.off(this._onViewerSceneTick);
        this._viewer.camera.off(this._onViewerCameraMatrix);
        this._viewer.camera.off(this._onViewerCameraWorldAxis);
        this._viewer.camera.perspective.off(this._onViewerCameraFOV);
        this._viewer.camera.off(this._onViewerCameraProjection);
        this._canvas.parentNode.removeChild(this._canvas);
        this._scene.destroy();
    }
}

export {SectionPlanesOverview};

