import {Marker} from "../../viewer/scene/marker/Marker.js";
import {utils} from "../../viewer/scene/utils.js";

/**
 * A {@link Marker} with an HTML label attached to it, managed by an {@link AnnotationsPlugin}.
 *
 * See {@link AnnotationsPlugin} for more info.
 */
class Annotation extends Marker {

    /**
     * @private
     */
    constructor(owner, cfg) {

        super(owner, cfg);

        /**
         * The {@link }AnnotationsPlugin} this Annotation belongs to
         * @type {AnnotationsPlugin}
         */
        this.plugin = cfg.plugin;

        this._container = cfg.container;
        if (!this._container) {
            throw "config missing: container";
        }

        this._markerHTML = cfg.markerHTML;
        if (!this._markerHTML) {
            throw "config missing: markerHTML";
        }

        this._labelHTML = cfg.labelHTML;
        if (!this._labelHTML) {
            throw "config missing: labelHTML";
        }

        this._markerShown = false;
        this._labelShown = false;

        this._fields = cfg.fields || {};
        this._htmlDirty = true;
        this._layoutDirty = true;
        this._visibilityDirty = true;

        this._buildHTML();

        this._onTick = this.scene.on("tick", () => {
            if (this._htmlDirty) {
                this._buildHTML();
                this._htmlDirty = false;
                this._layoutDirty = true;
                this._visibilityDirty = true;
            }
            if (this._layoutDirty) {
                if (this._markerShown || this._labelShown) {
                    this._updatePosition();
                    this._layoutDirty = false;
                }
            }
            if (this._visibilityDirty) {
                this._marker.style.visibility = (this.visible && this._markerShown) ? "visible" : "hidden";
                this._label.style.visibility = (this.visible && this._markerShown && this._labelShown) ? "visible" : "hidden";
                this._visibilityDirty = false;
            }
        });

        this.on("canvasPos", () => {
            this._layoutDirty = true;
        });

        this.on("visible", () => {
            this._visibilityDirty = true;
        });

        this.setMarkerShown(cfg.markerShown !== false);
        this.setLabelShown(cfg.labelShown);

        /**
         * Optional World-space position for {@link Camera#eye}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {Number[]} Eye position.
         */
        this.eye = cfg.eye;

        /**
         * Optional World-space position for {@link Camera#look}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {Number[]} The "look" vector.
         */
        this.look = cfg.look;

        /**
         * Optional World-space position for {@link Camera#up}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {Number[]} The "up" vector.
         */
        this.up = cfg.up;
    }

    /**
     * @private
     */
    _buildHTML() {
        if (this._link) {
            this._container.removeChild(this._link);
            this._link = null;
            this._container.removeChild(this._label);
            this._label = null;
        }
        this._link = document.createElement("a");
        this._link.addEventListener("click", () => {
            this.plugin.fire("markerClicked", this);
        });
        this._link.addEventListener("mouseenter", () => {
            this.plugin.fire("markerMouseEnter", this);
        });
        this._link.addEventListener("mouseleave", () => {
            this.plugin.fire("markerMouseLeave", this);
        });
        this._container.appendChild(this._link);
        let markerHTML = this._markerHTML || "<p></p>"; // Make marker
        if (utils.isArray(markerHTML)) {
            markerHTML = markerHTML.join("");
        }
        markerHTML = this._renderTemplate(markerHTML);
        const markerFragment = document.createRange().createContextualFragment(markerHTML);
        this._marker = markerFragment.firstChild;
        this._link.appendChild(this._marker);
        this._container.appendChild(this._link);
        let labelHTML = this._labelHTML || "<p></p>"; // Make label
        if (utils.isArray(labelHTML)) {
            labelHTML = labelHTML.join("");
        }
        labelHTML = this._renderTemplate(labelHTML);
        const labelFragment = document.createRange().createContextualFragment(labelHTML);
        this._label = labelFragment.firstChild;
        this._container.appendChild(this._label);
        this._marker.style.visibility = this._markerShown ? "visible" : "hidden";
        this._label.style.visibility = (this._markerShown && this._labelShown) ? "visible" : "hidden";
    }

    /**
     * @private
     */
    _updatePosition() {
        const boundary = this.scene.canvas.boundary;
        const left = boundary[0];
        const top = boundary[1];
        const canvasPos = this.canvasPos;
        this._marker.style.left = (Math.floor(left + canvasPos[0]) - 12) + "px";
        this._marker.style.top = (Math.floor(top + canvasPos[1]) - 12) + "px";
        const offsetX = 20;
        const offsetY = -17;
        this._label.style.left = 20 + Math.floor(left + canvasPos[0] + offsetX) + "px";
        this._label.style.top = Math.floor(top + canvasPos[1] + offsetY) + "px";
        this._link.style["z-index"] = 90005 + Math.floor(this._viewPos[2] * 10) + 1;
    }

    /**
     * @private
     */
    _renderTemplate(template) {
        for (var key in this._fields) {
            if (this._fields.hasOwnProperty(key)) {
                const value = this._fields[key];
                template = template.replace(new RegExp('{{' + key + '}}', 'g'), value);
            }
        }
        return template;
    }

    /**
     * Sets whether or not to show this Annotation's marker.
     *
     * The marker shows the Annotation's position.
     *
     * The marker is only visible when both this property and {@link Annotation#visible} are ````true````.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {Boolean} shown Whether to show the marker.
     */
    setMarkerShown(shown) {
        shown = !!shown;
        if (this._markerShown === shown) {
            return;
        }
        this._markerShown = shown;
        this._visibilityDirty = true;
    }

    /**
     * Gets whether or not to show this Annotation's marker.
     *
     * The marker shows the Annotation's position.
     *
     * The marker is only visible when both this property and {@link Annotation#visible} are ````true````.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @returns {Boolean} Whether to show the marker.
     */
    getMarkerShown() {
        return this._markerShown;
    }

    /**
     * Sets whether or not to show this Annotation's label.
     *
     * The label is only visible when both this property and {@link Annotation#visible} are ````true````.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {Boolean} shown Whether to show the label.
     */
    setLabelShown(shown) {
        shown = !!shown;
        if (this._labelShown === shown) {
            return;
        }
        this._labelShown = shown;
        this._visibilityDirty = true;
    }

    /**
     * Gets whether or not to show this Annotation's label.
     *
     * The label is only visible when both this property and {@link Annotation#visible} are ````true````.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @returns {Boolean} Whether to show the label.
     */
    getLabelShown() {
        return this._labelShown;
    }

    /**
     * Sets the value of a field within the HTML templates for either the Annotation's marker or label.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {String} key Identifies the field.
     * @param {String} value The field's value.
     */
    setField(key, value) {
        this._fields[key] = value || "";
        this._htmlDirty = true;
    }

    /**
     * Gets the value of a field within the HTML templates for either the Annotation's marker or label.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {String} key Identifies the field.
     * @returns {String} The field's value.
     */
    getField(key) {
        return this._fields[key];
    }

    /**
     * Sets values for multiple fields within the Annotation's HTML templates for marker and label.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {{String:(String|Number)}} fields Map of field values.
     */
    setFields(fields) {
        for (var key in fields) {
            if (fields.hasOwnProperty(key)) {
                const value = fields[key];
                this.setField(key, value);
            }
        }
    }

    /**
     * Gets the values that were set for the fields of this Annotation's HTML marker and label templates.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @RETURNS {{String:(String|Number)}} Map of field values.
     */
    getFields() {
        return this._fields;
    }

    /**
     * Destroys this Annotation.
     */
    destroy() {
        if (this._link) {
            this._link.parentNode.removeChild(this._link);
            this._label.parentNode.removeChild(this._label);
            this._link = null;
            this._label = null;
        }
        this.scene.off(this._onTick);
        super.destroy();
    }
}

export {Annotation};