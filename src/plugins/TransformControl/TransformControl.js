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
import {transformToNode} from "../lib/ui/index.js";

const zeroVec = new Float64Array([0, 0, 1]);
const quat = new Float64Array(4);

/**
 * Controls a transformation with mouse and touch input.
 *
 * @private
 */
class TransformControl {

    /** @private */
    constructor(viewer) {
        const cameraControl = viewer.cameraControl;
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;

        // Builds the Entities that represent this Control.
        const NO_STATE_INHERIT = false;
        const arrowLength = 1.0;
        const handleRadius = 0.09;
        const tubeRadius = 0.01;

        const rootNode = new Node(scene, { // Root of Node graph that represents this control in the 3D scene
            position: [0, 0, 0],
            scale: [5, 5, 5],
            isObject: false
        });

        const pos = math.vec3();
        this._setPosition = (function() {
            const origin = math.vec3();
            const rtcPos = math.vec3();
            return function(p) {
                pos.set(p);
                worldToRTCPos(p, origin, rtcPos);
                rootNode.origin = origin;
                rootNode.position = rtcPos;
            };
        })();

        this._setQuaternion = q => { rootNode.quaternion = q; };

        const arrowGeometry = (radiusBottom, height) => new ReadableGeometry(rootNode, buildCylinderGeometry({
            radiusTop: 0.001,
            radiusBottom: radiusBottom,
            radialSegments: 32,
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
            radius: arrowLength - 0.2,
            tube: tube,
            radialSegments: 64,
            tubeSegments: tubeSegments,
            arc: (Math.PI * 2.0) * arcFraction
        }));

        const shapes = {// Reusable geometries

            curve:       torusGeometry(tubeRadius,   0.25, 14),
            curveHandle: torusGeometry(handleRadius, 0.25, 14),
            hoop:        torusGeometry(tubeRadius,   1,     8),

            arrowHead:       arrowGeometry(0.07, 0.2),
            arrowHeadBig:    arrowGeometry(0.09, 0.25),
            arrowHeadHandle: tubeGeometry(handleRadius, 0.37, 8),

            axis:       tubeGeometry(tubeRadius,   arrowLength, 20),
            axisHandle: tubeGeometry(handleRadius, arrowLength, 20)
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

        const handlers = { };
        const addAxis = (rgb, hoopRot) => {
            const axisDirection = math.mulVec3Scalar(rgb, -1, math.vec3());
            const material = colorMaterial(rgb);

            const hoopMatrix = math.quaternionToRotationMat4(hoopRot, math.identityMat4());
            math.mulMat4(math.rotationMat4v(Math.PI, [0,1,0], math.mat4()), hoopMatrix, hoopMatrix);
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
                isUI: true,
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
                isUI: true,
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
                isUI: true,
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
                isUI: true,
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
                isUI: true,
                isObject: false
            }), NO_STATE_INHERIT);


            const axisRotation = math.quaternionToRotationMat4(math.vec3PairToQuaternion([ 0, 1, 0 ], rgb), math.identityMat4());
            math.mulMat4(math.rotationMat4v(Math.PI, [0,1,0], math.mat4()), axisRotation, axisRotation);

            const translatedAxisMatrix = (yOffset) => math.mulMat4(axisRotation, math.translateMat4c(0, yOffset, 0, math.identityMat4()), math.identityMat4());
            const arrowMatrix = translatedAxisMatrix(arrowLength + .1);
            const shaftMatrix = translatedAxisMatrix(arrowLength / 2);

            const arrow = rootNode.addChild(new Mesh(rootNode, {
                geometry: shapes.arrowHead,
                material: material,
                matrix: arrowMatrix,
                pickable: false,
                collidable: true,
                clippable: false,
                visible: false,
                isUI: true,
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
                isUI: true,
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
                isUI: true,
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
                isUI: true,
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
                isUI: true,
                isObject: false
            }), NO_STATE_INHERIT);

            const localToWorldVec = (localVec, worldVec) => math.vec3ApplyQuaternion(rootNode.quaternion, localVec, worldVec);

            const closestPointOnAxis = (function() {
                const worldAxis = math.vec3();
                const org = math.vec3();
                const dir = math.vec3();
                return (canvasPos, dst) => {
                    localToWorldVec(rgb, worldAxis);

                    const P = pos;
                    const D = worldAxis;

                    math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, org, dir);

                    const d01 = math.dotVec3(D, dir);
                    const v = math.subVec3(org, P, dst);
                    const v0 = math.dotVec3(v, D);
                    const v1 = math.dotVec3(v, dir);
                    const det = 1 - d01 * d01;

                    if (Math.abs(det) > 1e-10) { // if lines are not parallel
                        const s = (v0 - d01 * v1) / det;
                        math.addVec3(P, math.mulVec3Scalar(D, s, dst), dst);
                        return true;
                    } else {
                        return false;
                    }
                };
            })();
            const initOffset = math.vec3();
            const tempVec3 = math.vec3();
            handlers[arrowHandle.id] = handlers[shaftHandle.id] = {
                setActivated: a => bigArrowHead.visible = a,
                initDragAction: (initCanvasPos) => {
                    return closestPointOnAxis(initCanvasPos, initOffset) && math.subVec3(initOffset, pos, initOffset) && ((canvasPos) => {
                        if (closestPointOnAxis(canvasPos, tempVec3)) {
                            math.subVec3(tempVec3, initOffset, tempVec3);
                            this._setPosition(tempVec3);
                            if (this._handlers) {
                                this._handlers.onPosition(tempVec3);
                            }
                        }
                    });
                }
            };

            handlers[rotateHandle.id] = {
                setActivated: a => hoop.visible = a,
                initDragAction: (initCanvasPos) => {
                    const rotationFromCanvasPos = (function() {
                        const planeCanvasPos = scene.camera.projectWorldPos(pos);
                        localToWorldVec(rgb, tempVec3);
                        math.transformVec3(scene.camera.normalMatrix, tempVec3, tempVec3);
                        const axisCoeff = Math.sign(tempVec3[2]);
                        return (canvasPos) => {
                            const dx = canvasPos[0] - planeCanvasPos[0];
                            const dy = canvasPos[1] - planeCanvasPos[1];
                            return axisCoeff * Math.atan2(-dy, dx);
                        };
                    })();

                    let lastRotation = rotationFromCanvasPos(initCanvasPos);

                    return canvasPos => {
                        const rotation = rotationFromCanvasPos(canvasPos);
                        rootNode.rotate(rgb, (rotation - lastRotation) * 180 / Math.PI);
                        if (this._handlers) {
                            this._handlers.onQuaternion(rootNode.quaternion);
                        }
                        lastRotation = rotation;
                    };
                }
            };

            let positionActive = false;
            let rotationActive = false;
            let visible = false;

            const updatePositionHandle = () => {
                const v = visible && positionActive;
                arrowHandle.visible = shaftHandle.visible = arrow.visible = shaft.visible = !!v;
                if (! v) {
                    bigArrowHead.visible = false;
                }
            };
            const updateRotationHandle = () => {
                const v = visible && rotationActive;
                rotateHandle.visible = curve.visible = arrow1.visible = arrow2.visible = !!v;
                if (! v) {
                    hoop.visible = false;
                }
            };

            return {
                setPositionActive: (a) => { positionActive = a; updatePositionHandle(); },
                setRotationActive: (a) => { rotationActive = a; updateRotationHandle(); },
                set visible(v) {
                    visible = v;
                    updatePositionHandle();
                    updateRotationHandle();
                }
            };
        };

        this._displayMeshes = {
            center: rootNode.addChild(new Mesh(rootNode, { // center
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

            x: addAxis([1,0,0], math.vec3PairToQuaternion([1,0,0], [0,0,1])),
            y: addAxis([0,1,0], math.eulerToQuaternion([90,0,0], "XYZ")),
            z: addAxis([0,0,1], math.identityQuaternion())
        };

        const cleanups = [ ];

        { // Keep gizmo screen size constant
            let lastDist = -1;
            const setRootNodeScale = size => {
                if (rootNode.scale[0] !== size) {
                    rootNode.scale = [size, size, size];
                    if (this._handlers && this._handlers.onScreenScale) {
                        this._handlers.onScreenScale(rootNode.scale);
                    }
                }
            };
            const onSceneTick = scene.on("tick", () => {
                const camera = scene.camera;
                const dist = Math.abs(math.distVec3(camera.eye, pos));
                if (camera.projection === "perspective") {
                    if (dist !== lastDist) {
                        setRootNodeScale(0.07 * dist * Math.tan(camera.perspective.fov * math.DEGTORAD));
                    }
                } else if (camera.projection === "ortho") {
                    setRootNodeScale(camera.ortho.scale / 10);
                }
                lastDist = dist;
            });
            cleanups.push(() => scene.off(onSceneTick));
        }

        {
            let deactivateActive = null;
            let currentDrag = null;
            cleanups.push(() => { if (currentDrag) { currentDrag.cleanup(); } });
            const canvasPos = math.vec2();

            const copyCanvasPos = (event, vec2) => {
                vec2[0] = event.pageX;
                vec2[1] = event.pageY;
                transformToNode(canvas.ownerDocument.documentElement, canvas, vec2);
            };

            const pickIds = Object.keys(handlers);
            const pickHandler = (e) => {
                copyCanvasPos(e, canvasPos);
                // This doesn't guarantee the gizmo is prioritized (as it should be) by other Scene::pick calls
                const pickResult = scene.pick({ canvasPos: canvasPos });//, includeEntities: pickIds });
                const pickEntity = pickResult && pickResult.entity;
                const pickId = pickEntity && pickEntity.id;
                return (pickId in handlers) && handlers[pickId];
            };

            const startDrag = (event, matchesEvent) => {
                const handler = pickHandler(matchesEvent(event));
                if (handler) {
                    if (currentDrag) {
                        currentDrag.cleanup();
                    }

                    const dragAction = handler.initDragAction(canvasPos);
                    if (dragAction) {
                        cameraControl.pointerEnabled = false; // or .active = false ?
                        handler.setActivated(true);

                        currentDrag = {
                            onChange: event => {
                                const e = matchesEvent(event);
                                if (e) {
                                    copyCanvasPos(e, canvasPos);
                                    dragAction(canvasPos);
                                }
                            },
                            cleanup: function() {
                                currentDrag = null;
                                cameraControl.pointerEnabled = true; // or .active = true ?
                                handler.setActivated(false);
                            }
                        };
                    }
                    return !!dragAction;
                } else {
                    return false;
                }
            };

            const addCanvasEventListener = (type, listener) => {
                canvas.addEventListener(type, listener);
                cleanups.push(() => canvas.removeEventListener(type, listener));
            };

            const preventDefaultStopPropagation = e => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            };

            addCanvasEventListener("mousedown", (e) => {
                if ((e.which === 1) && startDrag(e, event => (event.which === 1) && event)) {
                    preventDefaultStopPropagation(e);
                }
            });

            addCanvasEventListener("mousemove", (e) => {
                if (currentDrag) {
                    currentDrag.onChange(e);
                    preventDefaultStopPropagation(e);
                } else {
                    if (deactivateActive) {
                        deactivateActive();
                    }
                    const handler = pickHandler(e);
                    if (handler) {
                        handler.setActivated(true);
                        deactivateActive = () => handler.setActivated(false);
                    } else {
                        deactivateActive = null;
                    }
                }
            });

            addCanvasEventListener("mouseup", (e) => {
                if (currentDrag) {
                    currentDrag.onChange(e);
                    currentDrag.cleanup();
                    // Calling preventDefaultStopPropagation would interfere with cameraControl
                    // by making it follow the pointer until next click
                    // preventDefaultStopPropagation(e);
                }
            });


            addCanvasEventListener("touchstart", event => {
                event.preventDefault();
                if (event.touches.length === 1)
                {
                    const touchStartId = event.touches[0].identifier;
                    if (startDrag(event, event => [...event.changedTouches].find(e => e.identifier === touchStartId))) {
                        preventDefaultStopPropagation(event);
                    }
                }
            });

            addCanvasEventListener("touchmove", event => {
                if (currentDrag) {
                    currentDrag.onChange(event);
                    preventDefaultStopPropagation(event);
                }
            });

            addCanvasEventListener("touchend",  event => {
                if (currentDrag) {
                    currentDrag.onChange(event);
                    currentDrag.cleanup();
                    // See the comment in mouseup listener
                    // preventDefaultStopPropagation(e);
                }
            });
        }

        this.__destroy = () => {
            cleanups.forEach(c => c());
            rootNode.destroy();
            for (let id in handlers) {
                delete handlers[id];
            }
        };
    }

    destroy() {
        this.__destroy();
    }

    /**
     * Called to assign this Control to Handlers.
     * Call with a null or undefined value to disconnect the Control from whatever Handlers it was assigned to.
     * @private
     */
    setHandlers(handlers) {
        Object.values(this._displayMeshes).forEach(m => m.visible = !!handlers);
        this._handlers = handlers;
        this._displayMeshes.x.setPositionActive(handlers && handlers.onPosition);
        this._displayMeshes.y.setPositionActive(handlers && handlers.onPosition);
        this._displayMeshes.z.setPositionActive(handlers && handlers.onPosition);
        this._displayMeshes.x.setRotationActive(handlers && handlers.onQuaternion);
        this._displayMeshes.y.setRotationActive(handlers && handlers.onQuaternion);
        this._displayMeshes.z.setRotationActive(handlers && handlers.onQuaternion);
    }

    /**
     * Sets the World-space position of this Control.
     *
     * @param {Number[]} value New position.
     */
    setPosition(p) {
        this._setPosition(p);
    }

    /**
     * Sets the quaternion of this Control.
     *
     * @param {Number[]} value New quaternion.
     */
    setQuaternion(q) {
        this._setQuaternion(q);
    }
}

export {TransformControl};
