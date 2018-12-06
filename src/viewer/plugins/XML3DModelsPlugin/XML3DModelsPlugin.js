import {ModelsPlugin} from "./../../ModelsPlugin.js";
import {XML3DModel} from "./XML3DModel.js";

/**
 * A viewer plugin that loads models from [3DXML](https://en.wikipedia.org/wiki/3DXML) files.
 *
 * For each model loaded, creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within its
 * {@link Viewer}'s [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
 *
 * Note that the name of this plugin is intentionally munged to "XML3D" because a JavaScript
 * class name cannot begin with a numeral.
 *
 * An 3DXML model is a zip archive that bundles multiple XML files and assets. Internally, the XML3DModelsPlugin uses the
 * [zip.js](https://gildas-lormeau.github.io/zip.js/) library to unzip them before loading. The zip.js library uses
 * [Web workers](https://www.w3.org/TR/workers/) for fast unzipping, so XML3DModelsPlugin requires that we configure it
 * with a ````workerScriptsPath```` property specifying the directory where zip.js keeps its Web worker script. See 
 * the example for how to do that. 
 *
 * See the {@link XML3DModelsPlugin#load} method for parameters that you can configure
 * each [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with as you load it.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an XML3DModelsPlugin to the Viewer
 * var plugin = new XML3DModelsPlugin(viewer, {
 *      id: "XML3DModels",  // Default value
 *      workerScriptsPath : "../../src/plugins/XML3DModels/zipjs/" // Path to zip.js workers dir
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.XML3DModels;
 *
 * // Load the 3DXML model
 * // These params can include all the xeogl.OBJModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/my3DXMLModel.3dxml",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // Recall that the model is a xeogl.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model via the xeogl.Model
 * model.translate = [200,0,0];
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the xeogl.Model itself
 * model.destroy();
 *
 * @class XML3DModels
 */

class XML3DModelsPlugin extends ModelsPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="XML3DModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} cfg.workerScriptsPath Path to the directory that contains the
     * bundled [zip.js](https://gildas-lormeau.github.io/zip.js/) archive, which is a dependency of this plugin. This directory
     * contains the script that is used by zip.js to instantiate Web workers, which assist with unzipping the 3DXML, which is a ZIP archive.
     */
    constructor(viewer, cfg) {
        super("XML3DModels", viewer, XML3DModel, cfg);
        cfg = cfg || {};
        if (!cfg.workerScriptsPath) {
            this.error("Config expected: workerScriptsPath");
            return
        }
        this._workerScriptsPath = cfg.workerScriptsPath;
    }

    /**
     * Loads a 3DXML model from a file into this XML3DModelsPlugin's {@link Viewer}.
     *
     * Creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the [xeogl.Model](http://xeogl.org/docs/classes/Model.html),
     * unique among all components in the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {String} [params.src] Path to a 3DXML file.
     *
     * @param {xeogl.Object} [params.parent] The parent [xeogl.Object](http://xeogl.org/docs/classes/Object.html),
     * if we want to graft the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) into a xeogl object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeogl renders the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterials=false]  When true, gives each [xeogl.Mesh](http://xeogl.org/docs/classes/Mesh.html)
     * the same [xeogl.LambertMaterial](http://xeogl.org/docs/classes/LambertMaterial.html) and a ````colorize````
     * value set the to diffuse color extracted from the 3DXML material. This is typically used for large CAD models and
     * will cause loading to ignore textures in the 3DXML.
     *
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the 3DXML.
     * When false, ignores backfaces.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{xeogl.Model}} A [xeogl.Model](http://xeogl.org/docs/classes/Model.html) representing the loaded 3DXML model.
     */
    load(params) {
        params.workerScriptsPath = this._workerScriptsPath;
        return super.load(params);
    }
}

export {XML3DModelsPlugin}