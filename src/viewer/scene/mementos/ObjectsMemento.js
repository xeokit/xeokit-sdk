import {math} from "../math/math.js";

const colorize = math.vec3();

/**
 * @desc Saves and restores a snapshot of the visual state of the {@link Entity}'s that represent objects within a {@link Scene}.
 *
 * * An Entity represents an object when {@link Entity#isObject} is ````true````.
 * * Each object-Entity is registered by {@link Entity#id} in {@link Scene#objects}.
 *
 * ## Usage
 *
 * In the example below, we'll create a {@link Viewer} and use an {@link XKTLoaderPlugin} to load an ````.xkt```` model. When the model has loaded, we'll hide a couple of {@link Entity}s and save a snapshot of the visual states of all the Entitys in an ObjectsMemento. Then we'll show all the Entitys
 * again, and then we'll restore the visual states of all the Entitys again from the ObjectsMemento, which will hide those two Entitys again.
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {ObjectsMemento} from "../src/scene/mementos/ObjectsMemento.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * // Load a model
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/schependomlaan/schependomlaan.xkt"
 * });
 *
 * model.on("loaded", () => {
 *
 *      // Model has loaded
 *
 *      // Hide a couple of objects
 *      viewer.scene.objects["0u4wgLe6n0ABVaiXyikbkA"].visible = false;
 *      viewer.scene.objects["3u4wgLe3n0AXVaiXyikbYO"].visible = false;
 *
 *      // Save memento of all object states, which includes those two hidden objects
 *      const objectsMemento = new ObjectsMemento();
 *
 *      objectsMemento.saveObjects(viewer.scene);
 *
 *      // Show all objects
 *      viewer.scene.setObjectsVisible(viewer.scene.objectIds, true);
 *
 *      // Restore the objects states again, which involves hiding those two objects again
 *      objectsMemento.restoreObjects(viewer.scene);
 * });
 * `````
 */
class ObjectsMemento {

    /**
     * Creates an ObjectsState.
     *
     * @param {Scene} [scene] When given, immediately saves the given {@link Scene}'s {@link Entity} states to this ObjectsState.
     */
    constructor(scene) {

        /** @private */
        this.objectsVisible = [];

        /** @private */
        this.objectsEdges = [];

        /** @private */
        this.objectsXrayed = [];

        /** @private */
        this.objectsHighlighted = [];

        /** @private */
        this.objectsSelected = [];

        /** @private */
        this.objectsClippable = [];

        /** @private */
        this.objectsPickable = [];

        /** @private */
        this.objectsColorize = [];

        /** @private */
        this.objectsOpacity = [];

        /** @private */
        this.numObjects = 0;

        if (scene) {
            this.saveObjects(scene);
        }
    }

    /**
     * Saves a snapshot of the visual state of the {@link Entity}'s that represent objects within a {@link Scene}.
     *
     * @param {Scene} scene The scene.
     */
    saveObjects(scene) {

        this.numObjects = 0;

        const objects = scene.objects;

        for (var objectId in objects) {
            if (objects.hasOwnProperty(objectId)) {

                const object = objects[objectId];
                const i = this.numObjects;

                this.objectsVisible[i] = object.visible;
                this.objectsEdges[i] = object.edges;
                this.objectsXrayed[i] = object.xrayed;
                this.objectsHighlighted[i] = object.highlighted;
                this.objectsSelected[i] = object.selected;
                this.objectsClippable[i] = object.clippable;
                this.objectsPickable[i] = object.pickable;

                const colorize = object.colorize;
                this.objectsColorize[i * 3 + 0] = colorize[0];
                this.objectsColorize[i * 3 + 1] = colorize[1];
                this.objectsColorize[i * 3 + 2] = colorize[2];

                this.objectsOpacity[i] = object.opacity;

                this.numObjects++;
            }
        }
    }

    /**
     * Restores a {@link Scene}'s {@link Entity}'s to their state previously captured with {@link ObjectsMemento#saveObjects}.
     * @param {Scene} scene The scene.
     */
    restoreObjects(scene) {

        var i = 0;

        const objects = scene.objects;

        for (var objectId in objects) {
            if (objects.hasOwnProperty(objectId)) {

                const object = objects[objectId];

                object.visible = this.objectsVisible[i];
                object.edges = this.objectsEdges[i];
                object.xrayed = this.objectsXrayed[i];
                object.highlighted = this.objectsHighlighted[i];
                object.selected = this.objectsSelected[i];
                object.clippable = this.objectsClippable[i];
                object.pickable = this.objectsPickable[i];

                colorize[0] = this.objectsColorize[i * 3 + 0];
                colorize[1] = this.objectsColorize[i * 3 + 1];
                colorize[2] = this.objectsColorize[i * 3 + 2];

                object.colorize = colorize;

                object.opacity = this.objectsOpacity[i];

                i++;
            }
        }
    }
}

export {ObjectsMemento};