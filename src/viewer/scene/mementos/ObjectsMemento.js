import {math} from "../math/math.js";

const colorize = math.vec3();

/**
 * @desc Saves and restores a snapshot of the visual state of the {@link Entity}'s that represent objects within a {@link Scene}.
 *
 * * An Entity represents an object when {@link Entity#isObject} is ````true````.
 * * Each object-Entity is registered by {@link Entity#id} in {@link Scene#objects}.
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