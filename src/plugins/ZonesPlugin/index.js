import {Label} from "../lib/html/Label.js";
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

        var scene = this.plugin.viewer.scene;

        this._vp = new Float64Array(24);
        this._pp = new Float64Array(24);
        this._cp = new Float64Array(8);

        this._geometry = cfg.geometry;
        this._basePoints = cfg.geometry.planeCoordinates;
        this._zoneAltitude = cfg.geometry.altitude;
        this._zoneHeight = cfg.geometry.height;

        const min = (idx) => (idx === 1) ?  this._zoneAltitude                     : Math.min(...this._basePoints.map(p => p[(idx === 2) ? 1 : 0]));
        const max = (idx) => (idx === 1) ? (this._zoneAltitude + this._zoneHeight) : Math.max(...this._basePoints.map(p => p[(idx === 2) ? 1 : 0]));

        const xmin = min(0);
        const ymin = min(1);
        const zmin = min(2);
        const xmax = max(0);
        const ymax = max(1);
        const zmax = max(2);

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

        this._zoneMesh = new Mesh(scene, {
            geometry: new ReadableGeometry(scene, buildBoxGeometry()),
            material: new PhongMaterial(scene, {
                alpha: 0.5,
                backfaces: true
            })
        });

        this._label = new Label(this._container, {
            prefix: "",
            text: "",
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 4 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });
        this.labelText = cfg.labelText || "Label";

        this.color = cfg.color;

        this._vpDirty = false;
        this._cpDirty = false;
        this._sectionPlanesDirty = true;


        this._onViewMatrix = scene.camera.on("viewMatrix", () => {
            this._vpDirty = true;
            this._needUpdate(0); // No lag
        });

        this._onProjMatrix = scene.camera.on("projMatrix", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        this._onCanvasBoundary = scene.canvas.on("boundary", () => {
            this._cpDirty = true;
            this._needUpdate(0); // No lag
        });

        this._onMetricsOrigin = scene.metrics.on("origin", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        this._onSectionPlaneUpdated = scene.on("sectionPlaneUpdated", () =>{
            this._sectionPlanesDirty = true;
            this._needUpdate();
        });

        this._visible = true;
        this._labelsVisible = true;

        this._wp = new Float64Array([
            xmin, ymin, zmin, 1.0,
            xmax, ymin, zmin, 1.0,
            xmax, ymax, zmin, 1.0,
            xmax, ymax, zmax, 1.0
        ]);

        this._vpDirty = true;

        const c = this._basePoints.map(p => [ p[0], this._zoneAltitude, p[1] ]).concat(this._basePoints.map(p => [ p[0], this._zoneAltitude + this._zoneHeight, p[1] ]));

        this._zoneMesh.geometry.positions = [].concat(
            c[5], c[4], c[0], c[1], // front
            c[5], c[1], c[2], c[6], // right
            c[5], c[6], c[7], c[4], // top
            c[4], c[7], c[3], c[0], // left
            c[3], c[2], c[1], c[0], // bottom
            c[2], c[3], c[7], c[6]  // back
        );
    }

    _update() {

        if (!this._visible) {
            return;
        }

        const scene = this.plugin.viewer.scene;

        if (this._vpDirty) {

            math.transformPositions4(scene.camera.viewMatrix, this._wp, this._vp);

            this._vp[3] = 1.0;
            this._vp[7] = 1.0;
            this._vp[11] = 1.0;
            this._vp[15] = 1.0;

            this._vpDirty = false;
            this._cpDirty = true;
        }

        if (this._sectionPlanesDirty) {
            const isSliced = scene._sectionPlanesState.sectionPlanes.some(
                sectionPlane => math.planeClipsPositions3(sectionPlane.pos, sectionPlane.dir, this._wp, 4));

            this._label.setCulled(isSliced);

            if (isSliced) {
                return;
            }

            this._sectionPlanesDirty = false;
        }

        if (this._cpDirty) {

            this._label.setCulled(!this._labelsVisible);

            if (this._labelsVisible) {
                math.transformPositions4(scene.camera.project.matrix, this._vp, this._pp);

                const offsets = scene.canvas.canvas.getBoundingClientRect();
                const containerOffsets = this._container.getBoundingClientRect();
                const top  = offsets.top  - containerOffsets.top;
                const left = offsets.left - containerOffsets.left;
                const aabb = scene.canvas.boundary;
                const canvasWidth  = aabb[2];
                const canvasHeight = aabb[3];

                const pp = this._pp;
                const cp = this._cp;
                for (let i = 0, j = 0, len = pp.length; i < len; i += 4) {
                    cp[j  ] = left + Math.floor((1 + pp[i + 0] / pp[i + 3]) * canvasWidth / 2);
                    cp[j+1] = top  + Math.floor((1 - pp[i + 1] / pp[i + 3]) * canvasHeight / 2);
                    j += 2;
                }

                this._label.setPosOnWire(cp[0], cp[1], cp[6], cp[7]);
            }

            this._cpDirty = false;
        }
    }

    set labelText(text) {
        this._labelText = text;
        this._label.setText(this._labelText);
    }

    get labelText() {
        return this._labelText;
    }

    set color(value) {
        this._color = value;
        this._label.setFillColor(this._color);
        this._zoneMesh.material.diffuse = hex2rgb(this._color);
    }

    get color() {
        return this._color;
    }

    /**
     * Sets whether this Zone is visible or not.
     *
     * @type {Boolean}
     */
    set visible(value) {
        this._visible = !!value;
        this._label.setVisible(this._visible);
        this._zoneMesh.visible = this._visible;
        this._cpDirty = true;
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
            labelText: this._labelText,
            color: this._color
        };
    }

    /**
     * @private
     */
    destroy() {

        const scene = this.plugin.viewer.scene;

        scene.camera.off(this._onViewMatrix);
        scene.camera.off(this._onProjMatrix);
        scene.canvas.off(this._onCanvasBoundary);
        scene.metrics.off(this._onMetricsOrigin);
        scene.off(this._onSectionPlaneUpdated);

        this._label.destroy();
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
    activate(zoneAltitude, zoneHeight, zoneColor, zoneLabelText) {

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
                                        diffuse: hex2rgb(zoneColor),
                                        alpha: 0.5,
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
                    const ymin = min(1);
                    const zmin = min(2);
                    const xmax = max(0);
                    const ymax = max(1);
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
                                altitude: ymin,
                                height: ymax - ymin
                            },
                            color: zoneColor,
                            labelText: zoneLabelText
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
            color: params.color,
            labelText: params.labelText,
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

export {ZonesMouseControl}
export {ZonesPlugin}
