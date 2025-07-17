import {math} from "../../viewer/scene/math/math.js";

/**
 * Utility class for handling WebXR AR interactions like hit testing,
 * model placement, and user input management.
 *
 * @private
 */
class WebXRInteractionUtils {

    /**
     * @constructor
     * @param {Viewer} viewer The xeokit Viewer instance.
     * @param {WebXRSessionManager} sessionManager The XR session manager.
     */
    constructor(viewer, sessionManager) {
        this.viewer = viewer;
        this.sessionManager = sessionManager;

        // Placement state
        this.placementMode = false;
        this.selectedModelId = null;
        this.placementScale = [1, 1, 1];
        this.placementRotation = [0, 0, 0];

        // Hit test visualization
        this.hitTestMarker = null;
        this.showHitTestMarker = true;

        // Input handling
        this.inputSources = new Map();
        this.controllers = new Map();

        // Event callbacks
        this.onModelPlaced = null;
        this.onHitTest = null;
        this.onInputSourcesChange = null;

        // Reticle/cursor for AR placement
        this.reticleVisible = false;
        this.reticlePosition = math.vec3();
        this.reticleNormal = math.vec3([0, 1, 0]);

        this._init();
    }

    /**
     * Initialize interaction utilities.
     * @private
     */
    _init() {
        this._createHitTestMarker();
        this._setupInputHandlers();
    }

    /**
     * Create a visual marker for hit test results.
     * @private
     */
    _createHitTestMarker() {
        if (!this.showHitTestMarker) {
            return;
        }

        // Create a simple ring geometry for the hit test marker
        const scene = this.viewer.scene;

        try {
            // Create a simple circle mesh for the reticle
            this.hitTestMarker = scene.createMesh({
                id: "webxr-hit-marker",
                geometry: scene.createGeometry({
                    id: "webxr-hit-marker-geometry",
                    primitive: "triangles",
                    positions: this._createCirclePositions(0.1, 32),
                    indices: this._createCircleIndices(32)
                }),
                material: scene.createMaterial({
                    id: "webxr-hit-marker-material",
                    ambient: [1, 1, 1],
                    diffuse: [0, 1, 0],
                    emissive: [0, 0.5, 0],
                    alpha: 0.7
                }),
                visible: false,
                pickable: false
            });
        } catch (error) {
            console.warn("Could not create hit test marker:", error);
        }
    }

    /**
     * Create positions for a circle geometry.
     * @param {number} radius Circle radius.
     * @param {number} segments Number of segments.
     * @returns {Float32Array} Vertex positions.
     * @private
     */
    _createCirclePositions(radius, segments) {
        const positions = new Float32Array((segments + 1) * 3);

        // Center vertex
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = 0;

        // Circle vertices
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const idx = (i + 1) * 3;
            positions[idx] = Math.cos(angle) * radius;
            positions[idx + 1] = 0;
            positions[idx + 2] = Math.sin(angle) * radius;
        }

        return positions;
    }

    /**
     * Create indices for a circle geometry.
     * @param {number} segments Number of segments.
     * @returns {Uint16Array} Triangle indices.
     * @private
     */
    _createCircleIndices(segments) {
        const indices = new Uint16Array(segments * 3);

        for (let i = 0; i < segments; i++) {
            const idx = i * 3;
            indices[idx] = 0; // Center vertex
            indices[idx + 1] = i + 1;
            indices[idx + 2] = ((i + 1) % segments) + 1;
        }

        return indices;
    }

    /**
     * Set up input event handlers.
     * @private
     */
    _setupInputHandlers() {
        if (this.sessionManager.session) {
            this.sessionManager.session.addEventListener('inputsourceschange', (event) => {
                this._onInputSourcesChange(event);
            });

            this.sessionManager.session.addEventListener('select', (event) => {
                this._onSelect(event);
            });

            this.sessionManager.session.addEventListener('selectstart', (event) => {
                this._onSelectStart(event);
            });

            this.sessionManager.session.addEventListener('selectend', (event) => {
                this._onSelectEnd(event);
            });
        }
    }

    /**
     * Handle input sources change.
     * @param {XRInputSourcesChangeEvent} event
     * @private
     */
    _onInputSourcesChange(event) {
        // Track added input sources
        for (const inputSource of event.added) {
            this.inputSources.set(inputSource, {
                inputSource: inputSource,
                gamepad: inputSource.gamepad
            });
        }

        // Remove tracked input sources
        for (const inputSource of event.removed) {
            this.inputSources.delete(inputSource);
        }

        if (this.onInputSourcesChange) {
            this.onInputSourcesChange(event);
        }
    }

    /**
     * Handle select event (tap/click in AR).
     * @param {XRInputSourceEvent} event
     * @private
     */
    _onSelect(event) {
        console.log('Select event received - placementMode:', this.placementMode, 'selectedModelId:', this.selectedModelId, 'reticleVisible:', this.reticleVisible);

        if (this.placementMode && this.selectedModelId) {
            console.log('Attempting to place model:', this.selectedModelId);
            this._placeSelectedModel();
        } else {
            console.log('Cannot place model - conditions not met');
        }
    }

    /**
     * Handle select start event.
     * @param {XRInputSourceEvent} event
     * @private
     */
    _onSelectStart(event) {
        // Could be used for drag/hold interactions
    }

    /**
     * Handle select end event.
     * @param {XRInputSourceEvent} event
     * @private
     */
    _onSelectEnd(event) {
        // Could be used for drag/hold interactions
    }

    /**
     * Update interactions for the current frame.
     * @param {DOMHighResTimeStamp} time Current time.
     * @param {XRFrame} frame Current XR frame.
     * @param {Array} hitTestResults Hit test results from session manager.
     */
    update(time, frame, hitTestResults) {
        this._updateHitTestVisualization(hitTestResults);
        this._updateInputSources(frame);
    }

    /**
     * Update hit test visualization.
     * @param {Array} hitTestResults Hit test results.
     * @private
     */
    _updateHitTestVisualization(hitTestResults) {
        if (!this.hitTestMarker) {
            return;
        }

        if (hitTestResults.length > 0) {
            const hitResult = hitTestResults[0];
            const hitPose = hitResult.getPose(this.sessionManager.referenceSpace);

            if (hitPose) {
                // Update reticle position
                this.reticlePosition[0] = hitPose.transform.position.x;
                this.reticlePosition[1] = hitPose.transform.position.y;
                this.reticlePosition[2] = hitPose.transform.position.z;

                // Update reticle normal (assuming Y-up)
                const orientation = hitPose.transform.orientation;
                const rotationMatrix = math.mat4();
                math.quaternionToMat4([
                    orientation.x,
                    orientation.y,
                    orientation.z,
                    orientation.w
                ], rotationMatrix);

                // Extract Y-axis as normal
                this.reticleNormal[0] = rotationMatrix[4];
                this.reticleNormal[1] = rotationMatrix[5];
                this.reticleNormal[2] = rotationMatrix[6];

                // Position the hit test marker
                this.hitTestMarker.position = this.reticlePosition;
                this.hitTestMarker.visible = true;
                this.reticleVisible = true;

                if (this.onHitTest) {
                    this.onHitTest(this.reticlePosition, this.reticleNormal);
                }
            }
        } else {
            // No hit test results
            if (this.hitTestMarker) {
                this.hitTestMarker.visible = false;
            }
            this.reticleVisible = false;
        }
    }

    /**
     * Update input sources for the current frame.
     * @param {XRFrame} frame Current XR frame.
     * @private
     */
    _updateInputSources(frame) {
        for (const [inputSource, data] of this.inputSources) {
            if (inputSource.gripSpace) {
                const gripPose = frame.getPose(inputSource.gripSpace, this.sessionManager.referenceSpace);
                if (gripPose) {
                    data.gripPose = gripPose;
                }
            }

            if (inputSource.targetRaySpace) {
                const targetRayPose = frame.getPose(inputSource.targetRaySpace, this.sessionManager.referenceSpace);
                if (targetRayPose) {
                    data.targetRayPose = targetRayPose;
                }
            }
        }
    }

    /**
     * Enable placement mode for a model.
     * @param {String} modelId The ID of the model to place.
     * @param {Object} options Placement options.
     */
    enablePlacementMode(modelId, options = {}) {
        console.log('Enabling placement mode for model:', modelId);
        this.placementMode = true;
        this.selectedModelId = modelId;
        this.placementScale = options.scale || [1, 1, 1];
        this.placementRotation = options.rotation || [0, 0, 0];

        // Show the model for preview if it exists
        const model = this.viewer.scene.models[modelId];
        if (model) {
            console.log('Model found for placement:', modelId);
            model.visible = true;
        } else {
            console.warn('Model not found when enabling placement mode:', modelId);
        }
    }

    /**
     * Disable placement mode.
     */
    disablePlacementMode() {
        this.placementMode = false;
        this.selectedModelId = null;
    }

    /**
     * Place the selected model at the current reticle position.
     * @private
     */
    _placeSelectedModel() {
        console.log('_placeSelectedModel called - selectedModelId:', this.selectedModelId, 'reticleVisible:', this.reticleVisible);

        if (!this.selectedModelId || !this.reticleVisible) {
            console.warn('Cannot place model - missing requirements:', {
                selectedModelId: this.selectedModelId,
                reticleVisible: this.reticleVisible,
                reticlePosition: this.reticlePosition
            });
            return false;
        }

        const model = this.viewer.scene.models[this.selectedModelId];
        if (!model) {
            console.warn("Model not found:", this.selectedModelId);
            return false;
        }

        console.log('Placing model at position:', this.reticlePosition);

        // Set model transform
        model.position = this.reticlePosition;
        model.scale = this.placementScale;
        model.rotation = this.placementRotation;
        model.visible = true;

        // Notify callback
        if (this.onModelPlaced) {
            this.onModelPlaced({
                modelId: this.selectedModelId,
                position: this.reticlePosition,
                scale: this.placementScale,
                rotation: this.placementRotation,
                normal: this.reticleNormal
            });
        }

        // Exit placement mode
        this.disablePlacementMode();

        return true;
    }

    /**
     * Place a model at a specific position.
     * @param {string} modelId ID of the model to place.
     * @param {Array} position World position [x, y, z].
     * @param {Object} options Additional placement options.
     * @returns {boolean} True if placement was successful.
     */
    placeModelAt(modelId, position, options = {}) {
        const model = this.viewer.scene.models[modelId];
        if (!model) {
            console.warn("Model not found:", modelId);
            return false;
        }

        const scale = options.scale || [1, 1, 1];
        const rotation = options.rotation || [0, 0, 0];

        model.position = position;
        model.scale = scale;
        model.rotation = rotation;
        model.visible = true;

        if (this.onModelPlaced) {
            this.onModelPlaced({
                modelId: modelId,
                position: position,
                scale: scale,
                rotation: rotation,
                normal: options.normal || [0, 1, 0]
            });
        }

        return true;
    }

    /**
     * Get the current reticle (hit test cursor) position.
     * @returns {Array|null} Current reticle position or null if not visible.
     */
    getReticlePosition() {
        return this.reticleVisible ? this.reticlePosition : null;
    }

    /**
     * Get the current reticle normal vector.
     * @returns {Array|null} Current reticle normal or null if not visible.
     */
    getReticleNormal() {
        return this.reticleVisible ? this.reticleNormal : null;
    }

    /**
     * Set whether the hit test marker should be visible.
     * @param {boolean} visible
     */
    setHitTestMarkerVisible(visible) {
        this.showHitTestMarker = visible;
        if (this.hitTestMarker) {
            this.hitTestMarker.visible = visible && this.reticleVisible;
        }
    }

    /**
     * Get all currently tracked input sources.
     * @returns {Map} Map of input sources and their data.
     */
    getInputSources() {
        return this.inputSources;
    }

    /**
     * Check if placement mode is currently active.
     * @returns {boolean}
     */
    isPlacementModeActive() {
        return this.placementMode;
    }

    /**
     * Get the currently selected model ID for placement.
     * @returns {string|null}
     */
    getSelectedModelId() {
        return this.selectedModelId;
    }

    /**
     * Destroy the interaction utils and clean up resources.
     */
    destroy() {
        // Clean up hit test marker
        if (this.hitTestMarker) {
            this.hitTestMarker.destroy();
            this.hitTestMarker = null;
        }

        // Clear state
        this.inputSources.clear();
        this.controllers.clear();
        this.placementMode = false;
        this.selectedModelId = null;
        this.reticleVisible = false;
    }
}

export {WebXRInteractionUtils};
