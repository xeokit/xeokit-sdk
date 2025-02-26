import {IFCObjectDefaults, Plugin, VBOSceneModel, Viewer} from "../../viewer";

export declare type XKTLoaderPluginConfiguration = {
    /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
    id?: string;
    /** Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.*/
    objectDefaults?: IFCObjectDefaults;
    /** A custom data source through which the XKTLoaderPlugin can load model and metadata files. Defaults to an instance of {@link XKTDefaultDataSource}, which loads uover HTTP. */
    dataSource?: IXKTDefaultDataSource;
    /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
    includeTypes?: string[];
    /** When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
    excludeTypes?: string[];
    /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.id} values in this list. */
    includeIds?: string[];
    /** When loading metadata and this is ````true````, will only load {@link Entity}s that have {@link MetaObject}s (that are not excluded). This is useful when we don't want Entitys in the Scene that are not represented within IFC navigation components, such as {@link TreeViewPlugin}. */
    excludeUnclassifiedObjects?: boolean;
    /** Indicates whether to enable geometry reuse */
    reuseGeometries?: boolean;
    /** Maximum geometry batch size, as number of vertices. */
    maxGeometryBatchSize?: number;
};

export declare type LoadXKTModel = {
    /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
    id?: string;
    /** Path or URL to a *````.xkt````* file, as an alternative to the ````xkt```` parameter. */
    src?: string;
    /** The *````.xkt````* file data, as an alternative to the ````src```` parameter. */
    xkt?: ArrayBuffer;
    /** Path or URL to an optional metadata file, as an alternative to the ````metaModelData```` parameter. */
    metaModelSrc?: string;
    /** JSON model metadata, as an alternative to the ````metaModelSrc```` parameter. */
    metaModelData?: any;
    /** Path or URL to a JSON manifest file that provides paths or URLs to ````.xkt```` files to load as parts of the model. Use this option to load models that have been split intomultiple XKT files. See [tutorial](https://www.notion.so/xeokit/Automatically-Splitting-Large-Models-for-Better-Performance-165fc022e94742cf966ee50003572259) for more info.*/
    manifestSrc?: any;
    /** A JSON manifest object (as an alternative to a path or URL) that provides paths or URLs to ````.xkt```` files to load as parts of the model. Use this option to load models that have been split intomultiple XKT files. See [tutorial](https://www.notion.so/xeokit/Automatically-Splitting-Large-Models-for-Better-Performance-165fc022e94742cf966ee50003572259) for more info. */
    manifest?: object;
    /** Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}. */
    objectDefaults?: object;
    /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
    includeTypes?: string[]
    /** When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
    excludeTypes?: string[];
    /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.id} values in this list. */
    includeIds?: string[]
    /** Whether or not xeokit renders the model with edges emphasized. */
    edges?: boolean;
    /** The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates. */
    origin?: number[];
    /** The model single-precision 3D position, relative to the ````origin```` parameter. */
    position?: number[];
    /** The model's scale. */
    scale?: number[];
    /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
    rotation?: number[];
    /** The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````.*/
    matrix?: number[];
    /** Indicates if Scalable Ambient Obscurance (SAO) will apply to the model. SAO is configured by the Scene's {@link SAO} component. Only works when {@link SAO.enabled} is also ````true```` */
    saoEnabled?: boolean;
    /** Indicates if physically-based rendering (PBR) will apply to the model. Only works when {@link Scene.pbrEnabled} is also ````true````. */
    pbrEnabled?: boolean;
    /** Indicates if base color texture rendering is enabled for the model. Overridden by ````pbrEnabled````.  Only works when {@link Scene#colorTextureEnabled} is also ````true````. */
    colorTextureEnabled?: boolean;
    /** When we set this ````true````, then we force rendering of backfaces for the model. */
    backfaces?: boolean;
    /** When loading metadata and this is ````true````, will only load {@link Entity}s that have {@link MetaObject}s (that are not excluded). */
    excludeUnclassifiedObjects?: boolean;
    /** Indicates whether to globalize each {@link Entity.id} and {@link MetaObject.id}, in case you need to prevent ID clashes with other models. */
    globalizeObjectIds?: boolean;
    /** Indicates whether to enable geometry reuse (````true```` by default) or whether to expand
     * all geometry instances into batches (````false````), and not use instancing to render them. Setting this ````false```` can significantly
     * improve Viewer performance for models that have excessive geometry reuse, but may also increases the amount of
     * browser and GPU memory used by the model. See [#769](https://github.com/xeokit/xeokit-sdk/issues/769) for more info. */
    reuseGeometries?: boolean;
    /** When ````true```` (default) use data textures (DTX), where appropriate, to
     * represent the returned model. Set false to always use vertex buffer objects (VBOs). Note that DTX is only applicable
     * to non-textured triangle meshes, and that VBOs are always used for meshes that have textures, line segments, or point
     * primitives. Only works while {@link DTX#enabled} is also ````true````. */
    dtxEnabled?: boolean;
    /** Specifies the rendering order for the model. This is used to control the order in which
     * SceneModels are drawn when they have transparent objects, to give control over the order in which those objects are blended within the transparent
     * render pass. */
    renderOrder?: number;
}

export declare interface IXKTDefaultDataSource {
    /**
     * Gets metamodel JSON.
     *
     * @param {String|Number} metaModelSrc Identifies the metamodel JSON asset.
     * @param {Function(*)} ok Fired on successful loading of the metamodel JSON asset.
     * @param {Function(*)} error Fired on error while loading the metamodel JSON asset.
     */
    getMetaModel(metaModelSrc: string | number, ok: (json: any) => void, error: (e: Error) => void): void;

    /**
     * Gets the contents of the given ````.xkt```` file in an arraybuffer.
     *
     * @param {String|Number} src Path or ID of an ````.xkt```` file.
     * @param {Function} ok Callback fired on success, argument is the ````.xkt```` file in an arraybuffer.
     * @param {Function} error Callback fired on error.
     */
    getXKT(src: string | number, ok: (buffer: ArrayBuffer) => void, error: (e: Error) => void): void;

    get cacheBuster(): boolean;

    set cacheBuster(value: boolean);
}

/**
 * {@link Viewer} plugin that loads models from xeokit's optimized *````.XKT````* format.
 *
 */
export declare class XKTLoaderPlugin extends Plugin {
    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {XKTLoaderPluginConfiguration} cfg  Plugin configuration.
     */
    constructor(viewer: Viewer, cfg?: XKTLoaderPluginConfiguration);

    /**
     * Sets a custom data source through which the XKTLoaderPlugin can load models and metadata.
     *
     * Default value is {@link XKTDefaultDataSource}, which loads via HTTP.
     *
     * @type {IXKTDefaultDataSource}
     */
    set dataSource(arg: IXKTDefaultDataSource);

    /**
     * Gets the custom data source through which the XKTLoaderPlugin can load models and metadata.
     *
     * Default value is {@link XKTDefaultDataSource}, which loads via HTTP.
     *
     * @type {IXKTDefaultDataSource}
     */
    get dataSource(): IXKTDefaultDataSource;

    /**
     * Sets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * @type {IFCObjectDefaults}
     */
    set objectDefaults(arg: IFCObjectDefaults);

    /**
     * Gets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * @type {IFCObjectDefaults}
     */
    get objectDefaults(): IFCObjectDefaults;

    /**
     * Sets the whitelist of the IFC types loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    set includeTypes(arg: string[]);

    /**
     * Gets the whitelist of the IFC types loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */

    get includeTypes(): string[];

    /**
     * Sets the blacklist of IFC types that are never loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to **not** load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    set excludeTypes(arg: string[]);

    /**
     * Gets the blacklist of IFC types that are never loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to **not** load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    get excludeTypes(): string[];

    /**
     * Sets the whitelist of the specified elements by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose ids are in this
     * list. An object's id is indicated by its {@link MetaObject}'s {@link MetaObject#id}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    set includeIds(arg: string[]);

    /**
     * Gets the whitelist of the specified elements loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose ids are in this
     * list. An object's id is indicated by its {@link MetaObject}'s {@link MetaObject#id}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    get includeIds(): string[];

    /**
     * Sets whether we load objects that don't have IFC types.
     *
     * When loading models with metadata and this is ````true````, XKTLoaderPlugin will not load objects
     * that don't have IFC types.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set excludeUnclassifiedObjects(arg: boolean);

    /**
     * Gets whether we load objects that don't have IFC types.
     *
     * When loading models with metadata and this is ````true````, XKTLoaderPlugin will not load objects
     * that don't have IFC types.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get excludeUnclassifiedObjects(): boolean;

    /**
     * Sets whether XKTLoaderPlugin enables geometry reuse when loading models.
     *
     * Default value is ````true````.
     *
     * Geometry reuse saves memory, but can impact Viewer performance when there are many reused geometries. For
     * this reason, we can set this ````false```` to disable geometry reuse for models loaded by this XKTLoaderPlugin
     * (which will then "expand" the geometry instances into batches instead).
     *
     * The result will be be less WebGL draw calls (which are expensive), at the cost of increased memory footprint.
     *
     * See [.769](https://github.com/xeokit/xeokit-sdk/issues/769) for more info.
     *
     * @type {Boolean}
     */
    set reuseGeometries(arg: boolean);

    /**
     * Gets whether XKTLoaderPlugin enables geometry reuse when loading models.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get reuseGeometries(): boolean;

    /**
     * Gets the ````.xkt```` format versions supported by this XKTLoaderPlugin/
     * @returns {string[]}
     */
    get supportedVersions(): string[];

    /**
     * Sets whether XKTLoaderPlugin globalizes each {@link Entity.id} and {@link MetaObject.id} as it loads a model.
     *
     * Set  this ````true```` when you need to load multiple instances of the same model, to avoid ID clashes
     * between the objects in the different instances.
     *
     * When we load a model with this set ````true````, then each {@link Entity.id} and {@link MetaObject.id} will be
     * prefixed by the ID of the model, ie. ````<modelId>.<objectId>````.
     *
     * {@link Entity.originalSystemId} and {@link MetaObject.originalSystemId} will always hold the original, un-prefixed, ID values.
     *
     * Default value is ````false````.
     *
     * See the main {@link XKTLoaderPlugin} class documentation for usage info.
     *
     * @type {Boolean}
     */
    set globalizeObjectIds(arg: boolean);

    /**
     * Gets whether XKTLoaderPlugin globalizes each {@link Entity.id} and {@link MetaObject.id} as it loads a model.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get globalizeObjectIds(): boolean;


    /**
     * Loads an ````.xkt```` model into this XKTLoaderPlugin's {@link Viewer}.
     *
     * Since xeokit/xeokit-sdk 1.9.0, XKTLoaderPlugin has supported XKT 8, which bundles the metamodel
     * data (eg. an IFC element hierarchy) in the XKT file itself. For XKT 8, we therefore no longer need to
     * load the metamodel data from a separate accompanying JSON file, as we did with previous XKT versions.
     * However, if we do choose to specify a separate metamodel JSON file to load (eg. for backward compatibility
     * in data pipelines), then that metamodel will be loaded and the metamodel in the XKT 8 file will be ignored.
     *
     * @param {LoadXKTModel} params Loading parameters.
     * @returns {VBOSceneModel} Entity representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
     */
    load(params: LoadXKTModel): VBOSceneModel;
}
