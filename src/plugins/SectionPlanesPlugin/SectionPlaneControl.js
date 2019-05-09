import {math} from "../../viewer/scene/math/math.js";

import {buildTorusGeometry} from "../../viewer/scene/geometry/builders/buildTorusGeometry.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {EmphasisMaterial} from "../../viewer/scene/materials/EmphasisMaterial.js";
import {Node} from "../../viewer/scene/nodes/Node.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";

const zeroVec = new Float32Array([0, 0, 1]);
const quat = new Float32Array(4);

/**
 * Controls a {@link SectionPlane} with mouse and touch input.
 *
 * {@link SectionPlanesPlugin#sectionPlaneControls} contains a SectionPlaneControl for each of its {@link SectionPlane}s.
 */
class SectionPlaneControl {

    /** @private */
    constructor(viewer, sectionPlane) {

        this.viewer = viewer;

        this._visible = false;
        this._pos = math.vec3(); // Holds the current position of the center of the clip plane.
        this._baseDir = math.vec3(); // Saves direction of clip plane when we start dragging a gizmo arrow or ring.
        this._gizmoNode = null; // Root of Node graph that represents this control in the 3D scene
        this._displayMeshes = null; // Meshes that are always visible
        this._affordanceMeshes = null; // Meshes displayed momentarily for affordance

        this._createNodes();
        this._bindEvents();

        if (sectionPlane) {
            this._setSectionPlane(sectionPlane);
            this.setVisible(true);
        }
    }

    /**
     * Called by SectionPlanesPlugin to reuse this SectionPlaneControl for a different SectionPlane.
     * @private
     */
    _setSectionPlane(sectionPlane) {
        this._sectionPlane = sectionPlane;
        if (sectionPlane) {
            this._setPos(sectionPlane.pos);
            this._setDir(sectionPlane.dir);
        }
    }

    /**
     * Gets the {@link SectionPlane} controlled by this SectionPlaneControl.
     * @returns {SectionPlane} The SectionPlane.
     */
    get sectionPlane() {
        return this._sectionPlane;
    }

    /** @private */
    _setPos(xyz) {
        this._pos.set(xyz);
        this._gizmoNode.position = xyz;
    }

    /** @private */
    _setDir(xyz) {
        this._baseDir.set(xyz);
        this._gizmoNode.quaternion = math.vec3PairToQuaternion(zeroVec, xyz, quat);
    }

    /**
     * Sets if this SectionPlaneControl is visible.
     *
     * Default value is ````true````.
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
     * Gets if this SectionPlaneControl is visible.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    getVisible() {
        return this._visible;
    }

    /**
     * Builds the Entities that represent this SectionPlaneControl.
     * @private
     */
    _createNodes() {

        const NO_STATE_INHERIT = false;
        const scene = this.viewer.scene;
        const tubeRadius = 0.005;

        this._gizmoNode = new Node(scene, {
            position: [0, 0, 0],
            scale: [5, 5, 55]
        });

        const gizmoNode = this._gizmoNode;

        this._displayMeshes = {

            plane: gizmoNode.addChild(new Mesh(gizmoNode, {
                geometry: new ReadableGeometry(gizmoNode, {
                    primitive: "triangles",
                    positions: [
                        0.5, 0.5, 0.0, 0.5, -0.5, 0.0, // 0
                        -0.5, -0.5, 0.0, -0.5, 0.5, 0.0, // 1
                        0.5, 0.5, -0.0, 0.5, -0.5, -0.0, // 2
                        -0.5, -0.5, -0.0, -0.5, 0.5, -0.0 // 3
                    ],
                    indices: [0, 1, 2, 2, 3, 0]
                }),
                material: new PhongMaterial(gizmoNode, {
                    emissive: [0, 0, 0],
                    diffuse: [0, 0, 0],
                    backfaces: true
                }),
                opacity: 0.5,
                // ghosted: true,
                ghostMaterial: new EmphasisMaterial(gizmoNode, {
                    edges: false,
                    filled: true,
                    fillColor: [1, 1, 0],
                    fillAlpha: 0.2,
                    backfaces: true
                }),
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                scale: [10.4, 10.4, 1]
            }), NO_STATE_INHERIT),

            planeFrame: gizmoNode.addChild(new Mesh(gizmoNode, { // Visible frame
                geometry: new ReadableGeometry(gizmoNode, buildTorusGeometry({
                    center: [0, 0, 0],
                    radius: 1.7,
                    tube: tubeRadius * 2,
                    radialSegments: 4,
                    tubeSegments: 4,
                    arc: Math.PI * 2.0
                })),
                material: new PhongMaterial(gizmoNode, {
                    emissive: [1, 1, 0]
                }),
                //highlighted: true,
                highlightMaterial: new EmphasisMaterial(gizmoNode, {
                    edges: false,
                    edgeColor: [0.8, 0.8, 0.8],
                    filled: true,
                    fillColor: [0.8, 0.8, 0.8],
                    fillAlpha: 1.0
                }),
                pickable: false,
                collidable: false,
                clippable: false,
                visible: false,
                scale: [1, 1, .1],
                rotation: [0, 0, 45]
            }), NO_STATE_INHERIT)
        };

        this._affordanceMeshes = {
            planeFrame: gizmoNode.addChild(new Mesh(gizmoNode, {
                geometry: new ReadableGeometry(gizmoNode, buildTorusGeometry({
                    center: [0, 0, 0],
                    radius: 2,
                    tube: tubeRadius,
                    radialSegments: 4,
                    tubeSegments: 4,
                    arc: Math.PI * 2.0
                })),
                material: new PhongMaterial(gizmoNode, {
                    ambient: [1, 1, 1],
                    diffuse: [0, 0, 0],
                    emissive: [1, 1, 0]
                }),
                highlighted: true,
                highlightMaterial: new EmphasisMaterial(gizmoNode, {
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
            }), NO_STATE_INHERIT)
        };
    }

    _bindEvents() {

        const self = this;

        var over = false;

        const DRAG_ACTIONS = {
            none: -1
        };

        const gizmoNode = this._gizmoNode;

        var hoverMesh = null;
        var nextDragAction = null; // As we hover over an arrow or hoop, self is the action we would do if we then dragged it.
        var dragAction = null; // Action we're doing while we drag an arrow or hoop.
        var lastCanvasPos = math.vec2();

        const xBaseAxis = math.vec3([1, 0, 0]);
        const yBaseAxis = math.vec3([0, 1, 0]);
        const zBaseAxis = math.vec3([0, 0, 1]);

        const canvas = this.viewer.scene.canvas.canvas;
        const camera = this.viewer.camera;
        const scene = this.viewer.scene;

        canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        { // Keep gizmo screen size constant
            const tempVec3a = math.vec3([0, 0, 0]);
            var distDirty = true;
            var lastDist = -1;
            self._onCameraViewMatrix = scene.camera.on("viewMatrix", function () {
                distDirty = true;
            });
            self._onCameraProjMatrix = scene.camera.on("projMatrix", function () {
                distDirty = true;
            });
            self._onSceneTick = scene.on("tick", function () {
                //  if (distDirty) {
                var dist = Math.abs(math.lenVec3(math.subVec3(scene.camera.eye, gizmoNode.position, tempVec3a)));
                if (dist !== lastDist) {
                    var scale = 10 * (dist / 50);
                    gizmoNode.scale = [scale, scale, scale];
                    lastDist = dist;
                }
                distDirty = false;
                //  }
            });
        }

        const getClickCoordsWithinElement = (function () {
            const canvasPos = new Float32Array(2);
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

        const localToWorldVec = (function () {
            const mat = math.mat4();
            return function (localVec, worldVec) {
                math.quaternionToMat4(self._gizmoNode.quaternion, mat);
                math.transformVec3(mat, localVec, worldVec);
                math.normalizeVec3(worldVec);
                return worldVec;
            };
        })();

        var getTranslationPlane = (function () {
            const planeNormal = math.vec3();
            return function (worldAxis) {
                const absX = Math.abs(worldAxis.x);
                if (absX > Math.abs(worldAxis.y) && absX > Math.abs(worldAxis.z)) {
                    math.cross3Vec3(worldAxis, [0, 1, 0], planeNormal);
                } else {
                    math.cross3Vec3(worldAxis, [1, 0, 0], planeNormal);
                }
                math.cross3Vec3(planeNormal, worldAxis, planeNormal);
                math.normalizeVec3(planeNormal);
                return planeNormal;
            }
        })();

        const dragTranslateSectionPlane = (function () {
            const p1 = math.vec3();
            const p2 = math.vec3();
            const worldAxis = math.vec4();
            return function (baseAxis, fromMouse, toMouse) {
                localToWorldVec(baseAxis, worldAxis);
                const planeNormal = getTranslationPlane(worldAxis, fromMouse, toMouse);
                getPointerPlaneIntersect(fromMouse, planeNormal, p1);
                getPointerPlaneIntersect(toMouse, planeNormal, p2);
                math.subVec3(p2, p1);
                const dot = math.dotVec3(p2, worldAxis);
                self._pos[0] += worldAxis[0] * dot;
                self._pos[1] += worldAxis[1] * dot;
                self._pos[2] += worldAxis[2] * dot;
                self._gizmoNode.position = self._pos;
                if (self.sectionPlane) {
                    self.sectionPlane.pos = self._pos;
                }
            }
        })();

        var getPointerPlaneIntersect = (function () {
            const dir = math.vec4([0, 0, 0, 1]);
            const matrix = math.mat4();
            return function (mouse, axis, dest, offset) {
                offset = offset || 0;
                dir[0] = mouse[0] / canvas.width * 2.0 - 1.0;
                dir[1] = -(mouse[1] / canvas.height * 2.0 - 1.0);
                dir[2] = 0.0;
                dir[3] = 1.0;
                math.mulMat4(camera.projMatrix, camera.viewMatrix, matrix); // Unproject norm device coords to view coords
                math.inverseMat4(matrix);
                math.transformVec4(matrix, dir, dir);
                math.mulVec4Scalar(dir, 1.0 / dir[3]); // This is now point A on the ray in world space
                var rayO = camera.eye; // The direction
                math.subVec4(dir, rayO, dir);
                const origin = self._sectionPlane.pos; // Plane origin:
                var d = -math.dotVec3(origin, axis) - offset;
                var dot = math.dotVec3(axis, dir);
                if (Math.abs(dot) > 0.005) {
                    var t = -(math.dotVec3(axis, rayO) + d) / dot;
                    math.mulVec3Scalar(dir, t, dest);
                    math.addVec3(dest, rayO);
                    math.subVec3(dest, origin, dest);
                    return true;
                }
                return false;
            }
        })();

        {
            var mouseDownLeft;
            var mouseDownMiddle;
            var mouseDownRight;
            var down = false;
            var lastHighlightedMesh;
            var lastShownMesh;

            canvas.addEventListener("mousedown", this._canvasMouseDownListener = (e) => {
                if (!self._visible) {
                    return;
                }
                if (!over) {
                    return;
                }
                self.viewer.cameraControl.pointerEnabled = (nextDragAction === DRAG_ACTIONS.none);
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

            canvas.addEventListener("mousemove", this._canvasMouseMoveListener = (e) => {
                if (!self._visible) {
                    return;
                }
                if (!over) {
                    return;
                }
                var canvasPos = getClickCoordsWithinElement(e);
                if (!down) {
                    return;
                }
                const x = canvasPos[0];
                const y = canvasPos[1];
                dragTranslateSectionPlane(zBaseAxis, lastCanvasPos, canvasPos);
                lastCanvasPos[0] = x;
                lastCanvasPos[1] = y;
            });

            canvas.addEventListener("mouseup", this._canvasMouseUpListener = (e) => {
                if (!self._visible) {
                    return;
                }
                self.viewer.cameraControl.pointerEnabled = true;
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

            canvas.addEventListener("mouseenter", this._canvasMouseEnterListener = () => {
                if (!self._visible) {
                    return;
                }
                over = true;
            });

            canvas.addEventListener("mouseleave", this._canvasMouseLeaveListener = () => {
                if (!self._visible) {
                    return;
                }
                over = false;
            });

            canvas.addEventListener("wheel", this._canvasWheelListener = (e) => {
                if (!self._visible) {
                    return;
                }
                var delta = Math.max(-1, Math.min(1, -e.deltaY * 40));
                if (delta === 0) {
                    return;
                }
                e.preventDefault();
            });
        }
    }

    _destroy() {
        this._unbindEvents();
        this._destroyNodes();
    }

    _unbindEvents() {
        // TODO
    }

    _destroyNodes() {
        this._gizmoNode.destroy();
        this._displayMeshes = {};
        this._affordanceMeshes = {};
    }
}

export {SectionPlaneControl};