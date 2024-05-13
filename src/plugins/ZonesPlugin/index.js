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

        const baseTriangles = [ [ 0, 1, 3 ], [ 1, 2, 3 ] ];

        const pos = [ ];
        const ind = [ ];


        const addPlane = (isCeiling) => {
            const baseIdx = pos.length;

            for (let c of planeCoords) {
                pos.push([ c[0], altitude + (isCeiling ? height : 0), c[1] ]);
            }

            for (let t of baseTriangles) {
                ind.push(...(isCeiling ? t : t.slice(0).reverse()).map(i => i + baseIdx));
            }
        };
        addPlane(false);        // floor
        addPlane(true);         // ceiling


        // sides
        for (let i = 0; i < planeCoords.length; ++i) {
            const a = planeCoords[i];
            const b = planeCoords[(i+1) % planeCoords.length];
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
     * @param {boolean} [cfg.snapping=true] Whether to initially enable snap-to-vertex and snap-to-edge for this ZonesMouseControl.
     */
    constructor(zonesPlugin, cfg = {}) {

        super(zonesPlugin.viewer.scene);

        this.pointerLens = cfg.pointerLens;

        this._active = false;

        this._initMarkerDiv();

        this._onCameraControlRayMove = null;
        this._onMouseDown = null;
        this._onMouseUp = null;
        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;

        /**
         * The {@link ZonesPlugin} that owns this ZonesMouseControl.
         * @type {ZonesPlugin}
         */
        this.zonesPlugin = zonesPlugin;
    }

    _initMarkerDiv() {
        const markerDiv = document.createElement('div');
        markerDiv.setAttribute('id', 'myMarkerDiv');
        const canvas = this.scene.canvas.canvas;
        canvas.parentNode.insertBefore(markerDiv, canvas);
        markerDiv.style.background = "black";
        markerDiv.style.border = "2px solid blue";
        markerDiv.style.borderRadius = "10px";
        markerDiv.style.width = "5px";
        markerDiv.style.height = "5px";
        markerDiv.style.top = "-200px";
        markerDiv.style.left = "-200px";
        markerDiv.style.margin = "0 0";
        markerDiv.style.zIndex = "100";
        markerDiv.style.position = "absolute";
        markerDiv.style.pointerEvents = "none";

        this._markerDiv = markerDiv;
    }

    _destroyMarkerDiv() {
        if (this._markerDiv) {
            const element = this._markerDiv; // document.getElementById('myMarkerDiv');
            element.parentNode.removeChild(element);
            this._markerDiv = null;
        }
    }

    /**
     * Gets if this ZonesMouseControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this ZonesMouseControl is active.
     */
    get active() {
        return this._active;
    }

    /**
     * Activates this ZonesMouseControl, ready to respond to input.
     */
    activate(zoneAltitude, zoneHeight, zoneColor, zoneAlpha) {

        if (this._active) {
            return;
        }

        if (!this._markerDiv) {
            this._initMarkerDiv();
        }

        this.fire("activated", true);

        const markerDiv = this._markerDiv;
        const zonesPlugin = this.zonesPlugin;
        const scene = this.scene;
        const cameraControl = zonesPlugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;

        let mouseHovering = false;
        const pointerDownCanvas = math.vec2();
        const clickTolerance = 20;

        let basePolygon = null;
        let ghostBox = null;
        let points;
        let onPress;

        const getTop = el => el.offsetTop   + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent) : 0);
        const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);

        const updateHovering = (over, event) => {
            mouseHovering = over;
            canvas.style.cursor = over ? "pointer" : "default";

            if (this.pointerLens) {
                this.pointerLens.visible = true;
                this.pointerLens.canvasPos = event.canvasPos;
                this.pointerLens.snappedCanvasPos = event.canvasPos;
                this.pointerLens.snapped = false;
            }
        };

        this._onCameraControlRayMove = cameraControl.on(
            "rayMove",
            event => {
                markerDiv.style.left = `${getLeft(canvas) + event.canvasPos[0] - 5}px`;
                markerDiv.style.top  = `${getTop(canvas)  + event.canvasPos[1] - 5}px`;
                markerDiv.style.display = "";

                const origin = event.ray.origin;
                const dir = event.ray.direction;

                const norm = math.vec3([ 0, 1, 0 ]);
                const t = - (math.dotVec3(origin, norm) - zoneAltitude) / math.dotVec3(dir, norm);
                if (false) // (t < 0)
                {
                    updateHovering(false, event);
                    return;
                }

                updateHovering(true, event);

                const worldPos = math.vec3();
                math.mulVec3Scalar(dir, t, worldPos);
                math.addVec3(origin, worldPos, worldPos);

                points[points.length - 1].set(worldPos);

                if (points.length >= 2)
                {
                    const useBox = true;

                    if (! basePolygon)
                    {
                        basePolygon = new Mesh(
                            scene,
                            {
                                geometry: new ReadableGeometry(
                                    scene,
                                    useBox ? buildBoxGeometry() : {
                                        positions: new Array(4 * 3),
                                        normals:   [ 0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0 ],
                                        uv:        [ 0, 1,  1, 1,  0, 0,  1, 0 ],
                                        indices:   [ 0, 1, 2, 2, 1, 3 ]
                                    }),
                                material: new PhongMaterial(
                                    scene,
                                    {
                                        alpha: (zoneAlpha !== undefined) ? zoneAlpha : 0.5,
                                        diffuse: hex2rgb(zoneColor),
                                        backfaces: true
                                    })
                            });
                    }

                    if (window.showBox && (! ghostBox))
                    {
                        ghostBox = new Mesh(
                            scene,
                            {
                                geometry: new ReadableGeometry(
                                    scene,
                                    useBox ? buildBoxGeometry() : {
                                        positions: new Array(4 * 3),
                                        normals:   [ 0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0 ],
                                        uv:        [ 0, 1,  1, 1,  0, 0,  1, 0 ],
                                        indices:   [ 0, 1, 2, 2, 1, 3 ]
                                    }),
                                material: new PhongMaterial(
                                    scene,
                                    {
                                        diffuse: hex2rgb(zoneColor),
                                        alpha: 0.15,
                                        backfaces: true
                                    })
                            });
                    }

                    const min = (idx) => Math.min(points[0][idx], points[1][idx]);
                    const max = (idx) => Math.max(points[0][idx], points[1][idx]);

                    const xmin = min(0);
                    const ymin = min(1);
                    const zmin = min(2);
                    const xmax = max(0);
                    const ymax = Math.max(max(1), ymin + 0.05);
                    const zmax = max(2);

                    basePolygon.geometry.positions = useBox
                        ? [

                            // v0-v1-v2-v3 front
                            xmax, ymax, zmax,
                            xmin, ymax, zmax,
                            xmin, ymin, zmax,
                            xmax, ymin, zmax,

                            // v0-v3-v4-v1 right
                            xmax, ymax, zmax,
                            xmax, ymin, zmax,
                            xmax, ymin, zmin,
                            xmax, ymax, zmin,

                            // v0-v1-v6-v1 top
                            xmax, ymax, zmax,
                            xmax, ymax, zmin,
                            xmin, ymax, zmin,
                            xmin, ymax, zmax,

                            // v1-v6-v7-v2 left
                            xmin, ymax, zmax,
                            xmin, ymax, zmin,
                            xmin, ymin, zmin,
                            xmin, ymin, zmax,

                            // v7-v4-v3-v2 bottom
                            xmin, ymin, zmin,
                            xmax, ymin, zmin,
                            xmax, ymin, zmax,
                            xmin, ymin, zmax,

                            // v4-v7-v6-v1 back
                            xmax, ymin, zmin,
                            xmin, ymin, zmin,
                            xmin, ymax, zmin,
                            xmax, ymax, zmin
                        ]
                        : [
                            xmin, ymin, zmax,
                            xmax, ymin, zmax,
                            xmin, ymin, zmin,
                            xmax, ymin, zmin,
                        ];

                    if (ghostBox)
                    {
                        const ytop = ymin + zoneHeight;
                        ghostBox.geometry.positions = [

                            // v0-v1-v2-v3 front
                            xmax, ytop, zmax,
                            xmin, ytop, zmax,
                            xmin, ymin, zmax,
                            xmax, ymin, zmax,

                            // v0-v3-v4-v1 right
                            xmax, ytop, zmax,
                            xmax, ymin, zmax,
                            xmax, ymin, zmin,
                            xmax, ytop, zmin,

                            // v0-v1-v6-v1 top
                            xmax, ytop, zmax,
                            xmax, ytop, zmin,
                            xmin, ytop, zmin,
                            xmin, ytop, zmax,

                            // v1-v6-v7-v2 left
                            xmin, ytop, zmax,
                            xmin, ytop, zmin,
                            xmin, ymin, zmin,
                            xmin, ymin, zmax,

                            // v7-v4-v3-v2 bottom
                            xmin, ymin, zmin,
                            xmax, ymin, zmin,
                            xmax, ymin, zmax,
                            xmin, ymin, zmax,

                            // v4-v7-v6-v1 back
                            xmax, ymin, zmin,
                            xmin, ymin, zmin,
                            xmin, ytop, zmin,
                            xmax, ytop, zmin
                        ];
                    }
                }
            });

        canvas.addEventListener('mousedown', this._onMouseDown = (e) => {
            if (e.which === 1)
            {
                pointerDownCanvas[0] = e.clientX;
                pointerDownCanvas[1] = e.clientY;
            }
        });

        const startUI = () => {
            markerDiv.style.background = zoneColor;
            markerDiv.style.border = "2px solid white";

            points = [ math.vec3() ];
            onPress = event => {
                points.push(math.vec3());

                onPress = event => {
                    const origin = points[0];
                    const target = math.vec3([ points[1][0], points[0][1] + zoneHeight, points[1][2] ]);

                    const min = (idx) => Math.min(origin[idx], target[idx]);
                    const max = (idx) => Math.max(origin[idx], target[idx]);

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
                            color: zoneColor,
                            alpha: zoneAlpha
                        });

                    basePolygon.destroy();
                    basePolygon = null;
                    if (ghostBox)
                    {
                        ghostBox.destroy();
                        ghostBox = null;
                    }
                    this.fire("zoneEnd", zone);
                    startUI();
                };
            };
        };
        startUI();

        canvas.addEventListener("mouseup", this._onMouseUp =(e) => {
            if ((e.which === 1) &&
                (math.distVec2(pointerDownCanvas, math.vec2([ e.clientX, e.clientY ])) <= clickTolerance))
            {
                if (mouseHovering)
                {
                    onPress();
                }
            }
        });

        this._active = true;
    }

    /**
     * Deactivates this ZonesMouseControl, making it unresponsive to input.
     *
     * Destroys any {@link Zone} under construction by this ZonesMouseControl.
     */
    deactivate() {
        if (!this._active) {
            return;
        }

        this.fire("activated", false);

        if (this.pointerLens) {
            this.pointerLens.visible = false;
        }
        if (this._markerDiv) {
            this._destroyMarkerDiv();
        }
        this.reset();
        const canvas = this.scene.canvas.canvas;
        canvas.removeEventListener("mousedown", this._onMouseDown);
        canvas.removeEventListener("mouseup", this._onMouseUp);
        const cameraControl = this.zonesPlugin.viewer.cameraControl;
        cameraControl.off(this._onCameraControlRayMove);
        if (this._currentZone) {
            this.zonesPlugin.fire("zoneCancel", this._currentZone);
            this._currentZone.destroy();
            this._currentZone = null;
        }
        this._active = false;
    }

    /**
     * Resets this ZonesMouseControl.
     *
     * Destroys any {@link Zone} under construction by this ZonesMouseControl.
     *
     * Does nothing if the ZonesMouseControl is not active.
     */
    reset() {
        if (!this._active) {
            return;
        }

        this._destroyMarkerDiv();
        this._initMarkerDiv();

        if (this._currentZone) {
            this.zonesPlugin.fire("zoneCancel", this._currentZone);
            this._currentZone.destroy();
            this._currentZone = null;
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
        this.clear();
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
        const canvas = scene.canvas.canvas;
        const pointerCircle = this.pointerCircle;
        const pointerLens = this.pointerLens;
        const longTouchTimeoutMs = 300;
        const moveTolerance = 20;
        const self = this;

        const select3dPoint = function(onCancel, onChange, onCommit) {
            const pickWorldPos = canvasPos => {
                const origin = math.vec3();
                const direction = math.vec3();
                math.canvasPosToWorldRay(scene.canvas.canvas, scene.camera.viewMatrix, scene.camera.projMatrix, canvasPos, origin, direction);

                const norm = math.vec3([ 0, 1, 0 ]);
                const t = - (math.dotVec3(origin, norm) - zoneAltitude) / math.dotVec3(direction, norm);
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

            let longTouchTimeout = null;
            const nop = () => { };
            let onSingleTouchMove = nop;
            let startTouchIdentifier;

            const resetAction = function() {
                if (pointerLens)
                {
                    pointerLens.visible = false;
                }
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
                    const startCanvasPos = math.vec2([ startTouch.clientX, startTouch.clientY ]);

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
                                pointerCircle.start(startCanvasPos);

                                longTouchTimeout = setTimeout(
                                    function() {
                                        pointerCircle.stop();

                                        viewer.cameraControl.active = false;

                                        onSingleTouchMove = canvasPos => {
                                            if (pointerLens)
                                            {
                                                pointerLens.canvasPos = canvasPos;
                                            }
                                            onChange(pickWorldPos(canvasPos));
                                        };

                                        if (pointerLens)
                                        {
                                            pointerLens.snapped = false;
                                            pointerLens.visible = true;
                                            pointerLens.canvasPos = startCanvasPos;
                                        }
                                        onChange(startWorldPos);
                                    },
                                    longTouchTimeoutMs);
                            },
                            250);
                    }
                }
            };
            canvas.addEventListener("touchstart", onCanvasTouchStart, {passive: true});

            const onCanvasTouchMove = function(event) {
                const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
                if (touch)
                {
                    onSingleTouchMove(math.vec2([ touch.clientX, touch.clientY ]));
                }
            };
            canvas.addEventListener("touchmove", onCanvasTouchMove, {passive: true});

            const onCanvasTouchEnd = function(event) {
                const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
                if (touch)
                {
                    cleanup();
                    onCommit(pickWorldPos(math.vec2([ touch.clientX, touch.clientY ])));
                }
            };
            canvas.addEventListener("touchend", onCanvasTouchEnd, {passive: true});

            return cleanup;
        };

        const startUI = function() {
            const marker3D = function() {
                const getTop  = el => el.offsetTop  + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getTop(el.offsetParent)  : 0);
                const getLeft = el => el.offsetLeft + ((el.offsetParent && (el.offsetParent !== canvas.parentNode)) ? getLeft(el.offsetParent) : 0);

                const markerDiv = document.createElement("div");
                canvas.parentNode.insertBefore(markerDiv, canvas);

                markerDiv.style.background = zoneColor;
                markerDiv.style.border = "2px solid white";
                markerDiv.style.borderRadius = "10px";
                markerDiv.style.width = "5px";
                markerDiv.style.height = "5px";
                markerDiv.style.top = "-200px";
                markerDiv.style.left = "-200px";
                markerDiv.style.margin = "0 0";
                markerDiv.style.zIndex = "100";
                markerDiv.style.position = "absolute";
                markerDiv.style.pointerEvents = "none";
                markerDiv.style.display = "none";

                const marker = new Marker(scene, {});
                const updatePos = function() {
                    const canvasPos = marker.canvasPos;
                    markerDiv.style.left = (getLeft(canvas) + canvasPos[0] - 5) + "px";
                    markerDiv.style.top  = (getTop(canvas)  + canvasPos[1] - 5) + "px";
                };
                const onViewMatrix = scene.camera.on("viewMatrix", updatePos);
                const onProjMatrix = scene.camera.on("projMatrix", updatePos);

                return {
                    update: function(worldPos) {
                        if (worldPos)
                        {
                            marker.worldPos = worldPos;
                            updatePos();
                        }
                        markerDiv.style.display = worldPos ? "" : "none";
                    },

                    destroy: function() {
                        markerDiv.parentNode.removeChild(markerDiv);
                        scene.camera.off(onViewMatrix);
                        scene.camera.off(onProjMatrix);
                        marker.destroy();
                    }
                };
            };

            const marker1 = marker3D();
            const marker2 = marker3D();
            let basePolygon = new Mesh(
                scene,
                {
                    geometry: new ReadableGeometry(
                        scene,
                        {
                            positions: new Array(4 * 3),
                            normals:   [ 0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0 ],
                            uv:        [ 0, 1,  1, 1,  0, 0,  1, 0 ],
                            indices:   [ 0, 1, 2, 2, 1, 3 ]
                        }),
                    material: new PhongMaterial(
                        scene,
                        {
                            alpha: (zoneAlpha !== undefined) ? zoneAlpha : 0.5,
                            diffuse: hex2rgb(zoneColor),
                            backfaces: true
                        })
                });

            const updateBase = points => {
                if (points)
                {
                    const min = (idx) => Math.min(points[0][idx], points[1][idx]);
                    const max = (idx) => Math.max(points[0][idx], points[1][idx]);

                    const xmin = min(0);
                    const ymin = min(1);
                    const zmin = min(2);
                    const xmax = max(0);
                    const ymax = Math.max(max(1), ymin + 0.05);
                    const zmax = max(2);

                    basePolygon.geometry.positions = [
                        xmin, ymin, zmax,
                        xmax, ymin, zmax,
                        xmin, ymin, zmin,
                        xmax, ymin, zmin,
                    ];
                }
                basePolygon.visible = !!points;
            };
            updateBase(null);

            let deactivatePointSelection = select3dPoint(
                () => marker1.update(null),
                worldPos => marker1.update(worldPos),
                function(point1WorldPos) {
                    marker1.update(point1WorldPos);

                    deactivatePointSelection = select3dPoint(
                        function() {
                            marker2.update(null);
                            updateBase(null);
                        },
                        function(point2WorldPos) {
                            marker2.update(point2WorldPos);
                            updateBase([ point1WorldPos, point2WorldPos ]);
                        },
                        function(point2WorldPos) {
                            marker1.destroy();
                            marker2.destroy();
                            basePolygon.destroy();

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

                            self.fire("zoneEnd", zone);

                            startUI();
                        });
                });

            self._deactivate = function() {
                deactivatePointSelection();
                marker1.destroy();
                marker2.destroy();
                basePolygon.destroy();
            };
        };

        startUI();
    }

    deactivate() {
        if (this._deactivate)
        {
            this._deactivate();
            this._deactivate = null;
        }
    }

    reset() {
        if (this._deactivate)
        {
            this._deactivate();
            this.activate();
        }
    }

    destroy() {
        this.deactivate();
        super.destroy();
    }
}


export {ZonesMouseControl}
export {ZonesPlugin}
