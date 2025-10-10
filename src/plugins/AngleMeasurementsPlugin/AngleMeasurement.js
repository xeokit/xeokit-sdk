import {Dot3D, Label3D, Wire3D} from "../lib/ui/index.js";
import {math} from "../../viewer/scene/math/math.js";
import {Component} from "../../viewer/scene/Component.js";

const tmpVec3a = math.vec3();
const tmpVec3b = math.vec3();

/**
 * @desc Measures the angle indicated by three 3D points.
 *
 * See {@link AngleMeasurementsPlugin} for more info.
 */
class AngleMeasurement extends Component {

    /**
     * @private
     */
    constructor(plugin, cfg = {}) {

        const scene = plugin.viewer.scene;

        super(scene, cfg);

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurement.
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = plugin;

        const container = cfg.container;
        if (!container) {
            throw "config missing: container";
        }

        this._color = cfg.color || plugin.defaultColor;

        const channel = function(v) {
            const listeners = [ ];
            let value = v !== false;
            return {
                reg: (l) => listeners.push(l),
                get: () => value,
                set: (v) => {
                    value = v !== false;
                    listeners.forEach(l => l(value));
                }
            };
        };

        this._visible           = channel(cfg.visible);
        this._originVisible     = channel(cfg.originVisible);
        this._cornerVisible     = channel(cfg.cornerVisible);
        this._targetVisible     = channel(cfg.targetVisible);
        this._originWireVisible = channel(cfg.originWireVisible);
        this._targetWireVisible = channel(cfg.targetWireVisible);
        this._angleVisible      = channel(cfg.angleVisible);
        this._labelsVisible     = channel();
        this.labelsVisible      = cfg.labelsVisible;
        this._clickable         = channel(false);

        this.approximate = cfg.approximate;

        this._labelStringFormat = (angle) => {
            return (this._approximate ? " ~ " : " = ") + angle.toFixed(2) + "°";
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
        this._originWire = makeWire(this._color || "blue", 1, [ this._visible, this._originWireVisible ]);
        this._targetWire = makeWire(this._color || "red",  1, [ this._visible, this._targetWireVisible ]);

        const makeLabel = (color, zIndexOffset, visibilityChannels) => {
            const label = new Label3D(scene, container, {
                fillColor: color,
                zIndex: plugin.zIndex + zIndexOffset,
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
                setPosOnWire:  (p0, p1, offset) => label.setPosOnWire(p0, p1, offset),
                setPosBetween: (p0, p1, p2) => label.setPosBetween(p0, p1, p2),
                setText:       str => label.setText(str)
            };
        };
        this._angleLabel = makeLabel(this._color || "#00BBFF", 2, [ this._visible, this._angleVisible, this._labelsVisible ]);

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
        this._cornerDot = makeDot(cfg.corner, [ this._visible, this._cornerVisible ]);
        this._targetDot = makeDot(cfg.target, [ this._visible, this._targetVisible ]);

        this._update();
    }

    _update() {
        if (! this._targetDot) {
            return;
        }

        const p0 = this._originDot.worldPos;
        const p1 = this._cornerDot.worldPos;
        const p2 = this._targetDot.worldPos;

        this._originWire.setEnds(p0, p1);
        this._targetWire.setEnds(p1, p2);
        this._angleLabel.setPosBetween(p0, p1, p2);

        math.subVec3(p0, p1, tmpVec3a);
        math.subVec3(p2, p1, tmpVec3b);

        if ((math.lenVec3(tmpVec3a) > 0) && (math.lenVec3(tmpVec3b) > 0)) {
            math.normalizeVec3(tmpVec3a);
            math.normalizeVec3(tmpVec3b);
            this._angle = Math.abs(math.angleVec3(tmpVec3a, tmpVec3b)) * math.RADTODEG;
            this._angleLabel.setText(this._labelStringFormat(this._angle));
        } else {
            this._angle = undefined;
            this._angleLabel.setText("");
        }
    }

    /**
     * Sets whether this AngleMeasurement indicates that its measurement is approximate.
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
     * Gets whether this AngleMeasurement indicates that its measurement is approximate.
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
     * Gets the corner {@link Dot3D}.
     *
     * @type {Dot3D}
     */
    get corner() {
        return this._cornerDot;
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
     * Gets the angle between two connected 3D line segments, given
     * as three positions on the surface(s) of one or more {@link Entity}s.
     *
     * @type {Number}
     */
    get angle() {
        return this._angle;
    }

    /**
     * Gets the color of the angle measurement.
     *
     * The color is an HTML string representation, eg. "#00BBFF" and "blue".
     *
     * @type {String}
     */
    get color() {
        return this._color;
    }

    /** Sets the color of the angle measurement.
     *
     * The color is given as an HTML string representation, eg. "#00BBFF" and "blue".
     *
     * @type {String}
     */
    set color(value) {
        this._color = value;
        this._originDot.setFillColor(value);
        this._cornerDot.setFillColor(value);
        this._targetDot.setFillColor(value);
        this._originWire.setColor(value || "blue");
        this._targetWire.setColor(value || "red");
        this._angleLabel.setFillColor(value || "#00BBFF");
    }

    /**
     * Sets whether this AngleMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    set visible(value) {
        this._visible.set(value);
    }

    /**
     * Gets whether this AngleMeasurement is visible or not.
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
     * Sets if the corner {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    set cornerVisible(value) {
        this._cornerVisible.set(value);
    }

    /**
     * Gets if the corner {@link Dot3D} is visible.
     *
     * @type {Boolean}
     */
    get cornerVisible() {
        return this._cornerVisible.get();
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
     * Sets if the wire between the origin and the corner is visible.
     *
     * @type {Boolean}
     */
    set originWireVisible(value) {
        this._originWireVisible.set(value);
    }

    /**
     * Gets if the wire between the origin and the corner is visible.
     *
     * @type {Boolean}
     */
    get originWireVisible() {
        return this._originWireVisible.get();
    }

    /**
     * Sets if the wire between the target and the corner is visible.
     *
     * @type {Boolean}
     */
    set targetWireVisible(value) {
        this._targetWireVisible.set(value);
    }

    /**
     * Gets if the wire between the target and the corner is visible.
     *
     * @type {Boolean}
     */
    get targetWireVisible() {
        return this._targetWireVisible.get();
    }

    /**
     * Sets if the angle label is visible.
     *
     * @type {Boolean}
     */
    set angleVisible(value) {
        this._angleVisible.set(value);
    }

    /**
     * Gets if the angle label is visible.
     *
     * @type {Boolean}
     */
    get angleVisible() {
        return this._angleVisible.get();
    }

    /**
     * Sets if the labels are visible.
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
     * Sets if this DistanceMeasurement appears highlighted.
     * @param highlighted
     */
    setHighlighted(highlighted) {
        this._drawables.forEach(d => d.setHighlighted(highlighted));
    }

    /**
     * Sets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events.
     *
     * @type {Boolean}
     */
    set clickable(value) {
        this._clickable.set(!!value);
        this._drawables.forEach(d => d.setClickable(this._clickable.get()));
    }

    /**
     * Gets the function that formats the angle label's text.
     *
     * By default, this function formats the angle with two decimal places.
     */
    get labelStringFormat() {
        return this._labelStringFormat;
    }

    /** 
     * Sets the function that formats the angle label's text.
     */
    set labelStringFormat(value) {
        this._labelStringFormat = value;
        this._update();
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

export {AngleMeasurement};
