/**
 * The **Drawable** interface defines the contract implemented by renderable components in xeokit.
 *
 * * Drawable is a "virtual type" that has no concrete JavaScript implementation.
 * * Within xeokit's core classes, Drawable is only implemented by {@link Mesh}.
 * * Implement Drawable by your own subclasses to plug custom drawable components into xeokit.
 *
 * @class Drawable
 * @module xeokit
 * @submodule webgl
 */
class Drawable {

    /**
     Defines the Drawable's surface appearance when ghosted.

     @property ghostMaterial
     @type EmphasisMaterial
     @final
     */

    /**
     Defines the Drawable's surface appearance when highlighted.

     @property highlightMaterial
     @type EmphasisMaterial
     @final
     */

    /**
     Defines the Drawable's surface appearance when selected.

     @property selectedMaterial
     @type EmphasisMaterial
     */

    /**
     Defines the Drawable's surface appearance when edges are shown.

     @property edgeMaterial
     @type EdgeMaterial
     */

    /**
     Defines the Drawable's surface appearance when outlined.

     @property outlineMaterial
     @type OutlineMaterial
     */

    /**
     Indicates if the Drawable is currently visible.

     When the Drawable is a {@link Mesh}, then a value of true indicates that the whole Mesh
     is visible.

     The Drawable is only rendered when {@link Drawable/visible} is true and
     {@link Drawable/culled} is false.

     Each visible Drawable is registered in the {@link Scene}'s
     {@link Scene/visibleEntities} map when its {@link Object/entityType}
     is set to a value.

     @property visible
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently ghosted.

     The ghosted appearance is configured by {@link Drawable/ghostMaterial:property"}}ghostMaterial{{/crossLink}}.

     Each ghosted Drawable is registered in its {@link Scene}'s
     {@link Scene/ghostedEntities} map when its {@link Object/entityType}
     is set to a value.

     @property ghosted
     @default false
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently highlighted.

     The highlight appearance is configured by {@link Drawable/highlightMaterial:property"}}highlightMaterial{{/crossLink}}.

     Each highlighted Drawable is registered in its {@link Scene}'s
     {@link Scene/highlightedEntities} map when its {@link Object/entityType}
     is set to a value.

     @property highlighted
     @default false
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently selected.

     The selected appearance is configured by {@link Drawable/selectedMaterial:property"}}selectedMaterial{{/crossLink}}.

     Each selected Drawable is registered in its {@link Scene}'s
     {@link Scene/selectedEntities} map when its {@link Object/entityType}
     is set to a value.

     @property selected
     @default false
     @type Boolean
     */

    /**
     Indicates if the Drawable's edges are shown.

     The edges appearance is configured by {@link Drawable/edgeMaterial:property"}}edgeMaterial{{/crossLink}}.

     @property edges
     @default false
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently culled from view.

     The Drawable is only rendered when {@link Drawable/visible} is true and
     {@link Drawable/culled} is false.

     @property culled
     @default false
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently pickable.

     When false, the Drawable will never be picked by calls to the {@link Scene/pick:method"}}Scene pick(){{/crossLink}} method, and picking will happen as "through" the Drawable, to attempt to pick whatever lies on the other side of it.

     @property pickable
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently clippable.

     When false, the {@link Scene"}}Scene{{/crossLink}}'s {@link Clips} will have no effect on the Drawable.

     @property clippable
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently included in boundary calculations.

     When false, this Drawable will not be included in the bounding boxes provided by parent components.

     @property collidable
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable currently casts shadows.

     @property castShadow
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently able to have shadows cast upon it.

     @property receiveShadow
     @default true
     @type Boolean
     */

    /**
     Indicates if the Drawable is currently rendered with an outline.

     The outline appearance is configured by {@link Drawable/outlineMaterial:property"}}outlineMaterial{{/crossLink}}.

     @property outlined
     @default false
     @type Boolean
     */

    /**
     The Drawable's RGB colorize color, multiplies by the rendered fragment colors.

     @property colorize
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */

    /**
     The Drawable's opacity factor, multiplies by the rendered fragment alpha.

     This is a factor in range ````[0..1]````.

     @property opacity
     @default 1.0
     @type Number
     */

    /**
     Returns true to indicate that this component is a Drawable.

     xeokit will then render the Drawable subclass, which therefore must completely implement the Drawable contract.

     @property isDrawable
     @type Boolean
     @final
     */

    /**
     When ````true````, indicates that xeokit should render this Drawable in sorted order, relative to other Drawables of the same class.

     The sort order is determined by the Drawable subclasses' implementation
     of {@link Drawable/stateSortCompare:method"}}Drawable#stateSortCompare(){{/crossLink}}.

     Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same
     rendering state changes to the GPU, ie. can collapse them.

     @property isStateSortable
     @type Boolean
     @final
     */

    /**
     Comparison function used by the renderer to determine the order in which xeokit should render the Drawable subclass,
     relative to to other subclasses of the same class.

     xeokit requires the Drawable implementor to implement this method if the implemntor defines the
     {@link Drawable/isStateSortable:property"}}Drawable#isStateSortable{{/crossLink}} with value ````true````.

     Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same
     rendering state changes to the GPU, ie. can collapse them.

     @method stateSortCompare
     @param {Drawable} drawable1
     @param {Drawable} drawable2
     @returns {Number}
     */

    /**
      Called by xeokit, when about to render this Drawable, to get flags indicating what rendering effects to apply for it.

      @method getRenderFlags
      @param {RenderFlags} renderFlags Returns the rendering flags.
     */

    //------------------------------------------------------------------------------------------------------------------
    
    /**
     * Draws the Drawable's surfaces solid and opaque using its {@link Material}.
     * @method drawNormalFillOpaque
     * @param {FrameContext} frameCtx
     */

    /**
     * Draws the Drawable's edges solid and opaque using its {@link Material}.
     * @method drawNormalEdgesOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Drawable's edges opaque, using its {@link Material}.
     * @method drawGhostedEdgesOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */
    
    /**
     * Draws the Drawable's edges transparent using its {@link Material}.
     * @method drawNormalEdgesOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */
    
    //------------------------------------------------------------------------------------------------------------------
    
    /**
     * Draws the Drawable's surfaces ghosted and opaque, using its {@link GhostMaterial}.
     * @method drawGhostedFillOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Drawable's edges ghosted and opaque, using its {@link GhostMaterial}.
     * @method drawGhostedEdgesOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */
    
    /**
     * Draws the Drawable's surfaces ghosted and transparent, using its {@link GhostMaterial}.
     * @method drawGhostedFillTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Drawable's edges ghosted and transparent, using its {@link GhostMaterial}.
     * @method drawGhostedEdgesTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    //------------------------------------------------------------------------------------------------------------------
    
    /**
     * Draws the Mesh Drawable's surfaces highlighted and opaque, using its {@link HighlightMaterial}.
     * @method drawHighlightedFillOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's highlighted edges opaque, using its {@link HighlightMaterial}.
     * @method drawHighlightedEdgesTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's surfaces highlighted and transparent, using its {@link HighlightMaterial}.
     * @method drawHighlightedFillTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's highlighted edges transparent, using its {@link HighlightMaterial}.
     * @method drawHighlightedEdgesTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    //------------------------------------------------------------------------------------------------------------------
    
    /**
     * Draws the Mesh Drawable's surfaces selected and opaque, using its {@link SelectedMaterial}.
     * @method drawSelectedFillOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's edges selected and opaque, using its {@link SelectedMaterial}.
     * @method drawSelectedFillOpaque
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's surfaces selected and transparent, using its {@link SelectedMaterial}.
     * @method drawSelectedFillTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */

    /**
     * Draws the Mesh Drawable's selected edges transparent, using its {@link SelectedMaterial}.
     * @method drawSelectedEdgesTransparent
     * @param {FrameContext} frameCtx Frame rendering context.
     */
    
    //------------------------------------------------------------------------------------------------------------------
    
    // drawShadow(frameCtx, light) {
    //     if (this._shadowRenderer || (this._shadowRenderer = ShadowRenderer.get(this))) {
    //         this._shadowRenderer.drawDrawable(frameCtx, this, light);
    //     }
    // }
    //
    // drawOutline(frameCtx) {
    //     if (this._shadowRenderer || (this._outlineRenderer = OutlineRenderer.get(this))) {
    //         this._outlineRenderer.drawDrawable(frameCtx, this);
    //     }
    // }

    drawPickDrawable(frameCtx) {
        if (this._pickDrawableRenderer || (this._pickDrawableRenderer = PickDrawableRenderer.get(this))) {
            this._pickDrawableRenderer.drawDrawable(frameCtx, this);
            frameCtx.drawablePickList[frameCtx.drawablePickListLen++] = this;
        }
    }

    drawPickTriangles(frameCtx) {
        if (this._pickTriangleRenderer || (this._pickTriangleRenderer = PickTriangleRenderer.get(this))) {
            this._pickTriangleRenderer.drawDrawable(frameCtx, this);
        }
    }

    drawPickVertices(frameCtx) {
        if (this._pickVertexRenderer || (this._pickVertexRenderer = PickVertexRenderer.get(this))) {
            this._pickVertexRenderer.drawDrawable(frameCtx, this);
        }
    }

    /**
     * Given a pick hit record containing picking parameters, get geometry about the pick intersection
     * on the surface of this Drawable, adding it to the hit record.
     *
     * This delegates collection of that drawable-specific info to this xeokit.Drawable and allows user-defined
     * non-core drawable implementations to provide whatever info they are able to.
     *
     * @method getPickResult
     * @param hit
     * @param [hit.primIndex]
     * @param [hit.canvasPos]
     * @param [hit.origin]
     * @param [hit.direction]
     */
    getPickResult(hit) {
        getPickResult(this, hit);
    }

    _putRenderers() {
        if (this._drawRenderer) {
            this._drawRenderer.put();
            this._drawRenderer = null;
        }
        if (this._shadowRenderer) {
            this._shadowRenderer.put();
            this._shadowRenderer = null;
        }
        if (this._emphasisFillRenderer) {
            this._emphasisFillRenderer.put();
            this._emphasisFillRenderer = null;
        }
        if (this._emphasisEdgesRenderer) {
            this._emphasisEdgesRenderer.put();
            this._emphasisEdgesRenderer = null;
        }
        if (this._outlineRenderer) {
            this._outlineRenderer.put();
            this._outlineRenderer = null;
        }
        if (this._pickDrawableRenderer) {
            this._pickDrawableRenderer.put();
            this._pickDrawableRenderer = null;
        }
        if (this._pickTriangleRenderer) {
            this._pickTriangleRenderer.put();
            this._pickTriangleRenderer = null;
        }
        if (this._pickVertexRenderer) {
            this._pickVertexRenderer.put();
            this._pickVertexRenderer = null;
        }
    }

    destroy() {
        super.destroy(); // xeokit.Object
        this._putRenderers();
        this.scene._drawableDestroyed(this);
        this.glRedraw();
    }
}

var getPickResult = (function () {

    // Cached vars to avoid garbage collection

    const localRayOrigin = math.vec3();
    const localRayDir = math.vec3();
    const positionA = math.vec3();
    const positionB = math.vec3();
    const positionC = math.vec3();
    const triangleVertices = math.vec3();
    const position = math.vec4();
    const worldPos = math.vec3();
    const viewPos = math.vec3();
    const bary = math.vec3();
    const normalA = math.vec3();
    const normalB = math.vec3();
    const normalC = math.vec3();
    const uva = math.vec3();
    const uvb = math.vec3();
    const uvc = math.vec3();
    const tempVec4a = math.vec4();
    const tempVec4b = math.vec4();
    const tempVec4c = math.vec4();
    const tempVec3 = math.vec3();
    const tempVec3b = math.vec3();
    const tempVec3c = math.vec3();
    const tempVec3d = math.vec3();
    const tempVec3e = math.vec3();
    const tempVec3f = math.vec3();
    const tempVec3g = math.vec3();
    const tempVec3h = math.vec3();
    const tempVec3i = math.vec3();
    const tempVec3j = math.vec3();
    const tempVec3k = math.vec3();

    return function (drawable, hit) {

        if (hit.primIndex !== undefined && hit.primIndex > -1) {

            const geometry = drawable.geometry._state;
            const scene = drawable.scene;
            const camera = scene.camera;

            if (geometry.primitiveName === "triangles") {

                // Triangle picked; this only happens when the
                // Drawable has a Geometry that has primitives of type "triangle"

                hit.primitive = "triangle";

                // Get the World-space positions of the triangle's vertices

                const i = hit.primIndex; // Indicates the first triangle index in the indices array

                const indices = geometry.indices; // Indices into geometry arrays, not into shared VertexBufs
                const positions = geometry.positions;

                let ia3;
                let ib3;
                let ic3;

                if (indices) {

                    var ia = indices[i + 0];
                    var ib = indices[i + 1];
                    var ic = indices[i + 2];

                    triangleVertices[0] = ia;
                    triangleVertices[1] = ib;
                    triangleVertices[2] = ic;

                    hit.indices = triangleVertices;

                    ia3 = ia * 3;
                    ib3 = ib * 3;
                    ic3 = ic * 3;

                } else {

                    ia3 = i * 3;
                    ib3 = ia3 + 3;
                    ic3 = ib3 + 3;
                }

                positionA[0] = positions[ia3 + 0];
                positionA[1] = positions[ia3 + 1];
                positionA[2] = positions[ia3 + 2];

                positionB[0] = positions[ib3 + 0];
                positionB[1] = positions[ib3 + 1];
                positionB[2] = positions[ib3 + 2];

                positionC[0] = positions[ic3 + 0];
                positionC[1] = positions[ic3 + 1];
                positionC[2] = positions[ic3 + 2];

                if (geometry.quantized) {

                    // Decompress vertex positions

                    const positionsDecodeMatrix = geometry.positionsDecodeMatrix;
                    if (positionsDecodeMatrix) {
                        math.decompressPosition(positionA, positionsDecodeMatrix, positionA);
                        math.decompressPosition(positionB, positionsDecodeMatrix, positionB);
                        math.decompressPosition(positionC, positionsDecodeMatrix, positionC);
                    }
                }

                // Attempt to ray-pick the triangle in local space

                let canvasPos;

                if (hit.canvasPos) {
                    canvasPos = hit.canvasPos;
                    math.canvasPosToLocalRay(camera, drawable.worldMatrix, canvasPos, localRayOrigin, localRayDir);

                } else if (hit.origin && hit.direction) {
                    math.worldRayToLocalRay(drawable.worldMatrix, hit.origin, hit.direction, localRayOrigin, localRayDir);
                }

                math.normalizeVec3(localRayDir);
                math.rayPlaneIntersect(localRayOrigin, localRayDir, positionA, positionB, positionC, position);

                // Get Local-space cartesian coordinates of the ray-triangle intersection

                hit.localPos = position;
                hit.position = position;

                // Get interpolated World-space coordinates

                // Need to transform homogeneous coords

                tempVec4a[0] = position[0];
                tempVec4a[1] = position[1];
                tempVec4a[2] = position[2];
                tempVec4a[3] = 1;

                // Get World-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(drawable.worldMatrix, tempVec4a, tempVec4b);

                worldPos[0] = tempVec4b[0];
                worldPos[1] = tempVec4b[1];
                worldPos[2] = tempVec4b[2];

                hit.worldPos = worldPos;

                // Get View-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(camera.matrix, tempVec4b, tempVec4c);

                viewPos[0] = tempVec4c[0];
                viewPos[1] = tempVec4c[1];
                viewPos[2] = tempVec4c[2];

                hit.viewPos = viewPos;

                // Get barycentric coordinates of the ray-triangle intersection

                math.cartesianToBarycentric(position, positionA, positionB, positionC, bary);

                hit.bary = bary;

                // Get interpolated normal vector

                const normals = geometry.normals;

                if (normals) {

                    if (geometry.quantized) {

                        // Decompress vertex normals

                        const ia2 = ia * 2;
                        const ib2 = ib * 2;
                        const ic2 = ic * 2;

                        math.octDecodeVec2(normals.subarray(ia2, ia2 + 2), normalA);
                        math.octDecodeVec2(normals.subarray(ib2, ib2 + 2), normalB);
                        math.octDecodeVec2(normals.subarray(ic2, ic2 + 2), normalC);

                    } else {

                        normalA[0] = normals[ia3];
                        normalA[1] = normals[ia3 + 1];
                        normalA[2] = normals[ia3 + 2];

                        normalB[0] = normals[ib3];
                        normalB[1] = normals[ib3 + 1];
                        normalB[2] = normals[ib3 + 2];

                        normalC[0] = normals[ic3];
                        normalC[1] = normals[ic3 + 1];
                        normalC[2] = normals[ic3 + 2];
                    }

                    const normal = math.addVec3(math.addVec3(
                        math.mulVec3Scalar(normalA, bary[0], tempVec3),
                        math.mulVec3Scalar(normalB, bary[1], tempVec3b), tempVec3c),
                        math.mulVec3Scalar(normalC, bary[2], tempVec3d), tempVec3e);

                    hit.normal = math.transformVec3(drawable.worldNormalMatrix, normal, tempVec3f);
                }

                // Get interpolated UV coordinates

                const uvs = geometry.uv;

                if (uvs) {

                    uva[0] = uvs[(ia * 2)];
                    uva[1] = uvs[(ia * 2) + 1];

                    uvb[0] = uvs[(ib * 2)];
                    uvb[1] = uvs[(ib * 2) + 1];

                    uvc[0] = uvs[(ic * 2)];
                    uvc[1] = uvs[(ic * 2) + 1];

                    if (geometry.quantized) {

                        // Decompress vertex UVs

                        const uvDecodeMatrix = geometry.uvDecodeMatrix;
                        if (uvDecodeMatrix) {
                            math.decompressUV(uva, uvDecodeMatrix, uva);
                            math.decompressUV(uvb, uvDecodeMatrix, uvb);
                            math.decompressUV(uvc, uvDecodeMatrix, uvc);
                        }
                    }

                    hit.uv = math.addVec3(
                        math.addVec3(
                            math.mulVec2Scalar(uva, bary[0], tempVec3g),
                            math.mulVec2Scalar(uvb, bary[1], tempVec3h), tempVec3i),
                        math.mulVec2Scalar(uvc, bary[2], tempVec3j), tempVec3k);
                }
            }
        }
    }
})();

export {Drawable};