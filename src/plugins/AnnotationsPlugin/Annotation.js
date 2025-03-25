import {math} from '../../viewer/scene/math/math.js';
import {Marker} from "../../viewer/scene/marker/Marker.js";
import {utils} from "../../viewer/scene/utils.js";
import { addContextMenuListener } from '../lib/html/MenuEvent.js';

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

const px = x => x + "px";

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
         * The {@link AnnotationsPlugin} this Annotation was created by.
         * @type {AnnotationsPlugin}
         */
        this.plugin = cfg.plugin;

        this._container = cfg.container;
        if (!this._container) {
            throw "config missing: container";
        }

        if ((!cfg.markerElement) && (!cfg.markerHTML)) {
            throw "config missing: need either markerElement or markerHTML";
        }
        if ((!cfg.labelElement) && (!cfg.labelHTML)) {
            throw "config missing: need either labelElement or labelHTML";
        }

        this._htmlDirty = false;
        this._curMarkerWidth = undefined;
        this._curLabelWidth = 0;

        if (cfg.markerElement) {
            this._marker = cfg.markerElement;
            this._marker.addEventListener("click", this._onMouseClickedExternalMarker = () => {
                this.plugin.fire("markerClicked", this);
            });
            this._onContextMenuExternalMarker = () => {
                this.plugin.fire("contextmenu", this);
            }
            this._onContextMenuExternalMarkerRemover = addContextMenuListener(this._marker, this._onContextMenuExternalMarker);
            this._marker.addEventListener("mouseenter", this._onMouseEnterExternalMarker = () => {
                this.plugin.fire("markerMouseEnter", this);
            });
            this._marker.addEventListener("mouseleave", this._onMouseLeaveExternalMarker = () => {
                this.plugin.fire("markerMouseLeave", this);
            });
            this._markerExternal = true; // Don't destroy marker when destroying Annotation
        } else {
            this._markerHTML = cfg.markerHTML;
            this._htmlDirty = true;
            this._markerExternal = false;
        }

        if (cfg.labelElement) {
            this._label = cfg.labelElement;
            this._labelExternal = true; // Don't destroy marker when destroying Annotation
        } else {
            this._labelHTML = cfg.labelHTML;
            this._htmlDirty = true;
            this._labelExternal = false;
        }

        this._markerShown = !!cfg.markerShown;
        this._labelShown = !!cfg.labelShown;
        this._values = cfg.values || {};
        this._layoutDirty = true;
        this._visibilityDirty = true;
        this._labelPosition = 24;

        this._buildHTML();

        this._onTick = this.scene.on("tick", () => {
            if (this._htmlDirty) {
                this._buildHTML();
                this._htmlDirty = false;
                this._layoutDirty = true;
                this._visibilityDirty = true;
            }
            if (this._layoutDirty || this._visibilityDirty) {
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
        this.eye = cfg.eye ? cfg.eye.slice() : null;

        /**
         * Optional World-space position for {@link Camera#look}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {Number[]} The "look" vector.
         */
        this.look = cfg.look ? cfg.look.slice() : null;

        /**
         * Optional World-space position for {@link Camera#up}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {Number[]} The "up" vector.
         */
        this.up = cfg.up ? cfg.up.slice() : null;

        /**
         * Optional projection type for {@link Camera#projection}, used when this Annotation is associated with a {@link Camera} position.
         *
         * Undefined by default.
         *
         * @type {String} The projection type - "perspective" or "ortho"..
         */
        this.projection = cfg.projection;
    }

    /**
     * @private
     */
    _buildHTML() {
        if (!this._markerExternal) {
            if (this._marker) {
                this._container.removeChild(this._marker);
                this._marker = null;
            }
            let markerHTML = this._markerHTML || "<p></p>"; // Make marker
            if (utils.isArray(markerHTML)) {
                markerHTML = markerHTML.join("");
            }
            markerHTML = this._renderTemplate(markerHTML.trim());
            const markerFragment = document.createRange().createContextualFragment(markerHTML);
            this._marker = markerFragment.firstChild;
            this._container.appendChild(this._marker);
            this._marker.style.visibility = this._markerShown ? "visible" : "hidden";
            this._marker.addEventListener("click", () => {
                this.plugin.fire("markerClicked", this);
            });
            addContextMenuListener(this._marker, e => {
                e.preventDefault();
                this.plugin.fire("contextmenu", this);
            }, e => {
                e.preventDefault();
                this.plugin.fire("markerClicked", this);
            })
            this._marker.addEventListener("mouseenter", () => {
                this.plugin.fire("markerMouseEnter", this);
            });
            this._marker.addEventListener("mouseleave", () => {
                this.plugin.fire("markerMouseLeave", this);
            });
            this._marker.addEventListener('wheel', (event) => {
                this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new WheelEvent('wheel', event));
            });
        }
        if (!this._labelExternal) {
            if (this._label) {
                this._container.removeChild(this._label);
                this._label = null;
            }
            let labelHTML = this._labelHTML || "<p></p>"; // Make label
            if (utils.isArray(labelHTML)) {
                labelHTML = labelHTML.join("");
            }
            labelHTML = this._renderTemplate(labelHTML.trim());
            const labelFragment = document.createRange().createContextualFragment(labelHTML);
            this._label = labelFragment.firstChild;
            this._container.appendChild(this._label);
            this._label.style.visibility = (this._markerShown && this._labelShown) ? "visible" : "hidden";
            this._label.addEventListener('wheel', (event) => {
                this.plugin.viewer.scene.canvas.canvas.dispatchEvent(new WheelEvent('wheel', event));
            });
        }
    }

    /**
     * @private
     */
    _updateWithCurWidths() {
        const boundary = this.scene.canvas.boundary;
        const left = boundary[0] + this.canvasPos[0];
        const top  = boundary[1] + this.canvasPos[1];
        this._marker.style.top = px(top - 12);
        this._label.style.top  = px(top - 17);

        if (this._markerAlign === "legacy") {
            this._marker.style.left = px(left - 12);
            this._label.style.left  = px(left + 40);
        } else {
            const markerWidth = this._curMarkerWidth;
            const markerDir = (this._markerAlign === "right") ? -1 : ((this._markerAlign === "center") ? 0 : 1);
            const markerCenter = left + markerDir * (markerWidth / 2 - 12);
            this._marker.style.left = px(markerCenter - markerWidth / 2);

            const labelWidth = this._curLabelWidth;
            const labelDir = Math.sign(this._labelPosition);
            this._label.style.left = px(markerCenter + labelDir * (markerWidth / 2 + Math.abs(this._labelPosition) + labelWidth / 2) - labelWidth / 2);
        }

        const zIndex = 90005 + Math.floor(this._viewPos[2]) + 1;
        this._marker.style["z-index"] = zIndex;
        this._label.style["z-index"]  = zIndex;
    }

    /**
     * @private
     */
    _updateIfWidthsChanged() {
        let needsUpdate = false;
        const markerWidth = this._marker.getBoundingClientRect().width;
        if (this._curMarkerWidth !== markerWidth) {
            this._curMarkerWidth = markerWidth;
            needsUpdate = true;
        }
        const labelDir = Math.sign(this._labelPosition);
        // if (labelDir === 1) then don't perform relatively expensive label.getBoundingClientRect call
        if (labelDir !== 1) {
            const labelWidth = this._label.getBoundingClientRect().width;
            if (this._curLabelWidth !== labelWidth) {
                this._curLabelWidth = labelWidth;
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            this._updateWithCurWidths();
        }
    }

    /**
     * @private
     */
    _updatePosition() {
        const isLegacy = this._markerAlign === "legacy";
        if ((! isLegacy) && (this._curMarkerWidth === undefined)) {
            this._updateIfWidthsChanged();
        } else {
            // Update position with cached width values
            // and postpone expensive Annotation's getBoundingClientRect calls
            // so they don't interfere with e.g. interactive scene manipulation
            this._updateWithCurWidths();
            window.clearTimeout(this._widthTimeout);
            if (! isLegacy) {
                this._widthTimeout = window.setTimeout(() => this._updateIfWidthsChanged(), 500);
            }
        }
    }

    /**
     * @private
     */
    _renderTemplate(template) {
        for (var key in this._values) {
            if (this._values.hasOwnProperty(key)) {
                const value = this._values[key];
                template = template.replace(new RegExp('{{' + key + '}}', 'g'), value);
            }
        }
        return template;
    }

    /**
     * Sets the Marker's worldPos and entity properties based on passed {@link PickResult}
     *
     * @param {PickResult} pickResult A PickResult to position the Marker at.
     */
    setFromPickResult(pickResult) {
        if (!pickResult.worldPos || !pickResult.worldNormal) {
            this.error("Param 'pickResult' does not have both worldPos and worldNormal");
        } else {
            const normalizedWorldNormal = math.normalizeVec3(pickResult.worldNormal, tempVec3a);
            const offset = (this.plugin && this.plugin.surfaceOffset) || 0;
            const offsetVec = math.mulVec3Scalar(normalizedWorldNormal, offset, tempVec3b);
            const offsetWorldPos = math.addVec3(pickResult.worldPos, offsetVec, tempVec3c);
            this.entity = pickResult.entity;
            this.worldPos = offsetWorldPos;
        }
    }

    /**
     * Sets the horizontal alignment of the Annotation's marker HTML.
     *
     * @param {String} align Either "left", "center", "right", "legacy" (default "left")
     */
    setMarkerAlign(align) {
        const valid = [ "left", "center", "right", "legacy" ];
        if (! valid.includes(align)) {
            this.error("Param 'align' should be one of: " + JSON.stringify(valid));
        } else {
            this._markerAlign = align;
            this._updatePosition();
        }
    }

    /**
     * Sets the relative horizontal position of the Annotation's label HTML.
     *
     * @param {Number} position Negative - to the left, positive - to the right, otherwise ignore (default 24)
     */
    setLabelPosition(position) {
        if (typeof position !== "number") {
            this.error("Param 'position' is not a number");
        } else if (position === 0) {
            this.error("Param 'position' is zero");
        } else {
            this._labelPosition = position;
            this._updatePosition();
        }
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
        this._values[key] = value || "";
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
        return this._values[key];
    }

    /**
     * Sets values for multiple placeholders within the Annotation's HTML templates for marker and label.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @param {{String:(String|Number)}} values Map of field values.
     */
    setValues(values) {
        for (var key in values) {
            if (values.hasOwnProperty(key)) {
                const value = values[key];
                this.setField(key, value);
            }
        }
    }

    /**
     * Gets the values that were set for the placeholders within this Annotation's HTML marker and label templates.
     *
     * See {@link AnnotationsPlugin} for more info.
     *
     * @RETURNS {{String:(String|Number)}} Map of field values.
     */
    getValues() {
        return this._values;
    }

    /**
     * Destroys this Annotation.
     *
     * You can also call {@link AnnotationsPlugin#destroyAnnotation}.
     */
    destroy() {
        if (this._marker) {
            if (!this._markerExternal) {
                this._marker.parentNode.removeChild(this._marker);
                this._marker = null;
            } else {
                this._marker.removeEventListener("click", this._onMouseClickedExternalMarker);
                this._onContextMenuExternalMarkerRemover();
                this._marker.removeEventListener("mouseenter", this._onMouseEnterExternalMarker);
                this._marker.removeEventListener("mouseleave", this._onMouseLeaveExternalMarker);
                this._marker = null;
            }
        }
        if (this._label) {
            if (!this._labelExternal) {
                this._label.parentNode.removeChild(this._label);
            }
            this._label = null;
        }
        this.scene.off(this._onTick);
        super.destroy();
    }
}

export {Annotation};