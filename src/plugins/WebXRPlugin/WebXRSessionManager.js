import { math } from "../../viewer/scene/math/math.js";

/**
 * Manages WebXR session lifecycle and rendering for the WebXRPlugin.
 *
 * This class handles the low-level WebXR API interactions, session management,
 * and coordinate system transformations between WebXR and xeokit.
 *
 * @private
 */
class WebXRSessionManager {
    /**
     * @constructor
     * @param {Viewer} viewer The xeokit Viewer instance.
     * @param {Object} cfg Configuration options.
     */
    constructor(viewer, cfg = {}) {
        this.viewer = viewer;
        this.cfg = cfg;

        // Session state
        this.session = null;
        this.referenceSpace = null;
        this.hitTestSource = null;
        this.isPresenting = false;
        this.frameRequestId = null;

        // WebGL context
        this.gl = null;
        this.layer = null;

        // Camera state
        this.originalCameraState = {
            eye: math.vec3(),
            look: math.vec3(),
            up: math.vec3(),
            projection: null,
            customProjection: null,
        };

        // Transform matrices
        this.viewMatrix = math.mat4();
        this.projectionMatrix = math.mat4();
        this.modelMatrix = math.mat4();

        // Hit test results
        this.hitTestResults = [];

        // Event callbacks
        this.onFrame = null;
        this.onSessionStart = null;
        this.onSessionEnd = null;
        this.onError = null;

        // Bind methods
        this._onXRFrame = this._onXRFrame.bind(this);
        this._onSessionEnd = this._onSessionEnd.bind(this);
    }

    /**
     * Check if WebXR AR is supported.
     * @returns {Promise<boolean>}
     */
    async checkSupport() {
        if (!navigator.xr) {
            throw new Error("WebXR not available");
        }

        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        if (!supported) {
            throw new Error("immersive-ar not supported");
        }

        return true;
    }

    /**
     * Start a WebXR AR session.
     * @param {Object} options Session configuration options.
     * @returns {Promise<XRSession>}
     */
    async startSession(options = {}) {
        if (this.isPresenting) {
            throw new Error("XR session already active");
        }

        try {
            // Default session configuration
            const sessionInit = {
                requiredFeatures: ["local-floor"],
                optionalFeatures: ["hit-test", "dom-overlay", "anchors"],
                domOverlay: options.domOverlay || { root: document.body },
            };

            // Merge with provided options
            Object.assign(sessionInit, options.sessionInit || {});

            // Request the session
            this.session = await navigator.xr.requestSession(
                "immersive-ar",
                sessionInit,
            );

            // Set up WebGL layer
            await this._setupWebGLLayer(options);

            // Get reference space
            await this._setupReferenceSpace(
                options.referenceSpace || "local-floor",
            );

            // Set up hit testing
            if (options.hitTestEnabled !== false) {
                await this._setupHitTesting();
            }

            // Store original camera state
            this._storeOriginalCameraState();

            // Set up session event handlers
            this.session.addEventListener("end", this._onSessionEnd);

            // Start the render loop
            this.isPresenting = true;
            this.frameRequestId = this.session.requestAnimationFrame(
                this._onXRFrame,
            );

            // Notify callbacks
            if (this.onSessionStart) {
                this.onSessionStart(this.session);
            }

            return this.session;
        } catch (error) {
            this._cleanup();
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * End the current WebXR session.
     * @returns {Promise<void>}
     */
    async endSession() {
        if (!this.session) {
            return;
        }

        try {
            await this.session.end();
        } catch (error) {
            console.warn("Error ending XR session:", error);
        }
    }

    /**
     * Set up the WebGL layer for XR rendering.
     * @param {Object} options Configuration options.
     * @private
     */
    async _setupWebGLLayer(options) {
        const canvas = this.viewer.scene.canvas.canvas;

        // Use the existing WebGL context from the xeokit viewer
        this.gl = this.viewer.scene.canvas.gl;

        if (!this.gl) {
            throw new Error("No WebGL context available from xeokit viewer");
        }

        // Make the existing context XR compatible
        try {
            await this.gl.makeXRCompatible();
        } catch (error) {
            // If makeXRCompatible fails, we need to create a new XR-compatible context
            console.warn(
                "Failed to make existing context XR compatible:",
                error.message,
            );

            // Create a new XR-compatible WebGL context
            const contextAttributes = {
                xrCompatible: true,
                antialias: options.antialias !== false,
                depth: true,
                stencil: false,
                alpha: false,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance",
            };

            this.gl =
                canvas.getContext("webgl2", contextAttributes) ||
                canvas.getContext("webgl", contextAttributes);

            if (!this.gl) {
                throw new Error("Failed to create XR-compatible WebGL context");
            }

            // Verify XR compatibility
            try {
                await this.gl.makeXRCompatible();
            } catch (retryError) {
                throw new Error(
                    "Failed to create XR-compatible WebGL context: " +
                        retryError.message,
                );
            }
        }

        // Create XR WebGL layer
        this.layer = new XRWebGLLayer(this.session, this.gl, {
            antialias: options.antialias !== false,
            depth: true,
            stencil: false,
            alpha: false,
            multiview: false, // Not widely supported yet
        });

        // Update render state
        await this.session.updateRenderState({ baseLayer: this.layer });
    }

    /**
     * Set up the XR reference space.
     * @param {string} referenceSpaceType The type of reference space to request.
     * @private
     */
    async _setupReferenceSpace(referenceSpaceType) {
        try {
            this.referenceSpace =
                await this.session.requestReferenceSpace(referenceSpaceType);
        } catch (error) {
            // Fallback to 'local' if 'local-floor' fails
            if (referenceSpaceType === "local-floor") {
                console.warn(
                    "local-floor reference space not available, falling back to local",
                );
                this.referenceSpace =
                    await this.session.requestReferenceSpace("local");
            } else {
                throw error;
            }
        }
    }

    /**
     * Set up hit testing for AR placement.
     * @private
     */
    async _setupHitTesting() {
        try {
            this.hitTestSource = await this.session.requestHitTestSource({
                space: this.referenceSpace,
            });
        } catch (error) {
            console.warn("Hit test not available:", error.message);
            this.hitTestSource = null;
        }
    }

    /**
     * Store the original camera state for restoration.
     * @private
     */
    _storeOriginalCameraState() {
        const camera = this.viewer.camera;

        this.originalCameraState.eye[0] = camera.eye[0];
        this.originalCameraState.eye[1] = camera.eye[1];
        this.originalCameraState.eye[2] = camera.eye[2];
        this.originalCameraState.look[0] = camera.look[0];
        this.originalCameraState.look[1] = camera.look[1];
        this.originalCameraState.look[2] = camera.look[2];
        this.originalCameraState.up[0] = camera.up[0];
        this.originalCameraState.up[1] = camera.up[1];
        this.originalCameraState.up[2] = camera.up[2];

        this.originalCameraState.projection = camera.projection;
        this.originalCameraState.customProjection = camera.customProjection;
    }

    /**
     * Restore the original camera state.
     * @private
     */
    _restoreOriginalCameraState() {
        const camera = this.viewer.camera;

        camera.eye = this.originalCameraState.eye;
        camera.look = this.originalCameraState.look;
        camera.up = this.originalCameraState.up;
        camera.projection = this.originalCameraState.projection;
        camera.customProjection = this.originalCameraState.customProjection;
    }

    /**
     * XR frame callback - called for each XR frame.
     * @param {DOMHighResTimeStamp} time Current time.
     * @param {XRFrame} frame Current XR frame.
     * @private
     */
    _onXRFrame(time, frame) {
        if (!this.isPresenting || !this.session) {
            return;
        }

        // Request next frame
        this.frameRequestId = this.session.requestAnimationFrame(
            this._onXRFrame,
        );

        try {
            // Get viewer pose
            const pose = frame.getViewerPose(this.referenceSpace);
            if (!pose) {
                return;
            }

            // Update hit test results
            if (this.hitTestSource) {
                this.hitTestResults = frame.getHitTestResults(
                    this.hitTestSource,
                );
            }

            // Set up framebuffer
            this.gl.bindFramebuffer(
                this.gl.FRAMEBUFFER,
                this.layer.framebuffer,
            );

            // Clear the framebuffer
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

            // Render each view (typically just one for AR)
            for (let i = 0; i < pose.views.length; i++) {
                const view = pose.views[i];
                this._renderView(view, frame, i);
            }

            // Notify frame callback
            if (this.onFrame) {
                this.onFrame(time, frame, this.hitTestResults);
            }
        } catch (error) {
            console.error("Error in XR frame:", error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Render a single XR view.
     * @param {XRView} view The XR view to render.
     * @param {XRFrame} frame The current XR frame.
     * @param {number} viewIndex Index of the view being rendered.
     * @private
     */
    _renderView(view, frame, viewIndex) {
        // Set viewport for this view
        const viewport = this.layer.getViewport(view);
        this.gl.viewport(
            viewport.x,
            viewport.y,
            viewport.width,
            viewport.height,
        );

        // Update camera with XR view data
        this._updateCameraFromXRView(view);

        // Render the scene
        this.viewer.scene.render();
    }

    /**
     * Update xeokit camera from XR view data.
     * @param {XRView} view The XR view.
     * @private
     */
    _updateCameraFromXRView(view) {
        const camera = this.viewer.camera;

        // Get view and projection matrices
        const viewMatrix = view.transform.inverse.matrix;
        const projectionMatrix = view.projectionMatrix;

        // Convert WebXR matrices to xeokit format
        for (let i = 0; i < 16; i++) {
            this.viewMatrix[i] = viewMatrix[i];
            this.projectionMatrix[i] = projectionMatrix[i];
        }

        // Extract camera position from view matrix
        const eye = math.vec3();
        eye[0] = viewMatrix[12];
        eye[1] = viewMatrix[13];
        eye[2] = viewMatrix[14];

        // Extract look direction (negative z-axis)
        const look = math.vec3();
        look[0] = eye[0] - viewMatrix[8];
        look[1] = eye[1] - viewMatrix[9];
        look[2] = eye[2] - viewMatrix[10];

        // Extract up direction (y-axis)
        const up = math.vec3();
        up[0] = viewMatrix[4];
        up[1] = viewMatrix[5];
        up[2] = viewMatrix[6];

        // Update camera
        camera.eye = eye;
        camera.look = look;
        camera.up = up;
        camera.customProjection = this.projectionMatrix;
    }

    /**
     * Handle session end event.
     * @private
     */
    _onSessionEnd() {
        this._cleanup();

        // Restore original camera state
        this._restoreOriginalCameraState();

        // Notify callback
        if (this.onSessionEnd) {
            this.onSessionEnd();
        }
    }

    /**
     * Clean up session resources.
     * @private
     */
    _cleanup() {
        this.isPresenting = false;

        if (this.session) {
            this.session.removeEventListener("end", this._onSessionEnd);
            this.session = null;
        }

        this.referenceSpace = null;
        this.hitTestSource = null;
        this.layer = null;
        this.frameRequestId = null;
        this.hitTestResults = [];
    }

    /**
     * Get the current hit test results.
     * @returns {Array<XRHitTestResult>}
     */
    getHitTestResults() {
        return this.hitTestResults;
    }

    /**
     * Transform a point from XR space to xeokit world space.
     * @param {Float32Array|Array} xrPoint Point in XR space.
     * @returns {Array} Point in xeokit world space.
     */
    transformXRToWorld(xrPoint) {
        // For now, assume XR and world space are the same
        // In more complex scenarios, this would apply coordinate system transforms
        return [xrPoint[0], xrPoint[1], xrPoint[2]];
    }

    /**
     * Transform a point from xeokit world space to XR space.
     * @param {Array} worldPoint Point in xeokit world space.
     * @returns {Float32Array} Point in XR space.
     */
    transformWorldToXR(worldPoint) {
        // For now, assume XR and world space are the same
        return new Float32Array([worldPoint[0], worldPoint[1], worldPoint[2]]);
    }

    /**
     * Destroy the session manager and clean up resources.
     */
    destroy() {
        if (this.isPresenting) {
            this.endSession();
        }
        this._cleanup();
    }
}

export { WebXRSessionManager };
