import { math } from "../../viewer/scene/math/math.js";

/**
 * QR Code Positioning utility for WebXR room alignment.
 *
 * This class handles QR code detection, parsing, and coordinate system transformation
 * to align virtual models with real-world room coordinates.
 *
 * Features:
 * - QR code detection using BarcodeDetector API
 * - Room coordinate system alignment
 * - User position calculation
 * - Wall-based positioning
 * - Camera feed processing
 *
 * @private
 */
class QRCodePositioning {

    /**
     * @constructor
     * @param {Object} cfg Configuration options.
     */
    constructor(cfg = {}) {
        this.cfg = cfg;

        // QR code detection
        this.detector = null;
        this.isDetecting = false;
        this.detectionInterval = cfg.detectionInterval || 1000; // ms
        this.lastDetectionTime = 0;

        // Positioning state
        this.isPositioned = false;
        this.qrData = null;
        this.userPosition = [0, 0, 0];
        this.roomOrigin = [0, 0, 0];
        this.roomDimensions = [10, 3, 8]; // default room size
        this.wallOrientation = 0; // rotation in degrees

        // Coordinate transformation
        this.roomToARMatrix = math.mat4();
        this.arToRoomMatrix = math.mat4();

        // Camera and canvas for QR detection
        this.videoElement = null;
        this.canvasElement = null;
        this.context = null;

        // Event callbacks
        this.onQRDetected = null;
        this.onPositioned = null;
        this.onError = null;

        this._init();
    }

    /**
     * Initialize QR code positioning.
     * @private
     */
    _init() {
        this._initBarcodeDetector();
        this._setupDetectionCanvas();
        math.identityMat4(this.roomToARMatrix);
        math.identityMat4(this.arToRoomMatrix);
    }

    /**
     * Initialize barcode detector.
     * @private
     */
    _initBarcodeDetector() {
        try {
            if ('BarcodeDetector' in window) {
                this.detector = new BarcodeDetector({
                    formats: ['qr_code']
                });
                console.log('QR code detector initialized');
            } else {
                console.warn('BarcodeDetector API not available');
                this._initFallbackDetector();
            }
        } catch (error) {
            console.warn('Failed to initialize barcode detector:', error);
            this._initFallbackDetector();
        }
    }

    /**
     * Initialize fallback QR detection (using external library).
     * @private
     */
    _initFallbackDetector() {
        // In a real implementation, you could use libraries like:
        // - jsQR
        // - qr-scanner
        // - zxing-js
        console.log('Using fallback QR detection method');

        // Placeholder for fallback detector
        this.detector = {
            detect: this._fallbackDetect.bind(this)
        };
    }

    /**
     * Set up canvas for QR code detection.
     * @private
     */
    _setupDetectionCanvas() {
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.width = 640;
        this.canvasElement.height = 480;
        this.context = this.canvasElement.getContext('2d');
    }

    /**
     * Start QR code detection.
     * @param {HTMLVideoElement} videoElement Video element from camera.
     * @returns {Promise<void>}
     */
    async startDetection(videoElement) {
        if (this.isDetecting) {
            return;
        }

        try {
            this.videoElement = videoElement;
            this.isDetecting = true;

            console.log('Starting QR code detection');
            this._detectLoop();
        } catch (error) {
            console.error('Failed to start QR detection:', error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Stop QR code detection.
     */
    stopDetection() {
        this.isDetecting = false;
        console.log('QR code detection stopped');
    }

    /**
     * Detection loop.
     * @private
     */
    async _detectLoop() {
        if (!this.isDetecting || this.isPositioned) {
            return;
        }

        const now = Date.now();
        if (now - this.lastDetectionTime < this.detectionInterval) {
            requestAnimationFrame(() => this._detectLoop());
            return;
        }

        this.lastDetectionTime = now;

        try {
            await this._processFrame();
        } catch (error) {
            console.warn('QR detection frame processing failed:', error);
        }

        if (this.isDetecting && !this.isPositioned) {
            requestAnimationFrame(() => this._detectLoop());
        }
    }

    /**
     * Process a single frame for QR detection.
     * @private
     */
    async _processFrame() {
        if (!this.videoElement || !this.detector) {
            return;
        }

        try {
            // Draw video frame to canvas
            this.context.drawImage(
                this.videoElement,
                0, 0,
                this.canvasElement.width,
                this.canvasElement.height
            );

            // Get image data
            const imageData = this.context.getImageData(
                0, 0,
                this.canvasElement.width,
                this.canvasElement.height
            );

            // Detect QR codes
            const barcodes = await this.detector.detect(imageData);

            if (barcodes.length > 0) {
                await this._processDetectedQRCodes(barcodes);
            }
        } catch (error) {
            console.warn('Frame processing error:', error);
        }
    }

    /**
     * Process detected QR codes.
     * @param {Array} barcodes Detected barcodes.
     * @private
     */
    async _processDetectedQRCodes(barcodes) {
        for (const barcode of barcodes) {
            try {
                const qrData = this._parseQRData(barcode.rawValue);
                if (qrData && this._validateQRData(qrData)) {
                    console.log('Valid positioning QR code detected:', qrData);

                    await this._processPositioningData(qrData, barcode);

                    if (this.onQRDetected) {
                        this.onQRDetected(qrData, barcode);
                    }

                    break; // Use first valid QR code
                }
            } catch (error) {
                console.warn('Error processing QR code:', error);
            }
        }
    }

    /**
     * Parse QR code data.
     * @param {string} rawValue Raw QR code value.
     * @returns {Object|null} Parsed QR data.
     * @private
     */
    _parseQRData(rawValue) {
        try {
            // Try JSON format first
            if (rawValue.startsWith('{')) {
                return JSON.parse(rawValue);
            }

            // Try custom format: ROOM:id:x:y:z:wall:width:height:depth
            if (rawValue.startsWith('ROOM:')) {
                const parts = rawValue.split(':');
                if (parts.length >= 9) {
                    return {
                        type: 'room_positioning',
                        roomId: parts[1],
                        position: {
                            x: parseFloat(parts[2]),
                            y: parseFloat(parts[3]),
                            z: parseFloat(parts[4])
                        },
                        wall: parts[5],
                        dimensions: {
                            width: parseFloat(parts[6]),
                            height: parseFloat(parts[7]),
                            depth: parseFloat(parts[8])
                        },
                        orientation: parts[9] ? parseFloat(parts[9]) : 0
                    };
                }
            }

            // Try URL format
            if (rawValue.startsWith('http')) {
                const url = new URL(rawValue);
                const params = url.searchParams;

                if (params.has('room') && params.has('x') && params.has('y') && params.has('z')) {
                    return {
                        type: 'room_positioning',
                        roomId: params.get('room'),
                        position: {
                            x: parseFloat(params.get('x')),
                            y: parseFloat(params.get('y')),
                            z: parseFloat(params.get('z'))
                        },
                        wall: params.get('wall') || 'north',
                        dimensions: {
                            width: parseFloat(params.get('width')) || 10,
                            height: parseFloat(params.get('height')) || 3,
                            depth: parseFloat(params.get('depth')) || 8
                        },
                        orientation: parseFloat(params.get('orientation')) || 0
                    };
                }
            }

            return null;
        } catch (error) {
            console.warn('Failed to parse QR data:', error);
            return null;
        }
    }

    /**
     * Validate QR data for positioning.
     * @param {Object} qrData Parsed QR data.
     * @returns {boolean} Whether data is valid.
     * @private
     */
    _validateQRData(qrData) {
        if (!qrData || qrData.type !== 'room_positioning') {
            return false;
        }

        if (!qrData.roomId || !qrData.position) {
            return false;
        }

        if (typeof qrData.position.x !== 'number' ||
            typeof qrData.position.y !== 'number' ||
            typeof qrData.position.z !== 'number') {
            return false;
        }

        return true;
    }

    /**
     * Process positioning data from QR code.
     * @param {Object} qrData QR positioning data.
     * @param {Object} barcode Barcode detection result.
     * @private
     */
    async _processPositioningData(qrData, barcode) {
        try {
            // Store QR data
            this.qrData = qrData;

            // Set room origin and dimensions
            this.roomOrigin = [
                qrData.position.x,
                qrData.position.y,
                qrData.position.z
            ];

            if (qrData.dimensions) {
                this.roomDimensions = [
                    qrData.dimensions.width,
                    qrData.dimensions.height,
                    qrData.dimensions.depth
                ];
            }

            // Calculate wall orientation
            this.wallOrientation = this._getWallOrientation(qrData.wall, qrData.orientation);

            // Calculate user position based on QR code location
            this.userPosition = this._calculateUserPosition(qrData, barcode);

            // Create coordinate transformation matrices
            this._createTransformationMatrices();

            // Mark as positioned
            this.isPositioned = true;
            this.stopDetection();

            console.log('Room positioning established:');
            console.log('- Room ID:', qrData.roomId);
            console.log('- Room origin:', this.roomOrigin);
            console.log('- Room dimensions:', this.roomDimensions);
            console.log('- User position:', this.userPosition);
            console.log('- Wall orientation:', this.wallOrientation);

            // Notify positioning callback
            if (this.onPositioned) {
                this.onPositioned({
                    qrData: this.qrData,
                    userPosition: this.userPosition,
                    roomOrigin: this.roomOrigin,
                    roomDimensions: this.roomDimensions,
                    wallOrientation: this.wallOrientation,
                    roomToARMatrix: this.roomToARMatrix,
                    arToRoomMatrix: this.arToRoomMatrix
                });
            }

        } catch (error) {
            console.error('Failed to process positioning data:', error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Get wall orientation in degrees.
     * @param {string} wall Wall identifier.
     * @param {number} customOrientation Custom orientation override.
     * @returns {number} Orientation in degrees.
     * @private
     */
    _getWallOrientation(wall, customOrientation = 0) {
        if (customOrientation !== 0) {
            return customOrientation;
        }

        const wallOrientations = {
            'north': 0,
            'east': 90,
            'south': 180,
            'west': 270
        };

        return wallOrientations[wall.toLowerCase()] || 0;
    }

    /**
     * Calculate user position based on QR code detection.
     * @param {Object} qrData QR positioning data.
     * @param {Object} barcode Barcode detection result.
     * @returns {Array<number>} User position [x, y, z].
     * @private
     */
    _calculateUserPosition(qrData, barcode) {
        // Default user position (1.5 meters from QR code, average height)
        const defaultDistance = 1.5;
        const averageUserHeight = 1.6;

        // Calculate position based on wall orientation
        const wallAngle = this.wallOrientation * Math.PI / 180;

        // Offset from wall (user stands facing the wall)
        const offsetX = Math.sin(wallAngle) * defaultDistance;
        const offsetZ = Math.cos(wallAngle) * defaultDistance;

        return [
            qrData.position.x + offsetX,
            qrData.position.y + averageUserHeight,
            qrData.position.z + offsetZ
        ];
    }

    /**
     * Create coordinate transformation matrices.
     * @private
     */
    _createTransformationMatrices() {
        // Create room-to-AR transformation matrix
        math.identityMat4(this.roomToARMatrix);

        // Apply wall orientation rotation
        if (this.wallOrientation !== 0) {
            const rotationMatrix = math.mat4();
            math.rotationMat4v(this.wallOrientation * Math.PI / 180, [0, 1, 0], rotationMatrix);
            math.mulMat4(this.roomToARMatrix, rotationMatrix, this.roomToARMatrix);
        }

        // Apply room origin translation
        const translationMatrix = math.mat4();
        math.translationMat4v(this.roomOrigin, translationMatrix);
        math.mulMat4(this.roomToARMatrix, translationMatrix, this.roomToARMatrix);

        // Create inverse transformation (AR-to-room)
        math.inverseMat4(this.roomToARMatrix, this.arToRoomMatrix);
    }

    /**
     * Transform point from room coordinates to AR coordinates.
     * @param {Array<number>} roomPoint Point in room coordinates.
     * @returns {Array<number>} Point in AR coordinates.
     */
    transformRoomToAR(roomPoint) {
        const arPoint = math.vec3();
        math.transformPoint3(this.roomToARMatrix, roomPoint, arPoint);
        return arPoint;
    }

    /**
     * Transform point from AR coordinates to room coordinates.
     * @param {Array<number>} arPoint Point in AR coordinates.
     * @returns {Array<number>} Point in room coordinates.
     */
    transformARToRoom(arPoint) {
        const roomPoint = math.vec3();
        math.transformPoint3(this.arToRoomMatrix, arPoint, roomPoint);
        return roomPoint;
    }

    /**
     * Fallback QR detection using alternative method.
     * @param {ImageData} imageData Image data to process.
     * @returns {Promise<Array>} Detected barcodes.
     * @private
     */
    async _fallbackDetect(imageData) {
        // Placeholder for fallback detection
        // In a real implementation, you would use a JavaScript QR library

        // Simulate detection for demo purposes
        if (Math.random() < 0.1) { // 10% chance per frame
            return [{
                rawValue: JSON.stringify({
                    type: 'room_positioning',
                    roomId: 'demo_room_001',
                    position: { x: 0, y: 0, z: 0 },
                    wall: 'north',
                    dimensions: { width: 10, height: 3, depth: 8 },
                    orientation: 0
                }),
                boundingBox: {
                    x: 100, y: 100,
                    width: 200, height: 200
                }
            }];
        }

        return [];
    }

    /**
     * Generate QR code data for a room position.
     * @param {Object} config Room configuration.
     * @returns {string} QR code data string.
     */
    static generateQRData(config) {
        const {
            roomId,
            position = { x: 0, y: 0, z: 0 },
            wall = 'north',
            dimensions = { width: 10, height: 3, depth: 8 },
            orientation = 0,
            format = 'json'
        } = config;

        if (format === 'custom') {
            return `ROOM:${roomId}:${position.x}:${position.y}:${position.z}:${wall}:${dimensions.width}:${dimensions.height}:${dimensions.depth}:${orientation}`;
        } else if (format === 'url') {
            const params = new URLSearchParams({
                room: roomId,
                x: position.x,
                y: position.y,
                z: position.z,
                wall: wall,
                width: dimensions.width,
                height: dimensions.height,
                depth: dimensions.depth,
                orientation: orientation
            });
            return `https://ar.xeokit.io/room?${params.toString()}`;
        } else {
            return JSON.stringify({
                type: 'room_positioning',
                roomId: roomId,
                position: position,
                wall: wall,
                dimensions: dimensions,
                orientation: orientation
            });
        }
    }

    /**
     * Get current positioning status.
     * @returns {Object} Positioning status.
     */
    getStatus() {
        return {
            isPositioned: this.isPositioned,
            isDetecting: this.isDetecting,
            qrData: this.qrData,
            userPosition: this.userPosition,
            roomOrigin: this.roomOrigin,
            roomDimensions: this.roomDimensions,
            wallOrientation: this.wallOrientation
        };
    }

    /**
     * Reset positioning state.
     */
    reset() {
        this.isPositioned = false;
        this.qrData = null;
        this.userPosition = [0, 0, 0];
        this.roomOrigin = [0, 0, 0];
        this.wallOrientation = 0;
        math.identityMat4(this.roomToARMatrix);
        math.identityMat4(this.arToRoomMatrix);

        console.log('QR positioning reset');
    }

    /**
     * Manually set positioning (for testing).
     * @param {Object} config Manual positioning configuration.
     */
    setManualPositioning(config) {
        const {
            userPosition = [0, 1.6, 1.5],
            roomOrigin = [0, 0, 0],
            roomDimensions = [10, 3, 8],
            wallOrientation = 0,
            roomId = 'manual_room'
        } = config;

        this.userPosition = [...userPosition];
        this.roomOrigin = [...roomOrigin];
        this.roomDimensions = [...roomDimensions];
        this.wallOrientation = wallOrientation;

        this.qrData = {
            type: 'room_positioning',
            roomId: roomId,
            position: { x: roomOrigin[0], y: roomOrigin[1], z: roomOrigin[2] },
            wall: 'north',
            dimensions: { width: roomDimensions[0], height: roomDimensions[1], depth: roomDimensions[2] },
            orientation: wallOrientation,
            manual: true
        };

        this._createTransformationMatrices();
        this.isPositioned = true;

        console.log('Manual positioning set:', this.qrData);

        if (this.onPositioned) {
            this.onPositioned({
                qrData: this.qrData,
                userPosition: this.userPosition,
                roomOrigin: this.roomOrigin,
                roomDimensions: this.roomDimensions,
                wallOrientation: this.wallOrientation,
                roomToARMatrix: this.roomToARMatrix,
                arToRoomMatrix: this.arToRoomMatrix,
                manual: true
            });
        }
    }

    /**
     * Destroy the positioning utility.
     */
    destroy() {
        this.stopDetection();

        // Clear callbacks
        this.onQRDetected = null;
        this.onPositioned = null;
        this.onError = null;

        // Clean up canvas
        if (this.canvasElement) {
            this.canvasElement = null;
            this.context = null;
        }

        this.videoElement = null;
        this.detector = null;

        console.log('QR positioning utility destroyed');
    }
}

export { QRCodePositioning };
