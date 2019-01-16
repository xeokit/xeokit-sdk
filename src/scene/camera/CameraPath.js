import {Component} from "../Component.js"
import {SplineCurve} from "../paths/SplineCurve.js"
import {math} from "../math/math.js";

const tempVec3a = math.vec3();

class CameraPath extends Component {

    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this CameraPath as well.
     * @param [cfg] {*} Configuration
     * @param [cfg.id] {String} Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this CameraPath.
     * @param [cfg.eyeCurve] {String|SplineCurve} ID or instance of a {@link SplineCurve} to animate the {{#crossLink "Camera/eye:property"}}Camera's eye{{/crossLink}} property along.
     * @param [cfg.lookCurve] {String|SplineCurve} ID or instance of a {@link SplineCurve} to animate the {{#crossLink "Camera/look:property"}}Camera's look{{/crossLink}} property along.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._frames = [];

        this._eyeCurve = new SplineCurve(this);
        this._lookCurve = new SplineCurve(this);
        this._upCurve = new SplineCurve(this);

        if (cfg.frames) {
            this.addFrames(cfg.frames);
        }
    }

    /**
     * Gets the camera frames in this CameraPath.
     *
     * @returns {[]} The camera paths.
     */
    get frames() {
        return this._frames;
    }

    /**
     * Gets the {@link SplineCurve} along which {@link Camera#eye} travels.
     * @returns {SplineCurve} The SplineCurve for {@link Camera#eye}.
     */
    get eyeCurve() {
        return this._eyeCurve;
    }

    /**
     * Gets the {@link SplineCurve} along which {@link Camera#look} travels.
     * @returns {SplineCurve} The SplineCurve for {@link Camera#look}.
     */
    get lookCurve() {
        return this._lookCurve;
    }

    /**
     * Gets the {@link SplineCurve} along which {@link Camera#up} travels.
     * @returns {SplineCurve} The SplineCurve for {@link Camera#up}.
     */
    get upCurve() {
        return this._upCurve;
    }

    /**
     * Adds a frame to this CameraPath, given as the current position of the {@link Camera}.
     *
     * @param {Number} t Time instant for the new frame.
     */
    saveFrame(t) {
        const camera = this.scene.camera;
        this.addFrame(t, camera.eye, camera.look, camera.up);
    }

    /**
     * Adds a frame to this CameraPath, specified as values for eye, look and up vectors at a given time instant.
     *
     * @param {Number} t Time instant for the new frame;
     * @param {Number[]} eye A three-element vector specifying the eye position for the new frame.
     * @param {Number[]} look A three-element vector specifying the look position for the new frame.
     * @param {Number[]} up A three-element vector specifying the up vector for the new frame.
     */
    addFrame(t, eye, look, up) {
        const frame = {
            t: t,
            eye: eye.slice(0),
            look: look.slice(0),
            up: up.slice(0)
        };
        this._frames.push(frame);
        this._eyeCurve.points.push(frame.eye);
        this._lookCurve.points.push(frame.look);
        this._upCurve.points.push(frame.up);
    }

    /**
     * Adds multiple frames to this CameraPath, each frame specified as a set of values for eye, look and up vectors at a given time instant.
     *
     * @param {Array} frames An array of frames.
     */
    addFrames(frames) {
        let frame;
        for (let i = 0, len = frames.length; i < len; i++) {
            frame = frames[i];
            this.addFrame(frame.t || 0, frame.eye, frame.look, frame.up);
        }
    }

    /**
     * Sets the position of the {@link Camera} to a position interpolated within this CameraPath at the given time instant.
     *
     * @param {Number} t Time instant.
     */
    loadFrame(t) {

        const camera = this.scene.camera;

        t = t < 0.0 ? 0.0 : (t > 1.0 ? 1.0 : t);

        camera.eye = this._eyeCurve.getPoint(t, tempVec3a);
        camera.look = this._lookCurve.getPoint(t, tempVec3a);
        camera.up = this._upCurve.getPoint(t, tempVec3a);
    }

    /**
     * Gets eye, look and up vectors on this CameraPath at a given instant.
     *
     * @param {Number} t Time instant.
     * @param {Number[]} eye The eye position to update.
     * @param {Number[]} look The look position to update.
     * @param {Number[]} up The up vector to update.
     */
    sampleFrame(t, eye, look, up) {
        t = t < 0.0 ? 0.0 : (t > 1.0 ? 1.0 : t);
        this._eyeCurve.getPoint(t, eye);
        this._lookCurve.getPoint(t, look);
        this._upCurve.getPoint(t, up);
    }

    /**
     * Removes all frames from this CameraPath.
     */
    clearFrames() {
        this._frames = [];
        this._eyeCurve.points = [];
        this._lookCurve.points = [];
        this._upCurve.points = [];
    }
}

export {CameraPath}