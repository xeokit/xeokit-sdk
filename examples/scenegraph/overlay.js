import { math, Mesh, PhongMaterial, ReadableGeometry, Texture } from "../../dist/xeokit-sdk.min.es.js";

const planeIntersect = function(p0, n, origin, direction) {
    const t = - (math.dotVec3(origin, n) - p0) / math.dotVec3(direction, n);
    if (false) // (t < 0)
    {
        return false;
    }
    else
    {
        const worldPos = math.vec3();
        math.mulVec3Scalar(direction, t, worldPos);
        math.addVec3(origin, worldPos, worldPos);
        return worldPos;
    }
};

const transformToNode = function(from, to, vec) {
    const fromRec = from.getBoundingClientRect();
    const toRec = to.getBoundingClientRect();
    vec[0] += fromRec.left - toRec.left;
    vec[1] += fromRec.top  - toRec.top;
};

import {Marker} from "../../src/viewer/scene/marker/Marker.js";
import {Dot} from "../../src/plugins/lib/html/Dot.js";

export const createOverlay = function(scene, src) {
    const tex = new Texture(scene, { src: src });

    const [ xmin, ymin, zmin, xmax, ymax, zmax ] = [ 0, 0, 0, 1, 0, 1 ];
    const positions = [ xmin, ymax, zmax, xmax, ymax, zmax, xmax, ymax, zmin, xmin, ymax, zmin ];
    const indices = [ 0, 1, 2, 0, 2, 3 ];

    return new Mesh(scene, {
        pickable: false,
        geometry: new ReadableGeometry(
            scene,
            {
                positions: positions,
                indices:   indices,
                normals:   math.buildNormals(positions, indices),
                uv: [ 0, 1, 1, 1, 1, 0, 0, 0 ]
            }),
        material: new PhongMaterial(scene, {
            alpha: 0.75,
            diffuse:  [0, 0, 0],
            ambient:  [0, 0, 0],
            specular: [0, 0, 0],
            diffuseMap:  tex,
            emissiveMap: tex,
            backfaces: true
        })
    });
};


export const setupOverlayAlignmentControl = function(viewer, overlay) {

    const scene = viewer.scene;

    const makeDot = (parentElement, color) => {
        const dot = new Dot(parentElement, { fillColor: color });
        const marker = new Marker(scene, { });

        const updateDotPos = () => {
            const pos = marker.canvasPos.slice();
            transformToNode(scene.canvas.canvas, parentElement, pos);
            dot.setPos(pos[0]-4, pos[1]-4);
        };

        marker.on("worldPos", updateDotPos);
        const onViewMatrix = scene.camera.on("viewMatrix", updateDotPos);
        const onProjMatrix = scene.camera.on("projMatrix", updateDotPos);

        return {
            setDotPos: maybeWorldPos => {
                dot.setVisible(maybeWorldPos);
                if (maybeWorldPos) {
                    marker.worldPos = maybeWorldPos;
                }
            },
            destroy: () => {
                scene.camera.off(onViewMatrix);
                scene.camera.off(onProjMatrix);
                marker.destroy();
                dot.destroy();
            }
        };
    };

    const canvas = scene.canvas.canvas;

    const canvasHandle = function(type, cb) {
        const callback = event => {
            event.preventDefault();
            cb(event);
        };
        canvas.addEventListener(type, callback);
        return () => canvas.removeEventListener(type, callback);
    };

    const copyCanvasPos = (event, vec2) => {
        vec2[0] = event.clientX;
        vec2[1] = event.clientY;
        transformToNode(canvas.ownerDocument.body, canvas, vec2);
        return vec2;
    };

    const canvasToRay = canvasPos => {
        const origin = math.vec3();
        const direction = math.vec3();
        math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, origin, direction);
        return { origin: origin, direction: direction };
    };

    let handler = null;
    canvasHandle("mousedown", event => handler && handler.mousedown(event));
    canvasHandle("mousemove", event => handler && handler.mousemove(event));
    canvasHandle("mouseup",   event => handler && handler.mouseup(event));

    const setupMovePress = (rayToMaybeWorldPos, onPos, onPress) => {
        (function reset() {
            handler = {
                mousedown: event => {
                    if (event.which === 1) {
                        const downCanvasPos = copyCanvasPos(event, math.vec2());

                        const downMaybeWorldPos = rayToMaybeWorldPos(canvasToRay(downCanvasPos));

                        if (downMaybeWorldPos) {
                            const withinTolerance = e => (math.distVec2(downCanvasPos, copyCanvasPos(e, math.vec2())) < 4);
                            let active = true;
                            handler = {
                                mousedown: () => {
                                    if (active) {
                                        active = false;
                                        if (! active) {
                                            onPos(null);
                                        }
                                    }
                                },
                                mousemove: event => {
                                    if (active) {
                                        active = withinTolerance(event);
                                        if (! active) {
                                            onPos(null);
                                        }
                                    }
                                },
                                mouseup: event => {
                                    handler = null;
                                    if (active && (event.which === 1) && withinTolerance(event)) {
                                        onPress(downMaybeWorldPos);
                                    } else {
                                        reset();
                                    }
                                }
                            };
                        }
                    }
                },
                mousemove: event => onPos(rayToMaybeWorldPos(canvasToRay(copyCanvasPos(event, math.vec2())))),
                mouseup: reset
            };
        })();
    };


    const setupPointMove = function(setDotPos, makeTransformGetter, onEnd) {
        setDotPos(null);

        setupMovePress(
            ray => {
                const pickResult = viewer.scene.pick({ pickSurface: true, origin: ray.origin, direction: ray.direction, includeEntities: [ overlay.id ] });
                return pickResult && pickResult.entity && pickResult.worldPos.slice();
            },
            setDotPos,
            initWorldPos => {
                setDotPos(null);

                const initOverlayMat = overlay.matrix.slice();
                const getTransform = makeTransformGetter(initWorldPos);
                const updateMeshTransform = worldPos => {
                    if (worldPos) {
                        overlay.matrix = math.mulMat4(getTransform(worldPos), initOverlayMat, math.mat4());
                    }
                };

                const p = math.mulMat4v4(initOverlayMat, [0,0,0,1]);
                const n = math.mulMat4v4(initOverlayMat, [0,1,0,0]);
                const p0 = math.dotVec4(n, p);

                setupMovePress(
                    ray => planeIntersect(p0, n, ray.origin, ray.direction),
                    updateMeshTransform,
                    commitWorldPos => {
                        updateMeshTransform(commitWorldPos || initOverlayMat);
                        onEnd(commitWorldPos);
                    });
            });
    };

    overlay.pickable = true;

    let stepRotation = false;

    (function initAdjustment() {
        const dotParentElement = canvas.ownerDocument.body;

        const getPlanePos = (function() {
            const m = overlay.matrix;
            const p4 = math.mulMat4v4(m, [0,0,0,1]);
            const p = math.vec3([ p4[0], p4[1], p4[2] ]);
            const n4 = math.mulMat4v4(m, [0,1,0,0]);
            const n = math.vec3([ n4[0], n4[1], n4[2] ]);
            const p0 = math.dotVec3(n, p);
            const tmp = math.vec3();
            return worldPos => {
                math.subVec3(worldPos, p, tmp);
                const s = math.dotVec3(tmp, n) / math.dotVec3(n, n);
                math.mulVec3Scalar(n, s, tmp);
                math.subVec3(worldPos, tmp, tmp);
                return tmp;
            };
        })();

        const pivotDot = makeDot(dotParentElement, "#00ffff");
        setupPointMove(
            pivotDot.setDotPos,
            function(initWorldPos) {
                return worldPos => {
                    const planePos = getPlanePos(worldPos);
                    math.subVec3(planePos, initWorldPos, planePos);
                    return math.translationMat4v(planePos, math.identityMat4());
                };
            },
            function(pivotWorldPos) {
                pivotDot.setDotPos(pivotWorldPos);

                const pivotWorldPosNeg = math.mulVec3Scalar(pivotWorldPos, -1, math.vec3());

                let rotateScaleDot = makeDot(dotParentElement, "#ffff00");
                setupPointMove(
                    rotateScaleDot.setDotPos,
                    function(initWorldPos) {
                        const initVec = math.subVec3(initWorldPos, pivotWorldPos, math.vec3());
                        return worldPos => {
                            const planePos = getPlanePos(worldPos);
                            const newPosVec = math.subVec3(planePos, pivotWorldPos, math.vec3());
                            const s = math.lenVec3(newPosVec) / math.lenVec3(initVec);
                            const scale = math.scalingMat4c(s, s, s, math.identityMat4());

                            const quat = math.vec3PairToQuaternion(initVec, newPosVec, math.vec4());

                            const angleAxis = math.quaternionToAngleAxis(quat, math.vec4());

                            const deg = angleAxis[3] * math.RADTODEG;
                            angleAxis[3] = (stepRotation ? (Math.round(deg / 9) * 9) : deg) * math.DEGTORAD;
                            math.angleAxisToQuaternion(angleAxis, quat);

                            return math.mulMat4(
                                math.translationMat4v(pivotWorldPos),
                                math.mulMat4(
                                    math.quaternionToMat4(quat, math.mat4()),
                                    math.mulMat4(scale, math.translationMat4v(pivotWorldPosNeg), math.mat4()),
                                    math.mat4()),
                                math.mat4());
                        };
                    },
                    () => {
                        pivotDot.destroy();
                        rotateScaleDot.destroy();
                        initAdjustment();
                    });
            });
    })();

    return {
        setStepRotation: v => stepRotation = v
    };
};

