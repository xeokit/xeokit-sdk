import {math} from "../../viewer/scene/math/math.js";

import {buildCylinderGeometry} from "../../viewer/scene/geometry/builders/buildCylinderGeometry.js";
import {buildTorusGeometry} from "../../viewer/scene/geometry/builders/buildTorusGeometry.js";

import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {EmphasisMaterial} from "../../viewer/scene/materials/EmphasisMaterial.js";
import {Node} from "../../viewer/scene/nodes/Node.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {buildSphereGeometry} from "../../viewer/scene/geometry/builders/buildSphereGeometry.js";
import {worldToRTCPos} from "../../viewer/scene/math/rtcCoords.js";

const zeroVec = new Float64Array([0, 0, 1]);
const quat = new Float64Array(4);

/**
 * Controls a {@link SectionPlane} with mouse and touch input.
 */
export class FaceAlignedSectionPlanesControl {

    /** @private */
    constructor(plugin) {

        /**
         * ID of this FaceAlignedSectionPlanesControl.
         *
         * FaceAlignedSectionPlanesControl are mapped by this ID in {@link FaceAlignedSectionPlanesPlugin#controls}.
         *
         * @property id
         * @type {String|Number}
         */
        this.id = null;

        this._viewer = plugin.viewer;
        this._plugin = plugin;
        this._visible = false;
        this._pos = math.vec3(); // Full-precision position of the center of the FaceAlignedSectionPlanesControl
        this._origin = math.vec3();
        this._rtcPos = math.vec3();

        this._baseDir = math.vec3(); // Saves direction of clip plane when we start dragging an arrow or ring.
        this._rootNode = null; // Root of Node graph that represents this control in the 3D scene
        this._displayMeshes = null; // Meshes that are always visible
        this._affordanceMeshes = null; // Meshes displayed momentarily for affordance

        this._ignoreNextSectionPlaneDirUpdate = false;

        this._createNodes();
        this._bindEvents();
    }

    /**
     * Called by FaceAlignedSectionPlanesPlugin to assign this FaceAlignedSectionPlanesControl to a SectionPlane.
     * FaceAlignedSectionPlanesPlugin keeps FaceAlignedSectionPlanesControls in a reuse pool.
     * Call with a null or undefined value to disconnect the FaceAlignedSectionPlanesControl ffrom whatever SectionPlane it was assigned to.
     * @private
     */
    _setSectionPlane(sectionPlane) {
        if (this._sectionPlane) {
            this._sectionPlane.off(this._onSectionPlanePos);
            this._sectionPlane.off(this._onSectionPlaneDir);
            this._onSectionPlanePos = null;
            this._onSectionPlaneDir = null;
            this._sectionPlane = null;
        }
        if (sectionPlane) {
            this.id = sectionPlane.id;
            this._setPos(sectionPlane.pos);
            this._setDir(sectionPlane.dir);
            this._sectionPlane = sectionPlane;
            this._onSectionPlanePos = sectionPlane.on("pos", () => {
                this._setPos(this._sectionPlane.pos);
            });
            this._onSectionPlaneDir = sectionPlane.on("dir", () => {
                if (!this._ignoreNextSectionPlaneDirUpdate) {
                    this._setDir(this._sectionPlane.dir);
                } else {
                    this._ignoreNextSectionPlaneDirUpdate = false;
                }
            });
        }
    }

    /**
     * Gets the {@link SectionPlane} controlled by this FaceAlignedSectionPlanesControl.
     * @returns {SectionPlane} The SectionPlane.
     */
    get sectionPlane() {
        return this._sectionPlane;
    }

    /** @private */
    _setPos(xyz) {

        this._pos.set(xyz);

        worldToRTCPos(this._pos, this._origin, this._rtcPos);

        this._rootNode.origin = this._origin;
        this._rootNode.position = this._rtcPos;
    }

    /** @private */
    _setDir(xyz) {
        this._baseDir.set(xyz);
        this._rootNode.quaternion = math.vec3PairToQuaternion(zeroVec, xyz, quat);
    }

    _setSectionPlaneDir(dir) {
        if (this._sectionPlane) {
            this._ignoreNextSectionPlaneDirUpdate = true;
            this._sectionPlane.dir = dir;
        }
    }

    /**
     * Sets if this FaceAlignedSectionPlanesControl is visible.
     *
     * @type {Boolean}
     */
    setVisible(visible = true) {
        if (this._visible === visible) {
            return;
        }
        this._visible = visible;
        var id;
        for (id in this._displayMeshes) {
            if (this._displayMeshes.hasOwnProperty(id)) {
                this._displayMeshes[id].visible = visible;
            }
        }
        if (!visible) {
            for (id in this._affordanceMeshes) {
                if (this._affordanceMeshes.hasOwnProperty(id)) {
                    this._affordanceMeshes[id].visible = visible;
                }
            }
        }
    }

    /**
     * Gets if this FaceAlignedSectionPlanesControl is visible.
     *
     * @type {Boolean}
     */
    getVisible() {
        return this._visible;
    }

    /**
     * Sets if this FaceAlignedSectionPlanesControl is culled. This is called by FaceAlignedSectionPlanesPlugin to
     * temporarily hide the FaceAlignedSectionPlanesControl while a snapshot is being taken by Viewer#getSnapshot().
     * @param culled
     */
    setCulled(culled) {
        var id;
        for (id in this._displayMeshes) {
            if (this._displayMeshes.hasOwnProperty(id)) {
                this._displayMeshes[id].culled = culled;
            }
        }
        if (!culled) {
            for (id in this._affordanceMeshes) {
                if (this._affordanceMeshes.hasOwnProperty(id)) {
                    this._affordanceMeshes[id].culled = culled;
                }
            }
        }
    }

    /**
     * Builds the Entities that represent this FaceAlignedSectionPlanesControl.
     * @private
     */
    _createNodes() {

        const NO_STATE_INHERIT = false;
        const scene = this._viewer.scene;
        const radius = 1.0;
        const handleTubeRadius = 0.06;
        const hoopRadius = radius - 0.2;
        const tubeRadius = 0.01;
        const arrowRadius = 0.07;

        this._rootNode = new Node(scene, {
            position: [0, 0, 0],
            scale: [5, 5, 5]
        });

        const rootNode = this._rootNode;

        const shapes = {// Reusable geometries

            arrowHead: new ReadableGeometry(rootNode, buildCylinderGeometry({
                radiusTop: 0.001,
                radiusBottom: arrowRadius,
                radialSegments: 32,
                heightSegments: 1,
                height: 0.2,
                openEnded: false
            })),

            arrowHeadBig: new ReadableGeometry(rootNode, buildCylinderGeometry({
                radiusTop: 0.001,
                radiusBottom: 0.09,
                radialSegments: 32,
                heightSegments: 1,
                height: 0.25,
                openEnded: false
            })),

            axis: new ReadableGeometry(rootNode, buildCylinderGeometry({
                radiusTop: tubeRadius,
                radiusBottom: tubeRadius,
                radialSegments: 20,
                heightSegments: 1,
                height: radius,
                openEnded: false
            }))
        };

        const materials = { // Reusable materials

            red: new PhongMaterial(rootNode, {
                diffuse: [1, 0.0, 0.0],
                emissive: [1, 0.0, 0.0],
                ambient: [0.0, 0.0, 0.0],
                specular: [.6, .6, .3],
                shininess: 80,
                lineWidth: 2
            }),

            green: new PhongMaterial(rootNode, {
                diffuse: [0, 1.0, 0.0],
                emissive: [1, 0.0, 0.0],
                ambient: [0.0, 0.0, 0.0],
                specular: [.6, .6, .3],
                shininess: 80,
                lineWidth: 2
            }),

            blue: new PhongMaterial(rootNode, {
                diffuse: [0, 0.0, 1.0],
                emissive: [1, 0.0, 0.0],
                ambient: [0.0, 0.0, 0.0],
                specular: [.6, .6, .3],
                shininess: 80,
                lineWidth: 2
            }),

            highlightRed: new EmphasisMaterial(rootNode, { // Emphasis for red rotation affordance hoop
                edges: false,
                fill: true,
                fillColor: [1, 0, 0],
                fillAlpha: 0.6
            })
        };

        this._displayMeshes = {

            plane: rootNode.addChild(new Mesh(rootNode, {
                geometry: new ReadableGeometry(rootNode, {
                    primitive: "triangles",
                    positions: [
                        0.5, 0.5, 0.0, 0.5, -0.5, 0.0, // 0
                        -0.5, -0.5, 0.0, -0.5, 0.5, 0.0, // 1
                        0.5, 0.5, -0.0, 0.5, -0.5, -0.0, // 2
                        -0.5, -0.5, -0.0, -0.5, 0.5, -0.0 // 3
                    ],
                    indices: [0, 1, 2, 2, 3, 0]
                }),
                material: new PhongMaterial(rootNode, {
                    emissive: [0, 0.0, 0],
                    diffuse: [0, 0, 0],
                    backfaces: true
                }),
                opacity: 0.6,
                ghosted: true,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                scale: [2.4, 2.4, 1]
            }), NO_STATE_INHERIT),

            planeFrame: rootNode.addChild(new Mesh(rootNode, { // Visible frame
                geometry: new ReadableGeometry(rootNode, buildTorusGeometry({
                    center: [0, 0, 0],
                    radius: 1.7,
                    tube: tubeRadius * 2,
                    radialSegments: 4,
                    tubeSegments: 4,
                    arc: Math.PI * 2.0
                })),
                material: new PhongMaterial(rootNode, {
                    emissive: [0, 0, 0],
                    diffuse: [0, 0, 0],
                    specular: [0, 0, 0],
                    shininess: 0
                }),
                pickable: false,
                collidable: false,
                clippable: false,
                visible: false,
                scale: [1, 1, .1],
                rotation: [0, 0, 45]
            }), NO_STATE_INHERIT),

            center: rootNode.addChild(new Mesh(rootNode, {
                geometry: new ReadableGeometry(rootNode, buildSphereGeometry({
                    radius: 0.05
                })),
                material: materials.center,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false
            }), NO_STATE_INHERIT),

            zAxisArrow: rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHead,
                material: materials.blue,
                matrix: (function () {
                    const translate = math.translateMat4c(0, radius + .1, 0, math.identityMat4());
                    const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [0.8, 0, 0], math.identityMat4());
                    return math.mulMat4(rotate, translate, math.identityMat4());
                })(),
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false
            }), NO_STATE_INHERIT),

            zShaft: rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.axis,
                material: materials.blue,
                matrix: (function () {
                    const translate = math.translateMat4c(0, radius / 2, 0, math.identityMat4());
                    const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [1, 0, 0], math.identityMat4());
                    return math.mulMat4(rotate, translate, math.identityMat4());
                })(),
                clippable: false,
                pickable: false,
                collidable: true,
                visible: false
            }), NO_STATE_INHERIT)
        };

        this._affordanceMeshes = {

            planeFrame: rootNode.addChild(new Mesh(rootNode, {
                geometry: new ReadableGeometry(rootNode, buildTorusGeometry({
                    center: [0, 0, 0],
                    radius: 2,
                    tube: tubeRadius,
                    radialSegments: 4,
                    tubeSegments: 4,
                    arc: Math.PI * 2.0
                })),
                material: new PhongMaterial(rootNode, {
                    ambient: [1, 1, 1],
                    diffuse: [0, 0, 0],
                    emissive: [1, 1, 0]
                }),
                highlighted: true,
                highlightMaterial: new EmphasisMaterial(rootNode, {
                    edges: false,
                    filled: true,
                    fillColor: [1, 1, 0],
                    fillAlpha: 1.0
                }),
                pickable: false,
                collidable: false,
                clippable: false,
                visible: false,
                scale: [1, 1, 1],
                rotation: [0, 0, 45]
            }), NO_STATE_INHERIT),

            zAxisArrow: rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHeadBig,
                material: materials.blue,
                matrix: (function () {
                    const translate = math.translateMat4c(0, radius + .1, 0, math.identityMat4());
                    const rotate = math.rotationMat4v(-90 * math.DEGTORAD, [0.8, 0, 0], math.identityMat4());
                    return math.mulMat4(rotate, translate, math.identityMat4());
                })(),
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false
            }), NO_STATE_INHERIT)
        };
    }

    _bindEvents() {

        const rootNode = this._rootNode;

        var nextDragAction = null; // As we hover grabbed an arrow or hoop, self is the action we would do if we then dragged it.
        var dragAction = null; // Action we're doing while we drag an arrow or hoop.
        const lastCanvasPos = math.vec2();
        const camera = this._viewer.camera;
        const scene = this._viewer.scene;

        let deltaUpdate = 0;
        let waitForTick = false;

        { // Keep gizmo screen size constant

            const tempVec3a = math.vec3([0, 0, 0]);

            let distDirty = true;
            let lastDist = -1;

            this._onCameraViewMatrix = scene.camera.on("viewMatrix", () => {
                distDirty = true;
            });

            this._onCameraProjMatrix = scene.camera.on("projMatrix", () => {
                distDirty = true;
            });

            this._onSceneTick = scene.on("tick", () => {

                waitForTick = false;
                const dist = Math.abs(math.lenVec3(math.subVec3(scene.camera.eye, this._pos, tempVec3a)));

                if (dist !== lastDist) {
                    if (camera.projection === "perspective") {
                        const worldSize = (Math.tan(camera.perspective.fov * math.DEGTORAD)) * dist;
                        const size = 0.07 * worldSize;
                        rootNode.scale = [size, size, size];
                        lastDist = dist;
                    }
                }

                if (camera.projection === "ortho") {
                    const worldSize = camera.ortho.scale / 10;
                    const size = worldSize;
                    rootNode.scale = [size, size, size];
                    lastDist = dist;
                }

                if (deltaUpdate !== 0) {
                    moveSectionPlane(deltaUpdate);
                    deltaUpdate = 0;
                }
            });
        }

        const getClickCoordsWithinElement = (function () {
            const canvasPos = new Float64Array(2);
            return function (event) {
                if (!event) {
                    event = window.event;
                    canvasPos[0] = event.x;
                    canvasPos[1] = event.y;
                } else {
                    var element = event.target;
                    var totalOffsetLeft = 0;
                    var totalOffsetTop = 0;

                    while (element.offsetParent) {
                        totalOffsetLeft += element.offsetLeft;
                        totalOffsetTop += element.offsetTop;
                        element = element.offsetParent;
                    }
                    canvasPos[0] = event.pageX - totalOffsetLeft;
                    canvasPos[1] = event.pageY - totalOffsetTop;
                }
                return canvasPos;
            };
        })();

        const moveSectionPlane = (delta) => {
            const pos = this._sectionPlane.pos;
            const dir = this._sectionPlane.dir;
            math.addVec3(pos, math.mulVec3Scalar(dir, 0.1 * delta * this._plugin.getDragSensitivity(), math.vec3()));
            this._sectionPlane.pos = pos;
        }

        {
            let mouseDownLeft;
            let mouseDownMiddle;
            let mouseDownRight;
            let down = false;

            this._plugin._controlElement.addEventListener("mousedown", this._canvasMouseDownListener = (e) => {
                e.preventDefault();
                if (!this._visible) {
                    return;
                }
                this._viewer.cameraControl.pointerEnabled = false;
                switch (e.which) {
                    case 1: // Left button
                        mouseDownLeft = true;
                        down = true;
                        var canvasPos = getClickCoordsWithinElement(e);
                        dragAction = nextDragAction;
                        lastCanvasPos[0] = canvasPos[0];
                        lastCanvasPos[1] = canvasPos[1];
                        break;
                    default:
                        break;
                }
            });

            this._plugin._controlElement.addEventListener("mousemove", this._canvasMouseMoveListener = (e) => {
                if (!this._visible) {
                    return;
                }
                if (!down) {
                    return;
                }
                if (waitForTick) {    // Limit changes detection to one per frame
                    return;
                }
                var canvasPos = getClickCoordsWithinElement(e);
                const x = canvasPos[0];
                const y = canvasPos[1];
                moveSectionPlane(y - lastCanvasPos[1]);
                lastCanvasPos[0] = x;
                lastCanvasPos[1] = y;
            });

            this._plugin._controlElement.addEventListener("mouseup", this._canvasMouseUpListener = (e) => {
                if (!this._visible) {
                    return;
                }
                this._viewer.cameraControl.pointerEnabled = true;
                if (!down) {
                    return;
                }
                switch (e.which) {
                    case 1: // Left button
                        mouseDownLeft = false;
                        break;
                    case 2: // Middle/both buttons
                        mouseDownMiddle = false;
                        break;
                    case 3: // Right button
                        mouseDownRight = false;
                        break;
                    default:
                        break;
                }
                down = false;
            });

            this._plugin._controlElement.addEventListener("wheel", this._canvasWheelListener = (e) => {
                if (!this._visible) {
                    return;
                }
                deltaUpdate += Math.max(-1, Math.min(1, -e.deltaY * 40));
            });
        }

        {
            let touchStartY, touchEndY;
            let lastTouchY = null;

            this._plugin._controlElement.addEventListener("touchstart", this._handleTouchStart = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!this._visible) {
                    return;
                }
                touchStartY = e.touches[0].clientY;
                lastTouchY = touchStartY;
                deltaUpdate = 0;
            });

            this._plugin._controlElement.addEventListener("touchmove", this._handleTouchMove = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!this._visible) {
                    return;
                }
                if (waitForTick) {    // Limit changes detection to one per frame
                    return;
                }
                waitForTick = true;
                touchEndY = e.touches[0].clientY;
                if (lastTouchY !== null) {
                    deltaUpdate += touchEndY - lastTouchY;
                }
                lastTouchY = touchEndY;
            });

            this._plugin._controlElement.addEventListener("touchend", this._handleTouchEnd = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!this._visible) {
                    return;
                }
                touchStartY = null;
                touchEndY = null;
                deltaUpdate = 0;
            });
        }
    }

    _destroy() {
        this._unbindEvents();
        this._destroyNodes();
    }

    _unbindEvents() {

        const viewer = this._viewer;
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;
        const camera = viewer.camera;
        const controlElement = this._plugin._controlElement;

        scene.off(this._onSceneTick);

        canvas.removeEventListener("mousedown", this._canvasMouseDownListener);
        canvas.removeEventListener("mousemove", this._canvasMouseMoveListener);
        canvas.removeEventListener("mouseup", this._canvasMouseUpListener);
        canvas.removeEventListener("wheel", this._canvasWheelListener);

        controlElement.removeEventListener("touchstart", this._handleTouchStart);
        controlElement.removeEventListener("touchmove", this._handleTouchMove);
        controlElement.removeEventListener("touchend", this._handleTouchEnd);

        camera.off(this._onCameraViewMatrix);
        camera.off(this._onCameraProjMatrix);
    }

    _destroyNodes() {
        this._setSectionPlane(null);
        this._rootNode.destroy();
        this._displayMeshes = {};
        this._affordanceMeshes = {};
    }
}
