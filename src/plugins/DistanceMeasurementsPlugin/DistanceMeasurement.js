import {Dot3D} from "../lib/ui/index.js";
import {Wire} from "../lib/html/Wire.js";
import {Label} from "../lib/html/Label.js";
import {math} from "../../viewer/scene/math/math.js";
import {Component} from "../../viewer/scene/Component.js";


const distVec3 = math.vec3();

const lengthWire = (x1, y1, x2, y2) => {
    var a = x1 - x2;
    var b = y1 - y2;
    return Math.sqrt(a * a + b * b);
};

function determineMeasurementOrientation(A, B, distance) {
    const yDiff = Math.abs(B[1] - A[1]);

    return yDiff > distance ? 'Vertical' : 'Horizontal';
}

// function findDistance

/**
 * @desc Measures the distance between two 3D points.
 *
 * See {@link DistanceMeasurementsPlugin} for more info.
 */
class DistanceMeasurement extends Component {

    /**
     * @private
     */
    constructor(plugin, cfg = {}) {

        super(plugin.viewer.scene, cfg);

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurement.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._container = cfg.container;
        if (!this._container) {
            throw "config missing: container";
        }

        this._eventSubs = {};

        var scene = this.plugin.viewer.scene;

        this._originWorld = math.vec3();
        this._targetWorld = math.vec3();

        this._wp = new Float64Array(24); //world position
        this._vp = new Float64Array(24); //view position
        this._pp = new Float64Array(24);
        this._cp = new Float64Array(8); //canvas position

        this._xAxisLabelCulled = false;
        this._yAxisLabelCulled = false;
        this._zAxisLabelCulled = false;

        this._color = cfg.color || this.plugin.defaultColor;

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

        this._originDot = new Dot3D(scene, cfg.origin, this._container, {
            fillColor: this._color,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 2 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._targetDot = new Dot3D(scene, cfg.target, this._container, {
            fillColor: this._color,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 2 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._lengthWire = new Wire(this._container, {
            color: this._color,
            thickness: 2,
            thicknessClickable: 6,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 1 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._xAxisWire = new Wire(this._container, {
            color: "#FF0000",
            thickness: 1,
            thicknessClickable: 6,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 1 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._yAxisWire = new Wire(this._container, {
            color: "green",
            thickness: 1,
            thicknessClickable: 6,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 1 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._zAxisWire = new Wire(this._container, {
            color: "blue",
            thickness: 1,
            thicknessClickable: 6,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 1 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._lengthLabel = new Label(this._container, {
            fillColor: this._color,
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

        this._xAxisLabel = new Label(this._container, {
            fillColor: "red",
            prefix: "X",
            text: "",
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 3 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._yAxisLabel = new Label(this._container, {
            fillColor: "green",
            prefix: "Y",
            text: "",
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 3 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._zAxisLabel = new Label(this._container, {
            fillColor: "blue",
            prefix: "Z",
            text: "",
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 3 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._measurementOrientation = 'Horizontal';
        this._wpDirty = false;
        this._vpDirty = false;
        this._cpDirty = false;
        this._sectionPlanesDirty = true;

        this._visible = false;
        this._originVisible = false;
        this._targetVisible = false;
        this._wireVisible = false;
        this._axisVisible = false;
        this._xAxisVisible = false;
        this._yAxisVisible = false;
        this._zAxisVisible = false;
        this._axisEnabled = true;
        this._xLabelEnabled = false;
        this._yLabelEnabled = false;
        this._zLabelEnabled = false;
        this._lengthLabelEnabled = false;
        this._labelsVisible = false;
        this._labelsOnWires = false;
        this._clickable = false;

        this._originDot.on("worldPos", (value) => {
            this._originWorld.set(value || [0,0,0]); 
            this._wpDirty = true;
            this._needUpdate(0); // No lag
        });

        this._targetDot.on("worldPos", (value) => {
            this._targetWorld.set(value || [0,0,0]); 
            this._wpDirty = true;
            this._needUpdate(0); // No lag
        });

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

        this._onMetricsUnits = scene.metrics.on("units", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        this._onMetricsScale = scene.metrics.on("scale", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        this._onMetricsOrigin = scene.metrics.on("origin", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        this._onSectionPlaneUpdated = scene.on("sectionPlaneUpdated", () =>{
            this._sectionPlanesDirty = true;
            this._needUpdate();
        });

        this.approximate = cfg.approximate;
        this.visible = cfg.visible;
        this.originVisible = cfg.originVisible;
        this.targetVisible = cfg.targetVisible;
        this.wireVisible = cfg.wireVisible;
        this.axisVisible = cfg.axisVisible;
        this.xAxisVisible = cfg.xAxisVisible;
        this.yAxisVisible = cfg.yAxisVisible;
        this.zAxisVisible = cfg.zAxisVisible;
        this.xLabelEnabled = cfg.xLabelEnabled;
        this.yLabelEnabled = cfg.yLabelEnabled;
        this.zLabelEnabled = cfg.zLabelEnabled;
        this.lengthLabelEnabled = cfg.lengthLabelEnabled;
        this.labelsVisible = cfg.labelsVisible;
        this.labelsOnWires = cfg.labelsOnWires;
        this.useRotationAdjustment = cfg.useRotationAdjustment;
    }

    _update() {

        if (!this._visible) {
            return;
        }

        const scene = this.plugin.viewer.scene;

        if (this._wpDirty) {

            this._measurementOrientation = determineMeasurementOrientation(this._originWorld, this._targetWorld, 0);
            if(this._measurementOrientation === 'Vertical' && this.useRotationAdjustment){
                this._wp[0] = this._originWorld[0];
                this._wp[1] = this._originWorld[1];
                this._wp[2] = this._originWorld[2];
                this._wp[3] = 1.0;

                this._wp[4] = this._originWorld[0]; //x-axis
                this._wp[5] = this._originWorld[1];
                this._wp[6] = this._originWorld[2];
                this._wp[7] = 1.0;

                this._wp[8] = this._originWorld[0]; //x-axis
                this._wp[9] = this._targetWorld[1]; //y-axis
                this._wp[10] = this._originWorld[2];
                this._wp[11] = 1.0;

                this._wp[12] = this._targetWorld[0];
                this._wp[13] = this._targetWorld[1];
                this._wp[14] = this._targetWorld[2];
                this._wp[15] = 1.0;
            }
            else {
                this._wp[0] = this._originWorld[0];
                this._wp[1] = this._originWorld[1];
                this._wp[2] = this._originWorld[2];
                this._wp[3] = 1.0;

                this._wp[4] = this._targetWorld[0];
                this._wp[5] = this._originWorld[1];
                this._wp[6] = this._originWorld[2];
                this._wp[7] = 1.0;

                this._wp[8] = this._targetWorld[0];
                this._wp[9] = this._targetWorld[1];
                this._wp[10] = this._originWorld[2];
                this._wp[11] = 1.0;

                this._wp[12] = this._targetWorld[0];
                this._wp[13] = this._targetWorld[1];
                this._wp[14] = this._targetWorld[2];
                this._wp[15] = 1.0;
            }
            

            this._wpDirty = false;
            this._vpDirty = true;
        }

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

            if (this._isSliced(this._originWorld) || this._isSliced(this._targetWorld)) {
                this._xAxisLabel.setCulled(true);
                this._yAxisLabel.setCulled(true);
                this._zAxisLabel.setCulled(true);
                this._lengthLabel.setCulled(true);
                this._xAxisWire.setCulled(true);
                this._yAxisWire.setCulled(true);
                this._zAxisWire.setCulled(true);
                this._lengthWire.setCulled(true);
                this._originDot.setCulled(true);
                this._targetDot.setCulled(true);
                return;
            } else {
                this._xAxisLabel.setCulled(false);
                this._yAxisLabel.setCulled(false);
                this._zAxisLabel.setCulled(false);
                this._lengthLabel.setCulled(false);
                this._xAxisWire.setCulled(false);
                this._yAxisWire.setCulled(false);
                this._zAxisWire.setCulled(false);
                this._lengthWire.setCulled(false);
                this._originDot.setCulled(false);
                this._targetDot.setCulled(false);
            }

            this._sectionPlanesDirty = true;
        }

        const near = -0.3;
        const vpz1 = this._originDot.viewPos[2];
        const vpz2 = this._targetDot.viewPos[2];

        if (vpz1 > near || vpz2 > near) {

            this._xAxisLabel.setCulled(true);
            this._yAxisLabel.setCulled(true);
            this._zAxisLabel.setCulled(true);
            this._lengthLabel.setCulled(true);

            this._xAxisWire.setVisible(false);
            this._yAxisWire.setVisible(false);
            this._zAxisWire.setVisible(false);
            this._lengthWire.setVisible(false);

            this._originDot.setVisible(false);
            this._targetDot.setVisible(false);

            return;
        }

        if (this._cpDirty) {

            math.transformPositions4(scene.camera.project.matrix, this._vp, this._pp);

            var pp = this._pp;
            var cp = this._cp;

            var canvas = scene.canvas.canvas;
            var offsets = canvas.getBoundingClientRect();
            const containerOffsets = this._container.getBoundingClientRect();
            var top = offsets.top - containerOffsets.top;
            var left = offsets.left - containerOffsets.left;
            var aabb = scene.canvas.boundary;
            var canvasWidth = aabb[2];
            var canvasHeight = aabb[3];
            var j = 0;

            const metrics = this.plugin.viewer.scene.metrics;
            const scale = metrics.scale;
            const units = metrics.units;
            const unitInfo = metrics.unitsInfo[units];
            const unitAbbrev = unitInfo.abbrev;

            for (var i = 0, len = pp.length; i < len; i += 4) {
                cp[j] = left + Math.floor((1 + pp[i + 0] / pp[i + 3]) * canvasWidth / 2);
                cp[j + 1] = top + Math.floor((1 - pp[i + 1] / pp[i + 3]) * canvasHeight / 2);
                j += 2;
            }

            this._lengthWire.setStartAndEnd(cp[0], cp[1], cp[6], cp[7]);

            this._xAxisWire.setStartAndEnd(cp[0], cp[1], cp[2], cp[3]);
            this._yAxisWire.setStartAndEnd(cp[2], cp[3], cp[4], cp[5]);
            this._zAxisWire.setStartAndEnd(cp[4], cp[5], cp[6], cp[7]);

            if (!this.labelsVisible) {

                this._lengthLabel.setCulled(true);

                this._xAxisLabel.setCulled(true);
                this._yAxisLabel.setCulled(true);
                this._zAxisLabel.setCulled(true);

            } else {

                this._lengthLabel.setPosOnWire(cp[0], cp[1], cp[6], cp[7]);

                if (this.labelsOnWires) {
                    this._xAxisLabel.setPosOnWire(cp[0], cp[1], cp[2], cp[3]);
                    this._yAxisLabel.setPosOnWire(cp[2], cp[3], cp[4], cp[5]);
                    this._zAxisLabel.setPosOnWire(cp[4], cp[5], cp[6], cp[7]);
                } else {
                    const labelOffset = 35;
                    let currentLabelOffset = labelOffset;
                    this._xAxisLabel.setPosOnWire(cp[0], cp[1] + currentLabelOffset, cp[6], cp[7] + currentLabelOffset);
                    currentLabelOffset += labelOffset;
                    this._yAxisLabel.setPosOnWire(cp[0], cp[1] + currentLabelOffset, cp[6], cp[7] + currentLabelOffset);
                    currentLabelOffset += labelOffset;
                    this._zAxisLabel.setPosOnWire(cp[0], cp[1] + currentLabelOffset, cp[6], cp[7] + currentLabelOffset);
                }

                const tilde = this._approximate ? " ~ " : " = ";

                this._length = Math.abs(math.lenVec3(math.subVec3(this._targetWorld, this._originWorld, distVec3)))
                this._lengthLabel.setText(tilde + (this._length * scale).toFixed(2) + unitAbbrev);

                const xAxisCanvasLength = Math.abs(lengthWire(cp[0], cp[1], cp[2], cp[3]));
                const yAxisCanvasLength = Math.abs(lengthWire(cp[2], cp[3], cp[4], cp[5]));
                const zAxisCanvasLength = Math.abs(lengthWire(cp[4], cp[5], cp[6], cp[7]));

                const labelMinAxisLength = this.plugin.labelMinAxisLength;

                if (this.labelsOnWires){
                    this._xAxisLabelCulled = (xAxisCanvasLength < labelMinAxisLength);
                    this._yAxisLabelCulled = (yAxisCanvasLength < labelMinAxisLength);
                    this._zAxisLabelCulled = (zAxisCanvasLength < labelMinAxisLength);
                } else {
                    this._xAxisLabelCulled = false;
                    this._yAxisLabelCulled = false;
                    this._zAxisLabelCulled = false;
                }

                if (!this._xAxisLabelCulled) {
                    this._xAxisLabel.setText(tilde + Math.abs((this._targetWorld[0] - this._originWorld[0]) * scale).toFixed(2) + unitAbbrev);
                    this._xAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._xAxisLabel.setCulled(true);
                }

                if (!this._yAxisLabelCulled) {
                    this._yAxisLabel.setText(tilde + Math.abs((this._targetWorld[1] - this._originWorld[1]) * scale).toFixed(2) + unitAbbrev);
                    this._yAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._yAxisLabel.setCulled(true);
                }

                if (!this._zAxisLabelCulled) {
                    if(this._measurementOrientation === 'Vertical' && this.useRotationAdjustment) {
                        this._zAxisLabel.setPrefix("");
                        this._zAxisLabel.setText(tilde + Math.abs(math.lenVec3(math.subVec3(this._targetWorld, [this._originWorld[0], this._targetWorld[1], this._originWorld[2]], distVec3)) * scale).toFixed(2) + unitAbbrev);
                    }
                    else {
                        this._zAxisLabel.setPrefix("Z");
                        this._zAxisLabel.setText(tilde + Math.abs((this._targetWorld[2] - this._originWorld[2]) * scale).toFixed(2) + unitAbbrev);
                    }
                    this._zAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._zAxisLabel.setCulled(true);
                }
            }

            // this._xAxisLabel.setVisible(this.axisVisible && this.xAxisVisible);
            // this._yAxisLabel.setVisible(this.axisVisible && this.yAxisVisible);
            // this._zAxisLabel.setVisible(this.axisVisible && this.zAxisVisible);
            // this._lengthLabel.setVisible(false);

            this._originDot.setVisible(this._visible && this._originVisible);
            this._targetDot.setVisible(this._visible && this._targetVisible);

            this._xAxisWire.setVisible(this.axisVisible && this.xAxisVisible);
            this._yAxisWire.setVisible(this.axisVisible && this.yAxisVisible);
            this._zAxisWire.setVisible(this.axisVisible && this.zAxisVisible);

            this._lengthWire.setVisible(this.wireVisible);
            this._lengthLabel.setCulled(!this.wireVisible);

            this._cpDirty = false;
        }
    }

    _isSliced(positions) {
       const sectionPlanes = this.scene._sectionPlanesState.sectionPlanes;
        for (let i = 0, len = sectionPlanes.length; i < len; i++) {
            const sectionPlane = sectionPlanes[i];
            if (math.planeClipsPositions3(sectionPlane.pos, sectionPlane.dir, positions, 4)) {
                return true
            }
        }
        return false;
    }

    /**
     * Sets whether this DistanceMeasurement indicates that its measurement is approximate.
     *
     * This is ````true```` by default.
     *
     * @type {Boolean}
     */
    set approximate(approximate) {
        approximate = approximate !== false;
        if (this._approximate === approximate) {
            return;
        }
        this._approximate = approximate;
        this._cpDirty = true;
        this._needUpdate(0);
    }

    /**
     * Gets whether this DistanceMeasurement indicates that its measurement is approximate.
     *
     * This is ````true```` by default.
     *
     * @type {Boolean}
     */
    get approximate() {
        return this._approximate;
    }

    /**
     * Gets the origin {@link Dot3D}.
     *
     * @type {Dot3D}
     */
    get origin() {
        return this._originDot;
    }

    /**
     * Gets the target {@link Dot3D}.
     *
     * @type {Dot3D}
     */
    get target() {
        return this._targetDot;
    }

    /**
     * Gets the World-space direct point-to-point distance between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
     *
     * @type {Number}
     */
    get length() {
        this._update();
        const scale = this.plugin.viewer.scene.metrics.scale;
        return this._length * scale;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
        this._originDot.setFillColor(value);
        this._targetDot.setFillColor(value);
        this._lengthWire.setColor(value);
        this._lengthLabel.setFillColor(value);
    }

    /**
     * Sets whether this DistanceMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    set visible(value) {

        value = value !== undefined ? Boolean(value) : this.plugin.defaultVisible;

        this._visible = value;

        this._originDot.setVisible(this._visible && this._originVisible);
        this._targetDot.setVisible(this._visible && this._targetVisible);
        this._lengthWire.setVisible(this._visible && this._wireVisible);
        this._lengthLabel.setVisible(this._visible && this._wireVisible && this._lengthLabelEnabled);

        const xAxisVisible = this._visible && this._axisVisible && this._xAxisVisible;
        const yAxisVisible = this._visible && this._axisVisible && this._yAxisVisible;
        const zAxisVisible = this._visible && this._axisVisible && this._zAxisVisible;

        this._xAxisWire.setVisible(xAxisVisible);
        this._yAxisWire.setVisible(yAxisVisible);
        this._zAxisWire.setVisible(zAxisVisible);

        this._xAxisLabel.setVisible(xAxisVisible && !this._xAxisLabelCulled && this._EnabledVisible);
        this._yAxisLabel.setVisible(yAxisVisible && !this._yAxisLabelCulled && this._yLabelEnabled);
        this._zAxisLabel.setVisible(zAxisVisible && !this._zAxisLabelCulled && this._zLabelEnabled);

        this._cpDirty = true;

        this._needUpdate();
    }

    /**
     * Gets whether this DistanceMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._visible;
    }

    /**
     * Sets if the origin {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    set originVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultOriginVisible;
        this._originVisible = value;
        this._originDot.setVisible(this._visible && this._originVisible);
    }

    /**
     * Gets if the origin {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    get originVisible() {
        return this._originVisible;
    }

    /**
     * Sets if the target {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    set targetVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultTargetVisible;
        this._targetVisible = value;
        this._targetDot.setVisible(this._visible && this._targetVisible);
    }

    /**
     * Gets if the target {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    get targetVisible() {
        return this._targetVisible;
    }

    /**
     * Sets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are enabled.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set axisEnabled(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible;
        this._axisEnabled = value;
        var axisVisible = this._visible && this._axisVisible && this._axisEnabled;
        this._xAxisWire.setVisible(axisVisible && this._xAxisVisible);
        this._yAxisWire.setVisible(axisVisible && this._yAxisVisible);
        this._zAxisWire.setVisible(axisVisible && this._zAxisVisible);
        this._xAxisLabel.setVisible(axisVisible && !this._xAxisLabelCulled&& this._xAxisVisible && this._xLabelEnabled);
        this._yAxisLabel.setVisible(axisVisible && !this._yAxisLabelCulled&& this._xAxisVisible && this._yLabelEnabled);
        this._zAxisLabel.setVisible(axisVisible && !this._zAxisLabelCulled&& this._xAxisVisible && this._zLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are enabled.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get axisEnabled() {
        return this._axisEnabled;
    }

    /**
     * Sets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set axisVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible;
        this._axisVisible = value;
        var axisVisible = this._visible && this._axisVisible && this._axisEnabled;
        this._xAxisWire.setVisible(axisVisible && this._xAxisVisible);
        this._yAxisWire.setVisible(axisVisible && this._yAxisVisible);
        this._zAxisWire.setVisible(axisVisible && this._zAxisVisible);
        this._xAxisLabel.setVisible(axisVisible && !this._xAxisLabelCulled&& this._xAxisVisible);
        this._yAxisLabel.setVisible(axisVisible && !this._yAxisLabelCulled&& this._yAxisVisible);
        this._zAxisLabel.setVisible(axisVisible && !this._zAxisLabelCulled&& this._zAxisVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get axisVisible() {
        return this._axisVisible;
    }

    /**
     * Sets if the X-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set xAxisVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible;
        this._xAxisVisible = value;
        const axisVisible = this._visible && this._axisVisible && this._xAxisVisible && this._axisEnabled;
        this._xAxisWire.setVisible(axisVisible);
        this._xAxisLabel.setVisible(axisVisible && !this._xAxisLabelCulled && this._xLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the X-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get xAxisVisible() {
        return this._xAxisVisible;
    }

    /**
     * Sets if the Y-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set yAxisVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible;
        this._yAxisVisible = value;
        const axisVisible = this._visible && this._axisVisible && this._yAxisVisible && this._axisEnabled;
        this._yAxisWire.setVisible(axisVisible);
        this._yAxisLabel.setVisible(axisVisible && !this._yAxisLabelCulled && this._yLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the Y-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get yAxisVisible() {
        return this._yAxisVisible;
    }

    /**
     * Sets if the Z-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set zAxisVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible;
        this._zAxisVisible = value;
        const axisVisible = this._visible && this._axisVisible && this._zAxisVisible && this._axisEnabled;
        this._zAxisWire.setVisible(axisVisible);
        this._zAxisLabel.setVisible(axisVisible && !this._zAxisLabelCulled && this._zLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the Z-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get zAxisVisible() {
        return this._zAxisVisible;
    }

    /**
     * Sets if the direct point-to-point wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * @type {Boolean}
     */
    set wireVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultWireVisible;
        this._wireVisible = value;
        var wireVisible = this._visible && this._wireVisible;
        this._lengthLabel.setVisible(wireVisible && this._lengthLabelEnabled);
        this._lengthWire.setVisible(wireVisible);
    }

    /**
     * Gets if the direct point-to-point wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * @type {Boolean}
     */
    get wireVisible() {
        return this._wireVisible;
    }

    /**
     * Sets if the labels are visible except the length label.
     *
     * @type {Boolean}
     */
    set labelsVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultLabelsVisible;
        this._labelsVisible = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._xAxisLabel.setVisible(labelsVisible && !this._xAxisLabelCulled && this._clickable && this._axisEnabled && this._xLabelEnabled);
        this._yAxisLabel.setVisible(labelsVisible && !this._yAxisLabelCulled && this._clickable && this._axisEnabled && this._yLabelEnabled);
        this._zAxisLabel.setVisible(labelsVisible && !this._zAxisLabelCulled && this._clickable && this._axisEnabled && this._zLabelEnabled);
        this._lengthLabel.setVisible(labelsVisible && this._lengthLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the labels are visible.
     *
     * @type {Boolean}
     */
    get labelsVisible() {
        return this._labelsVisible;
    }

    /**
     * Sets if the x label is enabled.
     *
     * @type {Boolean}
     */
    set xLabelEnabled(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultXLabelEnabled;
        this._xLabelEnabled = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._xAxisLabel.setVisible(labelsVisible && !this._xAxisLabelCulled && this._clickable && this._axisEnabled && this._xLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the x label is enabled.
     *
     * @type {Boolean}
     */
    get xLabelEnabled(){
        return this._xLabelEnabled;
    }

    /**
     * Sets if the y label is enabled.
     *
     * @type {Boolean}
     */
    set yLabelEnabled(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultYLabelEnabled;
        this._yLabelEnabled = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._yAxisLabel.setVisible(labelsVisible && !this._yAxisLabelCulled && this._clickable && this._axisEnabled && this._yLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the y label is enabled.
     *
     * @type {Boolean}
     */
    get yLabelEnabled(){
        return this._yLabelEnabled;
    }

    /**
     * Sets if the z label is enabled.
     *
     * @type {Boolean}
     */
    set zLabelEnabled(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultZLabelEnabled;
        this._zLabelEnabled = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._zAxisLabel.setVisible(labelsVisible && !this._zAxisLabelCulled && this._clickable && this._axisEnabled && this._zLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the z label is enabled.
     *
     * @type {Boolean}
     */
    get zLabelEnabled(){
        return this._zLabelEnabled;
    }

    /**
     * Sets if the length label is enabled.
     *
     * @type {Boolean}
     */
    set lengthLabelEnabled(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultLengthLabelEnabled;
        this._lengthLabelEnabled = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._lengthLabel.setVisible(labelsVisible && !this._lengthAxisLabelCulled && this._clickable && this._axisEnabled && this._lengthLabelEnabled);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the length label is enabled.
     *
     * @type {Boolean}
     */
    get lengthLabelEnabled(){
        return this._lengthLabelEnabled;
    }

    /**
     * Sets if labels should be positioned on the wires.
     *
     * @type {Boolean}
     */
    set labelsOnWires(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultLabelsOnWires;
        this._labelsOnWires = value;
    }

    /**
     * Gets if labels should be positioned on the wires.
     *
     * @type {Boolean}
     */
    get labelsOnWires() {
        return this._labelsOnWires;
    }

    /**
     * Sets if this DistanceMeasurement appears highlighted.
     * @param highlighted
     */
    setHighlighted(highlighted) {
        this._originDot.setHighlighted(highlighted);
        this._targetDot.setHighlighted(highlighted);
        this._xAxisWire.setHighlighted(highlighted);
        this._yAxisWire.setHighlighted(highlighted);
        this._zAxisWire.setHighlighted(highlighted);
        this._xAxisLabel.setHighlighted(highlighted);
        this._yAxisLabel.setHighlighted(highlighted);
        this._zAxisLabel.setHighlighted(highlighted);
        this._lengthWire.setHighlighted(highlighted);
        this._lengthLabel.setHighlighted(highlighted);
    }

    /**
     * Sets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events, or ignore mouse events altogether.
     *
     * @type {Boolean}
     */
    set clickable(value) {
        value = !!value;
        this._clickable = value;
        this._originDot.setClickable(this._clickable);
        this._targetDot.setClickable(this._clickable);
        this._xAxisWire.setClickable(this._clickable);
        this._yAxisWire.setClickable(this._clickable);
        this._zAxisWire.setClickable(this._clickable);
        this._lengthWire.setClickable(this._clickable);
        this._xAxisLabel.setClickable(this._clickable);
        this._yAxisLabel.setClickable(this._clickable);
        this._zAxisLabel.setClickable(this._clickable);
        this._lengthLabel.setClickable(this._clickable);
    }

    /**
     * Gets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events.
     *
     * @type {Boolean}
     */
    get clickable() {
        return this._clickable;
    }

    /**
     * @private
     */
    destroy() {

        const scene = this.plugin.viewer.scene;
        const metrics = scene.metrics;

        if (this._onViewMatrix) {
            scene.camera.off(this._onViewMatrix);
        }
        if (this._onProjMatrix) {
            scene.camera.off(this._onProjMatrix);
        }
        if (this._onCanvasBoundary) {
            scene.canvas.off(this._onCanvasBoundary);
        }
        if (this._onMetricsUnits) {
            metrics.off(this._onMetricsUnits);
        }
        if (this._onMetricsScale) {
            metrics.off(this._onMetricsScale);
        }
        if (this._onMetricsOrigin) {
            metrics.off(this._onMetricsOrigin);
        }
        if (this._onSectionPlaneUpdated) {
            scene.off(this._onSectionPlaneUpdated);
        }

        this._originDot.destroy();
        this._targetDot.destroy();
        this._xAxisWire.destroy();
        this._yAxisWire.destroy();
        this._zAxisWire.destroy();
        this._lengthLabel.destroy();
        this._xAxisLabel.destroy();
        this._yAxisLabel.destroy();
        this._zAxisLabel.destroy();
        this._lengthWire.destroy();

        super.destroy();
    }
}

export {DistanceMeasurement};