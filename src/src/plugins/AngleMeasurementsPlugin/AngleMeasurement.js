import {Marker} from "../../viewer/scene/marker/Marker.js";
import {Wire} from "../lib/html/Wire.js";
import {Dot} from "../lib/html/Dot.js";
import {Label} from "../lib/html/Label.js";
import {math} from "../../viewer/scene/math/math.js";
import {Component} from "../../viewer/scene/Component.js";

var originVec = math.vec3();
var targetVec = math.vec3();

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

        super(plugin.viewer.scene, cfg);

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurement.
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._container = cfg.container;
        if (!this._container) {
            throw "config missing: container";
        }

        this._color = cfg.color || plugin.defaultColor;

        var scene = this.plugin.viewer.scene;

        this._originMarker = new Marker(scene, cfg.origin);
        this._cornerMarker = new Marker(scene, cfg.corner);
        this._targetMarker = new Marker(scene, cfg.target);

        this._originWorld = math.vec3();
        this._cornerWorld = math.vec3();
        this._targetWorld = math.vec3();

        this._wp = new Float64Array(12);
        this._vp = new Float64Array(12);
        this._pp = new Float64Array(12);
        this._cp = new Int16Array(6);

        const onMouseOver = cfg.onMouseOver ? (event) => {
            cfg.onMouseOver(event, this);
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseover', event));
        } : null;

        const onMouseLeave = cfg.onMouseLeave ? (event) => {
            cfg.onMouseLeave(event, this);
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseleave', event));
        } : null;

        const onContextMenu = cfg.onContextMenu ? (event) => {
            cfg.onContextMenu(event, this);
        } : null;

        const onMouseWheel = (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new WheelEvent('wheel', event));
        };

        const onMouseDown = (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mousedown', event));
        } ;

        const onMouseUp =  (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mouseup', event));
        };

        const onMouseMove =  (event) => {
            this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new MouseEvent('mousemove', event));
        };

        this._originDot = new Dot(this._container, {
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
        this._cornerDot = new Dot(this._container, {
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
        this._targetDot = new Dot(this._container, {
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

        this._originWire = new Wire(this._container, {
            color: this._color || "blue",
            thickness: 1,
            zIndex: plugin.zIndex,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });
        this._targetWire = new Wire(this._container, {
            color: this._color || "red",
            thickness: 1,
            zIndex: plugin.zIndex !== undefined ? plugin.zIndex + 1 : undefined,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._angleLabel = new Label(this._container, {
            fillColor: this._color || "#00BBFF",
            prefix: "",
            text: "",
            zIndex: plugin.zIndex + 2,
            onMouseOver,
            onMouseLeave,
            onMouseWheel,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            onContextMenu
        });

        this._wpDirty = false;
        this._vpDirty = false;
        this._cpDirty = false;

        this._visible = false;
        this._originVisible = false;
        this._cornerVisible = false;
        this._targetVisible = false;

        this._originWireVisible = false;
        this._targetWireVisible = false;

        this._angleVisible = false;
        this._labelsVisible = false;
        this._clickable = false;

        this._originMarker.on("worldPos", (value) => {
            this._originWorld.set(value || [0, 0, 0]);
            this._wpDirty = true;
            this._needUpdate(0); // No lag
        });

        this._cornerMarker.on("worldPos", (value) => {
            this._cornerWorld.set(value || [0, 0, 0]);
            this._wpDirty = true;
            this._needUpdate(0); // No lag
        });

        this._targetMarker.on("worldPos", (value) => {
            this._targetWorld.set(value || [0, 0, 0]);
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

        this._onSectionPlaneUpdated = scene.on("sectionPlaneUpdated", () => {
            this._sectionPlanesDirty = true;
            this._needUpdate();
        });

        this.approximate = cfg.approximate;
        this.visible = cfg.visible;

        this.originVisible = cfg.originVisible;
        this.cornerVisible = cfg.cornerVisible;
        this.targetVisible = cfg.targetVisible;

        this.originWireVisible = cfg.originWireVisible;
        this.targetWireVisible = cfg.targetWireVisible;

        this.angleVisible = cfg.angleVisible;
        this.labelsVisible = cfg.labelsVisible;
    }

    _update() {

        if (!this._visible) {
            return;
        }

        const scene = this.plugin.viewer.scene;

        if (this._wpDirty) {

            this._wp[0] = this._originWorld[0];
            this._wp[1] = this._originWorld[1];
            this._wp[2] = this._originWorld[2];
            this._wp[3] = 1.0;

            this._wp[4] = this._cornerWorld[0];
            this._wp[5] = this._cornerWorld[1];
            this._wp[6] = this._cornerWorld[2];
            this._wp[7] = 1.0;

            this._wp[8] = this._targetWorld[0];
            this._wp[9] = this._targetWorld[1];
            this._wp[10] = this._targetWorld[2];
            this._wp[11] = 1.0;

            this._wpDirty = false;
            this._vpDirty = true;
        }

        if (this._vpDirty) {

            math.transformPositions4(scene.camera.viewMatrix, this._wp, this._vp);

            this._vp[3] = 1.0;
            this._vp[7] = 1.0;
            this._vp[11] = 1.0;

            this._vpDirty = false;
            this._cpDirty = true;
        }

        if (this._sectionPlanesDirty) {

            if (this._isSliced(this._wp)) {
                this._angleLabel.setCulled(true);
                this._originWire.setCulled(true);
                this._targetWire.setCulled(true);
                this._originDot.setCulled(true);
                this._cornerDot.setCulled(true);
                this._targetDot.setCulled(true);
                return;
            } else {
                this._angleLabel.setCulled(false);
                this._originWire.setCulled(false);
                this._targetWire.setCulled(false);
                this._originDot.setCulled(false);
                this._cornerDot.setCulled(false);
                this._targetDot.setCulled(false);
            }

            this._sectionPlanesDirty = true;
        }

        if (this._cpDirty) {

            const near = -0.3;
            const zOrigin = this._originMarker.viewPos[2];
            const zCorner = this._cornerMarker.viewPos[2];
            const zTarget = this._targetMarker.viewPos[2];

            if (zOrigin > near || zCorner > near || zTarget > near) {

                this._originDot.setVisible(false);
                this._cornerDot.setVisible(false);
                this._targetDot.setVisible(false);

                this._originWire.setVisible(false);
                this._targetWire.setVisible(false);

                this._angleLabel.setCulled(true);

                return;
            }

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

            for (var i = 0, len = pp.length; i < len; i += 4) {
                cp[j] = left + Math.floor((1 + pp[i + 0] / pp[i + 3]) * canvasWidth / 2);
                cp[j + 1] = top + Math.floor((1 - pp[i + 1] / pp[i + 3]) * canvasHeight / 2);
                j += 2;
            }

            this._originDot.setPos(cp[0], cp[1]);
            this._cornerDot.setPos(cp[2], cp[3]);
            this._targetDot.setPos(cp[4], cp[5]);

            this._originWire.setStartAndEnd(cp[0], cp[1], cp[2], cp[3]);
            this._targetWire.setStartAndEnd(cp[2], cp[3], cp[4], cp[5]);

            this._angleLabel.setPosBetweenWires(cp[0], cp[1], cp[2], cp[3], cp[4], cp[5]);

            math.subVec3(this._originWorld, this._cornerWorld, originVec);
            math.subVec3(this._targetWorld, this._cornerWorld, targetVec);

            var validVecs =
                (originVec[0] !== 0 || originVec[1] !== 0 || originVec[2] !== 0) &&
                (targetVec[0] !== 0 || targetVec[1] !== 0 || targetVec[2] !== 0);

            if (validVecs) {

                const tilde = this._approximate ? " ~ " : " = ";

                math.normalizeVec3(originVec);
                math.normalizeVec3(targetVec);
                const angle = Math.abs(math.angleVec3(originVec, targetVec));
                this._angle = angle / math.DEGTORAD;
                this._angleLabel.setText(tilde + this._angle.toFixed(2) + "°");
            } else {
                this._angleLabel.setText("");
            }

            // this._angleLabel.setText((Math.abs(math.lenVec3(math.subVec3(this._targetWorld, this._originWorld, distVec3)) * scale).toFixed(2)) + unitAbbrev);

            this._originDot.setVisible(this._visible && this._originVisible);
            this._cornerDot.setVisible(this._visible && this._cornerVisible);
            this._targetDot.setVisible(this._visible && this._targetVisible);

            this._originWire.setVisible(this._visible && this._originWireVisible);
            this._targetWire.setVisible(this._visible && this._targetWireVisible);

            this._angleLabel.setCulled(!(this._visible && this._angleVisible && this.labelsVisible));

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
        this._cpDirty = true;
        this._needUpdate(0);
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
     * Gets the origin {@link Marker}.
     *
     * @type {Marker}
     */
    get origin() {
        return this._originMarker;
    }

    /**
     * Gets the corner {@link Marker}.
     *
     * @type {Marker}
     */
    get corner() {
        return this._cornerMarker;
    }

    /**
     * Gets the target {@link Marker}.
     *
     * @type {Marker}
     */
    get target() {
        return this._targetMarker;
    }

    /**
     * Gets the angle between two connected 3D line segments, given
     * as three positions on the surface(s) of one or more {@link Entity}s.
     *
     * @type {Number}
     */
    get angle() {
        this._update();
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
        this._originDot.setFillColor(value);
        this._cornerDot.setFillColor(value);
        this._targetDot.setFillColor(value);
        this._originWire.setColor(value || "blue");
        this._targetWire.setColor(value || "red");
        this._angleLabel.setFillColor(value || "#00BBFF");

        this._color = value;
    }

    /**
     * Sets whether this AngleMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    set visible(value) {
        value = value !== false;
        this._visible = value;
        this._originDot.setVisible(this._visible && this._originVisible);
        this._cornerDot.setVisible(this._visible && this._cornerVisible);
        this._targetDot.setVisible(this._visible && this._targetVisible);
        this._originWire.setVisible(this._visible && this._originWireVisible);
        this._targetWire.setVisible(this._visible && this._targetWireVisible);
        this._angleLabel.setVisible(this._visible && this._angleVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets whether this AngleMeasurement is visible or not.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._visible;
    }

    /**
     * Sets if the origin {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    set originVisible(value) {
        value = value !== false;
        this._originVisible = value;
        this._originDot.setVisible(this._visible && this._originVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the origin {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    get originVisible() {
        return this._originVisible;
    }

    /**
     * Sets if the corner {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    set cornerVisible(value) {
        value = value !== false;
        this._cornerVisible = value;
        this._cornerDot.setVisible(this._visible && this._cornerVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the corner {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    get cornerVisible() {
        return this._cornerVisible;
    }

    /**
     * Sets if the target {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    set targetVisible(value) {
        value = value !== false;
        this._targetVisible = value;
        this._targetDot.setVisible(this._visible && this._targetVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the target {@link Marker} is visible.
     *
     * @type {Boolean}
     */
    get targetVisible() {
        return this._targetVisible;
    }

    /**
     * Sets if the wire between the origin and the corner is visible.
     *
     * @type {Boolean}
     */
    set originWireVisible(value) {
        value = value !== false;
        this._originWireVisible = value;
        this._originWire.setVisible(this._visible && this._originWireVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the wire between the origin and the corner is visible.
     *
     * @type {Boolean}
     */
    get originWireVisible() {
        return this._originWireVisible;
    }

    /**
     * Sets if the wire between the target and the corner is visible.
     *
     * @type {Boolean}
     */
    set targetWireVisible(value) {
        value = value !== false;
        this._targetWireVisible = value;
        this._targetWire.setVisible(this._visible && this._targetWireVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the wire between the target and the corner is visible.
     *
     * @type {Boolean}
     */
    get targetWireVisible() {
        return this._targetWireVisible;
    }

    /**
     * Sets if the angle label is visible.
     *
     * @type {Boolean}
     */
    set angleVisible(value) {
        value = value !== false;
        this._angleVisible = value;
        this._angleLabel.setVisible(this._visible && this._angleVisible);
        this._cpDirty = true;
        this._needUpdate();
    }

    /**
     * Gets if the angle label is visible.
     *
     * @type {Boolean}
     */
    get angleVisible() {
        return this._angleVisible;
    }

    /**
     * Sets if the labels are visible.
     *
     * @type {Boolean}
     */
    set labelsVisible(value) {
        value = value !== undefined ? Boolean(value) : this.plugin.defaultLabelsVisible;
        this._labelsVisible = value;
        var labelsVisible = this._visible && this._labelsVisible;
        this._angleLabel.setVisible(labelsVisible);
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
     * Sets if this DistanceMeasurement appears highlighted.
     * @param highlighted
     */
    setHighlighted(highlighted) {
        this._originDot.setHighlighted(highlighted);
        this._cornerDot.setHighlighted(highlighted);
        this._targetDot.setHighlighted(highlighted);
        this._originWire.setHighlighted(highlighted);
        this._targetWire.setHighlighted(highlighted);
        this._angleLabel.setHighlighted(highlighted);
    }

    /**
     * Sets if the wires, dots ad labels will fire "mouseOver" "mouseLeave" and "contextMenu" events.
     *
     * @type {Boolean}
     */
    set clickable(value) {
        value = !!value;
        this._clickable = value;
        this._originDot.setClickable(this._clickable);
        this._cornerDot.setClickable(this._clickable);
        this._targetDot.setClickable(this._clickable);
        this._originWire.setClickable(this._clickable);
        this._targetWire.setClickable(this._clickable);
        this._angleLabel.setClickable(this._clickable);
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

        if (this._onViewMatrix) {
            scene.camera.off(this._onViewMatrix);
        }
        if (this._onProjMatrix) {
            scene.camera.off(this._onProjMatrix);
        }
        if (this._onCanvasBoundary) {
            scene.canvas.off(this._onCanvasBoundary);
        }
        if (this._onSectionPlaneUpdated) {
            scene.off(this._onSectionPlaneUpdated);
        }

        this._originDot.destroy();
        this._cornerDot.destroy();
        this._targetDot.destroy();

        this._originWire.destroy();
        this._targetWire.destroy();

        this._angleLabel.destroy();

        super.destroy();
    }
}

export {AngleMeasurement};
