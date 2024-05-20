import {Plugin} from "../../viewer/Plugin.js";
import {Component} from "../../viewer/scene/Component.js";
import {buildBoxGeometry} from "../../viewer/scene/geometry/builders/buildBoxGeometry.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {Marker} from "../../viewer/scene/marker/Marker.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {math} from "../../viewer/scene/math/math.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";

const hex2rgb = function(color) {
    const rgb = idx => parseInt(color.substr(idx + 1, 2), 16) / 255;
    return [ rgb(0), rgb(2), rgb(4) ];
};

const triangulateEarClipping = function(planeCoords) {

    const polygonVertices = [ ];
    for (let i = 0; i < planeCoords.length; ++i)
        polygonVertices.push(i);

    const isCCW = (function() {
        const ba = math.vec2();
        const bc = math.vec2();

        let anglesSum = 0;
        const angles = [ ];

        for (let i = 0; i < polygonVertices.length; ++i)
        {
            const a = planeCoords[polygonVertices[i]];
            const b = planeCoords[polygonVertices[(i + 1) % polygonVertices.length]];
            const c = planeCoords[polygonVertices[(i + 2) % polygonVertices.length]];

            math.subVec2(a, b, ba);
            math.subVec2(c, b, bc);

            const theta = math.dotVec2(ba, bc) / Math.sqrt(math.sqLenVec2(ba) * math.sqLenVec2(bc));
            const angle = Math.acos(Math.max(-1, Math.min(theta, 1)));
            const convex = (ba[0] * bc[1] - ba[1] * bc[0]) >= 0;
            anglesSum += convex ? angle : (2 * Math.PI - angle);
        }

        return anglesSum < (polygonVertices.length * Math.PI);
    })();

    const pointInTriangle = (function() {
        const sign = (p1, p2, p3) => {
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
        };

        return (pt, v1, v2, v3) => {
            const d1 = sign(pt, v1, v2);
            const d2 = sign(pt, v2, v3);
            const d3 = sign(pt, v3, v1);

            const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
            const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

            return !(has_neg && has_pos);
        };
    })();

    const baseTriangles = [ ];

    const vertices = (isCCW ? polygonVertices : polygonVertices.slice(0).reverse()).map(i => ({ idx: i }));
    vertices.forEach((v, i) => {
        v.prev = vertices[(i - 1 + vertices.length) % vertices.length];
        v.next = vertices[(i + 1)                   % vertices.length];
    });

    const ba = math.vec2();
    const bc = math.vec2();

    while (vertices.length > 2) {
        let earIdx = 0;
        while (true) {
            if (earIdx >= vertices.length)
            {
                throw `isCCW = ${isCCW}; earIdx = ${earIdx}; len = ${vertices.length}`;
            }
            const v = vertices[earIdx];

            const a = planeCoords[v.prev.idx];
            const b = planeCoords[v.idx];
            const c = planeCoords[v.next.idx];

            math.subVec2(a, b, ba);
            math.subVec2(c, b, bc);

            if (((ba[0] * bc[1] - ba[1] * bc[0]) >= 0) // a convex vertex
                &&
                vertices.every( // no other vertices inside
                    vv => ((vv === v)
                           ||
                           (vv === v.prev)
                           ||
                           (vv === v.next)
                           ||
                           !pointInTriangle(planeCoords[vv.idx], a, b, c))))
                break;
            ++earIdx;
        }

        const ear = vertices[earIdx];
        vertices.splice(earIdx, 1);

        baseTriangles.push([ ear.idx, ear.next.idx, ear.prev.idx ]);

        const prev = ear.prev;
        prev.next = ear.next;
        const next = ear.next;
        next.prev = ear.prev;
    }

    return [ planeCoords, baseTriangles ];
};

const marker3D = function(scene, color) {
    const canvas = scene.canvas.canvas;
    const getTop  = el => el.offsetTop  + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent)  : 0);
    const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);

    const markerDiv = document.createElement("div");
    canvas.parentNode.insertBefore(markerDiv, canvas);

    let size = 5;
    markerDiv.style.background = color;
    markerDiv.style.border = "2px solid white";
    markerDiv.style.margin = "0 0";
    markerDiv.style.zIndex = "100";
    markerDiv.style.position = "absolute";
    markerDiv.style.pointerEvents = "none";
    markerDiv.style.display = "none";

    const marker = new Marker(scene, {});

    const px = x => x + "px";
    const update = function() {
        const canvasPos = marker.canvasPos;
        markerDiv.style.left = px(getLeft(canvas) + canvasPos[0] - 3 - size / 2);
        markerDiv.style.top  = px(getTop(canvas)  + canvasPos[1] - 3 - size / 2);
        markerDiv.style.borderRadius = px(size * 2);
        markerDiv.style.width  = px(size);
        markerDiv.style.height = px(size);
    };
    const onViewMatrix = scene.camera.on("viewMatrix", update);
    const onProjMatrix = scene.camera.on("projMatrix", update);

    return {
        update: function(worldPos) {
            if (worldPos)
            {
                marker.worldPos = worldPos;
                update();
            }
            markerDiv.style.display = worldPos ? "" : "none";
        },

        setHighlighted: function(h) {
            size = h ? 10 : 5;
            update();
        },

        getCanvasPos: () => {
            const canvasPos = marker.canvasPos;
            return math.vec2([ getLeft(canvas) + canvasPos[0], getTop(canvas) + canvasPos[1] ]);
        },

        getWorldPos: () => marker.worldPos,

        destroy: function() {
            markerDiv.parentNode.removeChild(markerDiv);
            scene.camera.off(onViewMatrix);
            scene.camera.off(onProjMatrix);
            marker.destroy();
        }
    };
};

import {Wire} from "../lib/html/Wire.js";

const wire3D = function(scene, color, startWorldPos) {
    const canvas = scene.canvas.canvas;
    const getTop  = el => el.offsetTop  + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent)  : 0);
    const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);


    const startMarker = new Marker(scene, {});
    startMarker.worldPos = startWorldPos;
    const endMarker = new Marker(scene, {});
    const wire = new Wire(canvas.ownerDocument.body, {
        color: color,
        thickness: 1,
        thicknessClickable: 6
    });
    wire.setVisible(false);

    const updatePos = function() {
        const p0 = startMarker.canvasPos;
        const p1 = endMarker.canvasPos;
        const l = getLeft(canvas);
        const t = getTop(canvas);
        wire.setStartAndEnd(l + p0[0], t + p0[1], l + p1[0], t + p1[1]);
    };
    const onViewMatrix = scene.camera.on("viewMatrix", updatePos);
    const onProjMatrix = scene.camera.on("projMatrix", updatePos);

    return {
        update: function(endWorldPos) {
            if (endWorldPos)
            {
                endMarker.worldPos = endWorldPos;
                updatePos();
            }
            wire.setVisible(!!endWorldPos);
        },

        destroy: function() {
            scene.camera.off(onViewMatrix);
            scene.camera.off(onProjMatrix);
            startMarker.destroy();
            endMarker.destroy();
            wire.destroy();
        }
    };
};

const basePolygon3D = function(scene, color, alpha) {
    let mesh = null;

    const updateBase = points => {
        if (points)
        {
            if (mesh)
            {
                mesh.destroy();
            }

            try {
                const [ baseVertices, baseTriangles ] = triangulateEarClipping(points.map(p => [ p[0], p[2] ]));

                const positions = [ ].concat(...baseVertices.map(p => [p[0], points[0][1], p[1]])); // To convert from Float64Array into an Array
                const ind = [ ].concat(...baseTriangles);
                mesh = new Mesh(scene, {
                    pickable: false, // otherwise there's a WebGL error inside PickMeshRenderer.prototype.drawMesh
                    geometry: new ReadableGeometry(
                        scene,
                        {
                            positions: positions,
                            indices:   ind,
                            normals:   math.buildNormals(positions, ind)
                        }),
                    material: new PhongMaterial(scene, {
                        alpha: (alpha !== undefined) ? alpha : 0.5,
                        backfaces: true,
                        diffuse: hex2rgb(color)
                    })
                });
            } catch (e) {
                mesh = null;
            }
        }

        if (mesh)
        {
            mesh.visible = !!points;
        }
    };
    updateBase(null);

    return {
        updateBase: updateBase,
        destroy: () => mesh && mesh.destroy()
    };
};

const startAAZoneCreateUI = function(scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, pointerLens, zonesPlugin, select3dPoint, onZoneCreated) {
    const marker1 = marker3D(scene, zoneColor);
    const marker2 = marker3D(scene, zoneColor);
    const basePolygon = basePolygon3D(scene, zoneColor, zoneAlpha);

    const updatePointerLens = (pointerLens
                               ? function(canvasPos) {
                                   pointerLens.visible = !! canvasPos;
                                   if (canvasPos)
                                   {
                                       pointerLens.canvasPos = canvasPos;
                                   }
                               }
                               : () => { });

    let deactivatePointSelection = select3dPoint(
        () => {
            updatePointerLens(null);
            marker1.update(null);
        },
        (canvasPos, worldPos) => {
            updatePointerLens(canvasPos);
            marker1.update(worldPos);
        },
        function(point1CanvasPos, point1WorldPos) {
            marker1.update(point1WorldPos);

            deactivatePointSelection = select3dPoint(
                function() {
                    updatePointerLens(null);
                    marker2.update(null);
                    basePolygon.updateBase(null);
                },
                function(canvasPos, point2WorldPos) {
                    updatePointerLens(canvasPos);
                    marker2.update(point2WorldPos);

                    if (math.distVec3(point1WorldPos, point2WorldPos) > 0.01)
                    {
                        const min = (idx) => Math.min(point1WorldPos[idx], point2WorldPos[idx]);
                        const max = (idx) => Math.max(point1WorldPos[idx], point2WorldPos[idx]);

                        const xmin = min(0);
                        const ymin = min(1);
                        const zmin = min(2);
                        const xmax = max(0);
                        const ymax = max(1);
                        const zmax = max(2);

                        basePolygon.updateBase([ [ xmin, ymin, zmax ], [ xmax, ymin, zmax ],
                                                 [ xmax, ymin, zmin ], [ xmin, ymin, zmin ] ]);
                    }
                    else
                        basePolygon.updateBase(null);
                },
                function(point2CanvasPos, point2WorldPos) {
                    // `marker2.update' makes sure marker's position has been updated from its default [0,0,0]
                    // This works around an unidentified bug somewhere around OcclusionLayer, that causes error
                    // [.WebGL-0x13400c47e00] GL_INVALID_OPERATION: Vertex buffer is not big enough for the draw call
                    marker2.update(point2WorldPos);

                    marker1.destroy();
                    marker2.destroy();
                    basePolygon.destroy();
                    updatePointerLens(null);

                    const min = (idx) => Math.min(point1WorldPos[idx], point2WorldPos[idx]);
                    const max = (idx) => Math.max(point1WorldPos[idx], point2WorldPos[idx]);

                    const xmin = min(0);
                    const zmin = min(2);
                    const xmax = max(0);
                    const zmax = max(2);

                    const zone = zonesPlugin.createZone(
                        {
                            id: math.createUUID(),
                            geometry: {
                                planeCoordinates: [
                                    [ xmin, zmax ],
                                    [ xmax, zmax ],
                                    [ xmax, zmin ],
                                    [ xmin, zmin ]
                                ],
                                altitude: zoneAltitude,
                                height: zoneHeight
                            },
                            alpha: zoneAlpha,
                            color: zoneColor
                        });

                    onZoneCreated(zone);
                });
        });

    return {
        deactivate: function() {
            deactivatePointSelection();
            marker1.destroy();
            marker2.destroy();
            basePolygon.destroy();
            updatePointerLens(null);
        }
    };
};

const mousePointSelector = function(viewer, ray2WorldPos) {
    return function(onCancel, onChange, onCommit) {
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;
        const moveTolerance = 20;

        const getTop  = el => el.offsetTop  + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent)  : 0);
        const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);

        const copyCanvasPos = (event, vec2) => {
            const rect = event.target.getBoundingClientRect();
            vec2[0] = event.clientX - rect.left;
            vec2[1] = event.clientY - rect.top;
            return vec2;
        };

        const pickWorldPos = canvasPos => {
            const origin = math.vec3();
            const direction = math.vec3();
            math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, canvasPos, origin, direction);
            return ray2WorldPos(origin, direction);
        };

        let buttonDown = false;
        const resetAction = function() {
            buttonDown = false;
        };

        const cleanup = function() {
            resetAction();
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mousemove", onMouseMove);
            viewer.cameraControl.off(onCameraControlRayMove);
            canvas.removeEventListener("mouseup", onMouseUp);
        };

        const startCanvasPos = math.vec2();
        const onMouseDown = function(event) {
            if (event.which === 1)
            {
                copyCanvasPos(event, startCanvasPos);
                buttonDown = true;
            }
        };
        canvas.addEventListener("mousedown", onMouseDown);

        const onMouseMove = function(event) {
            const canvasPos = copyCanvasPos(event, math.vec2());
            if (buttonDown && math.distVec2(startCanvasPos, canvasPos) > moveTolerance)
            {
                resetAction();
                onCancel();
            }
        };
        canvas.addEventListener("mousemove", onMouseMove);

        const onCameraControlRayMove = viewer.cameraControl.on(
            "rayMove",
            event => {
                const canvasPos = event.canvasPos;
                onChange(canvasPos, pickWorldPos(canvasPos));
            });

        const onMouseUp = function(event) {
            if ((event.which === 1) && buttonDown)
            {
                cleanup();
                const canvasPos = copyCanvasPos(event, math.vec2());
                onCommit(canvasPos, pickWorldPos(canvasPos));
            }
        };
        canvas.addEventListener("mouseup", onMouseUp);

        return cleanup;
    };
};

const touchPointSelector = function(viewer, pointerCircle, ray2WorldPos) {
    return function(onCancel, onChange, onCommit) {
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;
        const longTouchTimeoutMs = 300;
        const moveTolerance = 20;

        const getTop  = el => el.offsetTop  + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent)  : 0);
        const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);

        const copyCanvasPos = (event, vec2) => {
            const rect = event.target.getBoundingClientRect();
            vec2[0] = event.clientX - rect.left;
            vec2[1] = event.clientY - rect.top;
            return vec2;
        };

        const pickWorldPos = canvasPos => {
            const origin = math.vec3();
            const direction = math.vec3();
            math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, canvasPos, origin, direction);
            return ray2WorldPos(origin, direction);
        };

        let longTouchTimeout = null;
        const nop = () => { };
        let onSingleTouchMove = nop;
        let startTouchIdentifier;

        const resetAction = function() {
            pointerCircle.stop();
            clearTimeout(longTouchTimeout);
            viewer.cameraControl.active = true;
            onSingleTouchMove = nop;
            startTouchIdentifier = null;
        };

        const cleanup = function() {
            resetAction();
            canvas.removeEventListener("touchstart", onCanvasTouchStart);
            canvas.removeEventListener("touchmove",  onCanvasTouchMove);
            canvas.removeEventListener("touchend",   onCanvasTouchEnd);
        };

        const onCanvasTouchStart = function(event) {
            const touches = event.touches;

            if (touches.length !== 1)
            {
                resetAction();
                onCancel();
            }
            else
            {
                const startTouch = touches[0];
                const startCanvasPos = copyCanvasPos(startTouch, math.vec2());

                const startWorldPos = pickWorldPos(startCanvasPos);
                if (startWorldPos)
                {
                    startTouchIdentifier = startTouch.identifier;

                    onSingleTouchMove = canvasPos => {
                        if (math.distVec2(startCanvasPos, canvasPos) > moveTolerance)
                        {
                            resetAction();
                        }
                    };

                    longTouchTimeout = setTimeout(
                        function() {
                            pointerCircle.start(
                                math.vec2([
                                    startCanvasPos[0] + getLeft(canvas),
                                    startCanvasPos[1] + getTop(canvas)
                                ]));

                            longTouchTimeout = setTimeout(
                                function() {
                                    pointerCircle.stop();

                                    viewer.cameraControl.active = false;

                                    onSingleTouchMove = canvasPos => {
                                        onChange(canvasPos, pickWorldPos(canvasPos));
                                    };

                                    onSingleTouchMove(startCanvasPos);
                                },
                                longTouchTimeoutMs);
                        },
                        250);
                }
            }
        };
        canvas.addEventListener("touchstart", onCanvasTouchStart, {passive: true});

        // canvas.addEventListener("touchcancel", e => console.log("touchcancel", e), {passive: true});

        const onCanvasTouchMove = function(event) {
            const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
            if (touch)
            {
                onSingleTouchMove(copyCanvasPos(touch, math.vec2()));
            }
        };
        canvas.addEventListener("touchmove", onCanvasTouchMove, {passive: true});

        const onCanvasTouchEnd = function(event) {
            const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
            if (touch)
            {
                cleanup();
                const canvasPos = copyCanvasPos(touch, math.vec2());
                onCommit(canvasPos, pickWorldPos(canvasPos));
            }
        };
        canvas.addEventListener("touchend", onCanvasTouchEnd, {passive: true});

        return cleanup;
    };
};

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

/**
 * @desc Renders a transparent box between two 3D points.
 *
 * See {@link ZonesPlugin} for more info.
 */

class Zone extends Component {

    /**
     * @private
     */
    constructor(plugin, cfg = {}) {

        super(plugin.viewer.scene, cfg);

        /**
         * The {@link ZonesPlugin} that owns this Zone.
         * @type {ZonesPlugin}
         */
        this.plugin = plugin;

        this._container = cfg.container;
        if (!this._container) {
            throw "config missing: container";
        }

        this._eventSubs = {};

        const scene = this.plugin.viewer.scene;

        this._vp = new Float64Array(24);
        this._pp = new Float64Array(24);
        this._cp = new Float64Array(8);

        this._geometry = cfg.geometry;

        const onMouseOver = cfg.onMouseOver ? (event) => {
            cfg.onMouseOver(event, this);
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseover', event));
        } : null;

        const onMouseLeave = cfg.onMouseLeave ? (event) => {
            cfg.onMouseLeave(event, this);
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseleave', event));
        } : null;

        const onMouseDown = (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mousedown', event));
        } ;

        const onMouseUp =  (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseup', event));
        };

        const onMouseMove =  (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mousemove', event));
        };

        const onContextMenu = cfg.onContextMenu ? (event) => {
            cfg.onContextMenu(event, this);
        } : null;

        const onMouseWheel = (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new WheelEvent('wheel', event));
        };

        this._alpha = (("alpha" in cfg) && (cfg.alpha !== undefined)) ? cfg.alpha : 0.5;
        this.color = cfg.color;

        this._visible = true;

        this._rebuildMesh();
    }

    _rebuildMesh() {
        const scene       = this.plugin.viewer.scene;
        const planeCoords = this._geometry.planeCoordinates.slice();
        const downward    = this._geometry.height < 0;
        const altitude    = this._geometry.altitude + (downward ? this._geometry.height : 0);
        const height      = this._geometry.height * (downward ? -1 : 1);

        const [ baseVertices, baseTriangles ] = triangulateEarClipping(planeCoords); // TODO: prevent crossing edges

        const pos = [ ];
        const ind = [ ];


        const addPlane = (isCeiling) => {
            const baseIdx = pos.length;

            for (let c of baseVertices) {
                pos.push([ c[0], altitude + (isCeiling ? height : 0), c[1] ]);
            }

            for (let t of baseTriangles) {
                ind.push(...(isCeiling ? t : t.slice(0).reverse()).map(i => i + baseIdx));
            }
        };
        addPlane(false);        // floor
        addPlane(true);         // ceiling


        // sides
        for (let i = 0; i < baseVertices.length; ++i) {
            const a = baseVertices[i];
            const b = baseVertices[(i+1) % baseVertices.length];
            const f = altitude;
            const c = altitude + height;

            const baseIdx = pos.length;

            pos.push(
                [ a[0], f, a[1] ],
                [ b[0], f, b[1] ],
                [ b[0], c, b[1] ],
                [ a[0], c, a[1] ]
            );

            ind.push(...[ 0, 1, 2, 0, 2, 3 ].map(i => i + baseIdx));
        }


        if (this._zoneMesh) {
            this._zoneMesh.destroy();
        }


        const positions = [].concat(...pos);
        this._zoneMesh = new Mesh(scene, {
            geometry: new ReadableGeometry(
                scene,
                {
                    positions: positions,
                    indices:   ind,
                    normals:   math.buildNormals(positions, ind)
                }),
            material: new PhongMaterial(scene, {
                alpha: this._alpha,
                backfaces: true,
                diffuse: hex2rgb(this._color)
            }),
            visible: this._visible
        });
        this._zoneMesh.highlighted = this._highlighted;

        this._zoneMesh.zone = this;


        const min = idx => Math.min(...pos.map(p => p[idx]));
        const max = idx => Math.max(...pos.map(p => p[idx]));

        const xmin = min(0);
        const ymin = min(1);
        const zmin = min(2);
        const xmax = max(0);
        const ymax = max(1);
        const zmax = max(2);

        this._wp = new Float64Array([
            xmin, ymin, zmin, 1.0,
            xmax, ymin, zmin, 1.0,
            xmax, ymax, zmin, 1.0,
            xmax, ymax, zmax, 1.0
        ]);

        this._center = math.vec3([ (xmin + xmax) / 2, (ymin + ymax) / 2, (zmin + zmax) / 2 ]);
    }

    get center() {
        return this._center;
    }

    get altitude() {
        return this._geometry.altitude;
    }

    set altitude(value) {
        this._geometry.altitude = value;
        this._rebuildMesh();
    }

    get height() {
        return this._geometry.height;
    }

    set height(value) {
        this._geometry.height = value;
        this._rebuildMesh();
    }

    get highlighted() {
        return this._highlighted;
    }

    set highlighted(value)
    {
        this._highlighted = value;
        if (this._zoneMesh) {
            this._zoneMesh.highlighted = value;
        }
    }

    set color(value) {
        this._color = value;
        if (this._zoneMesh) {
            this._zoneMesh.material.diffuse = hex2rgb(this._color);
        }
    }

    get color() {
        return this._color;
    }

    set alpha(value) {
        this._alpha = value;
        if (this._zoneMesh) {
            this._zoneMesh.material.alpha = this._alpha;
        }
    }

    get alpha() {
        return this._alpha;
    }

    /**
     * Sets whether this Zone is visible or not.
     *
     * @type {Boolean}
     */
    set visible(value) {
        this._visible = !!value;
        this._zoneMesh.visible = this._visible;
        this._needUpdate();
    }

    /**
     * Gets whether this Zone is visible or not.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._visible;
    }

    /**
     * Gets this Zone as JSON.
     *
     * @returns {JSON}
     */

    getJSON() {
        return {
            id: this.id,
            geometry: this._geometry,
            color: this._color
        };
    }

    /**
     * @private
     */
    destroy() {
        this._zoneMesh.destroy();
        super.destroy();
    }
}

/**
 * Creates {@link Zone}s in a {@link ZonesPlugin} from mouse input.
 *
 * ## Usage
 *
 * [[Run example](/examples/measurement/#distance_createWithMouse_snapping)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, ZonesPlugin, ZonesMouseControl} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.039];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "Duplex.xkt"
 * });
 *
 * const zones = new ZonesPlugin(viewer);
 *
 * const zonesControl  = new ZonesMouseControl(Zones)
 * ````
 */
class ZonesMouseControl extends Component {

    /**
     * Creates a ZonesMouseControl bound to the given ZonesPlugin.
     *
     * @param {ZonesPlugin} zonesPlugin The ZonesPlugin to control.
     * @param [cfg] Configuration
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor when snapping is enabled.
     */
    constructor(zonesPlugin, cfg = {}) {
        super(zonesPlugin.viewer.scene);

        this.zonesPlugin = zonesPlugin;
        this.pointerLens = cfg.pointerLens;
        this._deactivate = null;
    }

    get active() {
        return !! this._deactivate;
    }

    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._deactivate) {
            return;
        }

        const zonesPlugin = this.zonesPlugin;
        const viewer = zonesPlugin.viewer;
        const scene = viewer.scene;
        const self = this;

        const select3dPoint = mousePointSelector(
            viewer,
            function(origin, direction) {
                return planeIntersect(zoneAltitude, math.vec3([ 0, 1, 0 ]), origin, direction);
            });

        (function rec() {
            self._deactivate = startAAZoneCreateUI(
                scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, self.pointerLens, zonesPlugin, select3dPoint,
                zone => {
                    let reactivate = true;
                    self._deactivate = () => { reactivate = false; };
                    self.fire("zoneEnd", zone);
                    if (reactivate)
                    {
                        rec();
                    }
                }).deactivate;
        })();
    }

    deactivate() {
        if (this._deactivate)
        {
            this._deactivate();
            this._deactivate = null;
        }
    }

    /**
     * Destroys this ZonesMouseControl.
     *
     * Destroys any {@link Zone} under construction by this ZonesMouseControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}

/**
 * ZonesPlugin documentation to be added, mostly compatible with DistanceMeasurementsPlugin.
 */
class ZonesPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg]  Plugin configuration.
     * @param {String} [cfg.id="Zones"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {HTMLElement} [cfg.container] Container DOM element for markers and labels. Defaults to ````document.body````.
     * @param {string} [cfg.defaultColor=#00BBFF] The default color of the length dots, wire and label.
     * @param {number} [cfg.zIndex] If set, the wires, dots and labels will have this zIndex (+1 for dots and +2 for labels).
     * @param {PointerCircle} [cfg.pointerLens] A PointerLens to help the user position the pointer. This can be shared with other plugins.
     */
    constructor(viewer, cfg = {}) {

        super("Zones", viewer);

        this._pointerLens = cfg.pointerLens;

        this._container = cfg.container || document.body;

        this._zones = [ ];

        this.defaultColor = cfg.defaultColor !== undefined ? cfg.defaultColor : "#00BBFF";
        this.zIndex = cfg.zIndex || 10000;

        this._onMouseOver = (event, zone) => {
            this.fire("mouseOver", {
                plugin: this,
                zone,
                event
            });
        };

        this._onMouseLeave = (event, zone) => {
            this.fire("mouseLeave", {
                plugin: this,
                zone,
                event
            });
        };

        this._onContextMenu = (event, zone) => {
            this.fire("contextMenu", {
                plugin: this,
                zone,
                event
            });
        };
    }

    /**
     * Creates a {@link Zone}.
     *
     * The Zone is then registered by {@link Zone#id} in {@link ZonesPlugin#zones}.
     *
     * @param {Object} params {@link Zone} configuration.
     * @param {String} params.id Unique ID to assign to {@link Zone#id}. The Zone will be registered by this in {@link ZonesPlugin#zones} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
     * @param {Number[]} params.origin.worldPos Origin World-space 3D position.
     * @param {Entity} params.origin.entity Origin Entity.
     * @param {Number[]} params.target.worldPos Target World-space 3D position.
     * @param {Entity} params.target.entity Target Entity.
     * @param {string} [params.color] The color of the length dot, wire and label.
     * @returns {Zone} The new {@link Zone}.
     */
    createZone(params = {}) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer scene component with this ID already exists: " + params.id);
            delete params.id;
        }

        const zone = new Zone(this, {
            id: params.id,
            plugin: this,
            container: this._container,
            geometry: params.geometry,
            alpha: params.alpha,
            color: params.color,
            onMouseOver: this._onMouseOver,
            onMouseLeave: this._onMouseLeave,
            onContextMenu: this._onContextMenu
        });
        this._zones.push(zone);
        zone.on("destroyed", () => {
            const idx = this._zones.indexOf(zone);
            if (idx >= 0) {
                this._zones.splice(idx, 1);
            }
        });
        this.fire("zoneCreated", zone);
        return zone;
    }

    /**
     * Gets the existing {@link Zone}s, each mapped to its {@link Zone#id}.
     *
     * @type {{String:Zone}}
     */
    get zones() {
        return this._zones;
    }

    /**
     * Destroys this ZonesPlugin.
     *
     * Destroys all {@link Zone}s first.
     */
    destroy() {
        super.destroy();
    }
}

import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";

export class ZonesTouchControl extends Component {

    constructor(zonesPlugin, cfg = {}) {
        super(zonesPlugin.viewer.scene);

        this.zonesPlugin = zonesPlugin;
        this.pointerLens = cfg.pointerLens;
        this.pointerCircle = new PointerCircle(zonesPlugin.viewer);
        this._deactivate = null;
    }

    get active() {
        return !! this._deactivate;
    }

    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._deactivate) {
            return;
        }

        const zonesPlugin = this.zonesPlugin;
        const viewer = zonesPlugin.viewer;
        const scene = viewer.scene;
        const self = this;

        const select3dPoint = touchPointSelector(
            viewer,
            this.pointerCircle,
            function(origin, direction) {
                return planeIntersect(zoneAltitude, math.vec3([ 0, 1, 0 ]), origin, direction);
            });

        (function rec() {
            self._deactivate = startAAZoneCreateUI(
                scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, self.pointerLens, zonesPlugin, select3dPoint,
                zone => {
                    let reactivate = true;
                    self._deactivate = () => { reactivate = false; };
                    self.fire("zoneEnd", zone);
                    if (reactivate)
                    {
                        rec();
                    }
                }).deactivate;
        })();
    }

    deactivate() {
        if (this._deactivate)
        {
            this._deactivate();
            this._deactivate = null;
        }
    }

    destroy() {
        this.deactivate();
        super.destroy();
    }
}

const startPolysurfaceZoneCreateUI = function(scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, pointerLens, zonesPlugin, select3dPoint, onZoneCreated) {
    const updatePointerLens = (pointerLens
                               ? function(canvasPos) {
                                   pointerLens.visible = !! canvasPos;
                                   if (canvasPos)
                                   {
                                       pointerLens.canvasPos = canvasPos;
                                   }
                               }
                               : () => { });

    let deactivatePointSelection;
    const cleanups = [ () => updatePointerLens(null) ];

    const basePolygon = basePolygon3D(scene, zoneColor, zoneAlpha);
    cleanups.push(() => basePolygon.destroy());

    (function selectNextPoint(markers) {
        const marker = marker3D(scene, zoneColor);
        const wire = (markers.length > 0) && wire3D(scene, zoneColor, markers[markers.length - 1].getWorldPos());

        cleanups.push(() => {
            marker.destroy();
            wire && wire.destroy();
        });

        const firstMarker = (markers.length > 0) && markers[0];
        const getSnappedFirst = function(canvasPos) {
            const firstCanvasPos = firstMarker && firstMarker.getCanvasPos();
            const snapToFirst = firstCanvasPos && (math.distVec2(firstCanvasPos, canvasPos) < 10);
            return snapToFirst && { canvasPos: firstCanvasPos, worldPos: firstMarker.getWorldPos() };
        };

        const lastSegmentIntersects = (function() {
            const onSegment = (p, q, r) => ((q[0] <= Math.max(p[0], r[0])) &&
                                            (q[0] >= Math.min(p[0], r[0])) &&
                                            (q[1] <= Math.max(p[1], r[1])) &&
                                            (q[1] >= Math.min(p[1], r[1])));

            const orient = (p, q, r) => {
                const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
                // collinear
                // clockwise
                // counterclockwise
                return ((val === 0) ? 0 : ((val > 0) ? 1 : 2));
            };

            return function(pos2D, excludeFirstSegment) {
                const a = pos2D[pos2D.length - 2];
                const b = pos2D[pos2D.length - 1];

                for (let i = excludeFirstSegment ? 1 : 0; i < pos2D.length - 2 - 1; ++i)
                {
                    const c = pos2D[i];
                    const d = pos2D[i + 1];

                    const o1 = orient(a, b, c);
                    const o2 = orient(a, b, d);
                    const o3 = orient(c, d, a);
                    const o4 = orient(c, d, b);

                    if (((o1 !== o2) && (o3 !== o4))       || // General case
                        ((o1 === 0) && onSegment(a, c, b)) || // a, b and c are collinear and c lies on segment ab
                        ((o2 === 0) && onSegment(a, d, b)) || // a, b and d are collinear and d lies on segment ab
                        ((o3 === 0) && onSegment(c, a, d)) || // c, d and a are collinear and a lies on segment cd
                        ((o4 === 0) && onSegment(c, b, d)))   // c, d and b are collinear and b lies on segment cd
                    {
                        return true;
                    }
                }

                return false;
            };
        })();

        deactivatePointSelection = select3dPoint(
            () => {
                updatePointerLens(null);
                marker.update(null);
                wire && wire.update(null);
                basePolygon.updateBase((markers.length > 2) ? markers.map(m => m.getWorldPos()) : null);
            },
            (canvasPos, worldPos) => {
                const snappedFirst = (markers.length > 2) && getSnappedFirst(canvasPos);
                firstMarker && firstMarker.setHighlighted(!! snappedFirst);
                updatePointerLens(snappedFirst ? snappedFirst.canvasPos : canvasPos);
                marker.update((! snappedFirst) && worldPos);
                wire && wire.update(snappedFirst ? snappedFirst.worldPos : worldPos);
                if ((markers.length >= 2))
                {
                    const pos = markers.map(m => m.getWorldPos()).concat(snappedFirst ? [] : [worldPos]);
                    const inter = lastSegmentIntersects(pos.map(p => [ p[0], p[2] ]), snappedFirst);
                    basePolygon.updateBase(inter ? null : pos);
                }
                else
                    basePolygon.updateBase(null);
            },
            function(canvasPos, worldPos) {
                const snappedFirst = (markers.length > 2) && getSnappedFirst(canvasPos);
                const pos = markers.map(m => m.getWorldPos()).concat(snappedFirst ? [] : [worldPos]);
                basePolygon.updateBase(pos);
                const pos2D = pos.map(p => [ p[0], p[2] ]);
                if ((markers.length > 2) && lastSegmentIntersects(pos2D, snappedFirst))
                {
                    cleanups.pop()();
                    selectNextPoint(markers);
                }
                else if (snappedFirst)
                {
                    // `marker2.update' makes sure marker's position has been updated from its default [0,0,0]
                    // This works around an unidentified bug somewhere around OcclusionLayer, that causes error
                    // [.WebGL-0x13400c47e00] GL_INVALID_OPERATION: Vertex buffer is not big enough for the draw call
                    marker.update(worldPos);

                    cleanups.forEach(c => c());
                    onZoneCreated(
                        zonesPlugin.createZone(
                            {
                                id: math.createUUID(),
                                geometry: {
                                    planeCoordinates: pos2D,
                                    altitude: zoneAltitude,
                                    height: zoneHeight
                                },
                                alpha: zoneAlpha,
                                color: zoneColor
                            }));
                }
                else
                {
                    marker.update(worldPos);
                    wire && wire.update(worldPos);
                    selectNextPoint(markers.concat(marker));
                }
            });
    })([ ], null);

    return {
        closeSurface: function() {
            throw "TODO";
        },
        deactivate: function() {
            deactivatePointSelection();
            cleanups.forEach(c => c());
        }
    };
};

export class ZonesPolysurfaceMouseControl extends Component {

    constructor(zonesPlugin, cfg = {}) {
        super(zonesPlugin.viewer.scene);

        this.zonesPlugin = zonesPlugin;
        this.pointerLens = cfg.pointerLens;
        this._action = null;
    }

    get active() {
        return !! this._action;
    }

    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._action) {
            return;
        }

        const zonesPlugin = this.zonesPlugin;
        const viewer = zonesPlugin.viewer;
        const scene = viewer.scene;
        const self = this;

        const select3dPoint = mousePointSelector(
            viewer,
            function(origin, direction) {
                return planeIntersect(zoneAltitude, math.vec3([ 0, 1, 0 ]), origin, direction);
            });

        (function rec() {
            self._action = startPolysurfaceZoneCreateUI(
                scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, self.pointerLens, zonesPlugin, select3dPoint,
                zone => {
                    let reactivate = true;
                    self._action = { deactivate: () => { reactivate = false; } };
                    self.fire("zoneEnd", zone);
                    if (reactivate)
                    {
                        rec();
                    }
                });
        })();
    }

    deactivate() {
        if (this._action)
        {
            this._action.deactivate();
            this._action = null;
        }
    }

    destroy() {
        this.deactivate();
        super.destroy();
    }
}

export class ZonesPolysurfaceTouchControl extends Component {

    constructor(zonesPlugin, cfg = {}) {
        super(zonesPlugin.viewer.scene);

        this.zonesPlugin = zonesPlugin;
        this.pointerLens = cfg.pointerLens;
        this.pointerCircle = new PointerCircle(zonesPlugin.viewer);
        this._action = null;
    }

    get active() {
        return !! this._action;
    }

    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._action) {
            return;
        }

        const zonesPlugin = this.zonesPlugin;
        const viewer = zonesPlugin.viewer;
        const scene = viewer.scene;
        const self = this;

        const select3dPoint = touchPointSelector(
            viewer,
            this.pointerCircle,
            function(origin, direction) {
                return planeIntersect(zoneAltitude, math.vec3([ 0, 1, 0 ]), origin, direction);
            });

        (function rec() {
            self._action = startPolysurfaceZoneCreateUI(
                scene, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, self.pointerLens, zonesPlugin, select3dPoint,
                zone => {
                    let reactivate = true;
                    self._action = { deactivate: () => { reactivate = false; } };
                    self.fire("zoneEnd", zone);
                    if (reactivate)
                    {
                        rec();
                    }
                });
        })();
    }

    deactivate() {
        if (this._action)
        {
            this._action.deactivate();
            this._action = null;
        }
    }

    destroy() {
        this.deactivate();
        super.destroy();
    }
}


export {ZonesMouseControl}
export {ZonesPlugin}
