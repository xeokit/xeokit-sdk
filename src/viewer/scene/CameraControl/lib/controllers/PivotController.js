import { math } from "../../../math/math.js";
import { PhongMaterial } from "../../../materials/PhongMaterial.js";
import { Mesh } from "../../../mesh/Mesh.js";
import { VBOGeometry } from "../../../geometry/VBOGeometry.js";
import { buildSphereGeometry } from "../../../geometry/builders/buildSphereGeometry.js";
import { worldToRTCPos } from "../../../math/rtcCoords.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();
const tempVec4c = math.vec4();

const TOP_LIMIT = 0.001;
const BOTTOM_LIMIT = Math.PI - 0.001;


/** @private */
class PivotController {

    /**
     * @private
     */
    constructor(scene, configs) {

        // Pivot math by: http://www.derschmale.com/

        this._scene = scene;
        this._configs = configs;
        this._pivotWorldPos = math.vec3();
        this._cameraOffset = math.vec3();
        this._azimuth = 0;
        this._polar = 0;
        this._radius = 0;
        this._pivotPosSet = false; // Initially false, true as soon as _pivotWorldPos has been set to some value
        this._pivoting = false; // True while pivoting
        this._shown = false;

        this._pivotSphereEnabled = false;
        this._pivotSphere = null;
        this._pivotSphereSize = 1;
        this._pivotSphereGeometry = null;
        this._pivotSphereMaterial = null;
        this._rtcCenter = math.vec3();
        this._rtcPos = math.vec3();

        this._pivotViewPos = math.vec4();
        this._pivotProjPos = math.vec4();
        this._pivotCanvasPos = math.vec2();
        this._cameraDirty = true;

        this._onViewMatrix = this._scene.camera.on("viewMatrix", () => {
            this._cameraDirty = true;
        });

        this._onProjMatrix = this._scene.camera.on("projMatrix", () => {
            this._cameraDirty = true;
        });

        this._onTick = this._scene.on("tick", () => {
            this.updatePivotElement();
            this.updatePivotSphere();
        });
    }

    createPivotSphere() {
        const currentPos = this.getPivotPos();
        const cameraPos = math.vec3();
        math.decomposeMat4(math.inverseMat4(this._scene.viewer.camera.viewMatrix, math.mat4()), cameraPos, math.vec4(), math.vec3());
        const length = math.distVec3(cameraPos, currentPos);
        let radius = (Math.tan(Math.PI / 500) * length) * this._pivotSphereSize;

        if (this._scene.camera.projection == "ortho") {
            radius /= (this._scene.camera.ortho.scale / 2);
        }

        worldToRTCPos(currentPos, this._rtcCenter, this._rtcPos);
        this._pivotSphereGeometry = new VBOGeometry(
            this._scene,
            buildSphereGeometry({ radius })
        );
        this._pivotSphere = new Mesh(this._scene, {
            geometry: this._pivotSphereGeometry,
            material: this._pivotSphereMaterial,
            pickable: false,
            position: this._rtcPos,
            rtcCenter: this._rtcCenter
        });
    };

    destroyPivotSphere() {
        if (this._pivotSphere) {
            this._pivotSphere.destroy();
            this._pivotSphere = null;
        }
        if (this._pivotSphereGeometry) {
            this._pivotSphereGeometry.destroy();
            this._pivotSphereGeometry = null;
        }
    }

    updatePivotElement() {

        const camera = this._scene.camera;
        const canvas = this._scene.canvas;

        if (this._pivoting && this._cameraDirty) {

            math.transformPoint3(camera.viewMatrix, this.getPivotPos(), this._pivotViewPos);
            this._pivotViewPos[3] = 1;
            math.transformPoint4(camera.projMatrix, this._pivotViewPos, this._pivotProjPos);

            const canvasAABB = canvas.boundary;
            const canvasWidth = canvasAABB[2];
            const canvasHeight = canvasAABB[3];

            this._pivotCanvasPos[0] = Math.floor((1 + this._pivotProjPos[0] / this._pivotProjPos[3]) * canvasWidth / 2);
            this._pivotCanvasPos[1] = Math.floor((1 - this._pivotProjPos[1] / this._pivotProjPos[3]) * canvasHeight / 2);

            // data-textures: avoid to do continuous DOM layout calculations            
            let canvasBoundingRect = canvas._lastBoundingClientRect;

            if (!canvasBoundingRect || canvas._canvasSizeChanged)
            {
                const canvasElem = canvas.canvas;

                canvasBoundingRect = canvas._lastBoundingClientRect = canvasElem.getBoundingClientRect ();
            }

            if (this._pivotElement) {
                this._pivotElement.style.left = (Math.floor(canvasBoundingRect.left + this._pivotCanvasPos[0]) - (this._pivotElement.clientWidth / 2) + window.scrollX) + "px";
                this._pivotElement.style.top = (Math.floor(canvasBoundingRect.top + this._pivotCanvasPos[1]) - (this._pivotElement.clientHeight / 2) + window.scrollY) + "px";
            }
            this._cameraDirty = false;
        }
    }

    updatePivotSphere() {
        if (this._pivoting && this._pivotSphere) {
            worldToRTCPos(this.getPivotPos(), this._rtcCenter, this._rtcPos);
            if(!math.compareVec3(this._rtcPos, this._pivotSphere.position)) {
                this.destroyPivotSphere();
                this.createPivotSphere();
            }
        }
    }
    /**
     * Sets the HTML DOM element that will represent the pivot position.
     *
     * @param pivotElement
     */
    setPivotElement(pivotElement) {
        this._pivotElement = pivotElement;
    }

    /**
     * Sets a sphere as the representation of the pivot position.
     *
     * @param {Object} [cfg] Sphere configuration.
     * @param {String} [cfg.size=1] Optional size factor of the sphere. Defaults to 1.
     * @param {String} [cfg.color=Array] Optional maretial color. Defaults to a red.
     */
    enablePivotSphere(cfg = {}) {
        this.destroyPivotSphere();
        this._pivotSphereEnabled = true;
        if (cfg.size) {
            this._pivotSphereSize = cfg.size;
        }
        const color = cfg.color || [1, 0, 0];
        this._pivotSphereMaterial = new PhongMaterial(this._scene, {
            emissive: color,
            ambient: color,
            specular: [0,0,0],
            diffuse: [0,0,0],
        });
    }

    /**
     * Remove the sphere as the representation of the pivot position.
     *
     */
    disablePivotSphere() {
        this.destroyPivotSphere();
        this._pivotSphereEnabled = false;
    }

    /**
     * Begins pivoting.
     */
    startPivot() {

        const camera = this._scene.camera;

        let lookat = math.lookAtMat4v(camera.eye, camera.look, camera.up);
        math.transformPoint3(lookat, this.getPivotPos(), this._cameraOffset);

        const pivotPos = this.getPivotPos();
        this._cameraOffset[2] += math.distVec3(camera.eye, pivotPos);

        lookat = math.inverseMat4(lookat);

        const offset = math.transformVec3(lookat, this._cameraOffset);
        const diff = math.vec3();

        math.subVec3(camera.eye, pivotPos, diff);
        math.addVec3(diff, offset);

        if (camera.zUp) {
            const t = diff[1];
            diff[1] = diff[2];
            diff[2] = t;
        }

        this._radius = math.lenVec3(diff);
        this._polar = Math.acos(diff[1] / this._radius);
        this._azimuth = Math.atan2(diff[0], diff[2]);
        this._pivoting = true;
    }

    _cameraLookingDownwards() { // Returns true if angle between camera viewing direction and World-space "up" axis is too small
        const camera = this._scene.camera;
        const forwardAxis = math.normalizeVec3(math.subVec3(camera.look, camera.eye, tempVec3a));
        const rightAxis = math.cross3Vec3(forwardAxis, camera.worldUp, tempVec3b);
        let rightAxisLen = math.sqLenVec3(rightAxis);
        return (rightAxisLen <= 0.0001);
    }

    /**
     * Returns true if we are currently pivoting.
     *
     * @returns {Boolean}
     */
    getPivoting() {
        return this._pivoting;
    }

    /**
     * Sets a 3D World-space position to pivot about.
     *
     * @param {Number[]} worldPos The new World-space pivot position.
     */
    setPivotPos(worldPos) {
        this._pivotWorldPos.set(worldPos);
        this._pivotPosSet = true;
    }

    /**
     * Sets the pivot position to the 3D projection of the given 2D canvas coordinates on a sphere centered
     * at the viewpoint. The radius of the sphere is configured via {@link CameraControl#smartPivot}.
     *
     *
     * @param canvasPos
     */
    setCanvasPivotPos(canvasPos) {
        const camera = this._scene.camera;
        const pivotShereRadius = Math.abs(math.distVec3(this._scene.center, camera.eye));
        const transposedProjectMat = camera.project.transposedMatrix;
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -1.0, 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);
        const worldPos = tempVec4a;
        camera.project.unproject(canvasPos, screenZ, tempVec4b, tempVec4c, worldPos);
        const eyeWorldPosVec = math.normalizeVec3(math.subVec3(worldPos, camera.eye, tempVec3a));
        const posOnSphere = math.addVec3(camera.eye, math.mulVec3Scalar(eyeWorldPosVec, pivotShereRadius, tempVec3b), tempVec3c);
        this.setPivotPos(posOnSphere);
    }

    /**
     * Gets the current position we're pivoting about.
     * @returns {Number[]} The current World-space pivot position.
     */
    getPivotPos() {
        return (this._pivotPosSet) ? this._pivotWorldPos : this._scene.camera.look; // Avoid pivoting about [0,0,0] by default
    }

    /**
     * Continues to pivot.
     *
     * @param {Number} yawInc Yaw rotation increment.
     * @param {Number} pitchInc Pitch rotation increment.
     */
    continuePivot(yawInc, pitchInc) {
        if (!this._pivoting) {
            return;
        }
        if (yawInc === 0 && pitchInc === 0) {
            return;
        }
        const camera = this._scene.camera;
        var dx = -yawInc;
        const dy = -pitchInc;
        if (camera.worldUp[2] === 1) {
            dx = -dx;
        }
        this._azimuth += -dx * .01;

        const isMovingUp = dy < 0;
        const isMovingDown = dy > 0;
        
        // Track if we're at limits - only check if we're very close to the limit
        const atTopLimit = Math.abs(this._polar - TOP_LIMIT) < 0.005;
        const atBottomLimit = Math.abs(this._polar - BOTTOM_LIMIT) < 0.005;
        
        let newPolar = this._polar + dy * .01;
        
        // Case 1: At top limit and trying to go beyond
        if (atTopLimit && isMovingUp) {
            newPolar = TOP_LIMIT;
        }
        // Case 2: At bottom limit and trying to go beyond
        else if (atBottomLimit && isMovingDown) {
            newPolar = BOTTOM_LIMIT;
        }
        // Case 3: Normal rotation or moving away from a limit
        else {
            newPolar = math.clamp(newPolar, TOP_LIMIT, BOTTOM_LIMIT);
        }

        this._polar = newPolar;

        const pos = [
            this._radius * Math.sin(this._polar) * Math.sin(this._azimuth),
            this._radius * Math.cos(this._polar),
            this._radius * Math.sin(this._polar) * Math.cos(this._azimuth)
        ];
        if (camera.worldUp[2] === 1) {
            const t = pos[1];
            pos[1] = pos[2];
            pos[2] = t;
        }
        // Preserve the eye->look distance, since in xeokit "look" is the point-of-interest, not the direction vector.
        const eyeLookLen = math.lenVec3(math.subVec3(camera.look, camera.eye, math.vec3()));
        const pivotPos = this.getPivotPos();
        math.addVec3(pos, pivotPos);
        let lookat = math.lookAtMat4v(pos, pivotPos, camera.worldUp);
        lookat = math.inverseMat4(lookat);
        const offset = math.transformVec3(lookat, this._cameraOffset);
        lookat[12] -= offset[0];
        lookat[13] -= offset[1];
        lookat[14] -= offset[2];
        const zAxis = [lookat[8], lookat[9], lookat[10]];
        camera.eye = [lookat[12], lookat[13], lookat[14]];
        math.subVec3(camera.eye, math.mulVec3Scalar(zAxis, eyeLookLen), camera.look);
        camera.up = [lookat[4], lookat[5], lookat[6]];
        this.showPivot();
    }

    /**
     * Shows the pivot position.
     *
     * Only works if we set an  HTML DOM element to represent the pivot position.
     */
    showPivot() {
        if (this._shown) {
            return;
        }
        if (this._pivotElement) {
            this.updatePivotElement();
            this._pivotElement.style.visibility = "visible";
        }
        if (this._pivotSphereEnabled) {
            this.destroyPivotSphere();
            this.createPivotSphere();
        }
        this._shown = true;
    }

    /**
     * Hides the pivot position.
     *
     * Only works if we set an  HTML DOM element to represent the pivot position.
     */
    hidePivot() {
        if (!this._shown) {
            return;
        }
        if (this._pivotElement) {
            this._pivotElement.style.visibility = "hidden";
        }
        if (this._pivotSphereEnabled) {
            this.destroyPivotSphere();
        }
        this._shown = false;
    }

    /**
     * Finishes pivoting.
     */
    endPivot() {
        this._pivoting = false;
    }

    destroy() {
        this.destroyPivotSphere();
        this._scene.camera.off(this._onViewMatrix);
        this._scene.camera.off(this._onProjMatrix);
        this._scene.off(this._onTick);
    }
}


export {PivotController};