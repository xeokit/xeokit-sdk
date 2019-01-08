/**
 * @desc A drawable {@link Scene} element.
 *
 * @interface
 * @abstract
 */
class Drawable {

    /**
     * Returns true to indicate that this is a Drawable.
     * @type {Boolean}
     * @abstract
     */
    get isDrawable() {

    }

    /**
     * Property with final value ````true```` to indicate that xeokit should render this Drawable in sorted order, relative to other Drawable of the same class.
     *
     * The sort order is determined by {@link Drawable#stateSortCompare}.
     *
     * Sorting is essential for rendering performance, so that xeokit is able to avoid applying runs of the same state changes to the GPU, ie. can collapse them.
     *
     * @type {boolean}
     * @abstract
     */
    get isStateSortable() {
    }

    /**
     * Comparison function used by the renderer to determine the order in which xeokit should render the Drawable, relative to to other Drawablees.
     *
     * Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same rendering state changes to the GPU, ie. can collapse them.
     *
     * @param {Drawable} drawable1
     * @param {Drawable} drawable2
     * @returns {number}
     * @abstract
     */
    stateSortCompare(drawable1, drawable2) {
    }

    /**
     * Called by xeokit when about to render this Drawable, to get flags indicating what rendering effects to apply for it.
     *
     * @param {RenderFlags} renderFlags Returns the rendering flags.
     * @abstract
     */
    getRenderFlags(renderFlags) {
    }

    /**
     * Configures the appearance of this Drawable when ghosted.
     *
     * Set to {@link Scene#ghostMaterial} by default.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get ghostMaterial() {
    }

    /**
     * Configures the appearance of this Drawable when highlighted.
     *
     * Set to {@link Scene#highlightMaterial} by default.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get highlightMaterial() {
    }

    /**
     * Configures the appearance of this Drawable when selected.
     *
     * Set to {@link Scene#selectedMaterial} by default.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get selectedMaterial() {
    }

    /**
     * Configures the appearance of this Drawable when edges are enhanced.
     *
     * @type {EdgeMaterial}
     * @abstract
     */
    get edgeMaterial() {
    }

    //------------------------------------------------------------------------------------------------------------------
    // Render passes
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Renders opaque edges using {@link Drawable#edgeMaterial}.
     *
     * See {@link RenderFlags#normalFillOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawNormalFillOpaque(frameCtx) {
    }

    /**
     * Renders opaque edges using {@link Drawable#edgeMaterial}.
     *
     * See {@link RenderFlags#normalEdgesOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawNormalEdgesOpaque(frameCtx) {
    }

    /**
     * Renders transparent filled surfaces using normal appearance attributes.
     *
     * See {@link RenderFlags#normalEdgesOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawNormalFillTransparent(frameCtx) {
    }

    /**
     * Renders opaque edges using {@link Drawable#edgeMaterial}.
     *
     * See {@link RenderFlags#normalEdgesTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawNormalEdgesTransparent(frameCtx) {
    }

    /**
     * Renders ghosted opaque fill using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#ghostedFillOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawGhostedFillOpaque(frameCtx) {
    }

    /**
     * Renders ghosted opaque edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#ghostedEdgesOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawGhostedEdgesOpaque(frameCtx) {
    }

    /**
     * Renders ghosted transparent edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#ghostedFillTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawGhostedFillTransparent(frameCtx) {
    }

    /**
     * Renders ghosted transparent edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#ghostedEdgesTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawGhostedEdgesTransparent(frameCtx) {
    }

    /**
     * Renders highlighted opaque fill using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#highlightedFillOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawHighlightedFillOpaque(frameCtx) {
    }

    /**
     * Renders highlighted opaque edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#highlightedEdgesOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawHighlightedEdgesOpaque(frameCtx) {
    }

    /**
     * Renders highlighted transparent fill using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#highlightedFillTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawHighlightedFillTransparent(frameCtx) {
    }

    /**
     * Renders highlighted transparent edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#highlightedEdgesTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawHighlightedEdgesTransparent(frameCtx) {
    }

    /**
     * Renders highlighted opaque fill using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#highlightedFillOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawSelectedFillOpaque(frameCtx) {
    }

    /**
     * Renders selected opaque edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#selectedEdgesOpaque}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawSelectedEdgesOpaque(frameCtx) {
    }

    /**
     * Renders selected transparent fill using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#selectedFillTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawSelectedFillTransparent(frameCtx) {
    }

    /**
     * Renders selected transparent edges using {@link Drawable#ghostMaterial}.
     *
     * See {@link RenderFlags#selectedEdgesTransparent}.
     *
     * @param {FrameContext} frameCtx Renderer frame context.
     * @abstract
     */
    drawSelectedEdgesTransparent(frameCtx) {
    }

    /**
     * Called by xeokit to get if surface pixking is possible on this Drawable.
     */
    isSurfacePickable() {
    }


    //==================================================================================================================
    // TODO picking members
    //==================================================================================================================

    drawPickDrawable(frameCtx) {

    }

    drawPickTriangles(frameCtx) {
    }

    drawPickVertices(frameCtx) {
    }

    /**
     * Given a {@link PickResult} that contains a {@link PickResult#primIndex}, which indicates that a primitive was picked on the Drawable, then add more information to the PickResult about the picked position on the surface of the Drawable.
     *
     * Architecturally, this delegates collection of that Drawable-specific info to the Drawable, allowing it to provide whatever info it's able to.
     *
     * @param {PickResult} pickResult The PickResult to augment with pick intersection information specific to this Mesh.
     * @param [pickResult.primIndex] Index of the primitive that was picked on this Mesh. Essential for obtaining the intersection information.
     * @param [pickResult.canvasPos] Canvas coordinates, provided when picking through the Canvas.
     * @param [pickResult.origin] World-space 3D ray origin, when ray picking.
     * @param [pickResult.direction] World-space 3D ray direction, provided when ray picking.
     */
    getPickResult(pickResult) {
        getPickResult(this, pickResult);
    }
}

export {Drawable};