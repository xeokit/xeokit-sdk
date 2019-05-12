import {math} from "../../viewer/scene/math/math.js";
import {Plugin} from "../../viewer/Plugin.js";
import {SectionPlane} from "../../viewer/scene/sectionPlane/SectionPlane.js";
import {SectionPlaneControl} from "./SectionPlaneControl.js";
import {SectionPlanesOverview} from "./SectionPlanesOverview.js";

const tempAABB = math.AABB3();
const tempVec3 = math.vec3();

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
     * @param {*} [cfg.overview={}] Optional initial configuration for the plugin's {@link Overview}.
     */
    constructor(viewer, cfg = {}) {

        super("SectionPlanes", viewer);

        this._freeSectionPlaneControls = [];
        this._sectionPlanes = viewer.scene.sectionPlanes;
        this._sectionPlaneControls = {};

        const overviewCfg = cfg.overview || {};

        this._activeControl = null;

        this._overview = new SectionPlanesOverview(this, {
            alignment: overviewCfg.alignment,
            leftMargin: overviewCfg.leftMargin,
            rightMargin: overviewCfg.rightMargin,
            topMargin: overviewCfg.topMargin,
            bottomMargin: overviewCfg.bottomMargin,
            size: overviewCfg.size,
            visible: overviewCfg.visible,

            onHoverEnterPlane: ((id) => {
                this._overview.planes[id]._setHighlighted(true);
            }),

            onHoverLeavePlane: ((id) => {
                this._overview.planes[id]._setHighlighted(false);
            }),

            onClickedPlane: ((id) => {
                const sectionPlaneControl = this._sectionPlaneControls[id];
                if (this._activeControl) {
                    this._overview.planes[id]._setSelected(false);
                    this._activeControl.setVisible(false);
                    if (this._activeControl.sectionPlane.id === id) { // Toggle visibility
                        this._activeControl = null;
                        return;
                    }
                }
                sectionPlaneControl.setVisible(true);
                this._overview.planes[id]._setSelected(true);
                this._activeControl = sectionPlaneControl;
                const sectionPlanePos = sectionPlaneControl.sectionPlane.pos;
                tempAABB.set(this.viewer.scene.aabb);
                math.getAABB3Center(tempAABB, tempVec3);
                tempAABB[0] += sectionPlanePos[0] - tempVec3[0];
                tempAABB[1] += sectionPlanePos[1] - tempVec3[1];
                tempAABB[2] += sectionPlanePos[2] - tempVec3[2];
                tempAABB[3] += sectionPlanePos[0] - tempVec3[0];
                tempAABB[4] += sectionPlanePos[1] - tempVec3[1];
                tempAABB[5] += sectionPlanePos[2] - tempVec3[2];
                this.viewer.cameraFlight.flyTo({
                    aabb: tempAABB,
                    fitFOV: 65
                })
            }),

            onClickedNothing: cfg.onClickedNothing || (() => {
                if (this._activeControl) {
                    this._activeControl.setVisible(false);
                    this._activeControl = null;
                }
            })
        });
    }

    /**
     * Gets the {@link SectionPlanesOverview}, which manages an interactive 3D overview of the {@link SectionPlane}s created by this SectionPlanesPlugin.
     *
     * @type {SectionPlanesOverview}
     */
    get overview() {
        return this._overview;
    }

    /**
     * Returns a map of the {@link SectionPlane}s created by this SectionPlanesPlugin.
     *
     * @returns {{String:SectionPlane}} A map containing the {@link SectionPlane}s, each mapped to its {@link SectionPlane#id}.
     */
    get sectionPlanes() {
        return this._sectionPlanes;
    }

    /**
     * Returns a map of the {@link SectionPlaneControl}s created by this SectionPlanesPlugin.
     *
     * @returns {{String:SectionPlaneControl}} A map containing the {@link SectionPlaneControl}s, each mapped to its {@link SectionPlaneControl#id}
     */
    get sectionPlaneControls() {
        return this._sectionPlaneControls;
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
     * Creates a {@link SectionPlane}.
     *
     * This method creates:
     *
     * * a {@link SectionPlane} in {@link SectionPlanesPlugin#sectionPlanes},
     * * a {@link SectionPlaneControl} in {@link SectionPlanesPlugin#sectionPlaneControls}, and
     * * a {@link SectionPlanesOverviewPlane} within the {@link SectionPlanesOverview}.
     *
     * @param {Object} params SectionPlane plane configuration.
     * @param {String} [params.id] Unique ID to assign to the SectionPlane. Must be unique among all components in the Viewer. Auto-generated when omitted.
     * @param {Number[]} [params.pos=0,0,0] World-space position of the sectionPlane plane.
     * @param {Number[]} [params.dir=[0,0,-1]} World-space vector indicating the orientation of the SectionPlane.
     * @param {Boolean} [params.active=true] Whether the SectionPlane is initially active. Only clips while this is true.
     * @returns {SectionPlane} The new {@link SectionPlane}.
     */
    createSectionPlane(params) {
        if (params.id !== undefined && params.id !== null && this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + params.id);
            delete params.id;
        }
        const sectionPlane = new SectionPlane(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active
        });
        const sectionPlaneControl = (this._freeSectionPlaneControls.length > 0) ? this._freeSectionPlaneControls.pop() : new SectionPlaneControl(this);
        sectionPlaneControl._setSectionPlane(sectionPlane);
        sectionPlaneControl.setVisible(false);
        this._sectionPlaneControls[sectionPlane.id] = sectionPlaneControl;
        this._overview._addSectionPlane(sectionPlane);
        return sectionPlane;
    }

    /**
     * Destroys a {@link SectionPlane} created by this SectionPlanesPlugin.
     *
     * Also destroys its {@link SectionPlaneControl} and {@link SectionPlanesOverviewPlane}.
     *
     * @param {String} id ID of the {@link SectionPlane}.
     */
    destroySectionPlane(id) {
        var sectionPlane = this.viewer.scene.sectionPlanes[id];
        if (!sectionPlane) {
            this.error("SectionPlane not found: " + id);
            return;
        }
        this._overview._removeSectionPlane(sectionPlane);
        sectionPlane.destroy();
        const sectionPlaneControl = this._sectionPlaneControls[id];
        if (!sectionPlaneControl) {
            return;
        }
        sectionPlaneControl.setVisible(false);
        sectionPlaneControl._setSectionPlane(null);
        delete this._sectionPlaneControls[sectionPlane.id];
        this._freeSectionPlaneControls.push(sectionPlaneControl);
        if (this._activeControl && this._activeControl.id === id) {
            this._activeControl = null;
        }
    }

    /**
     * Destroys all {@link SectionPlane}s created by this SectionPlanesPlugin.
     *
     * Also destroys each SectionPlane's {@link SectionPlaneControl} and {@link SectionPlanesOverviewPlane}.
     */
    clear() {
        const ids = Object.keys(this.viewer.scene.sectionPlanes);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroySectionPlane(ids[i]);
        }
    }

    /**
     * Destroys this SectionPlanesPlugin.
     *
     * Also destroys each {@link SectionPlane}, {@link SectionPlaneControl} and {@link SectionPlanesOverviewPlane} created by this SectionPlanesPlugin.
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
