import {Component} from "../Component.js"
import {CameraPath} from "./CameraPath.js"

class CameraPathAnimation extends Component {

    init(cfg) {

        super.init(cfg);

        this._cameraFlightAnimation = this.create({
            type: "CameraFlightAnimation"
        });

        this._t = 0;

        this.state = CameraPathAnimation.SCRUBBING;

        this._playingFromT = 0;
        this._playingToT = 0;
        this._playingRate = cfg.playingRate || 1.0;
        this._playingDir = 1.0;

        this.cameraPath = cfg.cameraPath;

        this._tick = this.scene.on("tick", this._updateT, this);
    }

    _updateT() {

        const cameraPath = this._attached.cameraPath;

        if (!cameraPath) {
            return;
        }

        const f = 0.002;
        //var f = 1.0;

        switch (this.state) {

            case CameraPathAnimation.SCRUBBING:
                return;

            case CameraPathAnimation.PLAYING:

                this._t += this._playingRate * f;

                const numFrames = this.cameraPath.frames.length;
                if (numFrames === 0 || (this._playingDir < 0 && this._t <= 0) || (this._playingDir > 0 && this._t >= this.cameraPath.frames[numFrames - 1].t)) {
                    this.state = CameraPathAnimation.SCRUBBING;
                    this._t = this.cameraPath.frames[numFrames - 1].t;
                    return;
                }

                cameraPath.loadFrame(this._t);

                break;

            case CameraPathAnimation.PLAYING_TO:

                let t = this._t + (this._playingRate * f * this._playingDir);

                //t = this._ease(t, this._playingFromT, this._playingToT, this._playingToT - this._playingFromT);

                if ((this._playingDir < 0 && t <= this._playingToT) || (this._playingDir > 0 && t >= this._playingToT)) {
                    t = this._playingToT;
                    this.state = CameraPathAnimation.SCRUBBING;
                }

                this._t = t;

                cameraPath.loadFrame(this._t);

                break;
        }
    }

    // Quadratic easing out - decelerating to zero velocity
    // http://gizma.com/easing

    _ease(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    }

    /**
     The {{#crossLink "CameraPath"}}{{/crossLink}} for this CameraPathAnimation.

     Fires a {{#crossLink "CameraPathAnimation/cameraPath:event"}}{{/crossLink}} event on change.

     @property cameraPath
     @type CameraPath
     */
    set cameraPath(value) {
        this._attach({name: "cameraPath", type: "CameraPath", component: value, sceneDefault: false});
    }

    get cameraPath() {
        return this._attached.cameraPath;
    }

    /**
     The rate at which this CameraPathAnimation plays.

     @property rate
     @type Number
     */
    set rate(value) {
        this._playingRate = value;
    }

    get rate() {
        return this._playingRate;
    }

    /**
     * Begins playing this CameraPathAnimation from the current time.
     * @method play
     */
    play() {
        if (!this._attached.cameraPath) {
            return;
        }
        this.state = CameraPathAnimation.PLAYING;
    }

    /**
     * Begins playing this CameraPathAnimation from the current time to the given time.
     *
     * @method playToT
     * @param {Number} t Time instant.
     */
    playToT(t) {
        const cameraPath = this._attached.cameraPath;
        if (!cameraPath) {
            return;
        }
        this._playingFromT = this._t;
        this._playingToT = t;
        this._playingDir = (this._playingToT - this._playingFromT) < 0 ? -1 : 1;
        this.state = CameraPathAnimation.PLAYING_TO;
    }

    /**
     * Begins playing this CameraPathAnimation from the current time to the time at the given frame.
     *
     * @method playToFrame
     * @param {Number} frameIdx Index of the frame to play to.
     */
    playToFrame(frameIdx) {
        const cameraPath = this._attached.cameraPath;
        if (!cameraPath) {
            return;
        }
        const frame = cameraPath.frames[frameIdx];
        if (!frame) {
            this.error("playToFrame - frame index out of range: " + frameIdx);
            return;
        }
        const t = (1.0 / cameraPath.frames.length) * frameIdx;
        this.playToT(t);
    }

    /**
     * Flies this CameraPathAnimation's {{#crossLink "Camera"}}{{/crossLink}} to the time at the given frame.
     *
     * @method flyToFrame
     * @param {Number} frameIdx Index of the frame to play to.
     * @param {Function} [ok] Callback to fire when playing is complete.
     */
    flyToFrame(frameIdx, ok) {
        const cameraPath = this._attached.cameraPath;
        if (!cameraPath) {
            return;
        }
        const frame = cameraPath.frames[frameIdx];
        if (!frame) {
            this.error("flyToFrame - frame index out of range: " + frameIdx);
            return;
        }
        this.state = CameraPathAnimation.SCRUBBING;
        this._cameraFlightAnimation.flyTo(frame, ok);
    }

    /**
     * Scrubs (sets) this CameraPathAnimation to the the given time.
     *
     * @method scrubToT
     * @param {Number} t Time instant.
     */
    scrubToT(t) {
        const cameraPath = this._attached.cameraPath;
        if (!cameraPath) {
            return;
        }
        const camera = this.scene.camera;
        if (!camera) {
            return;
        }
        this._t = t;
        cameraPath.loadFrame(this._t, camera);
        this.state = CameraPathAnimation.SCRUBBING;
    }

    /**
     * Scrubs this CameraPathAnimation to the given frame.
     *
     * @method scrubToFrame
     * @param {Number} frameIdx Index of the frame to scrub to.
     */
    scrubToFrame(frameIdx) {
        const cameraPath = this._attached.cameraPath;
        if (!cameraPath) {
            return;
        }
        const camera = this.scene.camera;
        if (!camera) {
            return;
        }
        const frame = cameraPath.frames[frameIdx];
        if (!frame) {
            this.error("playToFrame - frame index out of range: " + frameIdx);
            return;
        }
        this._t = (1.0 / cameraPath.frames.length) * frameIdx;
        cameraPath.loadFrame(this._t, camera);
        this.state = CameraPathAnimation.SCRUBBING;
    }

    /**
     * Stops playing this CameraPathAnimation.
     *
     * @method stop
     */
    stop() {
        this.state = CameraPathAnimation.SCRUBBING;
    }

    destroy() {
        super.destroy();
        this.scene.off(this._tick);
    }
}

CameraPathAnimation.STOPPED = 0;
CameraPathAnimation.SCRUBBING = 1;
CameraPathAnimation.PLAYING = 2;
CameraPathAnimation.PLAYING_TO = 3;

export {CameraPathAnimation}