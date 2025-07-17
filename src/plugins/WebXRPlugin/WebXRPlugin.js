import { Plugin } from "../../viewer/Plugin.js";
import { math } from "../../viewer/scene/math/math.js";
import { WebXRSessionManager } from "./WebXRSessionManager.js";
import { WebXRInteractionUtils } from "./WebXRInteractionUtils.js";
import { WebXRButton } from "./WebXRButton.js";
import { IOSQuickLookUtils } from "./IOSQuickLookUtils.js";
import { WebXRARRenderer } from "./WebXRARRenderer.js";
import { QRCodePositioning } from "./QRCodePositioning.js";

/**
 * {@link Viewer} plugin that enables WebXR Augmented Reality functionality.
 *
 * This plugin provides AR capabilities to xeokit-sdk, allowing users to view 3D models
 * in augmented reality using WebXR-compatible devices and browsers.
 *
 * ## Features
 *
 * * WebXR session management for immersive AR experiences
 * * AR button UI with customizable styling
 * * Hit testing for model placement in real-world coordinates
 * * Integration with xeokit's camera and rendering system
 * * Fallback detection for unsupported devices
 * * Controller input handling for AR interactions
 *
 * ## Usage
 *
 * ````javascript
 * import {Viewer, WebXRPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * const webxr = new WebXRPlugin(viewer, {
 *     buttonText: "View in AR",
 *     buttonEnabled: true
 * });
 *
 * // Load a model first
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/myModel.gltf"
 * });
 *
 * model.on("loaded", () => {
 *     webxr.supported.then(() => {
 *         console.log("WebXR AR is supported!");
 *     }).catch(() => {
 *         console.log("WebXR AR is not supported");
 *     });
 * });
 * ````
 *
 * @class WebXRPlugin
 */
class WebXRPlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg Plugin configuration.
     * @param {String} [cfg.id="WebXR"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.buttonText="AR"] Text for the AR button.
     * @param {Boolean} [cfg.buttonEnabled=true] Whether the AR button is initially enabled.
     * @param {String} [cfg.buttonId] Optional ID for the AR button element.
     * @param {HTMLElement} [cfg.buttonElement] Optional existing HTML button element to use.
     * @param {Boolean} [cfg.autoHideButton=true] Whether to auto-hide the AR button when AR is not supported.
     * @param {String} [cfg.referenceSpace="local-floor"] WebXR reference space type.
     * @param {Boolean} [cfg.hitTestEnabled=true] Whether to enable hit testing for model placement.
     * @param {Number[]} [cfg.modelScale=[1,1,1]] Scale to apply to models in AR space.
     * @param {String} [cfg.iosSrc] URL to USDZ file for iOS Quick Look AR fallback.
     * @param {Boolean} [cfg.iosQuickLookEnabled=true] Whether to enable iOS Quick Look fallback.
     * @param {String[]} [cfg.arModes=["webxr", "quick-look"]] AR modes to support.
     * @param {Boolean} [cfg.qrPositioningEnabled=true] Whether to enable QR code positioning.
     * @param {Array} [cfg.roomOrigin=[0,0,0]] Default room origin position.
     * @param {Array} [cfg.roomDimensions=[10,3,8]] Default room dimensions [width, height, depth].
     * @param {Function} [cfg.onSessionStart] Callback fired when AR session starts.
     * @param {Function} [cfg.onSessionEnd] Callback fired when AR session ends.
     * @param {Function} [cfg.onUserPositioned] Callback fired when user position is established.
     */
    constructor(viewer, cfg = {}) {
        super("WebXR", viewer, cfg);

        this._buttonText = cfg.buttonText || "AR";
        this._buttonEnabled = cfg.buttonEnabled !== false;
        this._buttonId = cfg.buttonId;
        this._buttonElement = cfg.buttonElement;
        this._autoHideButton = cfg.autoHideButton !== false;
        this._referenceSpace = cfg.referenceSpace || "local-floor";
        this._hitTestEnabled = cfg.hitTestEnabled !== false;
        this._modelScale = cfg.modelScale || [1, 1, 1];
        this._iosSrc = cfg.iosSrc;
        this._iosQuickLookEnabled = cfg.iosQuickLookEnabled !== false;
        this._arModes = cfg.arModes || ["webxr", "quick-look"];
        this._qrPositioningEnabled = cfg.qrPositioningEnabled !== false;
        this._roomOrigin = cfg.roomOrigin || [0, 0, 0];
        this._roomDimensions = cfg.roomDimensions || [10, 3, 8];
        this._onSessionStart = cfg.onSessionStart;
        this._onSessionEnd = cfg.onSessionEnd;
        this._onUserPositioned = cfg.onUserPositioned;

        this._supported = false;
        this._sessionManager = null;
        this._interactionUtils = null;
        this._iosUtils = null;
        this._arRenderer = null;
        this._qrPositioning = null;

        // UI elements
        this._arButton = null;

        // iOS/Safari specific
        this._isIOS = this._detectIOS();
        this._isSafari = this._detectSafari();
        this._quickLookSupported = false;

        // Positioning and room alignment
        this._isUserPositioned = false;
        this._userPosition = [0, 0, 0];
        this._currentRoom = null;

        // Initialize asynchronously
        this._initializeAsync();
    }

    /**
     * Gets whether WebXR AR is supported on this device/browser.
     * @returns {Promise} Promise that resolves if supported, rejects if not.
     */
    get supported() {
        return this._checkSupport();
    }

    /**
     * Gets whether an AR session is currently active.
     * @returns {Boolean}
     */
    get isPresenting() {
        return this._arRenderer ? this._arRenderer.isPresenting : false;
    }

    /**
     * Gets the current WebXR session, if any.
     * @returns {XRSession|null}
     */
    get session() {
        return this._arRenderer ? this._arRenderer.session : null;
    }

    /**
     * Gets the AR button element.
     * @returns {HTMLElement|null}
     */
    get buttonElement() {
        return this._arButton ? this._arButton.getElement() : null;
    }

    /**
     * Sets whether the AR button is enabled.
     * @param {Boolean} enabled
     */
    set buttonEnabled(enabled) {
        this._buttonEnabled = enabled;
        if (this._arButton) {
            this._arButton.setEnabled(enabled);
        }
    }

    /**
     * Gets whether the AR button is enabled.
     * @returns {Boolean}
     */
    get buttonEnabled() {
        return this._buttonEnabled;
    }

    /**
     * Initialize the plugin asynchronously.
     * @private
     */
    async _initializeAsync() {
        try {
            await this._init();
        } catch (error) {
            console.error("Failed to initialize WebXR plugin:", error);
            this._supported = false;
            if (this._autoHideButton && this._arButton) {
                this._arButton.setVisible(false);
            }
            this.fire("unsupported", { error });
        }
    }

    /**
     * Initialize the plugin.
     * @private
     */
    async _init() {
        // Initialize AR renderer with proper session management
        this._arRenderer = new WebXRARRenderer(this.viewer, {
            referenceSpace: this._referenceSpace,
            hitTestEnabled: this._hitTestEnabled,
        });

        // Wait for AR renderer to be fully initialized
        await this._arRenderer.init();

        // Initialize QR positioning if enabled
        if (this._qrPositioningEnabled) {
            this._qrPositioning = new QRCodePositioning({
                roomOrigin: this._roomOrigin,
                roomDimensions: this._roomDimensions,
            });
        }

        this._interactionUtils = new WebXRInteractionUtils(
            this.viewer,
            this._arRenderer,
        );

        this._iosUtils = new IOSQuickLookUtils();

        this._createARButton();
        this._setupEventHandlers();

        try {
            await this._checkSupport();
            this._supported = true;
            if (this._arButton) {
                this._arButton.setSupported(true);
                this._arButton.setVisible(true);
            }
            this.fire("supported", {});
        } catch (error) {
            this._supported = false;
            if (this._autoHideButton && this._arButton) {
                this._arButton.setVisible(false);
            }
            this.fire("unsupported", {});
        }
    }

    /**
     * Check if WebXR AR is supported.
     * @returns {Promise}
     * @private
     */
    async _checkSupport() {
        // Check for iOS Quick Look support first
        if (
            this._isIOS &&
            this._iosQuickLookEnabled &&
            this._arModes.includes("quick-look")
        ) {
            this._quickLookSupported = this._iosUtils.quickLookSupported;
            if (this._quickLookSupported && this._iosSrc) {
                return true;
            }
        }

        // Check WebXR support
        if (!navigator.xr) {
            throw new Error("WebXR not available");
        }

        if (!this._arModes.includes("webxr")) {
            throw new Error("WebXR mode disabled");
        }

        // Use AR renderer's comprehensive support check
        return await this._arRenderer.checkSupport();
    }

    /**
     * Create the AR button.
     * @private
     */
    _createARButton() {
        this._arButton = new WebXRButton({
            id: this._buttonId,
            element: this._buttonElement,
            text: this._buttonText,
            enabled: this._buttonEnabled,
            autoHide: this._autoHideButton,
            onClick: (isARActive) => {
                if (isARActive) {
                    this.stopAR();
                } else {
                    this.startAR();
                }
            },
        });
    }

    /**
     * Start an AR session.
     * @returns {Promise}
     */
    async startAR() {
        if (!this._supported) {
            throw new Error("WebXR AR not supported");
        }

        if (this.isPresenting) {
            this.warn("AR session already active");
            return;
        }

        try {
            // Check for existing session to prevent "already active" error
            if (this.isPresenting) {
                this.warn("AR session already active");
                return;
            }

            // Use iOS Quick Look if available and preferred
            if (this._shouldUseQuickLook()) {
                return this._startQuickLook();
            }

            // Use WebXR with proper session management
            const sessionOptions = {
                hitTestEnabled: this._hitTestEnabled,
                referenceSpace: this._referenceSpace,
                domOverlay: { root: document.body },
            };

            await this._arRenderer.startSession(sessionOptions);

            // Update button
            this._arButton.setARActive(true);

            this.fire("sessionStarted", {
                session: this.session,
                mode: "webxr",
            });

            if (this._onSessionStart) {
                this._onSessionStart(this.session);
            }
        } catch (error) {
            // Handle specific "already active session" error
            if (
                error.message.includes("already an active immersive XRSession")
            ) {
                this.warn(
                    "Another AR session is already active. Please close other AR applications.",
                );
                throw new Error(
                    "Another AR session is active. Close other AR apps and try again.",
                );
            }
            this.error("Failed to start AR session: " + error.message);
            throw error;
        }
    }

    /**
     * Stop the current AR session.
     */
    async stopAR() {
        if (!this.isPresenting) {
            return;
        }

        try {
            await this._arRenderer.endSession();
        } catch (error) {
            this.warn("Error ending AR session: " + error.message);
        }
    }

    /**
     * Set up event handlers for session manager and interaction utils.
     * @private
     */
    _setupEventHandlers() {
        // AR renderer events
        this._arRenderer.onSessionStart = (session) => {
            this._arButton.setARActive(true);
            this.fire("sessionStarted", { session, mode: "webxr" });
            if (this._onSessionStart) {
                this._onSessionStart(session);
            }
        };

        this._arRenderer.onSessionEnd = () => {
            this._arButton.setARActive(false);
            this._isUserPositioned = false;
            this.fire("sessionEnded", { mode: "webxr" });
            if (this._onSessionEnd) {
                this._onSessionEnd();
            }
        };

        this._arRenderer.onFrame = (time, frame, data) => {
            if (this._interactionUtils) {
                this._interactionUtils.update(time, frame, data.hitTestResults);
            }
            this.fire("frame", {
                time,
                frame,
                hitTestResults: data.hitTestResults,
                isPositioned: data.isPositioned,
                userPosition: data.userPosition,
            });
        };

        this._arRenderer.onPositioned = (positionData) => {
            this._isUserPositioned = true;
            this._userPosition = positionData.userPosition;
            this._currentRoom = positionData.qrData;

            this.fire("userPositioned", positionData);
            if (this._onUserPositioned) {
                this._onUserPositioned(positionData);
            }
        };

        this._arRenderer.onError = (error) => {
            this.error("AR renderer error: " + error.message);
        };

        // QR positioning events
        if (this._qrPositioning) {
            this._qrPositioning.onPositioned = (positionData) => {
                this._isUserPositioned = true;
                this._userPosition = positionData.userPosition;
                this._currentRoom = positionData.qrData;

                this.fire("userPositioned", positionData);
                if (this._onUserPositioned) {
                    this._onUserPositioned(positionData);
                }
            };

            this._qrPositioning.onQRDetected = (qrData) => {
                this.fire("qrDetected", { qrData });
            };

            this._qrPositioning.onError = (error) => {
                this.warn("QR positioning error: " + error.message);
            };
        }

        // Interaction utils events
        if (this._interactionUtils) {
            this._interactionUtils.onModelPlaced = (data) => {
                this.fire("modelPlaced", data);
            };

            this._interactionUtils.onHitTest = (position, normal) => {
                this.fire("hitTest", { position, normal });
            };
        }
    }

    /**
     * Gets the most recent hit test results.
     * @returns {Array} Array of XRHitTestResult objects.
     */
    getHitTestResults() {
        return this._arRenderer ? this._arRenderer.getHitTestResults() : [];
    }

    /**
     * Place a model at the first hit test result location.
     * @param {String} modelId The ID of the model to place.
     * @returns {Boolean} True if placement was successful.
     */
    placeModel(modelId) {
        if (!this._interactionUtils) {
            return false;
        }

        const hitTestResults = this.getHitTestResults();
        if (!this.isPresenting || hitTestResults.length === 0) {
            return false;
        }

        const model = this.viewer.scene.models[modelId];
        if (!model) {
            this.warn("Model not found: " + modelId);
            return false;
        }

        return this._interactionUtils.placeModelAt(
            modelId,
            this._interactionUtils.getReticlePosition(),
            {
                scale: this._modelScale,
            },
        );
    }

    /**
     * Enable placement mode for a model.
     * @param {String} modelId The ID of the model to place.
     * @param {Object} options Placement options.
     */
    enablePlacementMode(modelId, options = {}) {
        if (this._interactionUtils) {
            this._interactionUtils.enablePlacementMode(modelId, options);
        }
    }

    /**
     * Disable placement mode.
     */
    disablePlacementMode() {
        if (this._interactionUtils) {
            this._interactionUtils.disablePlacementMode();
        }
    }

    /**
     * Check if placement mode is currently active.
     * @returns {Boolean} True if placement mode is active.
     */
    isPlacementModeActive() {
        return this._interactionUtils
            ? this._interactionUtils.isPlacementModeActive()
            : false;
    }

    /**
     * Get debug information about the current placement state.
     * @returns {Object} Debug information object.
     */
    getDebugInfo() {
        if (!this._interactionUtils) {
            return { error: "Interaction utils not available" };
        }

        return {
            isPresenting: this.isPresenting,
            placementMode: this._interactionUtils.placementMode,
            selectedModelId: this._interactionUtils.selectedModelId,
            reticleVisible: this._interactionUtils.reticleVisible,
            reticlePosition: this._interactionUtils.reticlePosition,
            hitTestResults: this.getHitTestResults().length,
            hasHitTestMarker: !!this._interactionUtils.hitTestMarker,
            inputHandlersSetup: this._interactionUtils._inputHandlersSetup,
        };
    }

    /**
     * Check if user is positioned via QR code or manual positioning.
     * @returns {Boolean}
     */
    isUserPositioned() {
        return this._isUserPositioned;
    }

    /**
     * Get user position in room coordinates.
     * @returns {Array} User position [x, y, z].
     */
    getUserPosition() {
        return this._userPosition;
    }

    /**
     * Get current room information.
     * @returns {Object|null} Room data from QR code.
     */
    getCurrentRoom() {
        return this._currentRoom;
    }

    /**
     * Manually set user position (for testing or when QR code is not available).
     * @param {Array} position User position [x, y, z].
     * @param {Object} roomData Optional room data.
     */
    setUserPosition(position, roomData = null) {
        this._userPosition = [...position];
        this._isUserPositioned = true;

        if (roomData) {
            this._currentRoom = roomData;
        }

        // Update AR renderer if active
        if (this._arRenderer && this._arRenderer.isPresenting) {
            this._arRenderer.setUserPosition(
                position,
                roomData?.roomOrigin || [0, 0, 0],
            );
        }

        // Update QR positioning if available
        if (this._qrPositioning) {
            this._qrPositioning.setManualPositioning({
                userPosition: position,
                roomOrigin: roomData?.roomOrigin || [0, 0, 0],
                roomDimensions:
                    roomData?.roomDimensions || this._roomDimensions,
                roomId: roomData?.roomId || "manual_room",
            });
        }

        console.log("User position set manually:", position);

        this.fire("userPositioned", {
            userPosition: this._userPosition,
            roomOrigin: roomData?.roomOrigin || [0, 0, 0],
            manual: true,
        });

        if (this._onUserPositioned) {
            this._onUserPositioned({
                userPosition: this._userPosition,
                roomOrigin: roomData?.roomOrigin || [0, 0, 0],
                manual: true,
            });
        }
    }

    /**
     * Reset user positioning.
     */
    resetPositioning() {
        this._isUserPositioned = false;
        this._userPosition = [0, 0, 0];
        this._currentRoom = null;

        if (this._qrPositioning) {
            this._qrPositioning.reset();
        }

        console.log("User positioning reset");
        this.fire("positioningReset", {});
    }

    /**
     * Detect if running on iOS.
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
     * Detect if running on Safari.
     * @returns {Boolean}
     * @private
     */
    _detectSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    /**
     * Check if iOS Quick Look AR is supported.
     * @returns {Boolean}
     * @private
     */
    _checkQuickLookSupport() {
        if (!this._isIOS) {
            return false;
        }

        // Check for iOS 12+ with AR support
        const version = this._getIOSVersion();
        if (version && version.major >= 12) {
            // Check if device supports ARKit (basic heuristic)
            return "ontouchstart" in window && navigator.maxTouchPoints > 0;
        }

        return false;
    }

    /**
     * Get iOS version.
     * @returns {Object|null}
     * @private
     */
    _getIOSVersion() {
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);

        if (match) {
            return {
                major: parseInt(match[1], 10),
                minor: parseInt(match[2], 10),
                patch: parseInt(match[3] || "0", 10),
            };
        }

        return null;
    }

    /**
     * Determine if Quick Look should be used instead of WebXR.
     * @returns {Boolean}
     * @private
     */
    _shouldUseQuickLook() {
        if (!this._quickLookSupported || !this._iosSrc) {
            return false;
        }

        // Use iOS utilities to determine best approach
        if (!this._iosUtils.quickLookSupported) {
            return false;
        }

        // On iOS Safari, prefer Quick Look for better performance
        if (this._isIOS && this._isSafari) {
            // Check if WebXR is in the preferred modes and is actually supported
            const webxrPreferred =
                this._arModes.indexOf("webxr") <
                this._arModes.indexOf("quick-look");
            if (webxrPreferred && navigator.xr) {
                return false; // Use WebXR if preferred and available
            }
            return true; // Use Quick Look as fallback or preference
        }

        return false;
    }

    /**
     * Start iOS Quick Look AR experience.
     * @returns {Promise}
     * @private
     */
    async _startQuickLook() {
        if (!this._iosSrc) {
            throw new Error("iOS source (USDZ) file not specified");
        }

        try {
            // Validate USDZ file
            const isValid = await this._iosUtils.validateUSDZ(this._iosSrc);
            if (!isValid) {
                this.warn("USDZ file validation failed: " + this._iosSrc);
            }

            // Get recommended parameters for the use case
            const recommendedParams =
                this._iosUtils.getRecommendedParams("default");

            // Launch Quick Look with iOS utilities
            const result = await this._iosUtils.launchQuickLook(this._iosSrc, {
                params: recommendedParams,
                callToAction: this._buttonText,
            });

            // Update button state
            this._arButton.setARActive(true);

            // Fire event
            this.fire("sessionStarted", {
                session: null,
                mode: "quick-look",
                url: result.url,
                iosUtils: this._iosUtils.getDeviceCapabilities(),
            });

            if (this._onSessionStart) {
                this._onSessionStart(null);
            }

            // Quick Look doesn't provide session end events, so we simulate it
            setTimeout(() => {
                this._arButton.setARActive(false);

                this.fire("sessionEnded", {
                    mode: "quick-look",
                    url: result.url,
                });

                if (this._onSessionEnd) {
                    this._onSessionEnd();
                }
            }, 1000);
        } catch (error) {
            this.error("Failed to start Quick Look AR: " + error.message);
            throw error;
        }
    }

    /**
     * Set iOS source URL for Quick Look AR.
     * @param {String} url URL to USDZ file.
     */
    setIOSSrc(url) {
        this._iosSrc = url;

        // Cache the USDZ URL if provided
        if (url && this._iosUtils) {
            this._iosUtils.cacheUSDZ("default", url);
        }

        // Re-check support if iOS source is now available
        if (this._isIOS && url && !this._supported) {
            this._checkSupport()
                .then(() => {
                    this._supported = true;
                    if (this._arButton) {
                        this._arButton.setSupported(true);
                        this._arButton.setVisible(true);
                    }
                    this.fire("supported", {});
                })
                .catch(() => {
                    // Keep current state
                });
        }
    }

    /**
     * Get iOS source URL.
     * @returns {String|null}
     */
    getIOSSrc() {
        return this._iosSrc;
    }

    /**
     * Set supported AR modes.
     * @param {String[]} modes Array of supported modes: "webxr", "quick-look".
     */
    setARModes(modes) {
        this._arModes = modes || ["webxr", "quick-look"];

        // Re-check support with new modes
        this._checkSupport()
            .then(() => {
                this._supported = true;
                if (this._arButton) {
                    this._arButton.setSupported(true);
                    this._arButton.setVisible(true);
                }
                this.fire("supported", {});
            })
            .catch(() => {
                this._supported = false;
                if (this._autoHideButton && this._arButton) {
                    this._arButton.setVisible(false);
                }
                this.fire("unsupported", {});
            });
    }

    /**
     * Get supported AR modes.
     * @returns {String[]}
     */
    getARModes() {
        return this._arModes;
    }

    /**
     * Check if Quick Look is supported and available.
     * @returns {Boolean}
     */
    isQuickLookSupported() {
        return this._iosUtils ? this._iosUtils.quickLookSupported : false;
    }

    /**
     * Get iOS device capabilities and Quick Look information.
     * @returns {Object} Device capability information.
     */
    getIOSCapabilities() {
        return this._iosUtils ? this._iosUtils.getDeviceCapabilities() : null;
    }

    /**
     * Create a Quick Look link element for the current iOS source.
     * @param {Object} options Link creation options.
     * @returns {HTMLAnchorElement|null} Quick Look link or null if not supported.
     */
    createQuickLookLink(options = {}) {
        if (!this._iosUtils || !this._iosSrc) {
            return null;
        }

        return this._iosUtils.createQuickLookLink(this._iosSrc, {
            text: options.text || this._buttonText,
            className: options.className,
            style: options.style,
            params: options.params,
        });
    }

    /**
     * Log iOS and Quick Look debug information.
     */
    logIOSDebugInfo() {
        if (this._iosUtils) {
            this._iosUtils.logDebugInfo();
        } else {
            console.log("iOS utilities not initialized");
        }
    }

    /**
     * Destroys this plugin.
     */
    destroy() {
        if (this.isPresenting) {
            this.stopAR();
        }

        if (this._arRenderer) {
            this._arRenderer.destroy();
            this._arRenderer = null;
        }

        if (this._qrPositioning) {
            this._qrPositioning.destroy();
            this._qrPositioning = null;
        }

        if (this._interactionUtils) {
            this._interactionUtils.destroy();
            this._interactionUtils = null;
        }

        if (this._arButton) {
            this._arButton.destroy();
            this._arButton = null;
        }

        if (this._iosUtils) {
            this._iosUtils.destroy();
            this._iosUtils = null;
        }

        super.destroy();
    }
}

export { WebXRPlugin };
