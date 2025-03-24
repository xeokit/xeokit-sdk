import {Plugin} from "../../viewer/Plugin.js";
import {Component} from "../../viewer/scene/Component.js";
import {buildBoxGeometry} from "../../viewer/scene/geometry/builders/buildBoxGeometry.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {math} from "../../viewer/scene/math/math.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {activateDraggableDots, Dot3D, marker3D, wire3D, touchPointSelector, transformToNode, triangulateEarClipping} from "../../../src/plugins/lib/ui/index.js";

const hex2rgb = function(color) {
    const rgb = idx => parseInt(color.substr(idx + 1, 2), 16) / 255;
    return [ rgb(0), rgb(2), rgb(4) ];
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

const startAARectCreateUI = function(scene, markersColor, pointerLens, select3dPoint, withPoints, onPointsSelected) {
    const marker1 = marker3D(scene, markersColor);
    const marker2 = marker3D(scene, markersColor);

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
                    withPoints(null);
                },
                function(canvasPos, point2WorldPos) {
                    updatePointerLens(canvasPos);
                    marker2.update(point2WorldPos);
                    withPoints((math.distVec3(point1WorldPos, point2WorldPos) > 0.01)
                               &&
                               [ point1WorldPos, point2WorldPos ]);
                },
                function(point2CanvasPos, point2WorldPos) {
                    // `marker2.update' makes sure marker's position has been updated from its default [0,0,0]
                    // This works around an unidentified bug somewhere around OcclusionLayer, that causes error
                    // [.WebGL-0x13400c47e00] GL_INVALID_OPERATION: Vertex buffer is not big enough for the draw call
                    marker2.update(point2WorldPos);

                    marker1.destroy();
                    marker2.destroy();
                    updatePointerLens(null);

                    onPointsSelected([ point1WorldPos, point2WorldPos ]);
                });
        });

    return {
        deactivate: function() {
            deactivatePointSelection();
            marker1.destroy();
            marker2.destroy();
            updatePointerLens(null);
        }
    };
};

const mousePointSelector = function(viewer, ray2WorldPos) {
    return function(onCancel, onChange, onCommit) {
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;
        const moveTolerance = 20;

        const copyCanvasPos = (event, vec2) => {
            vec2[0] = event.clientX;
            vec2[1] = event.clientY;
            transformToNode(canvas.ownerDocument.documentElement, canvas, vec2);
            return vec2;
        };

        const pickWorldPos = canvasPos => {
            const origin = math.vec3();
            const direction = math.vec3();
            math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, origin, direction);
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

        const [ baseVertices, baseTriangles, isCCW ] = triangulateEarClipping(planeCoords); // TODO: prevent crossing edges

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
            const b = baseVertices[(baseVertices.length + i + (isCCW ? 1 : -1)) % baseVertices.length];
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


        const min = idx => Math.min(...pos.map(p => p[idx]));
        const max = idx => Math.max(...pos.map(p => p[idx]));

        const xmin = min(0);
        const ymin = min(1);
        const zmin = min(2);
        const xmax = max(0);
        const ymax = max(1);
        const zmax = max(2);

        this._center = math.vec3([ (xmin + xmax) / 2, (ymin + ymax) / 2, (zmin + zmax) / 2 ]);

        const positions = [].concat(...pos.map(p => math.subVec3(p, this._center, p)));
        this._zoneMesh = new Mesh(scene, {
            origin: this._center,
            edges: this._edges,
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

        {
            const u = math.vec2();
            const v = math.vec2();

            let baseArea = 0;

            for (let t of baseTriangles) {
                const p0 = baseVertices[t[0]];
                const p1 = baseVertices[t[1]];
                const p2 = baseVertices[t[2]];

                math.subVec2(p1, p0, u);
                math.subVec2(p2, p0, v);

                baseArea += Math.abs(u[0] * v[1] - u[1] * v[0]);
            }

            this._baseArea = baseArea / 2;
        }

        this._metrics = null;
    }

    get baseArea() {
        return this._baseArea;
    }

    get area() {
        return this._getMetrics().area;
    }

    get volume() {
        return this._getMetrics().volume;
    }

    _getMetrics() {
        if (this._metrics === null) {
            // Sum the volume of tetrahedrons formed by the origin and face triangles
            let volume = 0;
            let area = 0;
            const geo = this._zoneMesh.geometry;
            const pts = [ math.vec3(), math.vec3(), math.vec3() ];
            const tmpVec3 = math.vec3();
            for (let i = 0; i < geo.indices.length; i += 3) {
                for (let off = 0; off < 3; ++off) {
                    const p = pts[off];
                    const pIdx = 3 * geo.indices[i + off];
                    for (let c = 0; c < 3; ++c) {
                        p[c] = geo.positions[pIdx + c];
                    }
                }
                volume += math.dotVec3(pts[0], math.cross3Vec3(pts[1], pts[2], tmpVec3));
                math.subVec3(pts[1], pts[0], pts[1]);
                math.subVec3(pts[2], pts[0], pts[2]);
                area += math.lenVec3(math.cross3Vec3(pts[1], pts[2], tmpVec3));
            }

            this._metrics = {
                area: area / 2,
                volume: volume / 6
            };
        }
        return this._metrics;
    }

    sectionedAverage(sectionPlanes) {
        const planeCoords = this._geometry.planeCoordinates.slice();

        let faces = [ ];
        {
            const h = this._geometry.height;
            const a = this._geometry.altitude;
            const c = a + Math.max(0, h);
            const f = a + Math.min(0, h);

            const addPlane = (isCeiling) => {
                const face = planeCoords.map(p => [ p[0], isCeiling ? c : f, p[1] ]);
                faces.push(isCeiling ? face : face.slice(0).reverse());
            };
            addPlane(true);     // ceiling
            addPlane(false);    // floor

            // sides
            const p = (idx, y) => [ planeCoords[idx][0], y, planeCoords[idx][1] ];
            for (let i = 0; i < planeCoords.length; ++i)
            {
                const j = (i + 1) % planeCoords.length;
                faces.push([ p(i, f), p(j, f), p(j, c), p(i, c) ]);
            }
        }

        for (const s of sectionPlanes)
        {
            const dir = s.dir;
            const dist = s.dist;
            const newFaces = [ ];

            for (const face of faces)
            {
                const EPSILON = 1e-5;
                const COPLANAR = 0;
                const FRONT = 1;
                const BACK = 2;
                const SPANNING = 3;

                // Classify each point as well as the entire polygon into one of the above four classes.
                let polygonType = 0;
                const types = [ ];
                for (let i = 0; i < face.length; i++) {
                    const t = math.dotVec3(dir, face[i]) + dist;
                    const type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
                    polygonType |= type;
                    types.push(type);
                }

                // Put the polygon in the correct list, splitting it when necessary.
                switch (polygonType) {
                case COPLANAR:
                    newFaces.push(face);
                    break;
                case FRONT:
                    newFaces.push(face);
                    break;
                case BACK:
                    break;
                case SPANNING:
                    const f = [ ];
                    for (let i = 0; i < face.length; i++)
                    {
                        var j = (i + 1) % face.length;
                        const ti = types[i];
                        const tj = types[j];
                        const vi = face[i];
                        const vj = face[j];
                        if (ti !== BACK)
                        {
                            f.push(vi);
                        }

                        if ((ti | tj) === SPANNING)
                        {
                            const diff = math.vec3();
                            math.subVec3(vj, vi, diff);
                            const t = - (dist + math.dotVec3(dir, vi)) / math.dotVec3(dir, diff);
                            const v = [0,0,0];
                            math.lerpVec3(t, 0, 1, vi, vj, v);
                            f.push(v);
                        }
                    }
                    if (f.length >= 3)
                    {
                        newFaces.push(f);
                    }
                    break;
                }
            }

            faces = newFaces;
        }

        if (faces.length === 0)
        {
            return null;
        }
        else
        {
            const avg = math.vec3([ 0, 0, 0 ]);
            const unique = new Set();

            for (const f of faces)
            {
                for (const p of f)
                {
                    const id = p.map(x => x.toFixed(3)).join(":");
                    if (! (unique.has(id)))
                    {
                        unique.add(id);
                        math.addVec3(avg, p, avg);
                    }
                }
            }

            math.mulVec3Scalar(avg, 1 / unique.size, avg);

            return avg;
        }
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

    get edges() {
        return this._edges;
    }

    set edges(edges) {
        this._edges = edges;
        if (this._zoneMesh) {
            this._zoneMesh.edges = this._edges;
        }
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
            alpha: this._alpha,
            color: this._color
        };
    }

    duplicate() {
        return this.plugin.createZone(
            {
                id: math.createUUID(),
                geometry: {
                    planeCoordinates: this._geometry.planeCoordinates.map(c => c.slice()),
                    altitude: this._geometry.altitude,
                    height: this._geometry.height
                },
                alpha: this._alpha,
                color: this._color
            });
    }

    /**
     * @private
     */
    destroy() {
        this._zoneMesh.destroy();
        super.destroy();
    }
}

const createAAZoneFromPoints = function(pos1, pos2, zoneAltitude, zoneHeight, zoneColor, zoneAlpha, zonesPlugin) {

    const min = (idx) => Math.min(pos1[idx], pos2[idx]);
    const max = (idx) => Math.max(pos1[idx], pos2[idx]);

    const xmin = min(0);
    const zmin = min(2);
    const xmax = max(0);
    const zmax = max(2);

    return zonesPlugin.createZone(
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
};

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
class ZonesAAZoneControl extends Component {

    /**
     * Creates a ZonesMouseControl bound to the given ZonesPlugin.
     *
     * @param {ZonesPlugin} zonesPlugin The ZonesPlugin to control.
     * @param [cfg] Configuration
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor when snapping is enabled.
     */
    constructor(zonesPlugin, cfg, createSelect3dPoint) {
        super(zonesPlugin.viewer.scene);

        this.zonesPlugin = zonesPlugin;
        this.pointerLens = cfg.pointerLens;
        this.createSelect3dPoint = createSelect3dPoint;
        this._deactivate = null;
    }

    get active() {
        return !! this._deactivate;
    }

    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._deactivate) {
            return;
        }

        if (typeof(zoneAltitude) === "object" && (zoneAltitude !== null)) {
            const params = zoneAltitude;
            const param = (name, defaultValue) => {
                if (name in params) {
                    return params[name];
                } else if (defaultValue !== undefined) {
                    return defaultValue;
                } else {
                    throw "config missing: " + name;
                }
            };

            zoneAltitude = param("altitude");
            zoneHeight   = param("height");
            zoneColor    = param("color", "#008000");
            zoneAlpha    = param("alpha", 0.5);
        }

        const zonesPlugin = this.zonesPlugin;
        const viewer = zonesPlugin.viewer;
        const scene = viewer.scene;
        const self = this;

        const select3dPoint = this.createSelect3dPoint(viewer, (origin, direction) => planeIntersect(zoneAltitude, math.vec3([ 0, 1, 0 ]), origin, direction));

        (function rec() {
            const basePolygon = basePolygon3D(scene, zoneColor, zoneAlpha);
            const deactivate = startAARectCreateUI(
                scene, zoneColor, self.pointerLens, select3dPoint,
                points => {
                    if (points) {
                        const p0 = points[0];
                        const p1 = points[1];
                        const min = (idx) => Math.min(p0[idx], p1[idx]);
                        const max = (idx) => Math.max(p0[idx], p1[idx]);

                        const xmin = min(0);
                        const ymin = min(1);
                        const zmin = min(2);
                        const xmax = max(0);
                        const ymax = max(1);
                        const zmax = max(2);

                        basePolygon.updateBase([ [ xmin, ymin, zmax ], [ xmax, ymin, zmax ],
                                                 [ xmax, ymin, zmin ], [ xmin, ymin, zmin ] ]);
                    } else {
                        basePolygon.updateBase(null);
                    }
                },
                points => {
                    basePolygon.destroy();
                    const zone = createAAZoneFromPoints(points[0], points[1], zoneAltitude, zoneHeight, zoneColor, zoneAlpha, zonesPlugin);
                    let reactivate = true;
                    self._deactivate = () => { reactivate = false; };
                    self.fire("zoneEnd", zone);
                    if (reactivate)
                    {
                        rec();
                    }
                }).deactivate;
            self._deactivate = () => {
                deactivate();
                basePolygon.destroy();
            };
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

export class ZonesMouseControl extends ZonesAAZoneControl {
    constructor(zonesPlugin, cfg = {}) {
        super(
            zonesPlugin,
            cfg,
            (viewer, ray2WorldPos) => mousePointSelector(viewer, ray2WorldPos));
    }
}

import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";
export class ZonesTouchControl extends ZonesAAZoneControl {
    constructor(zonesPlugin, cfg = {}) {
        const pointerCircle = new PointerCircle(zonesPlugin.viewer);
        super(
            zonesPlugin,
            cfg,
            (viewer, ray2WorldPos) => touchPointSelector(viewer, pointerCircle, ray2WorldPos));
        this.pointerCircle = pointerCircle;
    }

    destroy() {
        this.pointerCircle.destroy();
        super.destroy();
    }
}

/**
 * ZonesPlugin documentation to be added, mostly compatible with DistanceMeasurementsPlugin.
 */
export class ZonesPlugin extends Plugin {

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
        const wire = (markers.length > 0) && wire3D(scene, zoneColor);
        const wireStart = wire && markers[markers.length - 1].getWorldPos();

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
                wire && wire.update(wireStart, null);
                basePolygon.updateBase((markers.length > 2) ? markers.map(m => m.getWorldPos()) : null);
            },
            (canvasPos, worldPos) => {
                const snappedFirst = (markers.length > 2) && getSnappedFirst(canvasPos);
                firstMarker && firstMarker.setHighlighted(!! snappedFirst);
                updatePointerLens(snappedFirst ? snappedFirst.canvasPos : canvasPos);
                marker.update((! snappedFirst) && worldPos);
                wire && wire.update(wireStart, snappedFirst ? snappedFirst.worldPos : worldPos);
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
                    wire && wire.update(wireStart, worldPos);
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

        if (typeof(zoneAltitude) === "object" && (zoneAltitude !== null)) {
            const params = zoneAltitude;
            const param = (name, defaultValue) => {
                if (name in params) {
                    return params[name];
                } else if (defaultValue !== undefined) {
                    return defaultValue;
                } else {
                    throw "config missing: " + name;
                }
            };

            zoneAltitude = param("altitude");
            zoneHeight   = param("height");
            zoneColor    = param("color", "#008000");
            zoneAlpha    = param("alpha", 0.5);
        }

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

        if (typeof(zoneAltitude) === "object" && (zoneAltitude !== null)) {
            const params = zoneAltitude;
            const param = (name, defaultValue) => {
                if (name in params) {
                    return params[name];
                } else if (defaultValue !== undefined) {
                    return defaultValue;
                } else {
                    throw "config missing: " + name;
                }
            };

            zoneAltitude = param("altitude");
            zoneHeight   = param("height");
            zoneColor    = param("color", "#008000");
            zoneAlpha    = param("alpha", 0.5);
        }

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

export class ZoneEditControl extends Component {
    constructor(zone, cfg, handleMouseEvents, handleTouchEvents) {
        const viewer = zone.plugin.viewer;
        const scene = viewer.scene;
        super(scene);

        const altitude = zone._geometry.altitude;

        const dots = zone._geometry.planeCoordinates.map(planeCoord => {
            const dotParent = scene.canvas.canvas.ownerDocument.body;
            const dot = new Dot3D(scene, {}, dotParent, { fillColor: zone._color });
            dot.worldPos = math.vec3([ planeCoord[0], altitude, planeCoord[1] ]);
            dot.on("worldPos", function() {
                planeCoord[0] = dot.worldPos[0];
                planeCoord[1] = dot.worldPos[2];
                try {
                    zone._rebuildMesh();
                } catch (e) {
                    if (zone._zoneMesh) {
                        zone._zoneMesh.destroy();
                        zone._zoneMesh = null;
                    }
                }
            });
            return dot;
        });

        const cleanupDrag = activateDraggableDots({
            viewer: viewer,
            handleMouseEvents: handleMouseEvents,
            handleTouchEvents: handleTouchEvents,
            pointerLens: cfg && cfg.pointerLens,
            dots: dots,
            ray2WorldPos: (orig, dir) => planeIntersect(altitude, math.vec3([ 0, 1, 0 ]), orig, dir),
            onEnd: (initPos, dot) => {
                if (zone._zoneMesh)
                {
                    this.fire("edited");
                }
                return !! zone._zoneMesh;
            }
        });

        const cleanup = function() {
            cleanupDrag();
            dots.forEach(d => d.destroy());
        };

        const destroyCb = zone.on("destroyed", cleanup);

        this._deactivate = function() {
            zone.off("destroyed", destroyCb);
            cleanup();
        };
    }

    deactivate() {
        this._deactivate();
        super.destroy();
    }
}

export class ZoneEditMouseControl extends ZoneEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, true, false);
    }
}

export class ZoneEditTouchControl extends ZoneEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, false, true);
    }
}


export class ZoneTranslateControl extends Component {
    constructor(zone, cfg, handleMouseEvents, handleTouchEvents) {
        const viewer = zone.plugin.viewer;
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;

        super(scene);
        const self = this;

        const altitude = zone._geometry.altitude;
        const pointerLens = cfg && cfg.pointerLens;
        const updatePointerLens = (pointerLens
                                   ? function(canvasPos) {
                                       pointerLens.visible = !! canvasPos;
                                       if (canvasPos)
                                       {
                                           pointerLens.canvasPos = canvasPos;
                                       }
                                   }
                                   : () => { });

        const ray2WorldPos = (orig, dir) => planeIntersect(altitude, math.vec3([ 0, 1, 0 ]), orig, dir);

        const pickWorldPos = canvasPos => {
            const origin = math.vec3();
            const direction = math.vec3();
            math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, origin, direction);
            return ray2WorldPos(origin, direction);
        };

        const copyCanvasPos = (event, vec2) => {
            vec2[0] = event.clientX;
            vec2[1] = event.clientY;
            transformToNode(canvas.ownerDocument.documentElement, canvas, vec2);
            return vec2;
        };

        const canvasHandle = function(type, cb) {
            const callback = event => {
                event.preventDefault();
                cb(event);
            };
            canvas.addEventListener(type, callback);
            return () => canvas.removeEventListener(type, callback);
        };

        let cleanupCurrentDrag = () => { };

        const startDrag = function(event, onMoveType, onEndType, matchesEvent) {
            const e = matchesEvent(event);
            const canvasPos = copyCanvasPos(e, math.vec2());
            const pickRecord = viewer.scene.pick({ canvasPos: canvasPos, includeEntities: [ zone._zoneMesh.id ] });
            const pickZone = pickRecord && pickRecord.entity && pickRecord.entity.zone;

            if (pickZone === zone)
            {
                cleanupCurrentDrag();

                canvas.style.cursor = "move";
                viewer.cameraControl.active = false;

                const onChange = (function() {
                    const initCoords = zone._geometry.planeCoordinates.map(c => c.slice());
                    const initWorldPos = pickWorldPos(canvasPos);
                    const initDragCoord = math.vec2([ initWorldPos[0], initWorldPos[2] ]);
                    const dPos = math.vec2();

                    return function(canvasPos) {
                        const worldPos = pickWorldPos(canvasPos);
                        dPos[0] = worldPos[0];
                        dPos[1] = worldPos[2];
                        math.subVec2(initDragCoord, dPos, dPos);

                        zone._geometry.planeCoordinates.forEach((planeCoord, idx) => {
                            math.subVec2(initCoords[idx], dPos, planeCoord);
                        });

                        try {
                            zone._rebuildMesh();
                        } catch (e) {
                            if (zone._zoneMesh) {
                                zone._zoneMesh.destroy();
                                zone._zoneMesh = null;
                            }
                        }
                    };
                })();

                const cleanupMove = canvasHandle(
                    onMoveType,
                    function(event) {
                        const e = matchesEvent(event);
                        if (e)
                        {
                            const canvasPos = copyCanvasPos(e, math.vec2());
                            onChange(canvasPos);
                            updatePointerLens(canvasPos);
                        }
                    });

                const cleanupEnd  = canvasHandle(
                    onEndType,
                    function(event) {
                        const e = matchesEvent(event);
                        if (e)
                        {
                            const canvasPos = copyCanvasPos(e, math.vec2());
                            onChange(canvasPos);
                            updatePointerLens(null);
                            cleanupCurrentDrag();
                            self.fire("translated");
                        }
                    });

                cleanupCurrentDrag = function() {
                    cleanupCurrentDrag = () => { };
                    canvas.style.cursor = "default";
                    viewer.cameraControl.active = true;
                    cleanupMove();
                    cleanupEnd();
                };
            }
        };

        const startDragCbs = [ ];

        if (handleMouseEvents) {
            startDragCbs.push(
                canvasHandle("mousedown", event => {
                    if (event.which === 1) {
                        startDrag(
                            event,
                            "mousemove",
                            "mouseup",
                            event => (event.which === 1) && event);
                    }
                }));
        }

        if (handleTouchEvents) {
            startDragCbs.push(
                canvasHandle("touchstart", event => {
                    if (event.touches.length === 1) {
                        const touchStartId = event.touches[0].identifier;
                        startDrag(
                            event,
                            "touchmove",
                            "touchend",
                            event => [...event.changedTouches].find(e => e.identifier === touchStartId));
                    }
                }));
        }

        const cleanup = function() {
            cleanupCurrentDrag();
            startDragCbs.forEach(cb => cb());
            updatePointerLens(null);
        };

        const destroyCb = zone.on("destroyed", cleanup);

        this._deactivate = function() {
            zone.off("destroyed", destroyCb);
            cleanup();
        };
    }

    deactivate() {
        this._deactivate();
        super.destroy();
    }
}

export class ZoneTranslateMouseControl extends ZoneTranslateControl {
    constructor(zone, cfg) {
        super(zone, cfg, true, false);
    }
}

export class ZoneTranslateTouchControl extends ZoneTranslateControl {
    constructor(zone, cfg) {
        super(zone, cfg, false, true);
    }
}
