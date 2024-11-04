import {Dot3D} from "../lib/ui/index.js";
import {Wire} from "../lib/html/Wire.js";
import {Label} from "../lib/html/Label.js";
import {math} from "../../viewer/scene/math/math.js";
import {Component} from "../../viewer/scene/Component.js";


const distVec3 = math.vec3();
const tmpVec3 = math.vec3();

const lengthWire = (x1, y1, x2, y2) => {
    var a = x1 - x2;
    var b = y1 - y2;
    return Math.sqrt(a * a + b * b);
};

function determineMeasurementOrientation(A, B, distance) {
    const yDiff = Math.abs(B[1] - A[1]);

    return yDiff > distance ? 'Vertical' : 'Horizontal';
}

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

        this._xAxisLabelUnculled = true;
        this._yAxisLabelUnculled = true;
        this._zAxisLabelUnculled = true;

        this._color = cfg.color || this.plugin.defaultColor;

        this._measurementOrientation = 'Horizontal';
        this._wpDirty = false;
        this._vpDirty = false;
        this._cpDirty = false;
        this._sectionPlanesDirty = true;

        const channel = function(initialValue) {
            const listeners = [ ];
            let value = initialValue;
            return {
                register: (l) => listeners.push(l),
                get: () => value,
                set: (v) => {
                    value = v;
                    listeners.forEach(l => l(v));
                }
            };
        };

        this._visible            = channel();
        this._originVisible      = channel(false);
        this._targetVisible      = channel(false);
        this._axisVisible        = channel(false);
        this._xAxisVisible       = channel(false);
        this._yAxisVisible       = channel(false);
        this._zAxisVisible       = channel(false);
        this._axisEnabled        = channel(true);
        this._wireVisible        = channel(false);
        this._xLabelEnabled      = channel(false);
        this._yLabelEnabled      = channel(false);
        this._zLabelEnabled      = channel(false);
        this._lengthLabelEnabled = channel(false);
        this._labelsVisible      = channel(false);
        this._clickable          = channel(false);
        this._labelsOnWires      = false;
        this._useRotationAdjustment = false;

        this._cleanups = [ ];
        this._drawables = [ ];

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

        const makeDot = (cfg, coordinateVector, visibilityChannels) => {
            const dot = new Dot3D(scene, cfg, this._container, {
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
            dot.on("worldPos", (value) => {
                coordinateVector.set(value || [0,0,0]);
                this._wpDirty = true; // should this be needed?
                this._needUpdate(0); // No lag
            });
            const update = () => dot.setVisible(visibilityChannels.every(ch => ch.get()));
            visibilityChannels.forEach(ch => ch.register(update));
            this._drawables.push(dot);
            this._cleanups.push(() => dot.destroy());
            return dot;
        };
        this._originDot = makeDot(cfg.origin, this._originWorld, [ this._visible, this._originVisible ]);
        this._targetDot = makeDot(cfg.target, this._targetWorld, [ this._visible, this._targetVisible ]);

        const makeWire = (color, thickness, visibilityChannels) => {
            const wire = new Wire(this._container, {
                color: color,
                thickness: thickness,
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
            const update = () => wire.setVisible(visibilityChannels.every(ch => ch.get()));
            visibilityChannels.forEach(ch => ch.register(update));
            this._drawables.push(wire);
            this._cleanups.push(() => wire.destroy());
            return wire;
        };
        this._lengthWire = makeWire(this._color, 2, [ this._visible, this._wireVisible ]);
        this._xAxisWire  = makeWire("#FF0000",   1, [ this._visible, this._axisEnabled, this._axisVisible, this._xAxisVisible ]);
        this._yAxisWire  = makeWire("green",     1, [ this._visible, this._axisEnabled, this._axisVisible, this._yAxisVisible ]);
        this._zAxisWire  = makeWire("blue",      1, [ this._visible, this._axisEnabled, this._axisVisible, this._zAxisVisible ]);

        const makeLabel = (color, prefix, zIndexOffset, visibilityChannels) => {
            const label = new Label(this._container, {
                fillColor: this._color,
                prefix: "",
                text: "",
                zIndex: plugin.zIndex !== undefined ? plugin.zIndex + zIndexOffset : undefined,
                onMouseOver,
                onMouseLeave,
                onMouseWheel,
                onMouseDown,
                onMouseUp,
                onMouseMove,
                onContextMenu
            });
            const update = () => label.setVisible(visibilityChannels.every(ch => ch.get()));
            visibilityChannels.forEach(ch => ch.register(update));
            this._drawables.push(label);
            this._cleanups.push(() => label.destroy());
            return label;
        };
        this._lengthLabel = makeLabel(this._color, "",  4, [ this._visible, this._labelsVisible, this._clickable, this._axisEnabled, this._lengthLabelEnabled, this._wireVisible ]);
        this._xAxisLabel  = makeLabel("red",       "X", 3, [ this._visible, this._labelsVisible, this._clickable, this._axisEnabled, this._axisVisible, this._xAxisVisible, this._xLabelEnabled ]); // , this._xAxisLabelUnculled ]);
        this._yAxisLabel  = makeLabel("green",     "Y", 3, [ this._visible, this._labelsVisible, this._clickable, this._axisEnabled, this._axisVisible, this._yAxisVisible, this._yLabelEnabled ]); // , this._yAxisLabelUnculled ]);
        this._zAxisLabel  = makeLabel("blue",      "Z", 3, [ this._visible, this._labelsVisible, this._clickable, this._axisEnabled, this._axisVisible, this._zAxisVisible, this._zLabelEnabled ]); // , this._zAxisLabelUnculled ]);

        const cameraOn = (event, cb) => {
            const handler = scene.camera.on("viewMatrix", cb);
            this._cleanups.push(() => scene.camera.off(handler));
        };

        cameraOn("viewMatrix", () => {
            this._vpDirty = true;
            this._needUpdate(0); // No lag
        });

        cameraOn("projMatrix", () => {
            this._cpDirty = true;
            this._needUpdate();
        });

        const onCanvasBoundary = scene.canvas.on("boundary", () => {
            this._cpDirty = true;
            this._needUpdate(0); // No lag
        });
        this._cleanups.push(() => scene.canvas.off(onCanvasBoundary));

        [ "units", "scale", "origin" ].forEach(evt => {
            const handler = scene.metrics.on("units", () => {
                this._cpDirty = true;
                this._needUpdate();
            });
            this._cleanups.push(() => scene.metrics.off(handler));
        });

        const onSectionPlaneUpdated = scene.on("sectionPlaneUpdated", () =>{
            this._sectionPlanesDirty = true;
            this._needUpdate();
        });
        this._cleanups.push(() => scene.off(onSectionPlaneUpdated));

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
        this._useRotationAdjustment = cfg.useRotationAdjustment;

        /**
         * @type {number[]}
         */
        this._axesBasis = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
    }

    /**
     * Sets the axes basis for the measurement.
     * 
     * The value is a 4x4 matrix where each column-vector defines an axis and must have unit length.
     * 
     * This is the ```identity``` matrix by default, meaning the measurement axes are the same as the world axes.
     * 
     * @param {number[]} value 
     */
    set axesBasis(value) {
        this._axesBasis = value.slice();
        this._wpDirty = true;
        this._needUpdate(0); // No lag
    }

    /**
     * Gets the axes basis for the measurement.
     * 
     * The value is a 4x4 matrix where each column-vector defines an axis and must have unit length.
     * 
     * This is the ```identity``` matrix by default, meaning the measurement axes are the same as the world axes.
     * 
     * @type {number[]}
     */
    get axesBasis() {
        return this._axesBasis;
    }

    _update() {

        if (!this._visible.get()) {
            return;
        }

        const scene = this.plugin.viewer.scene;

        if (this._wpDirty) {
            const delta = math.subVec3(
                this._targetWorld,
                this._originWorld,
                tmpVec3
            );

            /**
             * The length detected for each measurement axis.
             */
            this._factors = math.transformVec3(this._axesBasis, delta);

            this._measurementOrientation = determineMeasurementOrientation(this._originWorld, this._targetWorld, 0);
            if (this._measurementOrientation === 'Vertical' && this._useRotationAdjustment) {
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

                this._wp[4] = this._originWorld[0] + this._axesBasis[0]*this._factors[0];
                this._wp[5] = this._originWorld[1] + this._axesBasis[4]*this._factors[0];
                this._wp[6] = this._originWorld[2] + this._axesBasis[8]*this._factors[0];
                this._wp[7] = 1.0;

                this._wp[8] = this._originWorld[0] + this._axesBasis[0]*this._factors[0]+ this._axesBasis[1]*this._factors[1];
                this._wp[9] = this._originWorld[1] + this._axesBasis[4]*this._factors[0]+ this._axesBasis[5]*this._factors[1];
                this._wp[10] = this._originWorld[2] + this._axesBasis[8]*this._factors[0]+ this._axesBasis[9]*this._factors[1];;
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
                    this._xAxisLabelUnculled = (xAxisCanvasLength >= labelMinAxisLength);
                    this._yAxisLabelUnculled = (yAxisCanvasLength >= labelMinAxisLength);
                    this._zAxisLabelUnculled = (zAxisCanvasLength >= labelMinAxisLength);
                } else {
                    this._xAxisLabelUnculled = true;
                    this._yAxisLabelUnculled = true;
                    this._zAxisLabelUnculled = true;
                }

                if (this._xAxisLabelUnculled) {
                    this._xAxisLabel.setText(tilde + Math.abs(this._factors[0] * scale).toFixed(2) + unitAbbrev);
                    this._xAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._xAxisLabel.setCulled(true);
                }

                if (this._yAxisLabelUnculled) {
                    this._yAxisLabel.setText(tilde + Math.abs(this._factors[1] * scale).toFixed(2) + unitAbbrev);
                    this._yAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._yAxisLabel.setCulled(true);
                }

                if (this._zAxisLabelUnculled) {
                    if (this._measurementOrientation === 'Vertical' && this._useRotationAdjustment) {
                        this._zAxisLabel.setPrefix("");
                        this._zAxisLabel.setText(tilde + Math.abs(math.lenVec3(math.subVec3(this._targetWorld, [this._originWorld[0], this._targetWorld[1], this._originWorld[2]], distVec3)) * scale).toFixed(2) + unitAbbrev);
                    }
                    else {
                        this._zAxisLabel.setPrefix("Z");
                        this._zAxisLabel.setText(tilde + Math.abs(this._factors[2] * scale).toFixed(2) + unitAbbrev);
                    }
                    this._zAxisLabel.setCulled(!this.axisVisible);
                } else {
                    this._zAxisLabel.setCulled(true);
                }
            }

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
        this._visible.set(value !== undefined ? Boolean(value) : this.plugin.defaultVisible);
    }

    /**
     * Gets whether this DistanceMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._visible.get();
    }

    /**
     * Sets if the origin {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    set originVisible(value) {
        this._originVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultOriginVisible);
    }

    /**
     * Gets if the origin {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    get originVisible() {
        return this._originVisible.get();
    }

    /**
     * Sets if the target {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    set targetVisible(value) {
        this._targetVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultTargetVisible);
    }

    /**
     * Gets if the target {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    get targetVisible() {
        return this._targetVisible.get();
    }

    /**
     * Sets if the measurement is adjusted based on rotation
     *
     * @type {Boolean}
     */
    set useRotationAdjustment(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.useRotationAdjustment;
        this._useRotationAdjustment = value;
    }

    /**
     * Gets if the measurement is adjusted based on rotation
     *
     * @type {Boolean}
     */
    get useRotationAdjustment() {
        return this._useRotationAdjustment;
    }

    /**
     * Sets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are enabled.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set axisEnabled(value) {
        this._axisEnabled.set(value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible);
    }

    /**
     * Gets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are enabled.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get axisEnabled() {
        return this._axisEnabled.get();
    }

    /**
     * Sets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set axisVisible(value) {
        this._axisVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible);
    }

    /**
     * Gets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get axisVisible() {
        return this._axisVisible.get();
    }

    /**
     * Sets if the X-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set xAxisVisible(value) {
        this._xAxisVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible);
    }

    /**
     * Gets if the X-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get xAxisVisible() {
        return this._xAxisVisible.get();
    }

    /**
     * Sets if the Y-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set yAxisVisible(value) {
        this._yAxisVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible);
    }

    /**
     * Gets if the Y-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get yAxisVisible() {
        return this._yAxisVisible.get();
    }

    /**
     * Sets if the Z-axis-aligned wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set zAxisVisible(value) {
        this._zAxisVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultAxisVisible);
    }

    /**
     * Gets if the Z-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are visible.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    get zAxisVisible() {
        return this._zAxisVisible.get();
    }

    /**
     * Sets if the direct point-to-point wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * @type {Boolean}
     */
    set wireVisible(value) {
        this._wireVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultWireVisible);
    }

    /**
     * Gets if the direct point-to-point wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} is visible.
     *
     * @type {Boolean}
     */
    get wireVisible() {
        return this._wireVisible.get();
    }

    /**
     * Sets if the labels are visible except the length label.
     *
     * @type {Boolean}
     */
    set labelsVisible(value) {
        this._labelsVisible.set(value !== undefined ? Boolean(value) : this.plugin.defaultLabelsVisible);
    }

    /**
     * Gets if the labels are visible.
     *
     * @type {Boolean}
     */
    get labelsVisible() {
        return this._labelsVisible.get();
    }

    /**
     * Sets if the x label is enabled.
     *
     * @type {Boolean}
     */
    set xLabelEnabled(value) {
        this._xLabelEnabled.set(value !== undefined ? Boolean(value) : this.plugin.defaultXLabelEnabled);
    }

    /**
     * Gets if the x label is enabled.
     *
     * @type {Boolean}
     */
    get xLabelEnabled(){
        return this._xLabelEnabled.get();
    }

    /**
     * Sets if the y label is enabled.
     *
     * @type {Boolean}
     */
    set yLabelEnabled(value) {
        this._yLabelEnabled.set(value !== undefined ? Boolean(value) : this.plugin.defaultYLabelEnabled);
    }

    /**
     * Gets if the y label is enabled.
     *
     * @type {Boolean}
     */
    get yLabelEnabled(){
        return this._yLabelEnabled.get();
    }

    /**
     * Sets if the z label is enabled.
     *
     * @type {Boolean}
     */
    set zLabelEnabled(value) {
        this._zLabelEnabled.set(value !== undefined ? Boolean(value) : this.plugin.defaultZLabelEnabled);
    }

    /**
     * Gets if the z label is enabled.
     *
     * @type {Boolean}
     */
    get zLabelEnabled(){
        return this._zLabelEnabled.get();
    }

    /**
     * Sets if the length label is enabled.
     *
     * @type {Boolean}
     */
    set lengthLabelEnabled(value) {
        this._lengthLabelEnabled.set(value !== undefined ? Boolean(value) : this.plugin.defaultLengthLabelEnabled);
    }

    /**
     * Gets if the length label is enabled.
     *
     * @type {Boolean}
     */
    get lengthLabelEnabled(){
        return this._lengthLabelEnabled.get();
    }

    /**
     * Sets if labels should be positioned on the wires.
     *
     * @type {Boolean}
     */
    set labelsOnWires(value) {
        this._labelsOnWires = value !== undefined ? Boolean(value) : this.plugin.defaultLabelsOnWires;
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
        this._drawables.forEach(d => d.setHighlighted(highlighted));
    }

    /**
     * Sets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events, or ignore mouse events altogether.
     *
     * @type {Boolean}
     */
    set clickable(value) {
        this._clickable.set(!!value);
        this._drawables.forEach(d => d.setClickable(this._clickable.get()));
    }

    /**
     * Gets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events.
     *
     * @type {Boolean}
     */
    get clickable() {
        return this._clickable.get();
    }

    /**
     * @private
     */
    destroy() {
        this._cleanups.forEach(cleanup => cleanup());
        super.destroy();
    }
}

export {DistanceMeasurement};
