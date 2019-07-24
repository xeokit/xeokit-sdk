import {math} from "../math/math.js";

/**
 * @desc Saves and restores the state of a {@link Camera} within a {@link Scene}.
 */
class CameraState {

    /**
     * Creates a CameraState.
     *
     * @param {Scene} [scene] When given, immediately saves the given {@link Scene}'s {@link Entity} states to this ObjectsState.
     */
    constructor(scene) {

        this.eye = math.vec3();

        this.look = math.vec3();

        this.up = math.vec3();

        this.projection = {};

        if (scene) {
            this.saveCamera(scene);
        }
    }

    /**
     * Saves the state of the given {@link Scene}'s {@link Camera}.
     *
     * @param {Scene} scene The scene that contains the {@link Camera}.
     */
    saveCamera(scene) {

        const camera = scene.camera;
        const project = camera.project;

        this.eye.set(camera.eye);
        this.look.set(camera.look);
        this.up.set(camera.up);

        switch (camera.projection) {

            case "perspective":
                this.projection = {
                    projection: "perspective",
                    fov: project.fov,
                    fovAxis: project.fovAxis,
                    near: project.near,
                    far: project.far
                };
                break;

            case "ortho":
                this.projection = {
                    projection: "ortho",
                    scale: project.scale,
                    near: project.near,
                    far: project.far
                };
                break;

            case "frustum":
                this.projection = {
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
                this.projection = {
                    projection: "custom",
                    matrix: project.matrix.slice()
                };
                break;
        }
    }

    /**
     * Restores a {@link Scene}'s {@link Camera} to the state previously captured with {@link CameraState#saveCamera}.
     *
     * @param {Scene} scene The scene.
     * @param {Function} [done] When this callback is given, will fly the {@link Camera} to the saved state then fire the callback. Otherwise will just jump the Camera to the saved state.
     */
    restoreCamera(scene, done) {

        const camera = scene.camera;
        const savedProjection = this.projection;

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
                eye: this.eye,
                look: this.look,
                up: this.up,
                orthoScale: savedProjection.scale,
                projection: savedProjection.projection
            }, () => {
                restoreProjection();
                done();
            });
        } else {
            camera.eye = this.eye;
            camera.look = this.look;
            camera.up = this.up;
            restoreProjection();
            camera.projection = savedProjection.projection;
        }
    }
}

export {CameraState};