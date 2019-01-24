import {Plugin} from "./../../Plugin.js";
import {SectionPlane} from "../../../scene/sectionPlane/SectionPlane.js";

/**
 * {@link Viewer} plugin that manages user cross-section planes.
 *
 * TODO:
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {SectionPlanesPlugin} from "../src/viewer/plugins/SectionPlanesPlugin/SectionPlanesPlugin.js";
 *
 * // Create a viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin
 * const gltfLoaderPlugin = new GLTFModelsPlugin(viewer, {
 *      id: "GLTFModels"
 * });
 *
 * // Add a SectionPlanesPlugin
 * const sectionPlanesPlugin = new SectionPlanesPlugin(viewer, {
 *      id: "SectionPlanes"
 * });
 *
 * // Load a glTF model
 * const model = gltfLoaderPlugin.load({
 *      id: "myModel",
 *      src: "./models/gltf/mygltfmodel.gltf"
 * });
 *
 * // When the model has loaded, create some cross-sections
 * model.on("loaded", function() {
 *
 *     const sectionPlane1 = sectionPlanesPlugin.createSectionPlane({
 *         id: "myClip",
 *         pos: [0,0,0],
 *         dir: [0.5, 0.5, 0.5]
 *     });
 *
 *     const sectionPlane2 = sectionPlanesPlugin.createSectionPlane({
 *         id: "myClip2",
 *         pos: [0,0,0],
 *         dir: [0.5, -0.5, 0.5]
 *     });
 * });
 * ````
 */
class SectionPlanesPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="SectionPlanes"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("SectionPlanes", viewer);
        this.sectionPlanes = viewer.scene.sectionPlanes;
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clearSectionPlanes":
                this.clear();
                break;
        }
    }

    /**
     * Creates a SectionPlane.
     *
     * @param {Object} params SectionPlane plane configuration.
     * @param {String} params.id Unique ID to assign to the SectionPlane. Must be unique among all components in the Viewer.
     * @param {[Number, Number, Number]} [params.pos=0,0,0] World-space position of the sectionPlane plane.
     * @param {[Number, Number, Number]} [params.dir=[0,0,-1]} Vector indicating the orientation of the SectionPlane.
     * @param {Boolean} [params.active=true] Whether the SectionPlane is initially active. Only clips while this is true.
     * @param {Boolean} [params.shown=true] Whether to show a helper object to indicate the SectionPlane's position and orientation.
     * @returns {SectionPlane}  A {@link SectionPlane} representing the SectionPlane.
     */
    createSectionPlane(params) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + params.id);
            delete params.id;
        }
        return new SectionPlane(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active
        });
    }

    /**
     * Destroys a SectionPlane.
     *
     * @param {String} id ID of SectionPlane to destroy.
     */
    destroySectionPlane(id) {
        var sectionPlane = viewer.scene.sectionPlanes[id];
        if (!sectionPlane) {
            this.log("SectionPlane not found: " + id);
            return;
        }
        sectionPlane.destroy();
    }

    /**
     * Destroys all SectionPlanes.
     */
    clear() {
        var ids = Object.keys(this.viewer.scene.sectionPlanes);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroySectionPlane(ids[i]);
        }
    }

    /**
     * Destroys this plugin.
     *
     * Destroys all SectionPlanes first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {SectionPlanesPlugin}
