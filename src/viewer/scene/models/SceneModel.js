import {Component} from "../Component.js";

/**
 * @desc Abstract base class for buildable 3D scene model classes.
 *
 * Defines methods to build geometries, textures, meshes and entities within the model.
 *
 * Implementations:
 *
 * * {@link VBOSceneModel} - WebGL2-based model representation that stores geometry as vertex buffer objects (VBOs).
 * * {@link DataTextureSceneModel} - WebGL2-based model representation that stores geometry as data textures.
 *
 * @interface
 * @abstract
 */
export class SceneModel  {

    /**
     * Returns the {@link Entity}s in this SceneModel.
     * @returns {*|{}}
     * @abstract
     */
    get objects() {
    }

    /**
     * Gets the 3D World-space origin for this SceneModel.
     *
     * Each geometry or mesh origin, if supplied, is relative to this origin.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float64Array}
     * @abstract
     * @abstract
     */
    get origin() {
    }

    /**
     * Gets the SceneModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get position() {
    }

    /**
     * Gets the SceneModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get rotation() {
    }

    /**
     * Gets the SceneModels's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get quaternion() {
    }

    /**
     * Gets the SceneModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get scale() {
    }

    /**
     * Gets the SceneModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get matrix() {
    }

    /**
     * Gets the SceneModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     * @abstract
     */
    get worldMatrix() {
    }

    /**
     * Gets the SceneModel's World normal matrix.
     *
     * @type {Number[]}
     * @abstract
     */
    get worldNormalMatrix() {
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this SceneModel. The view matrix is the concatenation of the
     * Camera view matrix with the Performance model's world (modeling) matrix.
     *
     * @private
     * @abstract
     */
    get viewMatrix() {
    }

    /**
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this SceneModel.
     *
     * @private
     * @abstract
     */
    get viewNormalMatrix() {
    }

    /**
     * Sets if backfaces are rendered for this SceneModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    get backfaces() {
    }

    /**
     * Sets if backfaces are rendered for this SceneModel.
     *
     * Default is ````false````.
     *
     * When we set this ````true````, then backfaces are always rendered for this SceneModel.
     *
     * When we set this ````false````, then we allow the Viewer to decide whether to render backfaces. In this case,
     * the Viewer will:
     *
     *  * hide backfaces on watertight meshes,
     *  * show backfaces on open meshes, and
     *  * always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     *
     * @type {Boolean}
     * @abstract
     */
    set backfaces(backfaces) {
    }

    /**
     * Gets the list of {@link Entity}s within this SceneModel.
     *
     * @returns {Entity[]}
     * @abstract
     */
    get entityList() {
    }

    /**
     * Returns true to indicate that SceneModel is an {@link Entity}.
     * @type {Boolean}
     * @abstract
     */
    get isEntity() {
    }

    /**
     * Returns ````true```` if this SceneModel represents a model.
     *
     * When ````true```` the SceneModel will be registered by {@link SceneModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isModel() {
    }

    /**
     * Returns ````false```` to indicate that SceneModel never represents an object.
     *
     * @type {Boolean}
     * @abstract
     */
    get isObject() {
    }

    /**
     * Gets the SceneModel's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get aabb() {
    }

    /**
     * The approximate number of triangle primitives in this SceneModel.
     *
     * @type {Number}
     * @abstract
     */
    get numTriangles() {
    }

    /**
     * The approximate number of line primitives in this SceneModel.
     *
     * @type {Number}
     * @abstract
     */
    get numLines() {
    }

    /**
     * The approximate number of point primitives in this SceneModel.
     *
     * @type {Number}
     * @abstract
     */
    get numPoints() {
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are visible.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is ````true```` and {@link SceneModel#culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    get visible() {
    }

    /**
     * Sets if this SceneModel is visible.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is ````true```` and {@link SceneModel#culled} is ````false````.
     **
     * @type {Boolean}
     * @abstract
     */
    set visible(visible) {
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     * @abstract
     */
    get xrayed() {
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     * @abstract
     */
    set xrayed(xrayed) {
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     * @abstract
     */
    get highlighted() {
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     * @abstract
     */
    set highlighted(highlighted) {
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     * @abstract
     */
    get selected() {
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     * @abstract
     */
    set selected(selected) {
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     * @abstract
     */
    get edges() {
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     * @abstract
     */
    set edges(edges) {
    }

    /**
     * Gets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is true and {@link SceneModel#culled} is false.
     *
     * @type {Boolean}
     * @abstract
     */
    get culled() {
    }

    /**
     * Sets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is true and {@link SceneModel#culled} is false.
     *
     * @type {Boolean}
     * @abstract
     */
    set culled(culled) {
    }

    /**
     * Gets if {@link Entity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    get clippable() {
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    set clippable(clippable) {
    }

    /**
     * Gets if this SceneModel is collidable.
     *
     * @type {Boolean}
     * @abstract
     */
    get collidable() {
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are collidable.
     *
     * @type {Boolean}
     * @abstract
     */
    set collidable(collidable) {
    }

    /**
     * Gets if this SceneModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    get pickable() {
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    set pickable(pickable) {
    }

    /**
     * Gets the RGB colorize color for this SceneModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     * @abstract
     */
    get colorize() {
    }

    /**
     * Sets the RGB colorize color for this SceneModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     * @abstract
     */
    set colorize(colorize) {
    }

    /**
     * Gets this SceneModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     * @abstract
     */
    get opacity() {
    }

    /**
     * Sets the opacity factor for this SceneModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     * @abstract
     */
    set opacity(opacity) {
    }

    /**
     * Gets if this SceneModel casts a shadow.
     *
     * @type {Boolean}
     * @abstract
     */
    get castsShadow() {
    }

    /**
     * Sets if this SceneModel casts a shadow.
     *
     * @type {Boolean}
     * @abstract
     */
    set castsShadow(castsShadow) {
    }

    /**
     * Sets if this SceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     * @abstract
     */
    get receivesShadow() {
    }

    /**
     * Sets if this SceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     * @abstract
     */
    set receivesShadow(receivesShadow) {
    }

    /**
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this SceneModel.
     *
     * SAO is configured by the Scene's {@link SAO} component.
     *
     *  Only works when {@link SAO#enabled} is also true.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled() {
    }

    /**
     * Gets if physically-based rendering (PBR) is enabled for this SceneModel.
     *
     * Only works when {@link Scene#pbrEnabled} is also true.
     *
     * @type {Boolean}
     * @abstract
     */
    get pbrEnabled() {
    }

    /**
     * Gets if color textures are enabled for this SceneModel.
     *
     * Only works when {@link Scene#colorTextureEnabled} is also true.
     *
     * @type {Boolean}
     * @abstract
     */
    get colorTextureEnabled() {
    }

    /**
     * Returns true to indicate that SceneModel is implements {@link Drawable}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isDrawable() {
    }

    /** @private
     * @abstract
     */
    get isStateSortable() {
    }

    /**
     * Configures the appearance of xrayed {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get xrayMaterial() {
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get highlightMaterial() {
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     * @abstract
     */
    get selectedMaterial() {
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#edgeMaterial}.
     *
     * @type {EdgeMaterial}
     * @abstract
     */
    get edgeMaterial() {
    }

    /**
     * Called by private renderers in ./lib, returns the picking view matrix with which to
     * ray-pick on this SceneModel.
     *
     * @private
     * @abstract
     */
    getPickViewMatrix(pickViewMatrix) {
    }

    /**
     * Creates a reusable geometry within this SceneModel.
     *
     * We can then supply the geometry ID to {@link SceneModel#createMesh} when we want to create meshes that instance the geometry.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link SceneModel#createMesh}.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} [cfg.positions] Flat array of uncompressed 3D vertex positions positions. Required for all primitive types. Overridden by ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of quantized 3D vertex positions. Overrides ````positions````, and must be accompanied by ````positionsDecodeMatrix````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positionsCompressed````. Must be accompanied by ````positionsCompressed````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.normalsCompressed] Flat array of oct-encoded normal vectors. Overrides ````normals````. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of uncompressed RGBA vertex colors, as float values in range ````[0..1]````. Ignored when ````geometryId```` is given. Overridden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of compressed RGBA vertex colors, as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given. Overrides ````colors```` and is overridden by ````color````.
     * @param {Number[]} [cfg.uv] Flat array of uncompressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvCompressed] Flat array of compressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Overrides ````uv````. Must be accompanied by ````uvDecodeMatrix````. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvDecodeMatrix] A 3x3 matrix for decompressing ````uvCompressed````.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````SceneModel```` constructor.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link SceneModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
     * @abstract
     */
    createGeometry(cfg) {
    }

    /**
     * Creates a texture within this SceneModel.
     *
     * We can then supply the texture ID to {@link SceneModel#createTextureSet} when we want to create texture sets that use the texture.
     *
     * @param {*} cfg Texture properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture, to refer to with {@link VBOSceneModel#createTextureSet}.
     * @param {String} [cfg.src] Image file for the texture. Assumed to be transcoded if not having a recognized image file
     * extension (jpg, jpeg, png etc.). If transcoded, then assumes ````VBOSceneModel```` is configured with a {@link TextureTranscoder}.
     * @param {ArrayBuffer[]} [cfg.buffers] Transcoded texture data. Assumes ````VBOSceneModel```` is
     * configured with a {@link TextureTranscoder}. This parameter is given as an array of buffers so we can potentially support multi-image textures, such as cube maps.
     * @param {HTMLImageElement} [cfg.image] HTML Image object to load into this texture. Overrides ````src```` and ````buffers````. Never transcoded.
     * @param {Number} [cfg.minFilter=LinearMipmapLinearFilter] How the texture is sampled when a texel covers less than one pixel.
     * Supported values are {@link LinearMipmapLinearFilter}, {@link LinearMipMapNearestFilter}, {@link NearestMipMapNearestFilter}, {@link NearestMipMapLinearFilter} and {@link LinearMipMapLinearFilter}.
     * @param {Number} [cfg.magFilter=LinearFilter] How the texture is sampled when a texel covers more than one pixel. Supported values are {@link LinearFilter} and {@link NearestFilter}.
     * @param {Number} [cfg.wrapS=RepeatWrapping] Wrap parameter for texture coordinate *S*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Number} [cfg.wrapT=RepeatWrapping] Wrap parameter for texture coordinate *T*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Number} [cfg.wrapR=RepeatWrapping] Wrap parameter for texture coordinate *R*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Boolean} [cfg.flipY=false] Flips this Texture's source data along its vertical axis when ````true````.
     * @param {Number} [cfg.encoding=LinearEncoding] Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}.
     * @abstract
     */
    createTexture(cfg) {
    }

    /**
     * Creates a texture set within this SceneModel.
     *
     * A texture set is a collection of textures that can be shared among meshes. We can then supply the texture set
     * ID to {@link SceneModel#createMesh} when we want to create meshes that use the texture set.
     *
     * The textures can work as a texture atlas, where each mesh can have geometry UVs that index
     * a different part of the textures. This allows us to minimize the number of textures in our models, which
     * means faster rendering.
     *
     * @param {*} cfg Texture set properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture set, to refer to with {@link SceneModel#createMesh}.
     * @param {*} [cfg.colorTextureId] ID of *RGBA* base color texture, with color in *RGB* and alpha in *A*.
     * @param {*} [cfg.metallicRoughnessTextureId] ID of *RGBA* metal-roughness texture, with the metallic factor in *R*, and roughness factor in *G*.
     * @param {*} [cfg.normalsTextureId] ID of *RGBA* normal map texture, with normal map vectors in *RGB*.
     * @param {*} [cfg.emissiveTextureId] ID of *RGBA* emissive map texture, with emissive color in *RGB*.
     * @param {*} [cfg.occlusionTextureId] ID of *RGBA* occlusion map texture, with occlusion factor in *R*.
     * @abstract
     */
    createTextureSet(cfg) {
    }

    /**
     * Creates a mesh within this SceneModel.
     *
     * A mesh can either define its own geometry or share it with other meshes. To define own geometry, provide the
     * various geometry arrays to this method. To share a geometry, provide the ID of a geometry created earlier
     * with {@link SceneModel#createGeometry}.
     *
     * Internally, SceneModel will batch all unique mesh geometries into the same arrays, which improves
     * rendering performance.
     *
     * If you accompany the arrays with an  ````origin````, then ````createMesh()```` will assume
     * that the ````positions```` are in relative-to-center (RTC) coordinates, with ````origin```` being the origin of their
     * RTC coordinate system.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.textureSetId] ID of a texture set previously created with {@link SceneModel#createTextureSet"}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link SceneModel#createGeometry"}. Overrides all other geometry parameters given to this method.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} [cfg.positions] Flat array of uncompressed 3D vertex positions positions. Required for all primitive types. Overridden by ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of quantized 3D vertex positions. Overrides ````positions````, and must be accompanied by ````positionsDecodeMatrix````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positionsCompressed````. Must be accompanied by ````positionsCompressed````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.normalsCompressed] Flat array of oct-encoded normal vectors. Overrides ````normals````. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of uncompressed RGBA vertex colors, as float values in range ````[0..1]````. Ignored when ````geometryId```` is given. Overridden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of compressed RGBA vertex colors, as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given. Overrides ````colors```` and is overridden by ````color````.
     * @param {Number[]} [cfg.uv] Flat array of uncompressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvCompressed] Flat array of compressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Overrides ````uv````. Must be accompanied by ````uvDecodeMatrix````. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvDecodeMatrix] A 3x3 matrix for decompressing ````uvCompressed````.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````SceneModel```` constructor.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link SceneModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position of the mesh.
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..1, 0..1]````. Overridden by texture set ````colorTexture````. Overrides ````colors```` and ````colorsCompressed````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````. Overridden by texture set ````colorTexture````.
     * @param {Number} [cfg.metallic=0] Metallic factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     * @param {Number} [cfg.roughness=1] Roughness factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     * @abstract
     */
    createMesh(cfg) {
    }

    /**
     * Creates an {@link Entity} within this SceneModel, giving it one or more meshes previously created with {@link SceneModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link SceneModel@createMesh}.
     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link SceneModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link SceneModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link SceneModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link SceneModel#edgeMaterial}.
     * @returns {Entity}
     * @abstract
     */
    createEntity(cfg) {
    }

    /**
     * Finalizes this SceneModel.
     *
     * Immediately creates the SceneModel's {@link Entity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this SceneModel.
     * @abstract
     */
    finalize() {
    }

    /** @private
     * @abstract
     */
    stateSortCompare(drawable1, drawable2) {
    }

    /** @private
     * @abstract
     */
    drawColorOpaque(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawColorTransparent(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawDepth(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawNormals(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawSilhouetteXRayed(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawSilhouetteHighlighted(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawSilhouetteSelected(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawEdgesColorOpaque(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawEdgesColorTransparent(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawEdgesXRayed(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawEdgesHighlighted(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawEdgesSelected(frameCtx) {
    }

    /**
     * @private
     * @abstract
     */
    drawOcclusion(frameCtx) {
    }

    /**
     * @private
     * @abstract
     */
    drawShadow(frameCtx) {
    }

    /** @private
     * @abstract
     */
    drawPickMesh(frameCtx) {
    }

    /**
     * Called by VBOSceneModelMesh.drawPickDepths()
     * @private
     * @abstract
     */
    drawPickDepths(frameCtx) {
    }

    /**
     * Called by VBOSceneModelMesh.drawPickNormals()
     * @private
     * @abstract
     */
    drawPickNormals(frameCtx) {
    }

    /**
     * Destroys this SceneModel.
     * @abstract
     */
    destroy() {
    }
}