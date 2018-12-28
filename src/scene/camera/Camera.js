
import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {Perspective} from './Perspective.js';
import {Ortho} from './Ortho.js';
import {Frustum} from './Frustum.js';
import {CustomProjection} from './CustomProjection.js';

const tempVec3 = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempMat = math.mat4();
const tempMatb = math.mat4();
const eyeLookVec = math.vec3();
const eyeLookVecNorm = math.vec3();
const eyeLookOffset = math.vec3();
const offsetEye = math.vec3();

/**
 * @desc Manages viewing and projection transforms for its {@link Scene}.
 *
 * * One Camera per {@link Scene}
 * * Located at {@link Scene#camera}
 * * Also located for convenience at {@link Viewer#camera}
 * * Controls viewing and projection transforms
 * * Has methods to pan, zoom and orbit (or first-person rotation)
 * * Dynamically configurable World-space "up" direction
 * * Switchable between perspective, frustum and orthographic projections
 * * Switchable gimbal lock
 * * Can be "flown" to look at targets using a {@link CameraFlightAnimation}
 * * Can be animated along a path using a {@link CameraPathAnimation}
 *
 * ## Getting the Camera
 *
 * There is exactly one Camera per {@link Scene}:
 *
 * ````javascript
 * var camera = myViewer.scene.camera;
 * ````
 * Can also be found on the {@link Viewer} for convenience:
 *
 * ````javascript
 * var camera = myViewer.camera;
 * ````
 *
 * ## Moving around
 *
 * Get and set the Camera's absolute position at any time via its {@link Camera#eye}, {@link Camera#look} and {@link Camera#up} properties:
 *
 * ````javascript
 * camera.eye = [-10,0,0];
 * camera.look = [-10,0,0];
 * camera.up = [0,1,0];
 * ````
 *
 * Get the view matrix:
 *
 * ````javascript
 * var viewMatrix = camera.viewMatrix;
 * var viewNormalMatrix = camera.normalMatrix;
 * ````
 *
 * Listen for view matrix updates:
 *
 * ````javascript
 * camera.on("matrix", function(matrix) { ... });
 * ````
 *
 * Orbiting the {@link Camera#look} position:
 *
 * ````javascript
 * camera.orbitYaw(20.0);
 * camera.orbitPitch(10.0);
 * ````
 *
 * First-person rotation, rotates {@link Camera#look}
 * and {@link Camera#up} about {@link Camera#eye}:
 *
 * ````javascript
 * camera.yaw(5.0);
 * camera.pitch(-10.0);
 * ````
 *
 * Panning along the Camera's local axis (ie. left/right, up/down, forward/backward):
 *
 * ````javascript
 * camera.pan([-20, 0, 10]);
 * ````
 *
 * Zoom to vary distance between {@link Camera#eye} and {@link Camera#look}:
 *
 * ````javascript
 * camera.zoom(-5); // Move five units closer
 * ````
 *
 * Get the current distance between {@link Camera#eye} and {@link Camera#look}:
 *
 * ````javascript
 * var distance = camera.eyeLookDist;
 * ````
 *
 * ## Projection
 *
 * For each projection type, the Camera has a Component to manage that projection's configuration. You can hot-switch the Camera
 * between those projection types, while updating the properties of each projection component at any time.
 *
 * ````javascript
 * camera.perspective.near = 0.4;
 * camera.perspective.fov = 45;
 * //...
 *
 * camera.ortho.near = 0.8;
 * camera.ortho.far = 1000;
 * //...
 *
 * camera.frustum.left = -1.0;
 * camera.frustum.right = 1.0;
 * camera.frustum.far = 1000.0;
 * //...
 *
 * camera.customProjection.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
 *
 * camera.projection = "perspective"; // Switch to perspective
 * camera.projection = "frustum"; // Switch to frustum
 * camera.projection = "ortho"; // Switch to ortho
 * camera.projection = "customProjection"; // Switch to custom
 * ````
 *
 * Get the projection matrix:
 *
 * ````javascript
 * var projMatrix = camera.projMatrix;
 * ````
 *
 * Listen for projection matrix updates:
 *
 * ````javascript
 * camera.on("projMatrix", function(matrix) { ... });
 * ````
 *
 * ## Configuring World up direction
 *
 * We can dynamically configure the direction that we consider to be "up" in the World-space coordinate system.
 *
 * Set the +Y axis as World "up" (convention in some modeling software):
 *
 * ````javascript
 * camera.worldAxis = [
 *  1, 0, 0,    // Right
 *  0, 1, 0,    // Up
 *  0, 0,-1     // Forward
 * ];
 * ````
 *
 * Set the +Z axis as World "up" (convention in most CAD and BIM viewers):
 *
 * ````javascript
 * camera.worldAxis = [
 *  1, 0, 0, // Right
 *  0, 0, 1, // Up
 *  0,-1, 0  // Forward
 * ];
 * ````
 *
 * The Camera has read-only convenience properties that provide each axis individually:
 *
 * ````javascript
 * var worldRight = camera.worldRight;
 * var worldForward = camera.worldForward;
 * var worldUp = camera.worldUp;
 * ````
 *
 * ### Gimbal locking
 *
 * By default, the Camera locks yaw rotation to pivot about the World-space "up" axis. We can dynamically lock and unlock that at any time:
 *
 * ````javascript
 * camera.gimbalLock = false; // Yaw rotation now happens about Camera's local Y-axis
 * camera.gimbalLock = true; // Yaw rotation now happens about World's "up" axis
 * ````
 *
 * See: <a href="https://en.wikipedia.org/wiki/Gimbal_lock">https://en.wikipedia.org/wiki/Gimbal_lock</a>
 */
class Camera extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Camera";
    }

    /**
     @constructor
     @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            deviceMatrix: math.mat4(),
            hasDeviceMatrix: false, // True when deviceMatrix set to other than identity
            matrix: math.mat4(),
            normalMatrix: math.mat4()
        });

        this._perspective = new Perspective(this);
        this._ortho = new Ortho(this);
        this._frustum = new Frustum(this);
        this._customProjection = new CustomProjection(this);
        this._project = this._perspective;

        this._eye = math.vec3([0, 0, 10.0]);
        this._look = math.vec3([0, 0, 0]);
        this._up = math.vec3([0, 1, 0]);

        this._worldUp = math.vec3([0, 1, 0]);
        this._worldRight = math.vec3([1, 0, 0]);
        this._worldForward = math.vec3([0, 0, -1]);

        this.deviceMatrix = cfg.deviceMatrix;
        this.eye = cfg.eye;
        this.look = cfg.look;
        this.up = cfg.up;
        this.worldAxis = cfg.worldAxis;
        this.gimbalLock = cfg.gimbalLock;
        this.constrainPitch = cfg.constrainPitch;

        this.projection = cfg.projection;

        this._perspective.on("matrix", () => {
            if (this._projectionType === "perspective") {
                this.fire("projMatrix", this._perspective.matrix);
            }
        });
        this._ortho.on("matrix", () => {
            if (this._projectionType === "ortho") {
                this.fire("projMatrix", this._ortho.matrix);
            }
        });
        this._frustum.on("matrix", () => {
            if (this._projectionType === "frustum") {
                this.fire("projMatrix", this._frustum.matrix);
            }
        });
        this._customProjection.on("matrix", () => {
            if (this._projectionType === "customProjection") {
                this.fire("projMatrix", this._customProjection.matrix);
            }
        });
    }

    _update() {
        const state = this._state;
        // In ortho mode, build the view matrix with an eye position that's translated
        // well back from look, so that the front clip plane doesn't unexpectedly cut
        // the front off the view (not a problem with perspective, since objects close enough
        // to be clipped by the front plane are usually too big to see anything of their cross-sections).
        let eye;
        if (this.projection === "ortho") {
            math.subVec3(this._eye, this._look, eyeLookVec);
            math.normalizeVec3(eyeLookVec, eyeLookVecNorm);
            math.mulVec3Scalar(eyeLookVecNorm, 1000.0, eyeLookOffset);
            math.addVec3(this._look, eyeLookOffset, offsetEye);
            eye = offsetEye;
        } else {
            eye = this._eye;
        }
        if (state.hasDeviceMatrix) {
            math.lookAtMat4v(eye, this._look, this._up, tempMatb);
            math.mulMat4(state.deviceMatrix, tempMatb, state.matrix);
            //state.matrix.set(state.deviceMatrix);
        } else {
            math.lookAtMat4v(eye, this._look, this._up, state.matrix);
        }
        math.inverseMat4(this._state.matrix, this._state.normalMatrix);
        math.transposeMat4(this._state.normalMatrix);
        this.glRedraw();
        this.fire("matrix", this._state.matrix);
        this.fire("viewMatrix", this._state.matrix);
    }

    /**
     Rotates {@link Camera#eye} about {@link Camera#look}, around the {@link Camera#up} vector

     @method orbitYaw
     @param {Number} angle Angle of rotation in degrees
     */
    orbitYaw(angle) {
        let lookEyeVec = math.subVec3(this._eye, this._look, tempVec3);
        math.rotationMat4v(angle * 0.0174532925, this._gimbalLock ? this._worldUp : this._up, tempMat);
        lookEyeVec = math.transformPoint3(tempMat, lookEyeVec, tempVec3b);
        this.eye = math.addVec3(this._look, lookEyeVec, tempVec3c); // Set eye position as 'look' plus 'eye' vector
        this.up = math.transformPoint3(tempMat, this._up, tempVec3d); // Rotate 'up' vector
    }

    /**
     Rotates {@link Camera#eye} about {@link Camera#look} around the right axis (orthogonal to {@link Camera#up} and "look").

     @method orbitPitch
     @param {Number} angle Angle of rotation in degrees
     */
    orbitPitch(angle) {
        let eye2 = math.subVec3(this._eye, this._look, tempVec3);
        const left = math.cross3Vec3(math.normalizeVec3(eye2, tempVec3b), math.normalizeVec3(this._up, tempVec3c));
        math.rotationMat4v(angle * 0.0174532925, left, tempMat);
        eye2 = math.transformPoint3(tempMat, eye2, tempVec3d);
        const up = math.transformPoint3(tempMat, this._up, tempVec3e);
        if (this._constrainPitch) {
            var angle = math.dotVec3(up, this._worldUp) / math.DEGTORAD;
            if (angle < 1) {
                return;
            }
        }
        this.up = up;
        this.eye = math.addVec3(eye2, this._look, tempVec3f);
    }

    /**
     Rotates {@link Camera#look} about {@link Camera#eye}, around the {@link Camera#up} vector.

     @method yaw
     @param {Number} angle Angle of rotation in degrees
     */
    yaw(angle) {
        let look2 = math.subVec3(this._look, this._eye, tempVec3);
        math.rotationMat4v(angle * 0.0174532925, this._gimbalLock ? this._worldUp : this._up, tempMat);
        look2 = math.transformPoint3(tempMat, look2, tempVec3b);
        this.look = math.addVec3(look2, this._eye, tempVec3c);
        if (this._gimbalLock) {
            this.up = math.transformPoint3(tempMat, this._up, tempVec3d);
        }
    }

    /**
     Rotates {@link Camera#look} about {@link Camera#eye}, around the right axis (orthogonal to {@link Camera#up} and "look").

     @method pitch
     @param {Number} angle Angle of rotation in degrees
     */
    pitch(angle) {
        let look2 = math.subVec3(this._look, this._eye, tempVec3);
        const left = math.cross3Vec3(math.normalizeVec3(look2, tempVec3b), math.normalizeVec3(this._up, tempVec3c));
        math.rotationMat4v(angle * 0.0174532925, left, tempMat);
        const up = math.transformPoint3(tempMat, this._up, tempVec3f);
        if (this._constrainPitch) {
            var angle = math.dotVec3(up, this._worldUp) / math.DEGTORAD;
            if (angle < 1) {
                return;
            }
        }
        this.up = up;
        look2 = math.transformPoint3(tempMat, look2, tempVec3d);
        this.look = math.addVec3(look2, this._eye, tempVec3e);
    }

    /**
     Pans the camera along the camera's local X, Y and Z axis.

     @method pan
     @param pan The pan vector
     */
    pan(pan) {
        const eye2 = math.subVec3(this._eye, this._look, tempVec3);
        const vec = [0, 0, 0];
        let v;
        if (pan[0] !== 0) {
            const left = math.cross3Vec3(math.normalizeVec3(eye2, []), math.normalizeVec3(this._up, tempVec3b));
            v = math.mulVec3Scalar(left, pan[0]);
            vec[0] += v[0];
            vec[1] += v[1];
            vec[2] += v[2];
        }
        if (pan[1] !== 0) {
            v = math.mulVec3Scalar(math.normalizeVec3(this._up, tempVec3c), pan[1]);
            vec[0] += v[0];
            vec[1] += v[1];
            vec[2] += v[2];
        }
        if (pan[2] !== 0) {
            v = math.mulVec3Scalar(math.normalizeVec3(eye2, tempVec3d), pan[2]);
            vec[0] += v[0];
            vec[1] += v[1];
            vec[2] += v[2];
        }
        this.eye = math.addVec3(this._eye, vec, tempVec3e);
        this.look = math.addVec3(this._look, vec, tempVec3f);
    }

    /**
     Increments/decrements zoom factor, ie. distance between {@link Camera#eye}
     and {@link Camera#look}.

     @method zoom
     @param delta
     */
    zoom(delta) {
        const vec = math.subVec3(this._eye, this._look, tempVec3);
        const lenLook = Math.abs(math.lenVec3(vec, tempVec3b));
        const newLenLook = Math.abs(lenLook + delta);
        if (newLenLook < 0.5) {
            return;
        }
        const dir = math.normalizeVec3(vec, tempVec3c);
        this.eye = math.addVec3(this._look, math.mulVec3Scalar(dir, newLenLook), tempVec3d);
    }


    /**
     Position of this Camera's eye.

     Fires an {@link Camera#eye:event} event on change.

     @property eye
     @default [0,0,10]
     @type Float32Array
     */
    set eye(value) {
        this._eye.set(value || [0, 0, 10]);
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Camera's {@link Camera#eye} property changes.

         @event eye
         @param value The property's new value
         */
        this.fire("eye", this._eye);
    }

    get eye() {
        return this._eye;
    }

    /**
     Position of this Camera's point-of-interest.

     Fires a {@link Camera#look:event} event on change.

     @property look
     @default [0,0,0]
     @type Float32Array
     */
    set look(value) {
        this._look.set(value || [0, 0, 0]);
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Camera's {@link Camera#look} property changes.

         @event look
         @param value The property's new value
         */
        this.fire("look", this._look);
    }

    get look() {
        return this._look;
    }

    /**
     Direction of this Camera's {@link Camera#up} vector.

     Fires an {@link Camera#up:event} event on change.

     @property up
     @default [0,1,0]
     @type Float32Array
     */
    set up(value) {
        this._up.set(value || [0, 1, 0]);
        this._needUpdate(0);
        /**
         Fired whenever this Camera's {@link Camera#up} property changes.

         @event up
         @param value The property's new value
         */
        this.fire("up", this._up);
    }

    get up() {
        return this._up;
    }

    /**
     Sets an optional matrix to premultiply into {@link Camera#matrix} matrix.

     This is intended to be used for stereo rendering with WebVR etc.

     @property deviceMatrix
     @type {Float32Array}
     */
    set deviceMatrix(matrix) {
        this._state.deviceMatrix.set(matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        this._state.hasDeviceMatrix = !!matrix;
        this._needUpdate(0);
        /**
         Fired whenever this CustomProjection's {@link CustomProjection/matrix} property changes.

         @event deviceMatrix
         @param value The property's new value
         */
        this.fire("deviceMatrix", this._state.deviceMatrix);
    }

    get deviceMatrix() {
        return this._state.deviceMatrix;
    }

    /**
     Indicates the up, right and forward axis of the World coordinate system.

     Has format: ````[rightX, rightY, rightZ, upX, upY, upZ, forwardX, forwardY, forwardZ]````

     @property worldAxis
     @default [1, 0, 0, 0, 1, 0, 0, 0, 1]
     @type Float32Array
     */
    set worldAxis(value) {
        value = value || [1, 0, 0, 0, 1, 0, 0, 0, 1];
        if (!this._worldAxis) {
            this._worldAxis = new Float32Array(value);
        } else {
            this._worldAxis.set(value);
        }
        this._worldRight[0] = this._worldAxis[0];
        this._worldRight[1] = this._worldAxis[1];
        this._worldRight[2] = this._worldAxis[2];
        this._worldUp[0] = this._worldAxis[3];
        this._worldUp[1] = this._worldAxis[4];
        this._worldUp[2] = this._worldAxis[5];
        this._worldForward[0] = this._worldAxis[6];
        this._worldForward[1] = this._worldAxis[7];
        this._worldForward[2] = this._worldAxis[8];
        /**
         * Fired whenever this Camera's {@link Camera#worldAxis} property changes.
         *
         * @event worldAxis
         * @param value The property's new value
         */
        this.fire("worldAxis", this._worldAxis);
    }

    get worldAxis() {
        return this._worldAxis;
    }

    /**
     Direction of World-space "up".

     @property worldUp
     @default [0,1,0]
     @type Float32Array
     @final
     */
    get worldUp() {
        return this._worldUp;
    }

    /**
     Direction of World-space "right".

     @property worldRight
     @default [1,0,0]
     @type Float32Array
     @final
     */
    get worldRight() {
        return this._worldRight;
    }

    /**
     Direction of World-space "forwards".

     @property worldForward
     @default [0,0,-1]
     @type Float32Array
     @final
     */
    get worldForward() {
        return this._worldForward;
    }

    /**
     Whether to lock yaw rotation to pivot about the World-space "up" axis.

     Fires a {@link Camera#gimbalLock:event} event on change.

     @property gimbalLock
     @default true
     @type Boolean
     */
    set gimbalLock(value) {
        this._gimbalLock = value !== false;
        /**
         Fired whenever this Camera's  {@link Camera#gimbalLock} property changes.

         @event gimbalLock
         @param value The property's new value
         */
        this.fire("gimbalLock", this._gimbalLock);
    }

    get gimbalLock() {
        return this._gimbalLock;
    }

    /**
     Whether to prevent camera from being pitched upside down.

     The camera is upside down when the angle
     between {@link Camera#up} and {@link Camera#worldUp} is less than one degree.

     Fires a {@link Camera#constrainPitch:event} event on change.

     @property constrainPitch
     @default false
     @type Boolean
     */
    set constrainPitch(value) {
        this._constrainPitch = !!value;
        /**
         Fired whenever this Camera's  {@link Camera#constrainPitch} property changes.

         @event constrainPitch
         @param value The property's new value
         */
        this.fire("constrainPitch", this._constrainPitch);
    }

    get constrainPitch() {
        return this._constrainPitch;
    }

    /**
     Distance from "look" to "eye".
     @property eyeLookDist
     @type Number
     @final
     */
    get eyeLookDist() {
        return math.lenVec3(math.subVec3(this._look, this._eye, tempVec3));
    }

    /**
     The Camera's viewing transformation matrix.

     Fires a {@link Camera#matrix:event} event on change.

     @property matrix
     @type {Float32Array}
     @final
     @deprecated
     */
    get matrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }

    /**
     The Camera's viewing transformation matrix.

     Fires a {@link Camera#matrix:event} event on change.

     @property viewMatrix
     @final
     @type {Float32Array}
     */
    get viewMatrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }


    /**
     The Camera's viewing normal transformation matrix.

     Fires a {@link Camera#matrix:event} event on change.

     @property normalMatrix
     @type {Float32Array}
     @final
     @deprecated
     */
    get normalMatrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.normalMatrix;
    }

    /**
     The Camera's viewing normal transformation matrix.

     Fires a {@link Camera#matrix:event} event on change.

     @property viewNormalMatrix
     @final
     @type {Float32Array}
     */
    get viewNormalMatrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.normalMatrix;
    }

    /**
     Camera's projection transformation projMatrix.

     Fires a {@link Camera#projMatrix:event} event on change.

     @property projMatrix
     @final
     @type {Float32Array}
     */
    get projMatrix() {
        return this[this.projection].matrix;
    }


    /**
     The perspective projection transform for this Camera.

     This is used while {@link Camera#projection} equals "perspective".

     @property perspective
     @type Perspective
     @final
     */
    get perspective() {
        return this._perspective;
    }

    /**
     The orthographic projection transform for this Camera.

     This is used while {@link Camera#projection} equals "ortho".

     @property ortho
     @type Ortho
     @final
     */
    get ortho() {
        return this._ortho;
    }


    /**
     The frustum projection transform for this Camera.

     This is used while {@link Camera#projection} equals "frustum".

     @property frustum
     @type Frustum
     @final
     */
    get frustum() {
        return this._frustum;
    }

    /**
     A custom projection transform, given as a 4x4 matrix.

     This is used while {@link Camera#projection} equals "customProjection".

     @property customProjection
     @type CustomProjection
     @final
     */
    get customProjection() {
        return this._customProjection;
    }

    /**
     The active projection type.

     Accepted values are "perspective", "ortho", "frustum" and "customProjection".

     @property projection
     @default "perspective"
     @type {String}
     */
    set projection(value) {
        value = value || "perspective";
        if (this._projectionType === value) {
            return;
        }
        if (value === "perspective") {
            this._project = this._perspective;
        } else if (value === "ortho") {
            this._project = this._ortho;
        } else if (value === "frustum") {
            this._project = this._frustum;
        } else if (value === "customProjection") {
            this._project = this._customProjection;
        } else {
            this.error("Unsupported value for 'projection': " + value + " defaulting to 'perspective'");
            this._project = this._perspective;
            value = "perspective";
        }
        this._projectionType = value;
        this.glRedraw();
        this._update(); // Need to rebuild lookat matrix with full eye, look & up
        this.fire("dirty");
    }

    get projection() {
        return this._projectionType;
    }

    /**
     The active projection transform for this Camera.

     @property project
     @type Transform
     @final
     */
    get project() {
        return this._project;
    }

    get view() {
        return this;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {Camera};
