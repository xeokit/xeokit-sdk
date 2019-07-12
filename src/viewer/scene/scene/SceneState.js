import {math} from "../math/math.js";

const colorize = math.vec3();

/**
 * @desc Saves a snapshot of the visual state of a {@link Scene}.
 */
class SceneState {

    constructor() {

        this.camera = {
            eye: math.vec3(),
            look: math.vec3(),
            up: math.vec3(),
            projection: {}
        };

        this.objectsVisible = [];
        this.objectsEdges = [];
        this.objectsXrayed = [];
        this.objectsHighlighted = [];
        this.objectsSelected = [];
        this.objectsClippable = [];
        this.objectsPickable = [];
        this.objectsColorize = [];
        this.objectsOpacity = [];

        this.numObjects = 0;
    }

    /**
     * Saves the state of a {@link Scene}.
     * @param {Scene} scene The scene.
     */
    save(scene) {

        const camera = scene.camera;
        const project = camera.project;

        this.camera.eye.set(camera.eye);
        this.camera.look.set(camera.look);
        this.camera.up.set(camera.up);

        switch (camera.projection) {

            case "perspective":
                this.camera.projection = {
                    projection: "perspective",
                    fov: project.fov,
                    fovAxis: project.fovAxis,
                    near: project.near,
                    far: project.far
                };
                break;

            case "ortho":
                this.camera.projection = {
                    projection: "ortho",
                    scale: project.scale,
                    near: project.near,
                    far: project.far
                };
                break;

            case "frustum":
                this.camera.projection = {
                    projection: "frustum",
                    left: project.left,
                    right: project.right,
                    top: project.top,
                    bottom: project.bottom,
                    near: project.near,
                    far: project.far
                };
                break;

            case "custom":
                this.camera.projection = {
                    projection: "custom",
                    matrix: project.matrix.slice()
                };
                break;
        }

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
     * Restores a {@link Scene} to state previously captured with {@link SceneState#save}.
     * @param {Scene} scene The scene.
     */
    restore(scene, done) {
        this.restoreCamera(scene, done);
        this.restoreObjects(scene);
    }

    /**
     * Restores a {@link Scene}'s {@link Camera} to its state previously captured with {@link SceneState#save}.
     * @param {Scene} scene The scene.
     */
    restoreCamera(scene, done) {

        const camera = scene.camera;
        const savedProjection = this.camera.projection;

        function restoreProjection() {

            switch (savedProjection.type) {

                case "perspective":
                    camera.perspective.fov = savedProjection.fov;
                    camera.perspective.fovAxis = savedProjection.fovAxis;
                    camera.perspective.near = savedProjection.near;
                    camera.perspective.far = savedProjection.far;
                    break;

                case "ortho":
                    camera.ortho.scale = savedProjection.scale;
                    camera.ortho.near = savedProjection.near;
                    camera.ortho.far = savedProjection.far;
                    break;

                case "frustum":
                    camera.frustum.left = savedProjection.left;
                    camera.frustum.right = savedProjection.right;
                    camera.frustum.top = savedProjection.top;
                    camera.frustum.bottom = savedProjection.bottom;
                    camera.frustum.near = savedProjection.near;
                    camera.frustum.far = savedProjection.far;
                    break;

                case "custom":
                    camera.customProjection.matrix = savedProjection.matrix;
                    break;
            }
        }

        if (done) {
            scene.viewer.cameraFlight.flyTo({
                eye: this.camera.eye,
                look: this.camera.look,
                up: this.camera.up,
                orthoScale: this.camera.projection.scale,
                projection: savedProjection.projection
            }, () => {
                restoreProjection();
                done();
            });
        } else {
            camera.eye = this.camera.eye;
            camera.look = this.camera.look;
            camera.up = this.camera.up;
            restoreProjection();
            camera.projection = savedProjection.projection;
        }


    }

    /**
     * Restores a {@link Scene}'s {@link Entity}'s to their state previously captured with {@link SceneState#save}.
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

export {SceneState};