import {Plugin} from "../../viewer/Plugin.js";
import {SectionPlane} from "../../viewer/scene/sectionPlane/SectionPlane.js";
import {SectionPlaneControl} from "./SectionPlaneControl.js";
import {SectionPlanesOverview} from "./SectionPlanesOverview.js";

/**
 * {@link Viewer} plugin that manages user cross-section planes.
 *
 * In the example below, we'll use a {@link GLTFLoaderPlugin} to load a model, and a SectionPlanesPlugin
 * to create a {@link SectionPlane} to slice it in half.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#SectionPlanes_Schependomlaan)]
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {SectionPlanesPlugin} from "../src/plugins/SectionPlanesPlugin/SectionPlanesPlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-2.37, 18.97, -26.12];
 * viewer.scene.camera.look = [10.97, 5.82, -11.22];
 * viewer.scene.camera.up = [0.36, 0.83, 0.40];
 *
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * const sectionPlanes = new SectionPlanesPlugin(viewer);
 *
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/gltf/schependomlaan/scene.gltf"
 * });
 *
 * const sectionPlane = sectionPlanes.createSectionPlane({
 *     id: "mySectionPlane",
 *     pos: [0, 0, 0],
 *     dir: [0.5, 0.0, 0.5]
 * });
 *
 * const sectionPlaneControl = sectionPlanes.sectionPlaneControls["mySectionPlane"];
 *
 * sectionPlaneControl.setVisible(false);
 *
 * ````
 */
class SectionPlanesPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg Plugin configuration.
     * @param {String} [cfg.id="SectionPlanes"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {*} [cfg.overview={}] Optional initial configuration for the plugin's {@link SectionPlanesOverview}.
     */
    constructor(viewer, cfg = {}) {

        super("SectionPlanes", viewer);

        const overviewCfg = cfg.overview || {};

        this._visibleSectionPlane = null;

        this._overview = new SectionPlanesOverview(this, {
            alignment: overviewCfg.alignment,
            leftMargin: overviewCfg.leftMargin,
            rightMargin: overviewCfg.rightMargin,
            topMargin: overviewCfg.topMargin,
            bottomMargin: overviewCfg.bottomMargin,
            size: overviewCfg.size,
            visible: overviewCfg.visible,
            onClicked: (id) => {
                const sectionPlaneControl = this.sectionPlaneControls[id];
                if (this._visibleSectionPlane) {
                    this._visibleSectionPlane.setVisible(false);
                    if (this._visibleSectionPlane.sectionPlane.id === id) {
                        this._visibleSectionPlane = null;
                        return;
                    }
                }
                sectionPlaneControl.setVisible(true);
                this._visibleSectionPlane = sectionPlaneControl;
            },
            onNothingClicked: () => {
                if (this._visibleSectionPlane) {
                    this._visibleSectionPlane.setVisible(false);
                    this._visibleSectionPlane = null;
                }
            }
        });

        this._freeSectionPlaneControls = [];

        this.sectionPlanes = viewer.scene.sectionPlanes;

        this.sectionPlaneControls = {};
    }

    /**
     * Gets the {@link SectionPlanesOverview} gizmo, whhich provides an overview of the {@link SectionPlane}s.
     *
     * @type {SectionPlanesOverview}
     */
    get overview() {
        return this._overview;
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
     * @param {Number[]} [params.pos=0,0,0] World-space position of the sectionPlane plane.
     * @param {Number[]} [params.dir=[0,0,-1]} Vector indicating the orientation of the SectionPlane.
     * @param {Boolean} [params.active=true] Whether the SectionPlane is initially active. Only clips while this is true.
     * @param {Boolean} [params.shown=true] Whether to show a helper object to indicate the SectionPlane's position and orientation.
     * @returns {SectionPlane}  A {@link SectionPlane} representing the SectionPlane.
     */
    createSectionPlane(params) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + params.id);
            delete params.id;
        }
        const sectionPlane = new SectionPlane(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active
        });
        const sectionPlaneControl = (this._freeSectionPlaneControls.length > 0) ? this._freeSectionPlaneControls.pop() : new SectionPlaneControl(this.viewer);
        sectionPlaneControl._setSectionPlane(sectionPlane);
        this.sectionPlaneControls[sectionPlane.id] = sectionPlaneControl;
        this._overview._addSectionPlane(sectionPlane);
        return sectionPlane;
    }

    /**
     * Destroys a SectionPlane.
     *
     * @param {String} id ID of SectionPlane to destroy.
     */
    destroySectionPlane(id) {
        var sectionPlane = this.viewer.scene.sectionPlanes[id];
        if (!sectionPlane) {
            this.error("SectionPlane not found: " + id);
            return;
        }
        this._overview._removeSectionPlane(sectionPlane);
        sectionPlane.destroy();
        const sectionPlaneControl = this.sectionPlaneControls[id];
        if (!sectionPlaneControl) {
            return;
        }
        sectionPlaneControl.setVisible(false);
        sectionPlaneControl._setSectionPlane(null);
        delete this.sectionPlaneControls[sectionPlane.id];
        this._freeSectionPlaneControls.push(sectionPlaneControl);
    }

    /**
     * Destroys all SectionPlanes.
     */
    clear() {
        const ids = Object.keys(this.viewer.scene.sectionPlanes);
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
        this._overview._destroy();
        this.clear();
        this._destroyFreeSectionPlaneControls();
        super.destroy();
    }

    _destroyFreeSectionPlaneControls() {
        var sectionPlaneControl = this._freeSectionPlaneControls.pop();
        while (sectionPlaneControl) {
            sectionPlaneControl._destroy();
            sectionPlaneControl = this._freeSectionPlaneControls.pop();
        }
    }

}

export {SectionPlanesPlugin}
