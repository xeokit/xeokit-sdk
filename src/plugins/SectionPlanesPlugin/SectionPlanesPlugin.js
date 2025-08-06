import {math} from "../../viewer/scene/math/math.js";
import {Plugin} from "../../viewer/Plugin.js";
import {SectionPlane} from "../../viewer/scene/sectionPlane/SectionPlane.js";
import {TransformControl} from "../TransformControl/TransformControl.js";
import {Overview} from "./Overview.js";

import {buildCylinderGeometry} from "../../viewer/scene/geometry/builders/buildCylinderGeometry.js";
import {buildSphereGeometry} from "../../viewer/scene/geometry/builders/buildSphereGeometry.js";
import {buildTorusGeometry} from "../../viewer/scene/geometry/builders/buildTorusGeometry.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {EmphasisMaterial} from "../../viewer/scene/materials/EmphasisMaterial.js";
import {Node} from "../../viewer/scene/nodes/Node.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {worldToRTCPos} from "../../viewer/scene/math/rtcCoords.js";

const tempAABB = math.AABB3();
const tempVec3 = math.vec3();

/**
 * SectionPlanesPlugin is a {@link Viewer} plugin that manages {@link SectionPlane}s.
 *
 * [<img src="https://user-images.githubusercontent.com/83100/57724962-406e9a00-768c-11e9-9f1f-3d178a3ec11f.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#gizmos_SectionPlanesPlugin)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#gizmos_SectionPlanesPlugin)]
 *
 * ## Overview
 *
 * * Use the SectionPlanesPlugin to
 * create and edit {@link SectionPlane}s to slice portions off your models and reveal internal structures.
 * * As shown in the screen capture above, SectionPlanesPlugin shows an overview of all your SectionPlanes (on the right, in
 * this example).
 * * Click a plane in the overview to activate a 3D control with which you can interactively
 * reposition its SectionPlane in the main canvas.
 * * Use {@lin BCFViewpointsPlugin} to save and load SectionPlanes in BCF viewpoints.
 *
 * ## Usage
 *
 * In the example below, we'll use a {@link GLTFLoaderPlugin} to load a model, and a SectionPlanesPlugin
 * to slice it open with two {@link SectionPlane}s. We'll show the overview in the bottom right of the Viewer
 * canvas. Finally, we'll programmatically activate the 3D editing control, so that we can use it to interactively
 * reposition our second SectionPlane.
 *
 * ````JavaScript
 * import {Viewer, GLTFLoaderPlugin, SectionPlanesPlugin} from "xeokit-sdk.es.js";
 *
 * // Create a Viewer and arrange its Camera
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [-5.02, 2.22, 15.09];
 * viewer.camera.look = [4.97, 2.79, 9.89];
 * viewer.camera.up = [-0.05, 0.99, 0.02];
 *
 *
 * // Add a GLTFLoaderPlugin
 *
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * // Add a SectionPlanesPlugin, with overview visible
 *
 * const sectionPlanes = new SectionPlanesPlugin(viewer, {
 *     overviewCanvasID: "myOverviewCanvas",
 *     overviewVisible: true
 * });
 *
 * // Load a model
 *
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/gltf/schependomlaan/scene.gltf"
 * });
 *
 * // Create a couple of section planes
 * // These will be shown in the overview
 *
 * sectionPlanes.createSectionPlane({
 *     id: "mySectionPlane",
 *     pos: [1.04, 1.95, 9.74],
 *     dir: [1.0, 0.0, 0.0]
 * });
 *
 * sectionPlanes.createSectionPlane({
 *     id: "mySectionPlane2",
 *     pos: [2.30, 4.46, 14.93],
 *     dir: [0.0, -0.09, -0.79]
 * });
 *
 * // Show the SectionPlanePlugin's 3D editing gizmo,
 * // to interactively reposition one of our SectionPlanes
 *
 * sectionPlanes.showControl("mySectionPlane2");
 *
 * const mySectionPlane2 = sectionPlanes.sectionPlanes["mySectionPlane2"];
 *
 * // Programmatically reposition one of our SectionPlanes
 * // This also updates its position as shown in the overview gizmo
 *
 * mySectionPlane2.pos = [11.0, 6.0, -12];
 * mySectionPlane2.dir = [0.4, 0.0, 0.5];
 * ````
 */
class SectionPlanesPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg Plugin configuration.
     * @param {String} [cfg.id="SectionPlanes"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.overviewCanvasId] ID of a canvas element to display the overview.
     * @param {String} [cfg.overviewVisible=true] Initial visibility of the overview canvas.
     */
    constructor(viewer, cfg = {}) {

        super("SectionPlanes", viewer);

        this._freeControls = [];
        this._sectionPlanes = viewer.scene.sectionPlanes;
        this._controls = {};
        this._shownControlId = null;

        if (cfg.overviewCanvasId !== null && cfg.overviewCanvasId !== undefined) {

            const overviewCanvas = document.getElementById(cfg.overviewCanvasId);

            if (!overviewCanvas) {
                this.warn("Can't find overview canvas: '" + cfg.overviewCanvasId + "' - will create plugin without overview");

            } else {

                this._overview = new Overview(this, {
                    overviewCanvas: overviewCanvas,
                    visible: cfg.overviewVisible,

                    onHoverEnterPlane: ((id) => {
                        this._overview.setPlaneHighlighted(id, true);
                    }),

                    onHoverLeavePlane: ((id) => {
                        this._overview.setPlaneHighlighted(id, false);
                    }),

                    onClickedPlane: ((id) => {
                        if (this.getShownControl() === id) {
                            this.hideControl();
                            return;
                        }
                        this.showControl(id);
                        const sectionPlane = this.sectionPlanes[id];
                        const sectionPlanePos = sectionPlane.pos;
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
                        });
                    }),

                    onClickedNothing: (() => {
                        this.hideControl();
                    })
                });
            }
        }

        this._onSceneSectionPlaneCreated = viewer.scene.on("sectionPlaneCreated", (sectionPlane) => {

            // SectionPlane created, either via SectionPlanesPlugin#createSectionPlane(), or by directly
            // instantiating a SectionPlane independently of SectionPlanesPlugin, which can be done
            // by BCFViewpointsPlugin#loadViewpoint().

            this._sectionPlaneCreated(sectionPlane);
        });
    }

    /**
     * Sets if the overview canvas is visible.
     *
     * @param {Boolean} visible Whether or not the overview canvas is visible.
     */
    setOverviewVisible(visible) {
        if (this._overview) {
            this._overview.setVisible(visible);
        }
    }

    /**
     * Gets if the overview canvas is visible.
     *
     * @return {Boolean} True when the overview canvas is visible.
     */
    getOverviewVisible() {
        if (this._overview) {
            return this._overview.getVisible();
        }
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
     * Creates a {@link SectionPlane}.
     *
     * The {@link SectionPlane} will be registered by {@link SectionPlane#id} in {@link SectionPlanesPlugin#sectionPlanes}.
     *
     * @param {Object} params {@link SectionPlane} configuration.
     * @param {String} [params.id] Unique ID to assign to the {@link SectionPlane}. Must be unique among all components in the {@link Viewer}'s {@link Scene}. Auto-generated when omitted.
     * @param {Number[]} [params.pos=[0,0,0]] World-space position of the {@link SectionPlane}.
     * @param {Number[]} [params.dir=[0,0,-1]] World-space vector indicating the orientation of the {@link SectionPlane}.
     * @param {Boolean} [params.active=true] Whether the {@link SectionPlane} is initially active. Only clips while this is true.
     * @returns {SectionPlane} The new {@link SectionPlane}.
     */
    createSectionPlane(params = {}) {

        if (params.id !== undefined && params.id !== null && this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + params.id);
            delete params.id;
        }

        // Note that SectionPlane constructor fires "sectionPlaneCreated" on the Scene,
        // which SectionPlanesPlugin handles and calls #_sectionPlaneCreated to create gizmo and add to overview canvas.

        const sectionPlane = new SectionPlane(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active
        });
        return sectionPlane;
    }

    _sectionPlaneCreated(sectionPlane) {
        const control = ((this._freeControls.length > 0)
                         ? this._freeControls.pop()
                         : (() => {
                             const scene = this.viewer.scene;
                             const planeRoot = (function() {
                                 const rootNode = new Node(scene, { isObject: false });

                                 rootNode.addChild(new Mesh(rootNode, { // plane
                                     geometry: new ReadableGeometry(rootNode, {
                                         primitive: "triangles",
                                         positions: [
                                             0.5, 0.5, 0.0, 0.5, -0.5, 0.0, // 0
                                             -0.5, -0.5, 0.0, -0.5, 0.5, 0.0, // 1
                                             0.5, 0.5, -0.0, 0.5, -0.5, -0.0, // 2
                                             -0.5, -0.5, -0.0, -0.5, 0.5, -0.0 // 3
                                         ],
                                         indices: [0, 1, 2, 2, 3, 0]
                                     }),
                                     material: new PhongMaterial(rootNode, {
                                         emissive: [0, 0.0, 0],
                                         diffuse: [0, 0, 0],
                                         backfaces: true
                                     }),
                                     opacity: 0.6,
                                     ghosted: true,
                                     ghostMaterial: new EmphasisMaterial(rootNode, {
                                         edges: false,
                                         filled: true,
                                         fillColor: [1, 1, 0],
                                         edgeColor: [0, 0, 0],
                                         fillAlpha: 0.1,
                                         backfaces: true
                                     }),
                                     pickable: false,
                                     collidable: true,
                                     clippable: false,
                                     visible: false,
                                     scale: [2.4, 2.4, 1],
                                     isObject: false
                                 }));

                                 rootNode.addChild(new Mesh(rootNode, { // Visible frame
                                     geometry: new ReadableGeometry(rootNode, buildTorusGeometry({
                                         center: [0, 0, 0],
                                         radius: 1.7,
                                         tube: 0.02,
                                         radialSegments: 4,
                                         tubeSegments: 4,
                                         arc: Math.PI * 2.0
                                     })),
                                     material: new PhongMaterial(rootNode, {
                                         emissive: [0, 0, 0],
                                         diffuse: [0, 0, 0],
                                         specular: [0, 0, 0],
                                         shininess: 0
                                     }),
                                     //highlighted: true,
                                     highlightMaterial: new EmphasisMaterial(rootNode, {
                                         edges: false,
                                         edgeColor: [0.0, 0.0, 0.0],
                                         filled: true,
                                         fillColor: [0.8, 0.8, 0.8],
                                         fillAlpha: 1.0
                                     }),
                                     pickable: false,
                                     collidable: false,
                                     clippable: false,
                                     visible: false,
                                     scale: [1, 1, .1],
                                     rotation: [0, 0, 45],
                                     isObject: false
                                 }));

                                 return {
                                     setPosition: (function() {
                                         const origin = math.vec3();
                                         const rtcPos = math.vec3();
                                         return function(p) {
                                             worldToRTCPos(p, origin, rtcPos);
                                             rootNode.origin = origin;
                                             rootNode.position = rtcPos;
                                         };
                                     })(),
                                     setQuaternion: q => { rootNode.quaternion = q; },
                                     setScale: s => { rootNode.scale = s; },
                                     setVisible: v => { rootNode.visible = v; }
                                 };
                             })();
                             let unbindSectionPlane = () => { };
                             const ctrl = new TransformControl(this.viewer);

                             let culled  = false;
                             let visible = false;
                             let handlers = null;
                             const updateVisible = () => {
                                 const vis = visible && (! culled);
                                 planeRoot.setVisible(vis);
                                 ctrl.setHandlers(vis && handlers);
                             };

                             return {
                                 _destroy: () => {
                                     unbindSectionPlane();
                                     ctrl.destroy();
                                 },
                                 setCulled:  c => { culled = c;  updateVisible(); },
                                 setVisible: v => { visible = v; updateVisible(); },
                                 _setSectionPlane: sectionPlane => {
                                     unbindSectionPlane();
                                     if (sectionPlane) {
                                         let ignoreNextSectionPlaneDirUpdate = false;
                                         handlers = {
                                             onPosition:   p => {
                                                 planeRoot.setPosition(p);
                                                 sectionPlane.pos = p;
                                             },
                                             onQuaternion: q => {
                                                 planeRoot.setQuaternion(q);
                                                 ignoreNextSectionPlaneDirUpdate = true;
                                                 sectionPlane.quaternion = q;
                                             },
                                             onScreenScale: s => {
                                                 planeRoot.setScale(s);
                                             }
                                         };

                                         const setPosFromSectionPlane = () => {
                                             planeRoot.setPosition(sectionPlane.pos);
                                             ctrl.setPosition(sectionPlane.pos);
                                         };
                                         const setDirFromSectionPlane = () => {
                                             planeRoot.setQuaternion(sectionPlane.quaternion);
                                             ctrl.setQuaternion(sectionPlane.quaternion);
                                         };
                                         setPosFromSectionPlane();
                                         setDirFromSectionPlane();
                                         const onSectionPlanePos = sectionPlane.on("pos", setPosFromSectionPlane);
                                         const onSectionPlaneDir = sectionPlane.on("dir", () => {
                                             if (!ignoreNextSectionPlaneDirUpdate) {
                                                 setDirFromSectionPlane();
                                             } else {
                                                 ignoreNextSectionPlaneDirUpdate = false;
                                             }
                                         });

                                         unbindSectionPlane = () => {
                                             sectionPlane.off(onSectionPlanePos);
                                             sectionPlane.off(onSectionPlaneDir);
                                             unbindSectionPlane = () => { };
                                         };
                                     }
                                 }
                             };
                         })());
        control._setSectionPlane(sectionPlane);
        control.setVisible(false);
        this._controls[sectionPlane.id] = control;
        if (this._overview) {
            this._overview.addSectionPlane(sectionPlane);
        }
        sectionPlane.once("destroyed", () => {
            this._sectionPlaneDestroyed(sectionPlane);
        });
    }

    /**
     * Inverts the direction of {@link SectionPlane#dir} on every existing SectionPlane.
     *
     * Inverts all SectionPlanes, including those that were not created with SectionPlanesPlugin.
     */
    flipSectionPlanes() {
        const sectionPlanes = this.viewer.scene.sectionPlanes;
        for (let id in sectionPlanes) {
            const sectionPlane = sectionPlanes[id];
            sectionPlane.flipDir();
        }
    }

    /**
     * Shows the 3D editing gizmo for a {@link SectionPlane}.
     *
     * @param {String} id ID of the {@link SectionPlane}.
     */
    showControl(id) {
        const control = this._controls[id];
        if (!control) {
            this.error("Control not found: " + id);
            return;
        }
        this.hideControl();
        control.setVisible(true);
        if (this._overview) {
            this._overview.setPlaneSelected(id, true);
        }
        this._shownControlId = id;
    }

    /**
     * Gets the ID of the {@link SectionPlane} that the 3D editing gizmo is shown for.
     *
     * Returns ````null```` when the editing gizmo is not shown.
     *
     * @returns {String} ID of the the {@link SectionPlane} that the 3D editing gizmo is shown for, if shown, else ````null````.
     */
    getShownControl() {
        return this._shownControlId;
    }

    /**
     * Hides the 3D {@link SectionPlane} editing gizmo if shown.
     */
    hideControl() {
        for (var id in this._controls) {
            if (this._controls.hasOwnProperty(id)) {
                this._controls[id].setVisible(false);
                if (this._overview) {
                    this._overview.setPlaneSelected(id, false);
                }
            }
        }
        this._shownControlId = null;
    }

    /**
     * Destroys a {@link SectionPlane} created by this SectionPlanesPlugin.
     *
     * @param {String} id ID of the {@link SectionPlane}.
     */
    destroySectionPlane(id) {
        var sectionPlane = this.viewer.scene.sectionPlanes[id];
        if (!sectionPlane) {
            this.error("SectionPlane not found: " + id);
            return;
        }
        this._sectionPlaneDestroyed(sectionPlane);
        sectionPlane.destroy();

        if (id === this._shownControlId) {
            this._shownControlId = null;
        }
    }

    _sectionPlaneDestroyed(sectionPlane) {
        if (this._overview) {
            this._overview.removeSectionPlane(sectionPlane);
        }
        const control = this._controls[sectionPlane.id];
        if (!control) {
            return;
        }
        control.setVisible(false);
        control._setSectionPlane(null);
        delete this._controls[sectionPlane.id];
        this._freeControls.push(control);
    }

    /**
     * Destroys all {@link SectionPlane}s created by this SectionPlanesPlugin.
     */
    clear() {
        const ids = Object.keys(this._sectionPlanes);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroySectionPlane(ids[i]);
        }
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {

            case "snapshotStarting": // Viewer#getSnapshot() about to take snapshot - hide controls
                for (let id in this._controls) {
                    if (this._controls.hasOwnProperty(id)) {
                        this._controls[id].setCulled(true);
                    }
                }
                break;

            case "snapshotFinished": // Viewer#getSnapshot() finished taking snapshot - show controls again
                for (let id in this._controls) {
                    if (this._controls.hasOwnProperty(id)) {
                        this._controls[id].setCulled(false);
                    }
                }
                break;

            case "clearSectionPlanes":
                this.clear();
                break;
        }
    }

    /**
     * Destroys this SectionPlanesPlugin.
     *
     * Also destroys each {@link SectionPlane} created by this SectionPlanesPlugin.
     *
     * Does not destroy the canvas the SectionPlanesPlugin was configured with.
     */
    destroy() {
        this.clear();
        if (this._overview) {
            this._overview.destroy();
        }
        this._destroyFreeControls();
        super.destroy();
    }

    _destroyFreeControls() {
        var control = this._freeControls.pop();
        while (control) {
            control._destroy();
            control = this._freeControls.pop();
        }
        this.viewer.scene.off(this._onSceneSectionPlaneCreated);
    }
}

export {SectionPlanesPlugin}
