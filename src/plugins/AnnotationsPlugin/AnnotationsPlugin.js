import {Plugin} from "../../viewer/Plugin.js";
import {Annotation} from "./Annotation.js";
import {utils} from "../../viewer/scene/utils.js";
import {math} from "../../viewer/scene/math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

/**
 * A {@link Viewer} plugin that manages {@link Annotation}s.
 *
 * * An {@link Annotation} is a {@link Marker} that has a label.
 * * Configure an AnnotationsPlugin with HTML templates to render each Annotation's marker position and label.
 * * Dynamically set values within the templates.
 * * Optionally configure Annotations to hide themselves when occluded by {@link Entity}s in the 3D view.
 * * Optionally associate Annotations with Entities to automatically hide whenever the Entity is invisible.
 *
 * ## Usage
 *
 * In the example below, we'll use a {@link GLTFLoaderPlugin} to load a model, and an AnnotationsPlugin
 * to create an {@link Annotation} on it.
 *
 * We'll configure our AnnotationsPlugin with default HTML templates
 * to render Annotation pins and labels, along with some default data values to insert into the templates.
 *
 * Finally, we'll use the plugin to create the Annotation, providing some data values specific to the Annotation.
 *
 * The Annotation will also be linked to an {@link Entity}, causing it to be hidden in synch whenever {@link Entity#visible} is ````false````.
 *
 * We'll also configure the Annotation to be hidden whenever it is occluded by any Entities in the 3D view.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#annotations_clickShowLabels)]
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
 *      fields: {
 *          markerBGColor: "red",
 *          labelBGColor: "red",
 *          glyph: "X",
 *          title: "Untitled",
 *          description: "No description"
 *      }
 * });
 *
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/gltf/schependomlaan/scene.gltf"
 * });
 *
 * model.on("loaded", ()=>{
 *
 *      const entity = viewer.scene.meshes[""];
 *
 *      // Create an annotation
 *      const myAnnotation = annotations.createAnnotation({
 *
 *          id: "myAnnotation",         // Optional
 *
 *          worldPos: [0, 0, 0],        // Optional
 *
 *          entity: entity,             // Optional, synchs annotation visibility with Entity
 *          occludable: true,           // Optional, default, makes Annotation invisible when occluded by Entities
 *          markerShown: true,          // Optional, default is true
 *          labelShown: true            // Optional, default is false
 *
 *          fields: {                   // Optional, defaults to constructor fields
 *              glyph: "A",
 *              title: "My Annotation",
 *              description: "This is my annotation."
 *          }
 *      });
 *
 *      // Listen for change of the Annotation's 3D World-space position
 *      myAnnotation.on("worldPos", function(worldPos) {
 *          //...
 *      });
 *
 *      // Listen for change of the Annotation's 3D View-space position, which happens
 *      // when either worldPos was updated or the Camera was moved
 *      myAnnotation.on("viewPos", function(viewPos) {
 *          //...
 *      });
 *
 *      // Listen for change of the Annotation's 2D Canvas-space position, which happens
 *      // when worldPos or viewPos was updated, or Camera's projection was updated
 *      myAnnotation.on("canvasPos", function(canvasPos) {
 *          //...
 *      });
 *
 *      // Listen for change of Annotation visibility. The Annotation becomes invisible when it falls outside the canvas,
 *      // has an Entity that is also invisible, or when an Entity occludes the Annotation's position in the 3D view.
 *      myAnnotation.on("visible", function(visible) { // Marker visibility has changed
 *          if (visible) {
 *              this.log("Annotation is visible");
 *          } else {
 *              this.log("Annotation is invisible");
 *          }
 *      });
 *
 *      // Listen for destruction of Annotation
 *      myAnnotation.on("destroyed", () => {
 *          //...
 *      });
 * });
 * ````
 *
 * ## Individual annotation appearances
 *
 * We can override the AnnotationsPlugin's default HTML templates for individual Annotations.
 *
 * Let's create an Annotation with an image embedded in its label:
 *
 * ````javascript
 * annotations.createAnnotation({
 *      id: "anotherAnnotation",
 *
 *      entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *
 *      worldPos: [-0.163, 1.810, 7.977],
 *
 *      occludable: true,
 *      markerShown: true,
 *      labelShown: true,
 *
 *      labelHTML: "<div class='annotation-label' style='background-color: {{labelBGColor}};'>\
 *          <div class='annotation-title'>{{title}}</div>\
 *          <div class='annotation-desc'>{{description}}</div>\
 *          <br><img alt='myImage' width='150px' height='100px' src='{{imageSrc}}'>\
 *          </div>",
 *
 *      fields: {
 *          glyph: "A3",
 *          title: "The West wall",
 *          description: "Annotations can contain<br>custom HTML like this<br>image:",
 *          markerBGColor: "red",
 *          imageSrc: "https://xeokit.io/img/docs/BIMServerLoaderPlugin/schependomlaan.png"
 *      }
 * });
 * ````
 *
 * ## Annotation camera positions
 *
 * Each Annotation can optionally be associated with a {@link Camera} position.
 *
 * ## Creating annotations by picking
 *
 * AnnotationsPlugin also makes it easy to create {@link Annotation}s on the surfaces of {@link Entity}s that we pick
 * with the mouse. The {@link AnnotationsPlugin#createAnnotation} can accept a {@link PickResult} returned
 * by {@link Scene#pick}, from which it initializes the {@link Annotation}'s {@link Annotation#worldPos} and
 * {@link Annotation#entity}. Note this only works when {@link Scene#pick} is called to
 * do a 3D surface-intersection pick (see {@link Scene#pick} for more info).
 *
 * Let's extend our example to create Annotations wherever we click on the surfaces of Entities in our model:
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#annotations_createWithMouse)]
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
 *              fields: {                   // HTML template fields
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
 *
 * ## Annotation events
 *
 * *markerMouseClicked*
 *
 * *markerMouseEnter*
 *
 * *markerMouseLeave*
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
     * @param  {{String:(String|Number)}} [cfg.fields={}] Map of default values to insert into the HTML templates for the marker and label.
     */
    constructor(viewer, cfg) {

        super("Annotations", viewer);

        this._labelHTML = cfg.labelHTML || "<div></div>";
        this._markerHTML = cfg.markerHTML || "<div></div>";
        this._container = cfg.container || document.body;
        this._fields = cfg.fields || {};

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
     * @param  {{String:(String|Number)}} [params.fields={}] Map of values to insert into the HTML templates for the marker and label. These will be inserted in addition to any fields given to the AnnotationsPlugin constructor.
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
            fields: utils.apply(params.fields, utils.apply(this._fields, {})),
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
     * Destroys this plugin.
     *
     * Destroys all {@link Annotation}s first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {AnnotationsPlugin}
