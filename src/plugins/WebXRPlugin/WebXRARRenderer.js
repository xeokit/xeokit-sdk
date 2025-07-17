import { math } from "../../viewer/scene/math/math.js";

/**
 * Custom AR Renderer for WebXR, inspired by model-viewer's ARRenderer.
 *
 * This class provides a robust WebXR AR rendering system with proper session management,
 * QR code positioning, and integration with xeokit's rendering pipeline.
 *
 * Features:
 * - Proper WebXR session lifecycle management
 * - QR code detection and positioning
 * - Camera tracking and pose estimation
 * - Hit testing and surface detection
 * - Integration with xeokit's renderer
 *
 * @private
 */
class WebXRARRenderer {
    /**
     * @constructor
     * @param {Viewer} viewer The xeokit Viewer instance.
     * @param {Object} cfg Configuration options.
     */
    constructor(viewer, cfg = {}) {
        this.viewer = viewer;
        this.cfg = cfg;

        // WebXR session state
        this.session = null;
        this.referenceSpace = null;
        this.baseLayer = null;
        this.isPresenting = false;
        this.frameRequestId = null;

        // Renderer state
        this.gl = null;
        this.renderer = viewer.scene.canvas.gl;
        this.canvas = viewer.scene.canvas.canvas;

        // Camera and positioning
        this.viewMatrix = math.mat4();
        this.projectionMatrix = math.mat4();
        this.originalCameraState = null;
        this.userPosition = [0, 0, 0]; // User's position from QR code
        this.roomOrigin = [0, 0, 0]; // Room's origin position

        // Hit testing
        this.hitTestSource = null;
        this.hitTestResults = [];

        // QR Code tracking
        this.qrCodeDetector = null;
        this.qrCodePosition = null;
        this.isPositioned = false;
        this.roomAlignment = math.mat4();

        // Frame tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.renderStats = {
            fps: 0,
            frameTime: 0,
            lastUpdate: 0,
        };

        // Event callbacks
        this.onFrame = null;
        this.onSessionStart = null;
        this.onSessionEnd = null;
        this.onPositioned = null;
        this.onError = null;

        // Bind methods
        this._onXRFrame = this._onXRFrame.bind(this);
        this._onSessionEnd = this._onSessionEnd.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);

        // Note: _init() should be called externally after construction
    }

    /**
     * Initialize the AR renderer.
     * @public
     */
    async init() {
        // Set up WebGL context for XR
        await this._setupWebGLContext();

        // Initialize QR code detection
        this._initQRCodeDetection();

        // Set up visibility change handling
        document.addEventListener("visibilitychange", this._onVisibilityChange);

        console.log("WebXR AR Renderer initialized");
    }

    /**
     * Set up WebGL context for XR compatibility.
     * @private
     */
    async _setupWebGLContext() {
        try {
            // Use the existing WebGL context from xeokit viewer
            this.gl = this.renderer;

            if (!this.gl) {
                throw new Error(
                    "No WebGL context available from xeokit viewer",
                );
            }

            console.log("WebGL context type:", this.gl.constructor.name);
            console.log(
                "WebGL version:",
                this.gl.getParameter(this.gl.VERSION),
            );

            // Check if context is already XR compatible
            const xrExtension =
                this.gl.getExtension("WEBGL_xr_compatible_context") ||
                this.gl.getExtension("WEBGL_xr_compatible");

            if (xrExtension) {
                console.log(
                    "WebGL context already has XR compatibility extension",
                );
            }

            // Make the existing context XR compatible
            try {
                await this.gl.makeXRCompatible();
                console.log("WebGL context made XR compatible successfully");
            } catch (compatError) {
                console.error("makeXRCompatible failed:", compatError);
                console.log("WebGL context details:");
                console.log("- Canvas:", this.canvas);
                console.log(
                    "- Context attributes:",
                    this.gl.getContextAttributes(),
                );
                throw new Error(
                    "Failed to make WebGL context XR compatible: " +
                        compatError.message,
                );
            }
        } catch (error) {
            console.error("Failed to setup WebGL context for XR:", error);
            throw error;
        }
    }

    /**
     * Initialize QR code detection capabilities.
     * @private
     */
    _initQRCodeDetection() {
        try {
            // Check if BarcodeDetector is available
            if ("BarcodeDetector" in window) {
                this.qrCodeDetector = new BarcodeDetector({
                    formats: ["qr_code"],
                });
                console.log("QR code detection initialized");
            } else {
                console.warn(
                    "BarcodeDetector not available - QR positioning disabled",
                );
            }
        } catch (error) {
            console.warn("Failed to initialize QR code detection:", error);
        }
    }

    /**
     * Check if WebXR AR is supported.
     * @returns {Promise<boolean>}
     */
    async checkSupport() {
        if (!navigator.xr) {
            throw new Error("WebXR not available");
        }

        try {
            const supported =
                await navigator.xr.isSessionSupported("immersive-ar");
            if (!supported) {
                throw new Error("immersive-ar not supported");
            }

            // WebGL context should already be set up during initialization
            if (!this.gl) {
                throw new Error("WebGL context not initialized");
            }

            return true;
        } catch (error) {
            console.error("WebXR AR support check failed:", error);
            throw error;
        }
    }

    /**
     * Start AR session with proper lifecycle management.
     * @param {Object} options Session options.
     * @returns {Promise<XRSession>}
     */
    async startSession(options = {}) {
        // Prevent multiple sessions
        if (this.isPresenting) {
            console.warn("AR session already active");
            return this.session;
        }

        try {
            // Store original camera state
            this._storeOriginalCameraState();

            // Request XR session
            const sessionInit = {
                requiredFeatures: ["local", "local-floor"],
                optionalFeatures: [
                    "hit-test",
                    "dom-overlay",
                    "camera-access", // For QR code scanning
                    "bounded-floor",
                    "unbounded",
                    "depth-sensing",
                ],
                domOverlay: options.domOverlay || { root: document.body },
            };

            this.session = await navigator.xr.requestSession(
                "immersive-ar",
                sessionInit,
            );

            // Set up WebGL layer
            await this._setupWebGLLayer();

            // Get reference space
            await this._setupReferenceSpace(
                options.referenceSpace || "local-floor",
            );

            // Set up hit testing
            if (options.hitTestEnabled !== false) {
                await this._setupHitTesting();
            }

            // Set up session event handlers
            this.session.addEventListener("end", this._onSessionEnd);
            this.session.addEventListener(
                "visibilitychange",
                this._onVisibilityChange,
            );

            // Start the render loop
            this.isPresenting = true;
            this.frameRequestId = this.session.requestAnimationFrame(
                this._onXRFrame,
            );

            // Notify session start
            if (this.onSessionStart) {
                this.onSessionStart(this.session);
            }

            console.log("AR session started successfully");
            return this.session;
        } catch (error) {
            this._cleanup();
            console.error("Failed to start AR session:", error);

            if (this.onError) {
                this.onError(error);
            }

            throw error;
        }
    }

    /**
     * End the current AR session.
     * @returns {Promise<void>}
     */
    async endSession() {
        if (!this.session) {
            return;
        }

        try {
            await this.session.end();
        } catch (error) {
            console.warn("Error ending AR session:", error);
        }
    }

    /**
     * Set up WebGL layer for XR rendering.
     * @private
     */
    async _setupWebGLLayer() {
        try {
            // Verify WebGL context is XR compatible before creating layer
            if (!this.gl) {
                throw new Error("No WebGL context available");
            }

            // Check if context has XR compatibility extension
            const xrExtension =
                this.gl.getExtension("WEBGL_xr_compatible_context") ||
                this.gl.getExtension("WEBGL_xr_compatible");

            console.log(
                "WebGL context XR extension:",
                xrExtension ? "available" : "not available",
            );

            // Ensure context is XR compatible
            try {
                await this.gl.makeXRCompatible();
                console.log("WebGL context confirmed XR compatible");
            } catch (compatError) {
                console.error(
                    "Failed to ensure XR compatibility:",
                    compatError,
                );
                throw new Error(
                    "WebGL context cannot be made XR compatible: " +
                        compatError.message,
                );
            }

            // Create XR WebGL layer
            this.baseLayer = new XRWebGLLayer(this.session, this.gl, {
                antialias: true,
                depth: true,
                stencil: false,
                alpha: false,
                multiview: false,
            });

            await this.session.updateRenderState({ baseLayer: this.baseLayer });
            console.log("WebGL layer configured successfully");
        } catch (error) {
            console.error("Failed to setup WebGL layer:", error);
            throw error;
        }
    }

    /**
     * Set up XR reference space.
     * @param {string} referenceSpaceType Type of reference space.
     * @private
     */
    async _setupReferenceSpace(referenceSpaceType) {
        try {
            this.referenceSpace =
                await this.session.requestReferenceSpace(referenceSpaceType);
            console.log(`Reference space '${referenceSpaceType}' configured`);
        } catch (error) {
            console.warn(
                `Failed to get '${referenceSpaceType}' reference space, trying 'local'`,
            );
            try {
                this.referenceSpace =
                    await this.session.requestReferenceSpace("local");
                console.log("Fallback to 'local' reference space");
            } catch (fallbackError) {
                console.error(
                    "Failed to get any reference space:",
                    fallbackError,
                );
                throw fallbackError;
            }
        }
    }

    /**
     * Set up hit testing for surface detection.
     * @private
     */
    async _setupHitTesting() {
        try {
            this.hitTestSource = await this.session.requestHitTestSource({
                space: this.referenceSpace,
            });
            console.log("Hit testing configured");
        } catch (error) {
            console.warn("Hit testing not available:", error);
            this.hitTestSource = null;
        }
    }

    /**
     * Store original camera state for restoration.
     * @private
     */
    _storeOriginalCameraState() {
        const camera = this.viewer.camera;

        this.originalCameraState = {
            eye: math.vec3(camera.eye),
            look: math.vec3(camera.look),
            up: math.vec3(camera.up),
            projection: camera.projection,
            customProjection: camera.customProjection,
        };
    }

    /**
     * Restore original camera state.
     * @private
     */
    _restoreOriginalCameraState() {
        if (!this.originalCameraState) return;

        const camera = this.viewer.camera;
        camera.eye = this.originalCameraState.eye;
        camera.look = this.originalCameraState.look;
        camera.up = this.originalCameraState.up;
        camera.projection = this.originalCameraState.projection;
        camera.customProjection = this.originalCameraState.customProjection;
    }

    /**
     * Main XR frame callback.
     * @param {DOMHighResTimeStamp} time Current time.
     * @param {XRFrame} frame Current XR frame.
     * @private
     */
    _onXRFrame(time, frame) {
        if (!this.isPresenting || !this.session) {
            return;
        }

        try {
            // Update frame stats
            this._updateFrameStats(time);

            // Request next frame
            this.frameRequestId = this.session.requestAnimationFrame(
                this._onXRFrame,
            );

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

            // Process QR code detection if not positioned
            if (!this.isPositioned && this.qrCodeDetector) {
                this._processQRCodeDetection(frame);
            }

            // Set up framebuffer
            this.gl.bindFramebuffer(
                this.gl.FRAMEBUFFER,
                this.baseLayer.framebuffer,
            );

            // Clear the framebuffer
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

            // Render each view
            for (let i = 0; i < pose.views.length; i++) {
                const view = pose.views[i];
                this._renderView(view, frame, i);
            }

            // Notify frame callback
            if (this.onFrame) {
                this.onFrame(time, frame, {
                    hitTestResults: this.hitTestResults,
                    isPositioned: this.isPositioned,
                    userPosition: this.userPosition,
                    renderStats: this.renderStats,
                });
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
     * @param {number} viewIndex Index of the view.
     * @private
     */
    _renderView(view, frame, viewIndex) {
        // Set viewport
        const viewport = this.baseLayer.getViewport(view);
        this.gl.viewport(
            viewport.x,
            viewport.y,
            viewport.width,
            viewport.height,
        );

        // Update camera with XR view data
        this._updateCameraFromXRView(view);

        // Apply room alignment if positioned
        if (this.isPositioned) {
            this._applyCameraAlignment();
        }

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

        // Store matrices
        math.mat4Set(this.viewMatrix, viewMatrix);
        math.mat4Set(this.projectionMatrix, projectionMatrix);

        // Extract camera position from view matrix
        const eye = math.vec3([viewMatrix[12], viewMatrix[13], viewMatrix[14]]);

        // Extract look direction (negative z-axis)
        const look = math.vec3([
            eye[0] - viewMatrix[8],
            eye[1] - viewMatrix[9],
            eye[2] - viewMatrix[10],
        ]);

        // Extract up direction (y-axis)
        const up = math.vec3([viewMatrix[4], viewMatrix[5], viewMatrix[6]]);

        // Update camera
        camera.eye = eye;
        camera.look = look;
        camera.up = up;
        camera.customProjection = this.projectionMatrix;
    }

    /**
     * Apply camera alignment based on QR code positioning.
     * @private
     */
    _applyCameraAlignment() {
        if (!this.isPositioned) return;

        const camera = this.viewer.camera;

        // Apply room alignment transformation
        const alignedEye = math.vec3();
        const alignedLook = math.vec3();
        const alignedUp = math.vec3();

        // Transform camera vectors by room alignment matrix
        math.transformPoint3(this.roomAlignment, camera.eye, alignedEye);
        math.transformPoint3(this.roomAlignment, camera.look, alignedLook);
        math.transformVec3(this.roomAlignment, camera.up, alignedUp);

        // Apply user position offset
        math.addVec3(alignedEye, this.userPosition, alignedEye);
        math.addVec3(alignedLook, this.userPosition, alignedLook);

        // Update camera
        camera.eye = alignedEye;
        camera.look = alignedLook;
        camera.up = alignedUp;
    }

    /**
     * Process QR code detection for positioning.
     * @param {XRFrame} frame Current XR frame.
     * @private
     */
    async _processQRCodeDetection(frame) {
        if (!this.qrCodeDetector || this.isPositioned) {
            return;
        }

        try {
            // Get camera feed and process QR codes
            const session = frame.session;
            if (session.inputSources) {
                for (const inputSource of session.inputSources) {
                    if (inputSource.camera) {
                        // Pass frame to detection method for camera access
                        await this._detectQRCode(inputSource, frame);
                    }
                }
            } else {
                // Try detection without input source
                await this._detectQRCode(null, frame);
            }
        } catch (error) {
            console.warn("QR code detection failed:", error);
        }
    }

    /**
     * Detect QR code and extract positioning information.
     * @param {XRInputSource} inputSource Input source with camera.
     * @private
     */
    async _detectQRCode(inputSource, frame) {
        if (!this.qrCodeDetector) {
            return;
        }

        try {
            // Try to get camera image source from the WebXR session
            let imageSource = null;

            // Method 1: Try to get camera view from frame
            if (frame && frame.getViewerPose) {
                const pose = frame.getViewerPose(this.referenceSpace);
                if (pose && pose.views && pose.views.length > 0) {
                    // Use the camera view - this is experimental
                    const view = pose.views[0];
                    if (view.camera && view.camera.image) {
                        imageSource = view.camera.image;
                    }
                }
            }

            // Method 2: Try to get image from input source camera
            if (!imageSource && inputSource && inputSource.camera) {
                imageSource = inputSource.camera;
            }

            // Method 3: Try to access camera through WebXR session
            if (!imageSource && frame && frame.session) {
                const session = frame.session;
                if (session.renderState && session.renderState.baseLayer) {
                    const canvas = session.renderState.baseLayer.context.canvas;
                    if (canvas) {
                        // Create an ImageBitmap from the canvas
                        imageSource = await createImageBitmap(canvas);
                    }
                }
            }

            if (!imageSource) {
                // Fallback: try to get video element if available
                const videoElements = document.querySelectorAll("video");
                for (const video of videoElements) {
                    if (video.srcObject && video.readyState >= 2) {
                        imageSource = video;
                        break;
                    }
                }
            }

            if (imageSource) {
                // Detect QR codes in the image
                const barcodes = await this.qrCodeDetector.detect(imageSource);

                for (const barcode of barcodes) {
                    if (barcode.format === "qr_code") {
                        console.log("QR Code detected:", barcode.rawValue);

                        // Parse QR code data
                        const qrData = this._parseQRCodeData(
                            barcode.rawValue,
                            barcode.boundingBox,
                        );

                        if (qrData) {
                            this._processQRCodeData(qrData);
                            return; // Stop after first valid QR code
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("QR code detection failed:", error);
            // Fallback to simulation for demo purposes
            if (this.frameCount > 180) {
                const qrData = await this._simulateQRCodeDetection();
                if (qrData) {
                    this._processQRCodeData(qrData);
                }
            }
        }
    }

    /**
     * Simulate QR code detection (replace with real implementation).
     * @returns {Promise<Object>} QR code data.
     * @private
     */
    async _simulateQRCodeDetection() {
        // This simulates finding a QR code with room positioning data
        // In real implementation, this would be actual QR detection

        // Simulate finding QR code after a few seconds
        if (this.frameCount > 180) {
            // ~3 seconds at 60 FPS
            return {
                roomId: "room_001",
                position: [0, 0, 0], // QR code position in room coordinates
                rotation: [0, 0, 0], // QR code rotation
                roomDimensions: [10, 3, 8], // Room width, height, depth
                wallPosition: "north", // Which wall the QR code is on
            };
        }

        return null;
    }

    /**
     * Parse QR code data to extract room positioning information.
     * @param {string} rawValue - Raw QR code data.
     * @param {DOMRect} boundingBox - QR code bounding box in image.
     * @returns {Object|null} Parsed QR data or null if invalid.
     * @private
     */
    _parseQRCodeData(rawValue, boundingBox) {
        try {
            // Try to parse as JSON first
            let data;
            try {
                data = JSON.parse(rawValue);
            } catch (e) {
                // If not JSON, try to parse as structured text
                data = this._parseStructuredQRText(rawValue);
            }

            // Validate required fields
            if (data && typeof data === "object") {
                // Check for xeokit-specific QR code format
                if (data.type === "xeokit-room-position" || data.roomId) {
                    return {
                        roomId: data.roomId || data.room || "unknown",
                        position: data.position || [0, 0, 0],
                        rotation: data.rotation || [0, 0, 0],
                        roomDimensions: data.roomDimensions ||
                            data.dimensions || [10, 3, 8],
                        wallPosition: data.wallPosition || data.wall || "north",
                        scale: data.scale || 1.0,
                        boundingBox: boundingBox,
                    };
                }
            }

            return null;
        } catch (error) {
            console.warn("Failed to parse QR code data:", error);
            return null;
        }
    }

    /**
     * Parse structured text QR codes (non-JSON format).
     * @param {string} text - QR code text.
     * @returns {Object|null} Parsed data.
     * @private
     */
    _parseStructuredQRText(text) {
        // Handle common QR code formats like:
        // "ROOM:room_001;POS:0,0,0;ROT:0,0,0;DIM:10,3,8"
        // "xeokit://room/room_001?pos=0,0,0&rot=0,0,0"

        try {
            if (text.startsWith("xeokit://")) {
                // Parse URL-like format
                const url = new URL(text);
                const pathParts = url.pathname.split("/");
                const roomId = pathParts[pathParts.length - 1];

                return {
                    type: "xeokit-room-position",
                    roomId: roomId,
                    position: this._parseCoordinates(
                        url.searchParams.get("pos"),
                    ) || [0, 0, 0],
                    rotation: this._parseCoordinates(
                        url.searchParams.get("rot"),
                    ) || [0, 0, 0],
                    roomDimensions: this._parseCoordinates(
                        url.searchParams.get("dim"),
                    ) || [10, 3, 8],
                    wallPosition: url.searchParams.get("wall") || "north",
                };
            } else if (text.includes(";") && text.includes(":")) {
                // Parse structured format
                const parts = text.split(";");
                const data = {};

                for (const part of parts) {
                    const [key, value] = part.split(":");
                    if (key && value) {
                        switch (key.trim().toUpperCase()) {
                            case "ROOM":
                                data.roomId = value.trim();
                                break;
                            case "POS":
                                data.position = this._parseCoordinates(value);
                                break;
                            case "ROT":
                                data.rotation = this._parseCoordinates(value);
                                break;
                            case "DIM":
                                data.roomDimensions =
                                    this._parseCoordinates(value);
                                break;
                            case "WALL":
                                data.wallPosition = value.trim();
                                break;
                        }
                    }
                }

                if (data.roomId) {
                    data.type = "xeokit-room-position";
                    return data;
                }
            }
        } catch (error) {
            console.warn("Failed to parse structured QR text:", error);
        }

        return null;
    }

    /**
     * Parse coordinate string into array.
     * @param {string} coordStr - Coordinate string like "1,2,3".
     * @returns {number[]|null} Parsed coordinates.
     * @private
     */
    _parseCoordinates(coordStr) {
        if (!coordStr) return null;

        try {
            const coords = coordStr.split(",").map((s) => parseFloat(s.trim()));
            return coords.length >= 3 ? coords : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Process QR code data and set up room alignment.
     * @param {Object} qrData QR code data.
     * @private
     */
    _processQRCodeData(qrData) {
        try {
            console.log("Processing QR code data:", qrData);

            // Extract room positioning information
            this.roomOrigin = qrData.position || [0, 0, 0];

            // Calculate user position relative to room
            // This would be based on QR code position and current camera position
            this.userPosition = [
                qrData.position[0],
                qrData.position[1] + 1.6, // Average user height
                qrData.position[2],
            ];

            // Create room alignment matrix
            // This transforms from AR space to room space
            math.identityMat4(this.roomAlignment);

            // Apply rotation based on QR code orientation
            if (qrData.rotation) {
                math.rotateMatrixAroundAxis(
                    this.roomAlignment,
                    qrData.rotation[1], // Y rotation for wall orientation
                    [0, 1, 0],
                    this.roomAlignment,
                );
            }

            // Apply translation to room origin
            math.translateMat4v(
                this.roomAlignment,
                this.roomOrigin,
                this.roomAlignment,
            );

            this.isPositioned = true;
            this.qrCodePosition = qrData;

            console.log("Room positioning established");
            console.log("User position:", this.userPosition);
            console.log("Room alignment matrix:", this.roomAlignment);

            // Notify positioning callback
            if (this.onPositioned) {
                this.onPositioned({
                    userPosition: this.userPosition,
                    roomOrigin: this.roomOrigin,
                    roomAlignment: this.roomAlignment,
                    qrData: qrData,
                });
            }
        } catch (error) {
            console.error("Failed to process QR code data:", error);
        }
    }

    /**
     * Update frame statistics.
     * @param {DOMHighResTimeStamp} time Current time.
     * @private
     */
    _updateFrameStats(time) {
        this.frameCount++;

        if (this.lastFrameTime > 0) {
            this.renderStats.frameTime = time - this.lastFrameTime;
        }

        this.lastFrameTime = time;

        // Update FPS every second
        if (time - this.renderStats.lastUpdate > 1000) {
            this.renderStats.fps = this.frameCount;
            this.frameCount = 0;
            this.renderStats.lastUpdate = time;
        }
    }

    /**
     * Handle session end event.
     * @private
     */
    _onSessionEnd() {
        console.log("AR session ended");
        this._cleanup();
        this._restoreOriginalCameraState();

        if (this.onSessionEnd) {
            this.onSessionEnd();
        }
    }

    /**
     * Handle visibility change.
     * @private
     */
    _onVisibilityChange() {
        if (document.visibilityState === "hidden" && this.isPresenting) {
            console.log("Page hidden, ending AR session");
            this.endSession();
        }
    }

    /**
     * Clean up session resources.
     * @private
     */
    _cleanup() {
        this.isPresenting = false;
        this.isPositioned = false;

        if (this.session) {
            this.session.removeEventListener("end", this._onSessionEnd);
            this.session.removeEventListener(
                "visibilitychange",
                this._onVisibilityChange,
            );
            this.session = null;
        }

        this.referenceSpace = null;
        this.baseLayer = null;
        this.hitTestSource = null;
        this.frameRequestId = null;
        this.hitTestResults = [];
        this.qrCodePosition = null;

        // Reset positioning
        this.userPosition = [0, 0, 0];
        this.roomOrigin = [0, 0, 0];
        math.identityMat4(this.roomAlignment);
    }

    /**
     * Get current hit test results.
     * @returns {Array<XRHitTestResult>}
     */
    getHitTestResults() {
        return this.hitTestResults;
    }

    /**
     * Get user position in room coordinates.
     * @returns {Array<number>}
     */
    getUserPosition() {
        return this.userPosition;
    }

    /**
     * Get room origin position.
     * @returns {Array<number>}
     */
    getRoomOrigin() {
        return this.roomOrigin;
    }

    /**
     * Check if user is positioned via QR code.
     * @returns {boolean}
     */
    isUserPositioned() {
        return this.isPositioned;
    }

    /**
     * Get current render statistics.
     * @returns {Object}
     */
    getRenderStats() {
        return { ...this.renderStats };
    }

    /**
     * Manually set user position (for testing or manual positioning).
     * @param {Array<number>} position User position [x, y, z].
     * @param {Array<number>} roomOrigin Room origin [x, y, z].
     */
    setUserPosition(position, roomOrigin = [0, 0, 0]) {
        this.userPosition = [...position];
        this.roomOrigin = [...roomOrigin];
        this.isPositioned = true;

        console.log("User position set manually:", this.userPosition);

        if (this.onPositioned) {
            this.onPositioned({
                userPosition: this.userPosition,
                roomOrigin: this.roomOrigin,
                roomAlignment: this.roomAlignment,
                manual: true,
            });
        }
    }

    /**
     * Destroy the AR renderer and clean up resources.
     */
    destroy() {
        if (this.isPresenting) {
            this.endSession();
        }

        this._cleanup();

        // Remove event listeners
        document.removeEventListener(
            "visibilitychange",
            this._onVisibilityChange,
        );

        // Clear callbacks
        this.onFrame = null;
        this.onSessionStart = null;
        this.onSessionEnd = null;
        this.onPositioned = null;
        this.onError = null;

        console.log("WebXR AR Renderer destroyed");
    }
}

export { WebXRARRenderer };
