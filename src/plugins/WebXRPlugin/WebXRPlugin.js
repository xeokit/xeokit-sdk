import {Plugin} from "../../viewer/Plugin.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
/**
 * {@link Viewer} plugin that provides WebXR Augmented Reality (AR) functionality.
 *
 * ## Usage
 *
 * ````JavaScript````
 * import {Viewer, XKTLoaderPlugin, WebXRPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const webXR = new WebXRPlugin(viewer, {
 *     modelId: "myModel"  // ID of the model to place in AR
 * });
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "../assets/models/xkt/Schependomlaan.xkt",
 *     edges: true
 * });
 *
 * // Start AR when model is loaded
 * model.on("loaded", () => {
 *     webXR.setModel(model);
 * });
 * ````
 */
class WebXRPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="WebXR"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.modelId] ID of the model to place in AR.
     */
    constructor(viewer, cfg, cfgIOS = {}) {

        cfg = cfg || {};

        super("WebXR", viewer, cfg);

        this._modelId = cfg.modelId;

        this.isIOS = this._detectIOS();
        this.isSafari = this._detectSafari();
        this.iosVersion = this._getIOSVersion();

        this.quickLookSupported = this._checkQuickLookSupport();

        this._iosSrc = cfgIOS.iosSrc;
        this._model = null;
        this._arLink = null;
        this._xrSession = null;
        this._xrRefSpace = null;
        this._xrHitTestSource = null;
        this._xrViewerSpace = null;
        this._xrGlContext = null;
        this._isARMode = false;
        this._previewMesh = null;
        this._placedMeshes = [];
        this._originalScene = viewer.scene;
        this._startARButton = null;
        this._arOverlay = null;
        this._closeARButton = null;

        if (this._iosSrc && this.quickLookSupported) {
            this.warn("Check if quick look is supported on this device/browser");

            this._createUIForQuickLook();
        } else {
            if (!navigator.xr) {
                this.warn("WebXR not supported on this device/browser");
                return;
            }

            this._createUI();
            this._setupEventListeners();
        }
    }

    /**
     * Sets the model to be used in AR mode.
     * @param model
     */
    setModel(model) {
        this._model = model;
        this._modelId = model.id;
        if (this._startARButton) {
            this._startARButton.disabled = false;
        }
    }

    /**
     * Detect if running on iOS device.
     * @returns {Boolean}
     * @private
     */
    _detectIOS() {
        return (
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        );
    }

    /**
     * Detect if running on Safari browser.
     * @returns {Boolean}
     * @private
     */
    _detectSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    /**
     * Get iOS version information.
     * @returns {Object|null} Version object with major, minor, patch properties.
     * @private
     */
    _getIOSVersion() {
        if (!this.isIOS) {
            return null;
        }

        const userAgent = navigator.userAgent;
        let match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);

        if (!match) {
            match = userAgent.match(/Version\/(\d+)\.(\d+)\.?(\d+)?/);
        }

        if (match) {
            return {
                major: parseInt(match[1], 10),
                minor: parseInt(match[2], 10),
                patch: parseInt(match[3] || "0", 10),
                toString: function () {
                    return `${this.major}.${this.minor}.${this.patch}`;
                },
            };
        }

        return null;
    }

    /**
     * Check if iOS Quick Look AR is supported.
     * @returns {Boolean}
     * @private
     */
    _checkQuickLookSupport() {
        if (!this.isIOS) {
            return false;
        }

        if (this.iosVersion && this.iosVersion.major >= 12) {
            return (
                "ontouchstart" in window &&
                navigator.maxTouchPoints > 0 &&
                window.DeviceMotionEvent !== undefined
            );
        }

        return false;
    }

    /**
     * Check if device supports ARKit (more comprehensive check).
     * @returns {Boolean}
     */
    _supportsARKit() {
        if (!this.isIOS || !this.iosVersion) {
            return false;
        }

        const minVersion = { major: 11, minor: 0 };

        if (
            this.iosVersion.major > minVersion.major ||
            (this.iosVersion.major === minVersion.major &&
                this.iosVersion.minor >= minVersion.minor)
        ) {
            const userAgent = navigator.userAgent;

            const unsupportedDevices = [
                "iPhone6,1",
                "iPhone6,2", // iPhone 5s, 5c
                "iPhone7,1",
                "iPhone7,2", // iPhone 6, 6 Plus (some variants)
                "iPad4,1",
                "iPad4,2",
                "iPad4,3", // iPad Air (1st gen, some variants)
                "iPad2,",
                "iPad3,",
                "iPad4,", // Older iPads
            ];

            return !unsupportedDevices.some((device) => userAgent.includes(device));
        }

        return false;
    }

    /**
     * Get device capabilities for Quick Look.
     * @returns {Object} Device capability information.
     */
    _getDeviceCapabilities() {
        return {
            isIOS: this.isIOS,
            isSafari: this.isSafari,
            iosVersion: this.iosVersion,
            quickLookSupported: this.quickLookSupported,
            arkitSupported: this._supportsARKit(),
            maxTouchPoints: navigator.maxTouchPoints,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceMemory: navigator.deviceMemory || "unknown",
            hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
        };
    }

    _checkIfQuickLookSupported() {
        const capabilities = this._getDeviceCapabilities();
        console.log({capabilities});

        return capabilities.quickLookSupported;
    }

    _createUIForQuickLook() {
        this.warn("iOS quick look is supported on this device/browser");

        this._arLink = document.createElement("a");
        this._arLink.href = this._iosSrc;
        this._arLink.rel = "ar";
        this._arLink.innerHTML = "Start AR";
        this._arLink.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            padding: 12px 24px;
            background: #000000;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            text-decoration: none;
        `;

        const img = document.createElement("img");
        img.src = "";
        this._arLink.appendChild(img);
        document.body.appendChild(this._arLink);
    }

    _createUI() {
        this._startARButton = document.createElement("button");
        this._startARButton.innerHTML = "Start AR";
        this._startARButton.disabled = true;
        this._startARButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            padding: 12px 24px;
            background: #000000;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: none;
            -moz-user-select:none;
            -ms-user-select:none;
            -webkit-user-select:none;
            user-select: none;
        `;

        this._arOverlay = document.createElement("div");
        this._arOverlay.style.cssText = `
            position: absolute;
            -moz-user-select:none;
            -ms-user-select:none;
            -webkit-user-select:none;
            user-select: none;
            user-select: none;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            pointer-events: auto;
        `;

        this._closeARButton = document.createElement("a");
        this._closeARButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="padding:10px;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
        this._closeARButton.style.cssText = `
            position: absolute;
            -moz-user-select:none;
            -ms-user-select:none;
            -webkit-user-select:none;
            user-select: none;
            top: 20px;
            right: 20px;
            width: 44px;
            height: 44px;
            background: rgba(0, 0, 0, 0.70);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: block;
        `;

        this._closeARButton.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

        this._closeARButton.addEventListener("selectstart", (e) => {
            e.preventDefault();
        });

        this._arOverlay.appendChild(this._closeARButton);

        this._arOverlay.style.display = 'none';

        document.body.appendChild(this._startARButton);
        document.body.appendChild(this._arOverlay);

        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                this._startARButton.enabled = supported;
            });

            this._startARButton.style.display = "block";
            if (this._modelId) {
                console.log("disabled false");
                this._startARButton.disabled = false;
            } else {
                this._startARButton.disabled = true;
            }
        } else {
            if (this.quickLookSupported) {
                console.log("disabled false2");
                this._startARButton.disabled = false;
            } else {
                this._startARButton.disabled = true;
            }
        }
    }

    _setupEventListeners() {
        this._startARButton.addEventListener("click", () => {
            this._startARSession();
        });

        this._closeARButton.addEventListener("click", () => {
            this._endARSession();
        });

        this._arOverlay.addEventListener("click", (event) => {
            if (this._isARMode) {
                this._performHitTestAtScreenPosition(event);
            }
        });
    }

    async _startARSession() {
        try {
            const sessionInit = {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: {
                    root: this._arOverlay
                }
            };

            this._xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);

            try {
                this._xrRefSpace = await this._xrSession.requestReferenceSpace('unbounded');
            } catch (error) {
                console.warn('Unbounded reference space not supported, using local:', error);
                this._xrRefSpace = await this._xrSession.requestReferenceSpace('local');
            }

            this._xrViewerSpace = await this._xrSession.requestReferenceSpace('viewer');

            try {
                this._xrHitTestSource = await this._xrSession.requestHitTestSource({
                    space: this._xrViewerSpace
                });
            } catch (error) {
                console.warn('Hit test source creation failed:', error);
                this._xrHitTestSource = null;
            }

            const canvas = this.viewer.scene.canvas.canvas;
            let gl = this.viewer.scene.canvas.gl;

            if (!gl) {
                throw new Error('WebGL context not available');
            }

            let xrCompatible = false;
            if (gl.makeXRCompatible) {
                try {
                    xrCompatible = await gl.makeXRCompatible();
                } catch (error) {
                    this.warn('Failed to make existing WebGL context XR-compatible: ' + error.message);
                    xrCompatible = false;
                }
            }

            if (!xrCompatible) {
                this.log('Attempting to create new XR-compatible WebGL context...');

                const xrContextNames = ['webgl2', 'webgl', 'experimental-webgl'];
                let newGl = null;

                for (const contextName of xrContextNames) {
                    try {
                        newGl = canvas.getContext(contextName, {
                            xrCompatible: true,
                            alpha: true,
                            antialias: true,
                            depth: true,
                            stencil: true,
                            premultipliedAlpha: false,
                            preserveDrawingBuffer: false
                        });
                        if (newGl) {
                            this.log('Successfully created new XR-compatible WebGL context using ' + contextName);
                            gl = newGl;
                            xrCompatible = true;
                            break;
                        }
                    } catch (error) {
                        this.warn('Failed to create ' + contextName + ' context: ' + error.message);
                    }
                }

                if (!xrCompatible) {
                    throw new Error('Unable to create XR-compatible WebGL context. WebXR may not be supported on this device/browser, or the current WebGL context configuration is incompatible.');
                }
            }

            const xrGlLayer = new XRWebGLLayer(this._xrSession, gl);
            this._xrSession.updateRenderState({
                baseLayer: xrGlLayer
            });

            this._xrGlContext = gl;
            this.viewer.scene.canvas.canvas.style.display = 'none';
            this._arOverlay.style.display = 'block';
            this._startARButton.style.display = 'none';

            this._isARMode = true;

            this._xrSession.requestAnimationFrame(this._onXRFrame.bind(this));

            this.fire("arStarted");

        } catch (error) {
            this.error("Failed to start AR session: " + error.message);
        }
    }

    _endARSession() {
        if (this._xrSession) {
            this._xrSession.end();
            this._xrSession = null;
            this._xrHitTestSource = null;
            this._xrGlContext = null;
        }

        this.viewer.scene.canvas.canvas.style.display = 'block';
        this._arOverlay.style.display = 'none';
        this._startARButton.style.display = 'block';
        this._isARMode = false;

        if (this._previewMesh) {
            this._previewMesh.destroy();
            this._previewMesh = null;
        }

        this.fire("arEnded");
    }

    _onXRFrame(time, frame) {
        if (!this._xrSession || !this._isARMode) {
            return;
        }

        const session = this._xrSession;
        const pose = frame.getViewerPose(this._xrRefSpace);

        if (pose) {
            this._updateCameraFromXR(pose);
            this.viewer.scene.render(true);

            if (this._xrHitTestSource) {
                const hitTestResults = frame.getHitTestResults(this._xrHitTestSource);

                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    console.log('_onXRFrame', {hit});
                    const hitPose = hit.getPose(this._xrRefSpace);

                    this._updateModelPreview(hitPose);
                } else {
                    if (this._previewMesh) {
                        this._previewMesh.visible = false;
                    }
                }
            }
        }

        session.requestAnimationFrame(this._onXRFrame.bind(this));
    }

    _updateCameraFromXR(pose) {
        const camera = this.viewer.scene.camera;
        const transform = pose.transform;
        const eye = [
            transform.position.x,
            transform.position.y,
            transform.position.z
        ];

        const orientation = transform.orientation;
        const matrix = [
            1 - 2 * (orientation.y * orientation.y + orientation.z * orientation.z), 2 * (orientation.x * orientation.y - orientation.z * orientation.w), 2 * (orientation.x * orientation.z + orientation.y * orientation.w), 0,
            2 * (orientation.x * orientation.y + orientation.z * orientation.w), 1 - 2 * (orientation.x * orientation.x + orientation.z * orientation.z), 2 * (orientation.y * orientation.z - orientation.x * orientation.w), 0,
            2 * (orientation.x * orientation.z - orientation.y * orientation.w), 2 * (orientation.y * orientation.z + orientation.x * orientation.w), 1 - 2 * (orientation.x * orientation.x + orientation.y * orientation.y), 0,
            0, 0, 0, 1
        ];

        const forward = [
            matrix[8],  // -Z direction in camera space
            matrix[9],
            matrix[10]
        ];

        // Calculate up direction
        const up = [
            matrix[4],  // Y direction in camera space
            matrix[5],
            matrix[6]
        ];

        const look = [
            eye[0] + forward[0],
            eye[1] + forward[1],
            eye[2] + forward[2]
        ];

        camera.eye = eye;
        camera.look = look;
        camera.up = up;
    }

    _updateModelPreview(hitPose) {
        if (!this._model) return;

        if (!this._previewMesh) {
            this._previewMesh = this._createPreviewMesh();
        }

        if (this._previewMesh) {
            const position = hitPose.transform.position;
            const orientation = hitPose.transform.orientation;

            this._previewMesh.position = [position.x, position.y, position.z];
            // this._previewMesh.rotation = [orientation.x, orientation.y, orientation.z, orientation.w];

            this._previewMesh.visible = true;
        }
    }

    _createPreviewMesh() {
        if (!this._model) return null;

        const scene = this.viewer.scene;

        const geometry = {
            primitive: "triangles",
            positions: [
                // Front face
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
                -0.5, 0.5, 0.5,
                // Back face
                -0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                0.5, 0.5, -0.5,
                0.5, -0.5, -0.5,
                // Top face
                -0.5, 0.5, -0.5,
                -0.5, 0.5, 0.5,
                0.5, 0.5, 0.5,
                0.5, 0.5, -0.5,
                // Bottom face
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, 0.5,
                -0.5, -0.5, 0.5,
                // Right face
                0.5, -0.5, -0.5,
                0.5, 0.5, -0.5,
                0.5, 0.5, 0.5,
                0.5, -0.5, 0.5,
                // Left face
                -0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                -0.5, 0.5, 0.5,
                -0.5, 0.5, -0.5
            ],
            indices: [
                0, 1, 2, 0, 2, 3,       // front
                4, 5, 6, 4, 6, 7,       // back
                8, 9, 10, 8, 10, 11,    // top
                12, 13, 14, 12, 14, 15, // bottom
                16, 17, 18, 16, 18, 19, // right
                20, 21, 22, 20, 22, 23  // left
            ]
        };

        const material = {
            diffuse: [0.8, 0.8, 0.8],
            alpha: 0.7
        };

        return new Mesh(scene, {
            geometry: geometry,
            material: material,
            visible: false
        });
    }

    async _performHitTestAtScreenPosition(event) {
        console.log('Tap detected, attempting to place model');

        if (this._previewMesh && this._previewMesh.visible) {
            console.log('Placing model at preview position:', this._previewMesh.position);
            this._placeModel(event);
        } else {
            console.log('No preview mesh available for placement');
        }
    }

    _placeModel(event) {
        if (!this._previewMesh || !this._previewMesh.visible) return;

        const placedMesh = this._createPlacedMesh(this._previewMesh.position);

        if (placedMesh) {
            this._placedMeshes.push(placedMesh);
            this.fire("modelPlaced", {
                position: this._previewMesh.position,
                mesh: placedMesh
            });
        }
    }

    _createPlacedMesh(position) {
        if (!this._model) return null;

        const scene = this.viewer.scene;

        const geometry = {
            primitive: "triangles",
            positions: [
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
                -0.5, 0.5, 0.5,
                -0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                0.5, 0.5, -0.5,
                0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                -0.5, 0.5, 0.5,
                0.5, 0.5, 0.5,
                0.5, 0.5, -0.5,
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, 0.5,
                -0.5, -0.5, 0.5,
                0.5, -0.5, -0.5,
                0.5, 0.5, -0.5,
                0.5, 0.5, 0.5,
                0.5, -0.5, 0.5,
                -0.5, -0.5, -0.5,
                -0.5, -0.5, 0.5,
                -0.5, 0.5, 0.5,
                -0.5, 0.5, -0.5
            ],
            indices: [
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15,
                16, 17, 18, 16, 18, 19,
                20, 21, 22, 20, 22, 23
            ]
        };

        const material = {
            diffuse: [0.2, 0.8, 0.2],
            alpha: 1.0
        };

        return new Mesh(scene, {
            geometry: geometry,
            material: material,
            position: position,
            visible: true
        });
    }

    /**
     * Destroys this WebXRPlugin.
     */
    destroy() {
        this._endARSession();

        if (this._startARButton) {
            document.body.removeChild(this._startARButton);
        }
        if (this._closeARButton) {
            document.body.removeChild(this._closeARButton);
        }
        if (this._arOverlay) {
            document.body.removeChild(this._arOverlay);
        }

        if (this._previewMesh) {
            this._previewMesh.destroy();
        }

        this._placedMeshes.forEach(mesh => mesh.destroy());

        super.destroy();
    }
}

export {WebXRPlugin};
