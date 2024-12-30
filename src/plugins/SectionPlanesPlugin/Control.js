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
 *
 * @private
 */
class Control {

    /** @private */
    constructor(plugin) {

        /**
         * ID of this Control.
         *
         * SectionPlaneControls are mapped by this ID in {@link SectionPlanesPlugin#sectionPlaneControls}.
         *
         * @property id
         * @type {String|Number}
         */
        this.id = null;

        this._viewer = plugin.viewer;

        this._visible = false;
        this._pos = math.vec3(); // Full-precision position of the center of the Control
        this._origin = math.vec3();
        this._rtcPos = math.vec3();

        this._rootNode = null; // Root of Node graph that represents this control in the 3D scene
        this._displayMeshes = null; // Meshes that are always visible
        this._handlers = { };

        this._ignoreNextSectionPlaneDirUpdate = false;

        // Builds the Entities that represent this Control.
        const NO_STATE_INHERIT = false;
        const scene = this._viewer.scene;
        const radius = 1.0;
        const handleTubeRadius = 0.06;
        const hoopRadius = radius - 0.2;
        const tubeRadius = 0.01;
        const arrowRadius = 0.07;

        this._rootNode = new Node(scene, {
            position: [0, 0, 0],
            scale: [5, 5, 5],
            isObject: false
        });

        const rootNode = this._rootNode;

        const arrowGeometry = (radiusBottom, height, radialSegments) => new ReadableGeometry(rootNode, buildCylinderGeometry({
            radiusTop: 0.001,
            radiusBottom: radiusBottom,
            radialSegments: radialSegments,
            heightSegments: 1,
            height: height,
            openEnded: false
        }));

        const tubeGeometry = (radius, height, radialSegments) => new ReadableGeometry(rootNode, buildCylinderGeometry({
            radiusTop: radius,
            radiusBottom: radius,
            radialSegments: radialSegments,
            heightSegments: 1,
            height: height,
            openEnded: false
        }));

        const torusGeometry = (tube, arcFraction, tubeSegments) => new ReadableGeometry(rootNode, buildTorusGeometry({
            radius: hoopRadius,
            tube: tube,
            radialSegments: 64,
            tubeSegments: tubeSegments,
            arc: (Math.PI * 2.0) * arcFraction
        }));

        const shapes = {// Reusable geometries

            arrowHead: arrowGeometry(arrowRadius, 0.2, 32),
            arrowHeadBig: arrowGeometry(0.09, 0.25, 32),
            arrowHeadHandle: tubeGeometry(0.09, 0.37, 8),

            curve:       torusGeometry(tubeRadius, 0.25, 14),
            curveHandle: torusGeometry(handleTubeRadius, 0.25, 14),
            hoop:        torusGeometry(tubeRadius, 1, 8),

            axis: tubeGeometry(tubeRadius, radius, 20),
            axisHandle: tubeGeometry(0.08, radius, 20)
        };

        const colorMaterial = (rgb) => new PhongMaterial(rootNode, {
            diffuse: rgb,
            emissive: rgb,
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const highlightMaterial = (rgb, fillAlpha) => new EmphasisMaterial(rootNode, {
            edges: false,
            fill: true,
            fillColor: rgb,
            fillAlpha: fillAlpha
        });

        const pickableMaterial = new PhongMaterial(rootNode, { // Invisible material for pickable handles, which define a pickable 3D area
            diffuse: [1, 1, 0],
            alpha: 0, // Invisible
            alphaMode: "blend"
        });

        const addAxis = (rgb, axisDirection, hoopDirection) => {
            const material = colorMaterial(rgb);

            const rotateToHorizontal = math.rotationMat4v(270 * math.DEGTORAD, [1, 0, 0], math.identityMat4());
            const hoopRotation = math.quaternionToRotationMat4(math.vec3PairToQuaternion([ 0, 1, 0 ], hoopDirection), math.identityMat4());
            const hoopMatrix = math.mulMat4(hoopRotation, rotateToHorizontal, math.identityMat4());

            const scale = math.scaleMat4v([0.6, 0.6, 0.6], math.identityMat4());

            const scaledArrowMatrix = (t, matR) => {
                const matT = math.translateMat4v(t, math.identityMat4());
                const ret = math.identityMat4();
                math.mulMat4(matT, matR, ret);
                math.mulMat4(hoopMatrix, ret, ret);
                return math.mulMat4(ret, scale, math.identityMat4());
            };

            const curve = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.curve,
                material: material,
                matrix: hoopMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                backfaces: true,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const rotateHandle = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.curveHandle,
                material: pickableMaterial,
                matrix: hoopMatrix,
                pickable: true,
                collidable: true,
                clippable: false,
                backfaces: true,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const arrow1 = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHead,
                material: material,
                matrix: scaledArrowMatrix([ .8, .07, 0 ], math.rotationMat4v(180 * math.DEGTORAD, [0, 0, 1], math.identityMat4())),
                pickable: true,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const arrow2 = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHead,
                material: material,
                matrix: scaledArrowMatrix([ .07, .8, 0 ], math.rotationMat4v(90 * math.DEGTORAD, [0, 0, 1], math.identityMat4())),
                pickable: true,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const hoop = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.hoop,
                material: material,
                highlighted: true,
                highlightMaterial: highlightMaterial(rgb, 0.6),
                matrix: hoopMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);


            const axisRotation = math.quaternionToRotationMat4(math.vec3PairToQuaternion([ 0, 1, 0 ], axisDirection), math.identityMat4());

            const translatedAxisMatrix = (yOffset) => math.mulMat4(axisRotation, math.translateMat4c(0, yOffset, 0, math.identityMat4()), math.identityMat4());
            const arrowMatrix = translatedAxisMatrix(radius + .1);
            const shaftMatrix = translatedAxisMatrix(radius / 2);

            const arrow = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHead,
                material: material,
                matrix: arrowMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const arrowHandle = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHeadHandle,
                material: pickableMaterial,
                matrix: arrowMatrix,
                pickable: true,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const shaft = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.axis,
                material: material,
                matrix: shaftMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const shaftHandle = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.axisHandle,
                material: pickableMaterial,
                matrix: shaftMatrix,
                pickable: true,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            const bigArrowHead = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHeadBig,
                material: material,
                matrix: arrowMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT);

            this._handlers[arrowHandle.id] = this._handlers[shaftHandle.id] = [ bigArrowHead, [ true, rgb ] ];
            this._handlers[rotateHandle.id] = [ hoop, [ false, rgb ] ];

            return {
                set visible(v) {
                    arrow.visible = arrowHandle.visible = shaft.visible = shaftHandle.visible = curve.visible = rotateHandle.visible = arrow1.visible = arrow2.visible = v;
                    if (! v) {
                        bigArrowHead.visible = v;
                        hoop.visible = v;
                    }
                },
                set culled(c) {
                    arrow.culled = arrowHandle.culled = shaft.culled = shaftHandle.culled = curve.culled = rotateHandle.culled = arrow1.culled = arrow2.culled = c;
                    if (! c) {
                        bigArrowHead.culled = c;
                        hoop.culled = c;
                    }
                }
            };
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
                ghostMaterial: new EmphasisMaterial(rootNode, {
                    edges: false,
                    filled: true,
                    fillColor: [1, 1, 0],
                    edgeColor: [0, 0, 0],
                    fillAlpha: 0.1,
                    backfaces: true
                }),
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                scale: [2.4, 2.4, 1],
                isObject: false
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
                //highlighted: true,
                highlightMaterial: new EmphasisMaterial(rootNode, {
                    edges: false,
                    edgeColor: [0.0, 0.0, 0.0],
                    filled: true,
                    fillColor: [0.8, 0.8, 0.8],
                    fillAlpha: 1.0
                }),
                pickable: false,
                collidable: false,
                clippable: false,
                visible: false,
                scale: [1, 1, .1],
                rotation: [0, 0, 45],
                isObject: false
            }), NO_STATE_INHERIT),

            center: rootNode.addChild(new Mesh(rootNode, {
                geometry: new ReadableGeometry(rootNode, buildSphereGeometry({
                    radius: 0.05
                })),
                material: new PhongMaterial(rootNode, {
                    diffuse: [0.0, 0.0, 0.0],
                    emissive: [0, 0, 0],
                    ambient: [0.0, 0.0, 0.0],
                    specular: [.6, .6, .3],
                    shininess: 80
                }),
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isObject: false
            }), NO_STATE_INHERIT),

            //----------------------------------------------------------------------------------------------------------
            //
            //----------------------------------------------------------------------------------------------------------

            xAxis: addAxis([1,0,0], [ 1,  0,  0 ], [ 1, 0,  0 ]),
            yAxis: addAxis([0,1,0], [ 0, -1,  0 ], [ 0, 1,  0 ]),
            zAxis: addAxis([0,0,1], [ 0,  0, -1 ], [ 0, 0, -1 ])
        };

        // bindEvents
        const self = this;

        const setRootNodeScale = size => rootNode.scale = [size, size, size];

        var nextDragAction = null; // As we hover grabbed an arrow or hoop, self is the action we would do if we then dragged it.
        var dragAction = null; // Action we're doing while we drag an arrow or hoop.
        const lastCanvasPos = math.vec2();

        const canvas = this._viewer.scene.canvas.canvas;
        const camera = this._viewer.camera;

        { // Keep gizmo screen size constant
            const tempVec3a = math.vec3([0, 0, 0]);
            let lastDist = -1;
            this._onSceneTick = scene.on("tick", () => {
                const dist = Math.abs(math.lenVec3(math.subVec3(scene.camera.eye, this._pos, tempVec3a)));
                if (camera.projection === "perspective") {
                    if (dist !== lastDist) {
                        setRootNodeScale(0.07 * dist * Math.tan(camera.perspective.fov * math.DEGTORAD));
                    }
                } else if (camera.projection === "ortho") {
                    setRootNodeScale(camera.ortho.scale / 10);
                }
                lastDist = dist;
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
                    const element = event.target;
                    const rect = element.getBoundingClientRect();
                    canvasPos[0] = event.clientX - rect.left;
                    canvasPos[1] = event.clientY - rect.top;
                }
                return canvasPos;
            };
        })();

        const localToWorldVec = (function () {
            const mat = math.mat4();
            return function (localVec, worldVec) {
                math.quaternionToMat4(rootNode.quaternion, mat);
                math.transformVec3(mat, localVec, worldVec);
                math.normalizeVec3(worldVec);
                return worldVec;
            };
        })();

        var getTranslationPlane = (function () {
            const planeNormal = math.vec3();
            return function (worldAxis) {
                const absX = Math.abs(worldAxis[0]);
                if (absX > Math.abs(worldAxis[1]) && absX > Math.abs(worldAxis[2])) {
                    math.cross3Vec3(worldAxis, [0, 1, 0], planeNormal);
                } else {
                    math.cross3Vec3(worldAxis, [1, 0, 0], planeNormal);
                }
                math.cross3Vec3(planeNormal, worldAxis, planeNormal);
                math.normalizeVec3(planeNormal);
                return planeNormal;
            };
        })();

        const dragTranslateSectionPlane = (function () {
            const p1 = math.vec3();
            const p2 = math.vec3();
            const worldAxis = math.vec4();
            return function (baseAxis, fromMouse, toMouse) {
                localToWorldVec(baseAxis, worldAxis);
                const planeNormal = getTranslationPlane(worldAxis);
                getPointerPlaneIntersect(fromMouse, planeNormal, p1);
                getPointerPlaneIntersect(toMouse, planeNormal, p2);
                math.subVec3(p2, p1);
                const dot = math.dotVec3(p2, worldAxis);
                self._pos[0] += worldAxis[0] * dot;
                self._pos[1] += worldAxis[1] * dot;
                self._pos[2] += worldAxis[2] * dot;
                self._rootNode.position = self._pos;
                if (self._sectionPlane) {
                    self._sectionPlane.pos = self._pos;
                }
            };
        })();

        var dragRotateSectionPlane = (function () {
            const p1 = math.vec4();
            const p2 = math.vec4();
            const c = math.vec4();
            const worldAxis = math.vec4();
            const dir = math.vec3();
            const mat = math.mat4();
            return function (baseAxis, fromMouse, toMouse) {
                localToWorldVec(baseAxis, worldAxis);
                const hasData = getPointerPlaneIntersect(fromMouse, worldAxis, p1) && getPointerPlaneIntersect(toMouse, worldAxis, p2);
                if (!hasData) { // Find intersections with view plane and project down to origin
                    const planeNormal = getTranslationPlane(worldAxis);
                    getPointerPlaneIntersect(fromMouse, planeNormal, p1, 1); // Ensure plane moves closer to camera so angles become workable
                    getPointerPlaneIntersect(toMouse, planeNormal, p2, 1);
                    var dot = math.dotVec3(p1, worldAxis);
                    p1[0] -= dot * worldAxis[0];
                    p1[1] -= dot * worldAxis[1];
                    p1[2] -= dot * worldAxis[2];
                    dot = math.dotVec3(p2, worldAxis);
                    p2[0] -= dot * worldAxis[0];
                    p2[1] -= dot * worldAxis[1];
                    p2[2] -= dot * worldAxis[2];
                }
                math.normalizeVec3(p1);
                math.normalizeVec3(p2);
                dot = math.dotVec3(p1, p2);
                dot = math.clamp(dot, -1.0, 1.0); // Rounding errors cause dot to exceed allowed range
                var incDegrees = Math.acos(dot) * math.RADTODEG;
                math.cross3Vec3(p1, p2, c);
                if (math.dotVec3(c, worldAxis) < 0.0) {
                    incDegrees = -incDegrees;
                }
                self._rootNode.rotate(baseAxis, incDegrees);

                if (self.sectionPlane) {
                    math.quaternionToMat4(rootNode.quaternion, mat);  // << ---
                    math.transformVec3(mat, [0, 0, 1], dir);

                    if (self._sectionPlane) {
                        self._ignoreNextSectionPlaneDirUpdate = true;
                        self._sectionPlane.dir = dir;
                    }
                }
            };
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
            };
        })();

        {
            let lastAffordanceMesh = null;

            this._onCameraControlHover = this._viewer.cameraControl.on("hoverEnter", (hit) => {
                if (this._visible && (! dragAction)) {
                    if (lastAffordanceMesh) {
                        lastAffordanceMesh.visible = false;
                    }
                    const meshId = hit.entity.id;
                    if (meshId in this._handlers) {
                        const [ affordanceMesh, dragAction ] = this._handlers[meshId];
                        affordanceMesh.visible = true;
                        lastAffordanceMesh = affordanceMesh;
                        nextDragAction = dragAction;
                    } else {
                        lastAffordanceMesh = null;
                        nextDragAction = null;
                    }
                }
            });

            this._onCameraControlHoverLeave = this._viewer.cameraControl.on("hoverOutEntity", (hit) => {
                if (this._visible) {
                    if (lastAffordanceMesh) {
                        lastAffordanceMesh.visible = false;
                    }
                    lastAffordanceMesh = null;
                    nextDragAction = null;
                }
            });

            canvas.addEventListener("mousedown", this._canvasMouseDownListener = (e) => {
                e.preventDefault();
                if (this._visible && (e.which === 1) && nextDragAction) { // Left button
                    this._viewer.cameraControl.pointerEnabled = false;
                    dragAction = nextDragAction;
                    lastCanvasPos.set(getClickCoordsWithinElement(e));
                }
            });

            canvas.addEventListener("mousemove", this._canvasMouseMoveListener = (e) => {
                if (this._visible && dragAction) {
                    const canvasPos = getClickCoordsWithinElement(e);
                    const [ isTranslate, axis ] = dragAction;
                    if (isTranslate) {
                        dragTranslateSectionPlane(axis, lastCanvasPos, canvasPos);
                    } else {
                        dragRotateSectionPlane(axis, lastCanvasPos, canvasPos);
                    }
                    lastCanvasPos.set(canvasPos);
                }
            });

            canvas.addEventListener("mouseup", this._canvasMouseUpListener = (e) => {
                if (this._visible && dragAction) {
                    this._viewer.cameraControl.pointerEnabled = true;
                    dragAction = null;
                }
            });
        }

        this.__setSectionPlane = sectionPlane => {
            if (this._sectionPlane) {
                this._sectionPlane.off(this._onSectionPlanePos);
                this._sectionPlane.off(this._onSectionPlaneDir);
                this._onSectionPlanePos = null;
                this._onSectionPlaneDir = null;
                this._sectionPlane = null;
            }
            if (sectionPlane) {
                this.id = sectionPlane.id;
                const setPosFromSectionPlane = () => {
                    const pos = sectionPlane.pos;
                    this._pos.set(pos);
                    worldToRTCPos(pos, this._origin, this._rtcPos);
                    this._rootNode.origin = this._origin;
                    this._rootNode.position = this._rtcPos;
                };
                const setDirFromSectionPlane = () => {
                    this._rootNode.quaternion = math.vec3PairToQuaternion(zeroVec, sectionPlane.dir, quat);
                };
                setPosFromSectionPlane();
                setDirFromSectionPlane();
                this._sectionPlane = sectionPlane;
                this._onSectionPlanePos = sectionPlane.on("pos", setPosFromSectionPlane);
                this._onSectionPlaneDir = sectionPlane.on("dir", () => {
                    if (!this._ignoreNextSectionPlaneDirUpdate) {
                        setDirFromSectionPlane();
                    } else {
                        this._ignoreNextSectionPlaneDirUpdate = false;
                    }
                });
            }
        };

        this.__destroy = () => {
            // unbindEvents
            const viewer = this._viewer;
            const scene = viewer.scene;
            const canvas = scene.canvas.canvas;
            const camera = viewer.camera;
            const cameraControl = viewer.cameraControl;

            scene.off(this._onSceneTick);

            canvas.removeEventListener("mousedown", this._canvasMouseDownListener);
            canvas.removeEventListener("mousemove", this._canvasMouseMoveListener);
            canvas.removeEventListener("mouseup", this._canvasMouseUpListener);

            cameraControl.off(this._onCameraControlHover);
            cameraControl.off(this._onCameraControlHoverLeave);

            // destroyNodes
            this._setSectionPlane(null);
            this._rootNode.destroy();
            this._displayMeshes = {};
        };
    }

    _destroy() {
        this.__destroy();
    }

    /**
     * Called by SectionPlanesPlugin to assign this Control to a SectionPlane.
     * SectionPlanesPlugin keeps SectionPlaneControls in a reuse pool.
     * Call with a null or undefined value to disconnect the Control ffrom whatever SectionPlane it was assigned to.
     * @private
     */
    _setSectionPlane(sectionPlane) {
        this.__setSectionPlane(sectionPlane);
    }

    /**
     * Gets the {@link SectionPlane} controlled by this Control.
     * @returns {SectionPlane} The SectionPlane.
     */
    get sectionPlane() {
        return this._sectionPlane;
    }

    /**
     * Sets if this Control is visible.
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
    }

    /**
     * Gets if this Control is visible.
     *
     * @type {Boolean}
     */
    getVisible() {
        return this._visible;
    }

    /**
     * Sets if this Control is culled. This is called by SectionPlanesPlugin to
     * temporarily hide the Control while a snapshot is being taken by Viewer#getSnapshot().
     * @param culled
     */
    setCulled(culled) {
        var id;
        for (id in this._displayMeshes) {
            if (this._displayMeshes.hasOwnProperty(id)) {
                this._displayMeshes[id].culled = culled;
            }
        }
    }
}

export {Control};
