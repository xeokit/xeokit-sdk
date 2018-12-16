
/**

 Passed to each {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} method as
 xeokit is about to render it, to query what effects the renderer should apply to it.

 @class RenderFlags
 @constructor
 @module xeokit
 @submodule webgl
 */
class RenderFlags {

    constructor() {
        this.reset();
    }

    reset() {

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered solid and opaque.
         * @property normalFillOpaque
         * @type {boolean}
         */
        this.normalFillOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered solid and opaque.
         * @property normalEdgesOpaque
         * @type {boolean}
         */
        this.normalEdgesOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs its surfaces rendered solid and transparent.
         * @property normalFillTransparent
         * @type {boolean}
         */
        this.normalFillTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered opaque.
         * @property normalEdgesTransparent
         * @type {boolean}
         */
        this.normalEdgesTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and ghosted.
         * @property ghostedFillOpaque
         * @type {boolean}
         */
        this.ghostedFillOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered opaque and ghosted.
         * @property ghostedEdgesOpaque
         * @type {boolean}
         */
        this.ghostedEdgesOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and transparently ghosted.
         * @property ghostedFillTransparent
         * @type {boolean}
         */
        this.ghostedFillTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered transparent and ghosted.
         * @property ghostedEdgesTransparent
         * @type {boolean}
         */
        this.ghostedEdgesTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and highlighted.
         * @property highlightedFillOpaque
         * @type {boolean}
         */
        this.highlightedFillOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered opaque and highlighted.
         * @property highlightedEdgesOpaque
         * @type {boolean}
         */
        this.highlightedEdgesOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and transparently highlighted.
         * @property highlightedFillTransparent
         * @type {boolean}
         */
        this.highlightedFillTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered transparent.
         * @property highlightedEdgesTransparent
         * @type {boolean}
         */
        this.highlightedEdgesTransparent = false;


        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and selected.
         * @property selectedFillOpaque
         * @type {boolean}
         */
        this.selectedFillOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered opaque and selected.
         * @property selectedEdgesOpaque
         * @type {boolean}
         */
        this.selectedEdgesOpaque = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs surfaces rendered filled and transparently selected.
         * @property selectedFillTransparent
         * @type {boolean}
         */
        this.selectedFillTransparent = false;

        /**
         * Set by {@link Drawable/getRenderFlags:method"}}Drawable#getRenderFlags(){{/crossLink}} to indicate
         * the Drawable needs edges rendered transparent.
         * @property selectedEdgesTransparent
         * @type {boolean}
         */
        this.selectedEdgesTransparent = false;
    }
}

export {RenderFlags};