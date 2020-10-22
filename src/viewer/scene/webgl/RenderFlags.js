/**
 * Indicates what rendering needs to be done for the layers within a {@link Drawable}.
 *
 * Each Drawable has a RenderFlags in {@link Drawable#renderFlags}.
 *
 * Before rendering each frame, {@link Renderer} will call {@link Drawable#rebuildRenderFlags} on each {@link Drawable}.
 *
 * Then, when rendering a frame, Renderer will apply rendering passes to each Drawable according on what flags are set in {@link Drawable#renderFlags}.
 *
 * @private
 */
class RenderFlags {

    /**
     * @private
     */
    constructor() {

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate which layers are visible within the {@link Drawable}.
         *
         * This is a list of IDs of visible layers within the {@link Drawable}. The IDs will be whatever the
         * {@link Drawable} uses to identify its layers, usually integers.
         *
         * @property visibleLayers
         * @type {Number[]}
         */
        this.visibleLayers = [];


        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate which {@link SectionPlane}s are active within each layer of the {@link Drawable}.
         *
         * Layout is as follows:
         *
         * ````[
         *      false, false, true, // Layer 0, SectionPlanes 0, 1, 2
         *      false, true, true,  // Layer 1, SectionPlanes 0, 1, 2
         *      true, false, true   // Layer 2, SectionPlanes 0, 1, 2
         * ]````
         *
         * @property sectionPlanesActivePerLayer
         * @type {Boolean[]}
         */
        this.sectionPlanesActivePerLayer = [];

        this.reset();
    }

    /**
     * @private
     */
    reset() {

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate whether the {@link Drawable} is culled.
         * 
         * When this is ````false````, then all of the other properties on ````RenderFlags```` will remain at their default values.
         * 
         * @property culled
         * @type {Boolean}
         */
        this.culled = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the number of layers within the {@link Drawable}.
         *
         * @property numLayers
         * @type {Number}
         */
        this.numLayers = 0;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the number of visible layers within the {@link Drawable}.
         *
         * @property numVisibleLayers
         * @type {Number}
         */
        this.numVisibleLayers = 0;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawNormalFillOpaque}.
         * @property normalFillOpaque
         * @type {boolean}
         */
        this.normalFillOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawNormalEdgesOpaque}.
         * @property normalEdgesOpaque
         * @type {boolean}
         */
        this.normalEdgesOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawNormalFillTransparent}.
         * @property normalFillTransparent
         * @type {boolean}
         */
        this.normalFillTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawNormalEdgesTransparent}.
         * @property normalEdgesTransparent
         * @type {boolean}
         */
        this.normalEdgesTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawXRayedFillOpaque}.
         * @property xrayedFillOpaque
         * @type {boolean}
         */
        this.xrayedFillOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawXRayedEdgesOpaque}.
         * @property xrayedEdgesOpaque
         * @type {boolean}
         */
        this.xrayedEdgesOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawXRayedFillTransparent}.
         * @property xrayedFillTransparent
         * @type {boolean}
         */
        this.xrayedFillTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #xrayedEdgesTransparent}.
         * @property xrayedEdgesTransparent
         * @type {boolean}
         */
        this.xrayedEdgesTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #drawHighlightedFillOpaque}.
         * @property highlightedFillOpaque
         * @type {boolean}
         */
        this.highlightedFillOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #highlightedEdgesOpaque}.
         * @property highlightedEdgesOpaque
         * @type {boolean}
         */
        this.highlightedEdgesOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #highlightedFillTransparent}.
         * @property highlightedFillTransparent
         * @type {boolean}
         */
        this.highlightedFillTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #highlightedEdgesTransparent}.
         * @property highlightedEdgesTransparent
         * @type {boolean}
         */
        this.highlightedEdgesTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #selectedFillOpaque}.
         * @property selectedFillOpaque
         * @type {boolean}
         */
        this.selectedFillOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #selectedEdgesOpaque}.
         * @property selectedEdgesOpaque
         * @type {boolean}
         */
        this.selectedEdgesOpaque = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #selectedFillTransparent}.
         * @property selectedFillTransparent
         * @type {boolean}
         */
        this.selectedFillTransparent = false;

        /**
         * Set by {@link Drawable#rebuildRenderFlags} to indicate the {@link Drawable} needs {@link Drawable #selectedEdgesTransparent}.
         * @property selectedEdgesTransparent
         * @type {boolean}
         */
        this.selectedEdgesTransparent = false;
    }
}

export {RenderFlags};