import {Node} from "../../viewer/scene/nodes/Node.js";
import {Plugin} from "../../viewer/Plugin.js";
import {STLSceneGraphLoader} from "./STLSceneGraphLoader.js";
import {utils} from "../../viewer/scene/utils.js";
import {STLDefaultDataSource} from "./STLDefaultDataSource.js";

/**
 * {@link Viewer} plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> files.
 *
 * ## Overview
 *
 * * Creates an {@link Entity} representing each model it loads, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the model, which will have {@link Entity#isObject} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space, along with initial properties for all the model's {@link Entity}s.
 * * Supports both binary and ASCII formats.
 * * Supports double-precision vertex positions.
 * * Supports custom data source configuration.
 *
 * ## Smoothing STL Normals
 *
 * STL models are normally flat-shaded, however providing a ````smoothNormals```` parameter when loading gives a smooth
 * appearance. Triangles in STL are disjoint, where each triangle has its own separate vertex positions, normals and
 * (optionally) colors. This means that you can have gaps between triangles in an STL model. Normals for each triangle
 * are perpendicular to the triangle's surface, which gives the model a faceted appearance by default.
 *
 * The ```smoothNormals``` parameter causes the plugin to recalculate the STL normals, so that each normal's direction is
 * the average of the orientations of the triangles adjacent to its vertex. When smoothing, each vertex normal is set to
 * the average of the orientations of all other triangles that have a vertex at the same position, excluding those triangles
 * whose direction deviates from the direction of the vertice's triangle by a threshold given in
 * the ````smoothNormalsAngleThreshold```` loading parameter. This makes smoothing robust for hard edges.
 *
 * ## Creating Entities for Objects
 *
 * An STL model is normally a single mesh, however providing a ````splitMeshes```` parameter when loading
 * will create a separate object {@link Entity} for each group of faces that share the same vertex colors. This option
 * only works with binary STL files.
 *
 * See the {@link STLLoaderPlugin#load} method for more info on loading options.
 *
 * ## Usage
 *
 * In the example below, we'll use an STLLoaderPlugin to load an STL model of a spur gear. When the model has loaded,
 * we'll use the {@link CameraFlightAnimation} to fly the {@link Camera} to look at boundary of the model. We'll
 * then get the model's {@link Entity} from the {@link Scene} and highlight the whole model.
 *
 *  * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_STL_SpurGear)]
 *
 * ````javascript
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an STLLoaderPlugin to the Viewer
 * var plugin = new STLLoaderPlugin(viewer);
 *
 * // Load the STL model
 * var model = plugin.load({ // Model is an Entity
 *      id: "myModel",
 *      src: "./models/stl/binary/spurGear.stl",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true,
 *      smoothNormals: true,                // Default
 *      smoothNormalsAngleThreshold: 20,    // Default
 *      splitMeshes: true                   // Default
 * });
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() { // Model is an Entity
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Find the model Entity by ID
 * model = viewer.scene.models["myModel"];
 *
 * // Update properties of the model Entity
 * model.highlight = [1,0,0];
 *
 * // Destroy the model Entity
 * model.destroy();
 * ````
 *
 * ## Loading from a Pre-Loaded STL File
 *
 * If we already have our STL file in memory (perhaps pre-loaded, or even generated in-client), then we can just pass that
 * file data straight into the {@link STLLoaderPlugin#load} method. In the example below, to show how it's done, we'll pre-load
 * our STL file data, then pass it straight into that method.
 *
 *  * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_STL_dataAsParam)]
 *
 * ````javascript
 * loadSTL("./models/stl/binary/spurGear.stl", (stlData) =>{
 *
 *      const model = stlLoader.load({
 *          id: "myModel",
 *          stl: stlData,
 *          smoothNormals: true
 *      });
 *
 *      model.on("loaded", () => {
 *          viewer.cameraFlight.jumpTo(model);
 *          viewer.scene.on("tick", () => {
 *              viewer.camera.orbitYaw(0.4);
 *          })
 *      });
 *  })
 *
 * function loadSTL(src, ok, error) {
 *     const request = new XMLHttpRequest();
 *     request.overrideMimeType("application/json");
 *     request.open('GET', src, true);
 *     request.responseType = 'arraybuffer';
 *     request.onreadystatechange = function () {
 *         if (request.readyState === 4) {
 *             if (request.status === 200) {
 *                 ok(request.response);
 *             } else if (error) {
 *                     error(request.statusText);
 *             }
 *         }
 *     };
 *     request.send(null);
 * }
 *````
 *
 * ## Configuring a Custom Data Source
 *
 * In the example below, we'll create the STLLoaderPlugin again, this time configuring it with a
 * custom data source object, through which it can load STL files. For this example, our data source just loads
 * them via HTTP, for simplicity. Once we've created the STLLoaderPlugin, we'll load our STL file as before.
 *
 *  * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_STL_dataSource)]
 *
 * ````javascript
 * // Our custom STL data access strategy - implementation happens to be the same as STLDefaultDataSource
 *
 * class MyDataSource {
 *      getSTL(src, ok, error) {
 *          const request = new XMLHttpRequest();
 *          request.overrideMimeType("application/json");
 *          request.open('GET', src, true);
 *          request.responseType = 'arraybuffer';
 *          request.onreadystatechange = function () {
 *              if (request.readyState === 4) {
 *                  if (request.status === 200) {
 *                      ok(request.response);
 *                  } else {
 *                      error(request.statusText);
 *                  }
 *              }
 *          };
 *          request.send(null);
 *      }
 *  }
 *
 * const stlLoader = new STLLoaderPlugin(viewer, {
 *      dataSource: new MyDataSource()
 *  });
 *
 * // Load the STL model as before
 * var model = plugin.load({
 *      id: "myModel",
 *      src: "./models/stl/binary/spurGear.stl",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true,
 *      smoothNormals: true,                // Default
 *      smoothNormalsAngleThreshold: 20,    // Default
 *      splitMeshes: true                   // Default
 * });
 *
 * //...
 *````
 *
 * @class STLLoaderPlugin
 */
class STLLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg]  Plugin configuration.
     * @param {String} [cfg.id="STLLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.dataSource] A custom data source through which the STLLoaderPlugin can load STL files. Defaults to an instance of {@link STLDefaultDataSource}, which loads over HTTP.
     */
    constructor(viewer, cfg = {}) {

        super("STLLoader", viewer, cfg);

        /**
         * @private
         */
        this._sceneGraphLoader = new STLSceneGraphLoader();

        this.dataSource = cfg.dataSource;
    }

    /**
     * Sets a custom data source through which the STLLoaderPlugin can load STL files.
     *
     * Default value is {@link STLDefaultDataSource}, which loads via an XMLHttpRequest.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new STLDefaultDataSource();
    }

    /**
     * Gets the custom data source through which the STLLoaderPlugin can load STL files.
     *
     * Default value is {@link STLDefaultDataSource}, which loads via an XMLHttpRequest.
     *
     * @type {Object}
     */
    get dataSource() {
        return this._dataSource;
    }

    /**
     * Loads an STL model from a file into this STLLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} params.id ID to assign to the model's root {@link Entity}, unique among all components in the Viewer's {@link Scene}.
     * @param {String} [params.src] Path to an STL file. Overrides the ````stl```` parameter.
     * @param {String} [params.stl] Contents of an STL file, either binary of ASCII. Overridden by the ````src```` parameter.
     * @param {Boolean} [params.edges=false] Whether or not to renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model World-space 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model's World-space scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the STL.  When false, ignores backfaces.
     * @param {Boolean} [params.smoothNormals=true] When true, automatically converts face-oriented normals to vertex normals for a smooth appearance.
     * @param {Number} [params.smoothNormalsAngleThreshold=20] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Number} [params.edgeThreshold=20] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Boolean} [params.splitMeshes=true] When true, creates a separate {@link Mesh} for each group of faces that share the same vertex colors. Only works with binary STL.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}
     */
    load(params) {

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const modelNode = new Node(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        const src = params.src;
        const stl = params.stl;

        if (!src && !stl) {
            this.error("load() param expected: either 'src' or 'stl'");
            return modelNode;
        }

        if (src) {
            this._sceneGraphLoader.load(this, modelNode, src, params);
        } else {
            this._sceneGraphLoader.parse(this, modelNode, stl, params);
        }

        return modelNode;
    }
}


export {STLLoaderPlugin}