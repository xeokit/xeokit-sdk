import {Component} from '../Component.js';

/**
 * @desc Configures cross-section slices for a {@link Scene}.
 *
 * ## Overview
 *
 * Cross-sections allow to create an additional colored slice for used clipping planes. It is only a visual effect
 * calculated by shaders. It makes it easier to see the intersection between the model and the clipping plane this way.
 *
 * ## Usage
 *
 * In the example below, we'll configure CrossSections to manipulate the slice representation.
 *
 * ````javascript
 * //------------------------------------------------------------------------------------------------------------------
 * // Import the modules we need for this example
 * //------------------------------------------------------------------------------------------------------------------
 *
 * import {PhongMaterial, Viewer, math, SectionPlanesPlugin, XKTLoaderPlugin, Mesh, ReadableGeometry, buildPolylineGeometryFromCurve, SplineCurve} from "../../dist/xeokit-sdk.es.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a Viewer and arrange the camera
 * //------------------------------------------------------------------------------------------------------------------
 *
 * const viewer = new Viewer({
 *   canvasId: "myCanvas",
 *   transparent: true
 * });
 *
 * viewer.camera.eye = [-2.341298674548419, 22.43987089731119, 7.236688436028655];
 * viewer.camera.look = [4.399999999999963, 3.7240000000000606, 8.899000000000006];
 * viewer.camera.up = [0.9102954845584759, 0.34781746407929504, 0.22446635042673466];
 *
 * const cameraControl = viewer.cameraControl;
 * cameraControl.navMode = "orbit";
 * cameraControl.followPointer = true;
 *
 * //----------------------------------------------------------------------------------------------------------------------
 * // Create a xeokit loader plugin, load a model, fit to view
 * //----------------------------------------------------------------------------------------------------------------------
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * var t0 = performance.now();
 *
 * document.getElementById("time").innerHTML = "Loading model...";
 *
 * const sceneModel = xktLoader.load({
 *   id: "myModel",
 *   src: "../../assets/models/xkt/v10/glTF-Embedded/Duplex_A_20110505.glTFEmbedded.xkt",
 *   edges: true
 * });
 *
 * sceneModel.on("loaded", () => {
 *   var t1 = performance.now();
 *   document.getElementById("time").innerHTML = "Model loaded in " + Math.floor(t1 - t0) / 1000.0 + " seconds<br>Objects: " + sceneModel.numEntities;
 *
 *   let path = new SplineCurve(viewer.scene, {
 *     points: [
 *       [0, 0, -10],
 *       [0, 0, -3],
 *       [10, 0, 10],
 *       [10, 0, 30],
 *     ],
 *   });
 *
 *   new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildPolylineGeometryFromCurve({
 *       id: "SplineCurve",
 *       curve: path,
 *       divisions: 50,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *       emissive: [1, 0, 0]
 *     })
 *   });
 *
 *   //------------------------------------------------------------------------------------------------------------------
 *   // Create a moving SectionPlane, that moves through the table models
 *   //------------------------------------------------------------------------------------------------------------------
 *
 *   const sectionPlanes = new SectionPlanesPlugin(viewer, {
 *     overviewCanvasId: "mySectionPlanesOverviewCanvas",
 *     overviewVisible: true
 *   });
 *
 *   let currentPoint = path.getPoint(0);
 *   let currentDirection = path.getTangent(0);
 *
 *   const sectionPlane = sectionPlanes.createSectionPlane({
 *     id: "mySectionPlane",
 *     pos: currentPoint,
 *     dir: currentDirection
 *   });
 *
 *   sectionPlanes.showControl(sectionPlane.id);
 *
 *   //------------------------------------------------------------------------------------------------------------------
 *   // Controlling SectionPlane position and direction
 *   //------------------------------------------------------------------------------------------------------------------
 *
 *   let currentT = 0.0;
 *   document.getElementById("section_path").oninput = function() {
 *     currentT = Number(document.getElementById("section_path").value);
 *     currentPoint = path.getPoint(currentT);
 *     currentDirection = path.getTangent(currentT);
 *     sectionPlane.pos = currentPoint;
 *     sectionPlane.dir = currentDirection;
 *   };
 *
 *   window.viewer = viewer;
 *
 *   //------------------------------------------------------------------------------------------------------------------
 *   // Controlling CrossSections settings
 *   //------------------------------------------------------------------------------------------------------------------
 *
 *   viewer.scene.crossSections.sliceThickness = 0.05;
 *   viewer.scene.crossSections.sliceColor = [0.0, 0.0, 0.0, 1.0];
 * });
 * ````
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/slicing/#SectionPlanesPlugin_Duplex_SectionPath_CrossSections)]
 *
 */
class CrossSections extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this.sliceColor = cfg.sliceColor;
        this.sliceThickness  = cfg.sliceThickness;
    }

    /**
     * Sets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set sliceThickness(value) {
        if (value === undefined || value === null) {
            value = 0.0;
        }
        if (this._sliceThickness === value) {
            return;
        }
        this._sliceThickness = value;
        this.glRedraw();
    }

    /**
     * Gets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    get sliceThickness() {
        return this._sliceThickness;
    }

    /**
     * Sets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    set sliceColor(value) {
        if (value === undefined || value === null) {
            value = [0.0, 0.0, 0.0, 1.0];
        }
        if (this._sliceColor === value) {
            return;
        }
        this._sliceColor = value;
        this.glRedraw();
    }

    /**
     * Gets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    get sliceColor() {
        return this._sliceColor;
    }

    /**
     * Destroys this component.
     */
    destroy() {
        super.destroy();
    }
}

export {CrossSections};