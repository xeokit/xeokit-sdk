import {Plugin} from "../../viewer/Plugin.js";
import {Annotation} from "./Annotation.js";
import {utils} from "../../viewer/scene/utils.js";
import {math} from "../../viewer/scene/math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

/**
 * AnnotationsPlugin is a {@link Viewer} plugin that creates {@link Annotation}s.
 *
 * <img src="https://user-images.githubusercontent.com/83100/55674490-c93c2e00-58b5-11e9-8a28-eb08876947c0.gif">
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_NavCubePlugin)]
 *
 * ## Overview
 *
 * An {@link Annotation} is a 3D position that has a label attached to it. The position and the label are both
 * represented by HTML elements floating on the canvas. An Annotation can also be configured to hide its elements whenever its
 * 3D position is occluded by any {@link Entity}s.
 *
 * ## Configuring annotation appearance
 *
 * Configure the appearance of {@link Annotation} positions and labels using HTML templates. These can be configured
 * on the AnnotationsPlugin, to set the default appearance for all Annotations, or on each Annotation individually.
 *
 * Each {@link Annotation} uses two templates, one to show its position (the "marker") and a second to show its label. The
 * visibility of the marker and label can be updated independently.
 *
 * ## Inserting dynamic data into annotations
 *
 * We can dynamically provide each {@link Annotation} with new values to insert into its HTML templates. We can also provide
 * the AnnotationsPlugin with a default map of values, for Annotations to fall back on as defaults.
 *
 * ## Customizing annotation behaviour
 *
 * AnnotationsPlugin fires events to indicate when the mouse pointer hovers over or clicks {@link Annotation} marker elements. These events
 * are useful for customizing the behaviour of Annotations, for example showing labels when the mouse hovers over markers.
 *
 * ## Occlusion culling
 *
 * As mentioned, we can configure {@link Annotation}s to become invisible whenever their positions are hidden by any {@link Entity}s in the
 * 3D view. The {@link Scene} periodically tests the occlusion status of all Annotations, in  batch. By default, the Scene
 * performs this test on every 20th "tick" (which represents a rendered frame). We can adjust that frequency via property {@link Scene#ticksPerOcclusionTest}.
 *
 * ## Annotation camera positions
 *
 * TODO TODO TODO
 *
 * ## Example 1: Loading a model and creating an annotation
 *
 * In the example below, we'll use a {@link GLTFLoaderPlugin} to load a model, and an AnnotationsPlugin
 * to create an {@link Annotation} on it.
 *
 * We'll configure our AnnotationsPlugin with default HTML templates, along with some default values to insert into them.
 *
 * When we create our Annotation, we'll give it some specific values to insert into the templates, overriding some of
 * the default values configured on the plugin. Note the correspondence between the placeholders in the templates
 * and the keys in the values map.
 *
 * We'll also configure the Annotation to hide itself whenever it's position occluded by any {@link Entity}s.
 *
 * Finally, we'll demonstrate how to query the Annotation's position occlusion/visibility status, and how to subscribe
 * to change events on those properties..
 *
 * * [[Run a similar example](https://xeokit.github.io/xeokit-sdk/examples/#annotations_clickShowLabels)]
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {AnnotationsPlugin} from "../src/plugins/AnnotationsPlugin/AnnotationsPlugin.js";
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
 * const annotations = new AnnotationsPlugin(viewer, {
 *
 *      // Default HTML template for marker position
 *      markerHTML: "<div class='annotation-marker' style='background-color: {{markerBGColor}};'>{{glyph}}</div>",
 *
 *      // Default HTML template for label
 *      labelHTML: "<div class='annotation-label' style='background-color: {{labelBGColor}};'>" +
 *      "<div class='annotation-title'>{{title}}</div><div class='annotation-desc'>{{description}}</div></div>",
 *
 *      // Default values to insert into the marker and label templates
 *      values: {
 *          markerBGColor: "red",
 *          labelBGColor: "red",
 *          glyph: "X",
 *          title: "Untitled",
 *          description: "No description"
 *      }
 * });
 *
 * const model = gltfLoader.load({
 *      src: "./models/gltf/duplex/scene.gltf"
 * });
 *
 * model.on("loaded", () => {
 *
 *      const entity = viewer.scene.meshes[""];
 *
 *      // Create an annotation
 *      const myAnnotation = annotations.createAnnotation({
 *
 *          id: "myAnnotation",
 *
 *          entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"], // Optional, associate with an Entity
 *
 *          worldPos: [0, 0, 0],        // 3D World-space position
 *
 *          occludable: true,           // Optional, default, makes Annotation invisible when occluded by Entities
 *          markerShown: true,          // Optional, default is true, makes position visible (when not occluded)
 *          labelShown: true            // Optional, default is false, makes label visible (when not occluded)
 *
 *          values: {                   // Optional, overrides AnnotationPlugin's defaults
 *              glyph: "A",
 *              title: "My Annotation",
 *              description: "This is my annotation."
 *          }
 *      });
 *
 *      // Listen for change of the Annotation's 3D World-space position
 *
 *      myAnnotation.on("worldPos", function(worldPos) {
 *          //...
 *      });
 *
 *      // Listen for change of the Annotation's 3D View-space position, which happens
 *      // when either worldPos was updated or the Camera was moved
 *
 *      myAnnotation.on("viewPos", function(viewPos) {
 *          //...
 *      });
 *
 *      // Listen for change of the Annotation's 2D Canvas-space position, which happens
 *      // when worldPos or viewPos was updated, or Camera's projection was updated
 *
 *      myAnnotation.on("canvasPos", function(canvasPos) {
 *          //...
 *      });
 *
 *      // Listen for change of Annotation visibility. The Annotation becomes invisible when it falls outside the canvas,
 *      // or its position is occluded by some Entity. Note that, when not occluded, the position is only
 *      // shown when Annotation#markerShown is true, and the label is only shown when Annotation#labelShown is true.
 *
 *      myAnnotation.on("visible", function(visible) { // Marker visibility has changed
 *          if (visible) {
 *              this.log("Annotation is visible");
 *          } else {
 *              this.log("Annotation is invisible");
 *          }
 *      });
 *
 *      // Listen for destruction of the Annotation
 *
 *      myAnnotation.on("destroyed", () => {
 *          //...
 *      });
 * });
 * ````
 *
 * Let's query our {@link Annotation}'s current position in the World, View and Canvas coordinate systems:
 *
 * ````javascript
 * const worldPos  = myAnnotation.worldPos;  // [x,y,z]
 * const viewPos   = myAnnotation.viewPos;   // [x,y,z]
 * const canvasPos = myAnnotation.canvasPos; // [x,y]
 * ````
 *
 * We can query it's current visibility, which is ````false```` when its position is occluded by some {@link Entity}:
 *
 * ````
 * const visible = myAnnotation.visible;
 * ````
 *
 * To listen for change events on our Annotation's position and visibility:
 *
 * ````javascript
 * // World-space position changes when we assign a new value to Annotation#worldPos
 * myAnnotation.on("worldPos", (worldPos) => {
 *     //...
 * });
 *
 * // View-space position changes when either worldPos was updated or the Camera was moved
 * myAnnotation.on("viewPos", (viewPos) => {
 *     //...
 * });
 *
 * // Canvas-space position changes when worldPos or viewPos was updated, or Camera's projection was updated
 * myAnnotation.on("canvasPos", (canvasPos) => {
 *     //...
 * });
 *
 * // Annotation is invisible when its position falls off the canvas or is occluded by some Entity
 * myAnnotation.on("visible", (visible) => {
 *     //...
 * });
 * ````
 *
 * Finally, let's dynamically update the values for a couple of placeholders in our Annotation's label:
 *
 * ```` javascript
 * myAnnotation.setValues({
 *      title: "Here's a new title",
 *      description: "Here's a new description"
 * });
 * ````
 *
 *
 * ## Example 2: Creating an annotation with unique appearance
 *
 * Now let's create a second {@link Annotation}, this time with its own custom HTML label template, which includes
 * an image. In the Annotation's values, we'll also provide a new title and description, custom colors for the marker
 * and label, plus a URL for the image in the label template. To render its marker, the Annotation will fall back
 * on the AnnotationPlugin's default marker template.
 *
 * ````javascript
 * annotations.createAnnotation({
 *
 *      id: "myAnnotation2",
 *
 *      worldPos: [-0.163, 1.810, 7.977],
 *
 *      occludable: true,
 *      markerShown: true,
 *      labelShown: true,
 *
 *      // Custom label template is the same as the Annotation's, with the addition of an image element
 *      labelHTML: "<div class='annotation-label' style='background-color: {{labelBGColor}};'>\
 *          <div class='annotation-title'>{{title}}</div>\
 *          <div class='annotation-desc'>{{description}}</div>\
 *          <br><img alt='myImage' width='150px' height='100px' src='{{imageSrc}}'>\
 *          </div>",
 *
 *      // Custom template values override all the AnnotationPlugin's defaults, and includes an additional value
 *      // for the image element's URL
 *      values: {
 *          glyph: "A3",
 *          title: "The West wall",
 *          description: "Annotations can contain<br>custom HTML like this<br>image:",
 *          markerBGColor: "green",
 *          labelBGColor: "green",
 *          imageSrc: "https://xeokit.io/img/docs/BIMServerLoaderPlugin/schependomlaan.png"
 *      }
 * });
 * ````
 *
 *
 * ## Example 3: Annotation camera positions
 *
 *
 * ## Example 4: Creating annotations by clicking on objects
 *
 * AnnotationsPlugin makes it easy to create {@link Annotation}s on the surfaces of {@link Entity}s as we click on them.
 *
 * The {@link AnnotationsPlugin#createAnnotation} method can accept a {@link PickResult} returned
 * by {@link Scene#pick}, from which it initializes the {@link Annotation}'s {@link Annotation#worldPos} and
 * {@link Annotation#entity}. Note that this only works when {@link Scene#pick} was configured to perform a 3D
 * surface-intersection pick (see {@link Scene#pick} for more info).
 *
 * Let's now extend our example to create an Annotation wherever we click on the surface of of our model:
 *
 * * [[Run a similar example](https://xeokit.github.io/xeokit-sdk/examples/#annotations_createWithMouse)]
 *
 * ````javascript
 * var i = 1; // Used to create unique Annotation IDs
 *
 * viewer.scene.input.on("mouseclicked", (coords) => {
 *
 *     var pickRecord = viewer.scene.pick({
 *         canvasPos: coords,
 *         pickSurface: true  // <<------ This causes picking to find the intersection point on the entity
 *     });
 *
 *     if (pickRecord) {
 *
 *         const annotation = annotations.createAnnotation({
 *              id: "myAnnotation" + i,
 *              pickRecord: pickRecord,
 *              occludable: true,           // Optional, default is true
 *              markerShown: true,          // Optional, default is true
 *              labelShown: true,           // Optional, default is true
 *              values: {                   // HTML template values
 *                  glyph: "A" + i,
 *                  title: "My annotation " + i,
 *                  description: "My description " + i
 *              },
           });
 *
 *         i++;
 *      }
 * });
 * ````
 */
class AnnotationsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="Annotations"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.markerHTML] HTML text template for Annotation markers. Defaults to ````<div></div>````.
     * @param {String} [cfg.labelHTML] HTML text template for Annotation labels. Defaults to ````<div></div>````.
     * @param {HTMLElement} [cfg.container] Container DOM element for markers and labels. Defaults to ````document.body````.
     * @param  {{String:(String|Number)}} [cfg.values={}] Map of default values to insert into the HTML templates for the marker and label.
     */
    constructor(viewer, cfg) {

        super("Annotations", viewer);

        this._labelHTML = cfg.labelHTML || "<div></div>";
        this._markerHTML = cfg.markerHTML || "<div></div>";
        this._container = cfg.container || document.body;
        this._values = cfg.values || {};

        /**
         * The {@link Annotation}s created by {@link AnnotationsPlugin#createAnnotation}, each mapped to its {@link Annotation#id}.
         * @type {{String:Annotation}}
         */
        this.annotations = {};
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clearAnnotations":
                this.clear();
                break;
        }
    }

    /**
     * Creates an {@link Annotation}.
     *
     * The Annotation is then registered by {@link Annotation#id} in {@link AnnotationsPlugin#annotations}.
     *
     * @param {Object} params Annotation configuration.
     * @param {String} params.id Unique ID to assign to {@link Annotation#id}. The Annotation will be registered by this in {@link AnnotationsPlugin#annotations} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
     * @param {String} [params.markerHTML] HTML text template for the Annotation marker. Defaults to the marker HTML given to the AnnotationsPlugin constructor.
     * @param {String} [params.labelHTML] HTML text template for the Annotation label. Defaults to the label HTML given to the AnnotationsPlugin constructor.
     * @param {Number[]} [params.worldPos=[0,0,0]] World-space position of the Annotation marker, assigned to {@link Annotation#worldPos}.
     * @param {Entity} [params.entity] Optional {@link Entity} to associate the Annotation with. Causes {@link Annotation#visible} to be ````false```` whenever {@link Entity#visible} is also ````false````.
     * @param {PickResult} [params.pickResult] Sets the Annotation's World-space position and direction vector from the given {@link PickResult}'s {@link PickResult#worldPos} and {@link PickResult#worldNormal}, and the Annotation's Entity from {@link PickResult#entity}. Causes ````worldPos```` and ````entity```` parameters to be ignored, if they are also given.
     * @param {Boolean} [params.occludable=false] Indicates whether or not the {@link Annotation} marker and label are hidden whenever the marker occluded by {@link Entity}s in the {@link Scene}.
     * @param  {{String:(String|Number)}} [params.values={}] Map of values to insert into the HTML templates for the marker and label. These will be inserted in addition to any values given to the AnnotationsPlugin constructor.
     * @param {Boolean} [params.markerShown=true] Whether to initially show the {@link Annotation} marker.
     * @param {Boolean} [params.labelShown=false] Whether to initially show the {@link Annotation} label.
     * @param {Number[]} [params.eye] Optional World-space position for {@link Camera#eye}, used when this Annotation is associated with a {@link Camera} position.
     * @param {Number[]} [params.look] Optional World-space position for {@link Camera#look}, used when this Annotation is associated with a {@link Camera} position.
     * @param {Number[]} [params.up] Optional World-space position for {@link Camera#up}, used when this Annotation is associated with a {@link Camera} position.
     * @returns {Annotation} The new {@link Annotation}.
     */
    createAnnotation(params) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + params.id);
            delete params.id;
        }
        var worldPos;
        var entity;
        if (params.pickRecord) {
            const pickRecord = params.pickRecord;
            if (!pickRecord.worldPos || !pickRecord.worldNormal) {
                this.error("Param 'pickRecord' does not have both worldPos and worldNormal");
            } else {
                const normalizedWorldNormal = math.normalizeVec3(pickRecord.worldNormal, tempVec3a);
                const offsetVec = math.mulVec3Scalar(normalizedWorldNormal, 0.2, tempVec3b);
                const offsetWorldPos = math.addVec3(pickRecord.worldPos, offsetVec, tempVec3c);
                worldPos = offsetWorldPos;
                entity = pickRecord.entity;
            }
        } else {
            worldPos = params.worldPos;
            entity = params.entity;
        }
        const annotation = new Annotation(this.viewer.scene, {
            id: params.id,
            plugin: this,
            entity: entity,
            worldPos: worldPos,
            container: this._container,
            markerHTML: params.markerHTML || this._markerHTML,
            labelHTML: params.labelHTML || this._labelHTML,
            occludable: params.occludable,
            values: utils.apply(params.values, utils.apply(this._values, {})),
            markerShown: params.markerShown,
            labelShown: params.labelShown,
            eye: params.eye,
            look: params.look,
            up: params.up
        });
        this.annotations[annotation.id] = annotation;
        annotation.on("destroyed", () => {
            delete this.annotations[annotation.id];
        });
        return annotation;
    }

    /**
     * Destroys an {@link Annotation}.
     *
     * @param {String} id ID of Annotation to destroy.
     */
    destroyAnnotation(id) {
        var annotation = this.viewer.scene.annotations[id];
        if (!annotation) {
            this.log("Annotation not found: " + id);
            return;
        }
        annotation.destroy();
    }

    /**
     * Destroys all {@link Annotation}s.
     */
    clear() {
        const ids = Object.keys(this.viewer.scene.annotations);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroyAnnotation(ids[i]);
        }
    }

    /**
     * Destroys this AnnotationsPlugin.
     *
     * Destroys all {@link Annotation}s first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {AnnotationsPlugin}
