import {Dot3D, Label3D, Wire3D} from "../lib/ui/index.js";
import {math} from "../../viewer/scene/math/math.js";
import {Component} from "../../viewer/scene/Component.js";

const tmpVec3a = math.vec3();
const tmpVec3b = math.vec3();
const tmpVec3c = math.vec3();
const tmpVec4a = math.vec4();
const tmpVec4b = math.vec4();
const tmpVec4c = math.vec4();

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

        const scene = plugin.viewer.scene;

        super(scene, cfg);

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurement.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = plugin;

        const container = cfg.container;
        if (!container) {
            throw "config missing: container";
        }

        this._color = cfg.color || plugin.defaultColor;

        const channel = function(v, defaultIfUndefined) {
            const listeners = [ ];
            let value = v !== undefined ? Boolean(v) : defaultIfUndefined;
            return {
                reg: (l) => listeners.push(l),
                get: () => value,
                set: (v) => {
                    value = v !== undefined ? Boolean(v) : defaultIfUndefined;
                    listeners.forEach(l => l(value));
                }
            };
        };

        this._visible               = channel(cfg.visible,               plugin.defaultVisible);
        this._originVisible         = channel(cfg.originVisible,         plugin.defaultOriginVisible);
        this._targetVisible         = channel(cfg.targetVisible,         plugin.defaultTargetVisible);
        this._axisVisible           = channel(cfg.axisVisible,           plugin.defaultAxisVisible);
        this._xAxisVisible          = channel(cfg.xAxisVisible,          plugin.defaultAxisVisible);
        this._yAxisVisible          = channel(cfg.yAxisVisible,          plugin.defaultAxisVisible);
        this._zAxisVisible          = channel(cfg.zAxisVisible,          plugin.defaultAxisVisible);
        this._axisEnabled           = channel(true,                      plugin.defaultAxisVisible);
        this._wireVisible           = channel(cfg.wireVisible,           plugin.defaultWireVisible);
        this._xLabelEnabled         = channel(cfg.xLabelEnabled,         plugin.defaultXLabelEnabled);
        this._yLabelEnabled         = channel(cfg.yLabelEnabled,         plugin.defaultYLabelEnabled);
        this._zLabelEnabled         = channel(cfg.zLabelEnabled,         plugin.defaultZLabelEnabled);
        this._lengthLabelEnabled    = channel(cfg.lengthLabelEnabled,    plugin.defaultLengthLabelEnabled);
        this._labelsVisible         = channel(cfg.labelsVisible,         plugin.defaultLabelsVisible);
        this._clickable             = channel(false,                     false);
        this._labelsOnWires         = channel(cfg.labelsOnWires,         plugin.defaultLabelsOnWires);
        this._useRotationAdjustment = channel(cfg.useRotationAdjustment, plugin.useRotationAdjustment);

        this._axesBasis = math.identityMat4();
        this.approximate = cfg.approximate;

        this._labelStringFormat = (len) => {
            const metrics = this.plugin.viewer.scene.metrics;
            const scale = metrics.scale;
            const unit = metrics.unitsInfo[metrics.units].abbrev;

            return (this.approximate ? " ~ " : " = ") + (len * scale).toFixed(2) + unit;
        };

        const canvas = scene.canvas.canvas;

        const onMouseOver = cfg.onMouseOver ? (event) => {
            cfg.onMouseOver(event, this);
            canvas.dispatchEvent(new MouseEvent('mouseover', event));
        } : null;

        const onMouseLeave = cfg.onMouseLeave ? (event) => {
            cfg.onMouseLeave(event, this);
            canvas.dispatchEvent(new MouseEvent('mouseleave', event));
        } : null;

        const onContextMenu = cfg.onContextMenu ? (event) => {
            cfg.onContextMenu(event, this);
        } : null;

        const onMouseDown  = (event) => canvas.dispatchEvent(new MouseEvent('mousedown', event));
        const onMouseUp    = (event) => canvas.dispatchEvent(new MouseEvent('mouseup', event));
        const onMouseMove  = (event) => canvas.dispatchEvent(new MouseEvent('mousemove', event));
        const onMouseWheel = (event) => canvas.dispatchEvent(new WheelEvent('wheel', event));


        this._cleanups = [ ];

        [ "units", "scale" ].forEach(evt => {
            const handler = scene.metrics.on("units", () => this._update());
            this._cleanups.push(() => scene.metrics.off(handler));
        });

        this._drawables = [ ];

        const registerDrawable = (drawable, visibilityChannels) => {
            const updateVisibility = () => drawable.setVisible(visibilityChannels.every(ch => ch.get()));
            visibilityChannels.forEach(ch => ch.reg(updateVisibility));
            this._drawables.push(drawable);
            this._cleanups.push(() => drawable.destroy());
        };

        const makeWire = (color, thickness, visibilityChannels) => {
            const wire = new Wire3D(scene, container, {
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
            registerDrawable(wire, visibilityChannels);
            return {
                setEnds: (p0, p1) => wire.setEnds(p0, p1),
                setColor: value => wire.setColor(value)
            };
        };
        this._lengthWire = makeWire(this._color, 2, [ this._visible, this._wireVisible ]);
        this._xAxisWire  = makeWire("red",       1, [ this._visible, this._axisEnabled, this._axisVisible, this._xAxisVisible ]);
        this._yAxisWire  = makeWire("green",     1, [ this._visible, this._axisEnabled, this._axisVisible, this._yAxisVisible ]);
        this._zAxisWire  = makeWire("blue",      1, [ this._visible, this._axisEnabled, this._axisVisible, this._zAxisVisible ]);

        const makeLabel = (color, zIndexOffset, visibilityChannels) => {
            const label = new Label3D(scene, container, {
                fillColor: color,
                zIndex: plugin.zIndex !== undefined ? plugin.zIndex + zIndexOffset : undefined,
                onMouseOver,
                onMouseLeave,
                onMouseWheel,
                onMouseDown,
                onMouseUp,
                onMouseMove,
                onContextMenu
            });
            registerDrawable(label, visibilityChannels);
            return {
                setFillColor:  value => label.setFillColor(value),
                setPosOnWire:  (p0, p1, offset, labelMinAxisLength) => label.setPosOnWire(p0, p1, offset, labelMinAxisLength),
                setPosBetween: (p0, p1, p2) => label.setPosBetween(p0, p1, p2),
                setText:       str => label.setText(str.replace(/ /g, "&nbsp;"))
            };
        };
        this._lengthLabel = makeLabel(this._color, 4, [ this._visible, this._wireVisible, this._labelsVisible, this._clickable, this._axisEnabled, this._lengthLabelEnabled ]);
        this._xAxisLabel  = makeLabel("red",       3, [ this._visible, this._axisEnabled, this._axisVisible, this._xAxisVisible, this._labelsVisible, this._clickable, this._xLabelEnabled ]);
        this._yAxisLabel  = makeLabel("green",     3, [ this._visible, this._axisEnabled, this._axisVisible, this._yAxisVisible, this._labelsVisible, this._clickable, this._yLabelEnabled ]);
        this._zAxisLabel  = makeLabel("blue",      3, [ this._visible, this._axisEnabled, this._axisVisible, this._zAxisVisible, this._labelsVisible, this._clickable, this._zLabelEnabled ]);

        const makeDot = (cfg, visibilityChannels) => {
            const dot = new Dot3D(scene, cfg, container, {
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
            dot.on("worldPos", () => this._update());
            registerDrawable(dot, visibilityChannels);
            return dot;
        };
        this._originDot = makeDot(cfg.origin, [ this._visible, this._originVisible ]);
        this._targetDot = makeDot(cfg.target, [ this._visible, this._targetVisible ]);

        this._update();
    }

    _update() {
        if (! this._targetDot) {
            return;
        }

        const p0 = this._originDot.worldPos;
        const p1 = this._targetDot.worldPos;
        const axesBasis = this._axesBasis;
        const delta = math.subVec3(p1, p0, tmpVec3a);
        const factors = math.transformVec3(axesBasis, delta, delta);

        const measurementOrientationVertical = this._useRotationAdjustment.get() && Math.abs(delta[1]) > 0;

        const setWireCoordinates = (xEnd, zStart) => {

            const metrics = this.plugin.viewer.scene.metrics;
            const scale = metrics.scale;
            const unit = metrics.unitsInfo[metrics.units].abbrev;

            const setAxisLabelCoords = (label, a, b, offsetIdx) => {
                if (this._labelsOnWires.get()) {
                    label.setPosOnWire(a, b, 0, this.plugin.labelMinAxisLength);
                } else {
                    label.setPosOnWire(p0, p1, offsetIdx * 35, 0);
                }
            };

            this._xAxisWire.setEnds(p0, xEnd);
            setAxisLabelCoords(this._xAxisLabel, p0, xEnd, 1);
            this._xAxisLabel.setText("X" + this._labelStringFormat(math.distVec3(p0, xEnd)));

            this._yAxisWire.setEnds(xEnd, zStart);
            setAxisLabelCoords(this._yAxisLabel, xEnd, zStart, 2);
            this._yAxisLabel.setText("Y" + this._labelStringFormat(math.distVec3(xEnd, zStart)));

            this._zAxisWire.setEnds(zStart, p1);
            setAxisLabelCoords(this._zAxisLabel, zStart, p1, 3);
            this._zAxisLabel.setText((measurementOrientationVertical ? "" : "Z") + this._labelStringFormat(math.distVec3(zStart, p1)));

            this._lengthWire.setEnds(p0, p1);
            setAxisLabelCoords(this._lengthLabel, p0, p1, 0);
            const length = math.distVec3(p0, p1);
            this._length = length * scale;
            this._lengthLabel.setText(this._labelStringFormat(length));
        };

        if (measurementOrientationVertical) {
            tmpVec3c[0] = p0[0];
            tmpVec3c[1] = p1[1];
            tmpVec3c[2] = p0[2];

            setWireCoordinates(p0, tmpVec3c);
        }
        else {
            tmpVec3b[0] = p0[0] + axesBasis[0] * factors[0];
            tmpVec3b[1] = p0[1] + axesBasis[4] * factors[0];
            tmpVec3b[2] = p0[2] + axesBasis[8] * factors[0];

            tmpVec3c[0] = tmpVec3b[0] + axesBasis[1] * factors[1];
            tmpVec3c[1] = tmpVec3b[1] + axesBasis[5] * factors[1];
            tmpVec3c[2] = tmpVec3b[2] + axesBasis[9] * factors[1];

            setWireCoordinates(tmpVec3b, tmpVec3c);
        }
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
        this._axesBasis.set(value);
        this._update();
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
        this._update();
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
        return this._length;
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
        this._visible.set(value);
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
        this._originVisible.set(value);
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
        this._targetVisible.set(value);
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
        this._useRotationAdjustment.set(value);
        this._update();
    }

    /**
     * Gets if the measurement is adjusted based on rotation
     *
     * @type {Boolean}
     */
    get useRotationAdjustment() {
        return this._useRotationAdjustment.get();
    }

    /**
     * Sets if the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target} are enabled.
     *
     * Wires are only shown if enabled and visible.
     *
     * @type {Boolean}
     */
    set axisEnabled(value) {
        this._axisEnabled.set(value);
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
        this._axisVisible.set(value);
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
        this._xAxisVisible.set(value);
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
        this._yAxisVisible.set(value);
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
        this._zAxisVisible.set(value);
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
        this._wireVisible.set(value);
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
        this._labelsVisible.set(value);
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
        this._xLabelEnabled.set(value);
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
        this._yLabelEnabled.set(value);
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
        this._zLabelEnabled.set(value);
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
        this._lengthLabelEnabled.set(value);
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
        this._labelsOnWires.set(value);
        this._update();
    }

    /**
     * Gets if labels should be positioned on the wires.
     *
     * @type {Boolean}
     */
    get labelsOnWires() {
        return this._labelsOnWires.get();
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
     * Sets the function to format unit strings.
     *
     * @type {Function}
     */
    set labelStringFormat(value) {
        this._labelStringFormat = value;
        this._update();
    }

    /**
     * Gets the function to format unit strings.
     *
     * @type {Function}
     */
    get labelStringFormat() {
        return this._labelStringFormat;
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
