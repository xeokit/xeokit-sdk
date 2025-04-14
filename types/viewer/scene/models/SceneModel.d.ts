import { Component } from "../Component";
import { SceneModelEntity } from "./SceneModelEntity";
import { EdgeMaterial, EmphasisMaterial } from "../materials";
import { SceneModelMesh } from "./SceneModelMesh";
import { SceneModelTextureSet } from "./SceneModelTextureSet";
import { SceneModelTransform } from "./SceneModelTransform";
import { SceneModelTexture } from "./SceneModelTexture";

/**
 * A high-performance model representation for efficient rendering and low memory usage.
 */
export declare class SceneModel extends Component {

    /**
     * Fires when the model is loaded
     * @param event The loaded event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "loaded", callback: (loaded: true) => void, scope?: any): string;

    /**
     * Fires when the loading the model has an error
     * @param event The error event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "error", callback: (msg: string) => void, scope?: any): string;

    /**
     * Returns true to indicate that this Component is a SceneModel.
     * @type {Boolean}
     */
    get isPerformanceModel(): boolean;

    /**
     * The {@link SceneModelTransform}s in this SceneModel.
     *
     * Each {@link SceneModelTransform} is stored here against its {@link SceneModelTransform.id}.
     *
     * @returns {*|{}}
     */
    get transforms(): { [key: string]: SceneModelTransform }

    /**
     * The {@link SceneModelTexture}s in this SceneModel.
     *
     * * Each {@link SceneModelTexture} is created with {@link SceneModel.createTexture}.
     * * Each {@link SceneModelTexture} is stored here against its {@link SceneModelTexture.id}.
     *
     * @returns {*|{}}
     */
    get textures(): { [key: string]: SceneModelTexture }

    /**
     * The {@link SceneModelTextureSet}s in this SceneModel.
     *
     * Each {@link SceneModelTextureSet} is stored here against its {@link SceneModelTextureSet.id}.
     *
     * @returns {*|{}}
     */
    get textureSets(): { [key: string]: SceneModelTextureSet }

    /**
     * The {@link SceneModelMesh}es in this SceneModel.
     *
     * Each {@link SceneModelMesh} is stored here against its {@link SceneModelMesh.id}.
     *
     * @returns {*|{}}
     */
    get meshes(): { [key: string]: SceneModelMesh }

    /**
     * Returns the {@link SceneModelEntity}s in this SceneModel.
     * @returns {*|{}}
     */
    get objects(): { [key: string]: SceneModelEntity }

    /**
     * Gets the 3D World-space origin for this SceneModel.
     *
     * Each geometry or mesh origin, if supplied, is relative to this origin.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    get origin(): number[];

    /**
     * Sets the SceneModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    set position(value: number[]);

    /**
     * Gets the SceneModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    get position(): number[];

    /**
     * Sets the SceneModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    set rotation(value: number[]);

    /**
     * Gets the SceneModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    get rotation(): number[];

    /**
     * Sets the SceneModel's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {number[]}
     */
    set quaternion(value: number[]);

    /**
     * Gets the VBOSceneModels's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {number[]}
     */
    get quaternion(): number[];

    /**
     * Sets the SceneModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {number[]}
     * @deprecated
     */
    set scale(value: number[]);

    /**
     * Gets the SceneModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {number[]}
     */
    get scale(): number[];

    /**
     * Sets the SceneModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {number[]}
     */
    set matrix(value: number[])

    /**
     * Gets the SceneModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {number[]}
     */
    get matrix(): number[];

    /**
     * Gets the SceneModel's local modeling rotation transform matrix.
     *
     * @type {number[]}
     */
    get rotationMatrix(): number[];

    /**
     * Gets the conjugate of the SceneModel's local modeling rotation transform matrix.
     *
     * This is used for RTC view matrix management in renderers.
     *
     * @type {Number[]}
     */
    get rotationMatrixConjugate(): number[];

    /**
     * Gets the SceneModel's World matrix.
     *
     * @type {number[]}
     */
    get worldMatrix(): number[];

    /**
     * Gets the SceneModel's World normal matrix.
     *
     * @type {number[]}
     */
    get worldNormalMatrix(): number[];

    /**
     * Sets if backfaces are rendered for this SceneModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces(): boolean;

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
     */
    set backfaces(backfaces: boolean);

    /**
     * Gets the list of {@link SceneModelEntity}s within this SceneModel.
     *
     * @returns {SceneModelEntity[]}
     */
    get entityList(): SceneModelEntity[];

    /**
     * Returns true to indicate that SceneModel is an {@link SceneModelEntity}.
     * @type {Boolean}
     */
    get isEntity(): boolean;

    /**
     * Returns ````true```` if this SceneModel represents a model.
     *
     * When ````true```` the SceneModel will be registered by {@link SceneModel.id} in
     * {@link Scene.models} and may also have a {@link MetaObject} with matching {@link MetaObject.id}.
     *
     * @type {Boolean}
     */
    get isModel(): boolean;

    /**
     * Returns ````false```` to indicate that SceneModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject(): boolean;

    /**
     * Gets the SceneModel's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {number[]}
     */
    get aabb(): number[];

    /**
     * The approximate number of triangle primitives in this SceneModel.
     *
     * @type {number}
     */
    get numTriangles(): number;

    /**
     * The approximate number of line primitives in this SceneModel.
     *
     * @type {number}
     */
    get numLines(): number;

    /**
     * The approximate number of point primitives in this SceneModel.
     *
     * @type {number}
     */
    get numPoints(): number;

    /**
     * Gets if any {@link SceneModelEntity}s in this SceneModel are visible.
     *
     * The SceneModel is only rendered when {@link SceneModel.visible} is ````true```` and {@link SceneModel.culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible(): boolean;

    /**
     * Sets if this SceneModel is visible.
     *
     * The SceneModel is only rendered when {@link SceneModel.visible} is ````true```` and {@link SceneModel.culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible: boolean);

    /**
     * Gets if any {@link SceneModelEntity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed(): boolean

    /**
     * Sets if all {@link SceneModelEntity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed: boolean);

    /**
     * Gets if any {@link SceneModelEntity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted(): boolean;

    /**
     * Sets if all {@link SceneModelEntity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted: boolean);

    /**
     * Gets if any {@link SceneModelEntity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     */
    get selected(): boolean;

    /**
     * Sets if all {@link SceneModelEntity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     */
    set selected(selected: boolean);

    /**
     * Gets if any {@link SceneModelEntity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges(): boolean;

    /**
     * Sets if all {@link SceneModelEntity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     */
    set edges(edges: boolean);

    /**
     * Gets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel.visible} is true and {@link SceneModel.culled} is false.
     *
     * @type {Boolean}
     */
    get culled(): boolean;

    /**
     * Sets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel.visible} is true and {@link SceneModel.culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled: boolean);

    /**
     * Gets if {@link SceneModelEntity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable(): boolean;

    /**
     * Sets if {@link SceneModelEntity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable: boolean);

    /**
     * Gets if this SceneModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable(): boolean;

    /**
     * Sets if {@link SceneModelEntity}s in this SceneModel are collidable.
     *
     * @type {Boolean}
     */
    set collidable(collidable: boolean);

    /**
     * Gets if this SceneModel is pickable.
     *
     * Picking is done via calls to {@link Scene.pick}.
     *
     * @type {Boolean}
     */
    get pickable(): boolean;

    /**
     * Sets if {@link SceneModelEntity}s in this SceneModel are pickable.
     *
     * Picking is done via calls to {@link Scene.pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable: boolean);

    /**
     * Gets the RGB colorize color for this SceneModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {number[]}
     */
    get colorize(): number[];

    /**
     * Sets the RGB colorize color for this SceneModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {number[]}
     */
    set colorize(colorize: number[]);

    /**
     * Gets this SceneModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {number}
     */
    get opacity(): number;

    /**
     * Sets the opacity factor for this SceneModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {number}
     */
    set opacity(opacity: number);

    /**
     * Gets if this SceneModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow(): boolean;

    /**
     * Sets if this SceneModel casts a shadow.
     *
     * @type {Boolean}
     */
    set castsShadow(castsShadow: boolean);

    /**
     * Sets if this SceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow(): boolean;

    /**
     * Sets if this SceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    set receivesShadow(receivesShadow: boolean);

    /**
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this SceneModel.
     *
     * SAO is configured by the Scene's {@link SAO} component.
     *
     *  Only works when {@link SAO.enabled} is also true.
     *
     * @type {Boolean}
     */
    get saoEnabled(): boolean;

    /**
     * Gets if physically-based rendering (PBR) is enabled for this SceneModel.
     *
     * Only works when {@link Scene.pbrEnabled} is also true.
     *
     * @type {Boolean}
     */
    get pbrEnabled(): boolean;

    /**
     * Gets if color textures are enabled for this SceneModel.
     *
     * Only works when {@link Scene#colorTextureEnabled} is also true.
     *
     * @type {Boolean}
     */
    get colorTextureEnabled(): boolean;

    /**
     * Returns true to indicate that SceneModel is implements {@link Drawable}.
     *
     * @type {Boolean}
     */
    get isDrawable(): boolean;

    /**
     * Configures the appearance of xrayed {@link SceneModelEntity}s within this SceneModel.
     *
     * This is the {@link Scene.xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial(): EmphasisMaterial;

    /**
     * Configures the appearance of highlighted {@link SceneModelEntity}s within this SceneModel.
     *
     * This is the {@link Scene.highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial(): EmphasisMaterial;

    /**
     * Configures the appearance of selected {@link SceneModelEntity}s within this SceneModel.
     *
     * This is the {@link Scene.selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial(): EmphasisMaterial;

    /**
     * Configures the appearance of edges of {@link SceneModelEntity}s within this SceneModel.
     *
     * This is the {@link Scene.edgeMaterial}.
     *
     * @type {EdgeMaterial}
     */
    get edgeMaterial(): EdgeMaterial;

    /**
     *
     * @param cfg
     */
    createQuantizationRange(arg: {id: string | number, aabb: number[]}): void;

    /**
     * Creates a texture within this SceneModel.
     *
     * We can then supply the texture ID to {@link SceneModel#createTextureSet} when we want to create texture sets that use the texture.
     *
     * @param {*} cfg Texture properties.
     * @param {string|number} cfg.id Mandatory ID for the texture, to refer to with {@link SceneModel#createTextureSet}.
     * @param {string} [cfg.src] Image file for the texture. Assumed to be transcoded if not having a recognized image file
     * extension (jpg, jpeg, png etc.). If transcoded, then assumes ````SceneModel```` is configured with a {@link TextureTranscoder}.
     * @param {ArrayBuffer[]} [cfg.buffers] Transcoded texture data. Assumes ````SceneModel```` is
     * configured with a {@link TextureTranscoder}. This parameter is given as an array of buffers so we can potentially support multi-image textures, such as cube maps.
     * @param {HTMLImageElement} [cfg.image] HTML Image object to load into this texture. Overrides ````src```` and ````buffers````. Never transcoded.
     * @param {number} [cfg.minFilter=LinearMipmapLinearFilter] How the texture is sampled when a texel covers less than one pixel.
     * Supported values are {@link LinearMipmapLinearFilter}, {@link LinearMipMapNearestFilter}, {@link NearestMipMapNearestFilter}, {@link NearestMipMapLinearFilter} and {@link LinearMipMapLinearFilter}.
     * @param {number} [cfg.magFilter=LinearFilter] How the texture is sampled when a texel covers more than one pixel. Supported values are {@link LinearFilter} and {@link NearestFilter}.
     * @param {number} [cfg.wrapS=RepeatWrapping] Wrap parameter for texture coordinate *S*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {number} [cfg.wrapT=RepeatWrapping] Wrap parameter for texture coordinate *T*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}..
     * @param {number} [cfg.wrapR=RepeatWrapping] Wrap parameter for texture coordinate *R*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Boolean} [cfg.flipY=false] Flips this Texture's source data along its vertical axis when ````true````.
     * @param  {number} [cfg.encoding=LinearEncoding] Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}.
     */
    createTexture(cfg: {
        id: string | number,
        src?: string,
        buffer?: ArrayBuffer[],
        image?: HTMLImageElement,
        minFilter?: number,
        magFilter?: number,
        wrapS?: number,
        wrapT?: number,
        flipY?: boolean,
        encoding?: number
    }): void;

    /**
     * Creates a texture set within this SceneModel.
     *
     * * Stores the new {@link SceneModelTextureSet} in {@link SceneModel#textureSets}.
     *
     * A texture set is a collection of textures that can be shared among meshes. We can then supply the texture set
     * ID to {@link SceneModel#createMesh} when we want to create meshes that use the texture set.
     *
     * The textures can work as a texture atlas, where each mesh can have geometry UVs that index
     * a different part of the textures. This allows us to minimize the number of textures in our models, which
     * means faster rendering.
     *
     * @param {*} cfg Texture set properties.
     * @param {string|number} cfg.id Mandatory ID for the texture set, to refer to with {@link SceneModel#createMesh}.
     * @param {*} [cfg.colorTextureId] ID of *RGBA* base color texture, with color in *RGB* and alpha in *A*.
     * @param {*} [cfg.metallicRoughnessTextureId] ID of *RGBA* metal-roughness texture, with the metallic factor in *R*, and roughness factor in *G*.
     * @param {*} [cfg.normalsTextureId] ID of *RGBA* normal map texture, with normal map vectors in *RGB*.
     * @param {*} [cfg.emissiveTextureId] ID of *RGBA* emissive map texture, with emissive color in *RGB*.
     * @param {*} [cfg.occlusionTextureId] ID of *RGBA* occlusion map texture, with occlusion factor in *R*.
     * @returns {SceneModelTransform} The new texture set.
     */
    createTextureSet(cfg: {
        id: string | number,
        colorTextureId?: string | number,
        metallicRoughnessTextureId?: string | number,
        normalsTextureId?: string | number,
        emissiveTextureId?: string | number,
        occlusionTextureId?: string | number
    }): SceneModelTextureSet;

    /**
     * Creates a reusable geometry within this SceneModel.
     *
     * We can then supply the geometry ID to {@link SceneModel.createMesh} when we want to create meshes that instance the geometry.
     *
     * If provide a  ````positionsDecodeMatrix```` , then ````createGeometry()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {*} cfg Geometry properties.
     * @param {string|number} cfg.id Mandatory ID for the geometry, to refer to with {@link SceneModel.createMesh}.
     * @param {string} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {number[]} cfg.positions Flat array of positions.
     * @param {number[]} [cfg.normals] Flat array of normal vectors. Only used with 'triangles' primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {number[]} [cfg.colors] Flat array of RGBA vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overidden by ````color```` and ````colorsCompressed````.
     * @param {number[]} [cfg.colorsCompressed] Flat array of RGBA vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {number[]} [cfg.indices] Array of indices. Not required for `points` primitives.
     * @param {number[]} [cfg.edgeIndices] Array of edge line indices. Used only for Required for 'triangles' primitives. These are automatically generated internally if not supplied, using the ````edgeThreshold```` given to the ````SceneModel```` constructor.
     * @param {number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {number[]} [cfg.origin] Optional geometry origin, relative to {@link SceneModel.origin}. When this is given, then every mesh created with {@link SceneModel.createMesh} that uses this geometry will
     * be transformed relative to this origin.
     */
    createGeometry(cfg: {
        id: string | number;
        primitive: "lines" | "triangles" | "solid" | "surface";
        positions: number[];
        normals: number[];
        colors: number[];
        colorsCompressed: number[];
        indices: number[];
        edgeIndices: number[];
        positionsDecodeMatrix: number[];
        origin?: number[];
    }): void;

    /**
     * Creates a new {@link SceneModelTransform} within this SceneModel.
     *
     * * Stores the new {@link SceneModelTransform} in {@link SceneModel#transforms}.
     * * Can be connected into hierarchies
     * * Each {@link SceneModelTransform} can be used by unlimited {@link SceneModelMesh}es
     *
     * @param {*} cfg Transform creation parameters.
     * @param {string} cfg.id Mandatory ID for the new transform. Must not clash with any existing components within the {@link Scene}.
     * @param {string} [cfg.parentTransformId] ID of a parent transform, previously created with {@link SceneModel#createTextureSet}.
     * @param {number[]} [cfg.position=[0,0,0]] Local 3D position of the mesh. Overridden by ````transformId````.
     * @param {number[]} [cfg.scale=[1,1,1]] Scale of the transform.
     * @param {number[]} [cfg.rotation=[0,0,0]] Rotation of the transform as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @returns {SceneModelTransform} The new transform.
     */
    createTransform(cfg: {
        id: string | number,
        parentTransformId: string | number,
        position?: number[],
        scale?: number[],
        rotation?: number[],
        matrix?: number[]
    }): SceneModelMesh;

    /**
     * Creates a new {@link SceneModelMesh} within this SceneModel.
     *
     * * It prepares and saves data for a SceneModelMesh {@link SceneModel#meshes} creation. SceneModelMesh will be created only once the SceneModelEntity (which references this particular SceneModelMesh) will be created.
     * * The SceneModelMesh can either define its own geometry or share it with other SceneModelMeshes. To define own geometry, provide the
     * various geometry arrays to this method. To share a geometry, provide the ID of a geometry created earlier
     * with {@link SceneModel#createGeometry}.
     * * If you accompany the arrays with an  ````origin````, then ````createMesh()```` will assume
     * that the geometry ````positions```` are in relative-to-center (RTC) coordinates, with ````origin```` being the
     * origin of their RTC coordinate system.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.textureSetId] ID of a {@link SceneModelTextureSet} previously created with {@link SceneModel#createTextureSet}.
     * @param {String|Number} [cfg.transformId] ID of a {@link SceneModelTransform} to instance, previously created with {@link SceneModel#createTransform}. Overrides all other transform parameters given to this method.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link SceneModel#createGeometry}. Overrides all other geometry parameters given to this method.
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
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position of the mesh. Overridden by ````transformId````.
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.  Overridden by ````transformId````.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.  Overridden by ````transformId````.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters. Also  overridden by ````transformId````.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..1, 0..1]````. Overridden by texture set ````colorTexture````. Overrides ````colors```` and ````colorsCompressed````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````. Overridden by texture set ````colorTexture````.
     * @param {Number} [cfg.metallic=0] Metallic factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     * @param {Number} [cfg.roughness=1] Roughness factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     * @returns {Boolean} True = successfully mesh was created. False = error during creation of a mesh.
     */
    createMesh(cfg: {
        id: string;
        textureSetId?: string | number;
        transformId?: string | number;
        geometryId?: string | number;
        primitive: "lines" | "triangles" | "points";
        positions: number[];
        positionsCompressed: number[];
        positionsDecodeMatrix: number[];
        normals: number[];
        normalsCompressed: number[];
        colors: number[];
        colorsCompressed: number[];
        uv: number[];
        uvCompressed: number[];
        uvDecodeMatrix: number[];
        indices: number[];
        edgeIndices: number[];
        origin?: number[];
        position?: number[];
        scale?: number[];
        rotation?: number[];
        matrix?: number[];
        color?: number[];
        opacity?: number;
        metallic?: number;
        roughness?: number;
    }): boolean;

    /**
     * Creates an {@link SceneModelEntity} within this SceneModel, giving it one or more meshes previously created with {@link SceneModel.createMesh}.
     *
     * A mesh can only belong to one {@link SceneModelEntity}, so you'll get an error if you try to reuse a mesh among multiple {@link SceneModelEntity}s.
     *
     * @param {Object} cfg SceneModelEntity configuration.
     * @param {string} cfg.id Optional ID for the new SceneModelEntity. Must not clash with any existing components within the {@link Scene}.
     * @param {string[]} cfg.meshIds IDs of one or more meshes created previously with {@link SceneModel@createMesh}.

     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link SceneModelEntity} represents an object, in which case it will be registered by {@link SceneModelEntity.id} in {@link Scene.objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject.id}, registered by that ID in {@link MetaScene.metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the SceneModelEntity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the SceneModelEntity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the SceneModelEntity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the SceneModelEntity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the SceneModelEntity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the SceneModelEntity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the SceneModelEntity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the SceneModelEntity is initially xrayed. XRayed appearance is configured by {@link SceneModel.xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the SceneModelEntity is initially highlighted. Highlighted appearance is configured by {@link SceneModel.highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the SceneModelEntity is initially selected. Selected appearance is configured by {@link SceneModel.selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the SceneModelEntity's edges are initially emphasized. Edges appearance is configured by {@link SceneModel.edgeMaterial}.
     * @returns {SceneModelEntity}
     */
    createEntity(cfg: {
        id: string;
        meshIds: string[]
        isObject: boolean;
        visible?: boolean;
        culled?: boolean;
        pickable?: boolean;
        clippable?: boolean;
        collidable?: boolean;
        castsShadow?: boolean;
        receivesShadow?: boolean;
        xrayed?: boolean;
        highlighted?: boolean;
        selected?: boolean;
        edges?: boolean;
    }): SceneModelEntity;

    /**
     * Pre-renders all meshes that have been added, even if the SceneModel has not bee finalized yet.
     * This is use for progressively showing the SceneModel while it is being loaded or constructed.
     * @returns {boolean}
     */
    preFinalize(): boolean;

    /**
     * Finalizes this SceneModel.
     *
     * Immediately creates the SceneModel's {@link SceneModelEntity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this SceneModel.
     */
    finalize(): void;

    /**
     * Destroys this SceneModel.
     */
    destroy(): void;
}
