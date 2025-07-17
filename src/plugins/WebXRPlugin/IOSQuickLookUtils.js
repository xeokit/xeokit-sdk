import { math } from "../../viewer/scene/math/math.js";

/**
 * Utility class for iOS Quick Look AR integration with USDZ file support.
 *
 * This class handles USDZ file management, Quick Look parameter configuration,
 * and provides utilities for converting xeokit models to iOS-compatible AR experiences.
 *
 * @private
 */
class IOSQuickLookUtils {
    /**
     * @constructor
     * @param {Object} cfg Configuration options.
     */
    constructor(cfg = {}) {
        this.cfg = cfg;

        // iOS detection
        this.isIOS = this._detectIOS();
        this.isSafari = this._detectSafari();
        this.iosVersion = this._getIOSVersion();

        // Quick Look support
        this.quickLookSupported = this._checkQuickLookSupport();

        // USDZ file management
        this.usdzCache = new Map();

        // Quick Look parameters
        this.defaultQuickLookParams = {
            allowsContentScaling: "0",
            canonicalWebPageURL: "",
            planeDetection: "horizontal",
            checkoutTitle: "",
            checkoutSubtitle: "",
            price: "",
            callToAction: "View in AR",
        };
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

        // Try alternative pattern for newer iOS versions
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

        // Quick Look AR requires iOS 12.0 or later
        if (this.iosVersion && this.iosVersion.major >= 12) {
            // Additional checks for ARKit support
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
    supportsARKit() {
        if (!this.isIOS || !this.iosVersion) {
            return false;
        }

        // ARKit minimum requirements
        const minVersion = { major: 11, minor: 0 };

        if (
            this.iosVersion.major > minVersion.major ||
            (this.iosVersion.major === minVersion.major &&
                this.iosVersion.minor >= minVersion.minor)
        ) {
            // Check for A9 processor or later (approximate device check)
            const userAgent = navigator.userAgent;

            // Device exclusions (older devices without ARKit support)
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

            // This is a simplified check - in production you might want more sophisticated detection
            return !unsupportedDevices.some((device) =>
                userAgent.includes(device),
            );
        }

        return false;
    }

    /**
     * Create Quick Look URL with parameters.
     * @param {String} usdzUrl Base USDZ file URL.
     * @param {Object} params Quick Look parameters.
     * @returns {String} Complete Quick Look URL.
     */
    createQuickLookURL(usdzUrl, params = {}) {
        if (!usdzUrl) {
            throw new Error("USDZ URL is required");
        }

        const quickLookParams = {
            ...this.defaultQuickLookParams,
            canonicalWebPageURL: window.location.href,
            ...params,
        };

        const urlParams = new URLSearchParams();

        // Add parameters that have values
        Object.keys(quickLookParams).forEach((key) => {
            if (quickLookParams[key]) {
                urlParams.set(key, quickLookParams[key]);
            }
        });

        const paramString = urlParams.toString();
        if (paramString) {
            const separator = usdzUrl.includes("?") ? "&" : "?";
            return usdzUrl + separator + paramString;
        }

        return usdzUrl;
    }

    /**
     * Launch Quick Look AR experience.
     * @param {String} usdzUrl URL to USDZ file.
     * @param {Object} options Launch options.
     * @returns {Promise} Promise that resolves when Quick Look is launched.
     */
    async launchQuickLook(usdzUrl, options = {}) {
        if (!this.quickLookSupported) {
            throw new Error("Quick Look AR is not supported on this device");
        }

        if (!usdzUrl) {
            throw new Error("USDZ URL is required");
        }

        try {
            // Create Quick Look parameters
            const params = {
                allowsContentScaling: options.allowsContentScaling || "0",
                planeDetection: options.planeDetection || "horizontal",
                ...options.params,
            };

            // Create Quick Look URL
            const quickLookURL = this.createQuickLookURL(usdzUrl, params);

            // Create temporary link element
            const link = document.createElement("a");
            link.href = quickLookURL;
            link.rel = "ar";
            link.style.display = "none";

            // Add link text (required for some iOS versions)
            link.appendChild(
                document.createTextNode(params.callToAction || "View in AR"),
            );

            // Add to DOM temporarily
            document.body.appendChild(link);

            // Launch Quick Look
            const clickEvent = new MouseEvent("click", {
                view: window,
                bubbles: true,
                cancelable: true,
            });

            link.dispatchEvent(clickEvent);

            // Clean up after a delay
            setTimeout(() => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            }, 1000);

            return Promise.resolve({
                url: quickLookURL,
                launched: true,
            });
        } catch (error) {
            console.error("Failed to launch Quick Look:", error);
            throw error;
        }
    }

    /**
     * Cache USDZ file for reuse.
     * @param {String} key Cache key.
     * @param {String|Blob} usdzData USDZ URL or Blob.
     */
    cacheUSDZ(key, usdzData) {
        this.usdzCache.set(key, {
            data: usdzData,
            timestamp: Date.now(),
            type: typeof usdzData === "string" ? "url" : "blob",
        });
    }

    /**
     * Get cached USDZ file.
     * @param {String} key Cache key.
     * @returns {Object|null} Cached USDZ data or null if not found.
     */
    getCachedUSDZ(key) {
        return this.usdzCache.get(key) || null;
    }

    /**
     * Clear USDZ cache.
     * @param {String} [key] Specific key to clear, or all if not provided.
     */
    clearUSDZCache(key) {
        if (key) {
            this.usdzCache.delete(key);
        } else {
            this.usdzCache.clear();
        }
    }

    /**
     * Validate USDZ file URL or content.
     * @param {String|Blob} usdzData USDZ URL or Blob.
     * @returns {Promise<Boolean>} Promise that resolves to validation result.
     */
    async validateUSDZ(usdzData) {
        try {
            if (typeof usdzData === "string") {
                // Validate URL
                const url = new URL(usdzData);

                // Check file extension
                if (!url.pathname.toLowerCase().endsWith(".usdz")) {
                    console.warn("USDZ URL does not have .usdz extension");
                }

                // Try to fetch headers to check if file exists
                try {
                    const response = await fetch(usdzData, { method: "HEAD" });
                    return response.ok;
                } catch (fetchError) {
                    console.warn(
                        "Could not validate USDZ URL:",
                        fetchError.message,
                    );
                    return true; // Assume valid if we can't check
                }
            } else if (usdzData instanceof Blob) {
                // Basic validation for Blob
                return usdzData.size > 0;
            }

            return false;
        } catch (error) {
            console.error("USDZ validation error:", error);
            return false;
        }
    }

    /**
     * Get recommended Quick Look parameters for different use cases.
     * @param {String} useCase Use case: 'furniture', 'architecture', 'product', 'default'.
     * @returns {Object} Recommended parameters.
     */
    getRecommendedParams(useCase = "default") {
        const paramSets = {
            furniture: {
                planeDetection: "horizontal",
                allowsContentScaling: "1",
                callToAction: "Place in Room",
            },
            architecture: {
                planeDetection: "horizontal",
                allowsContentScaling: "0",
                callToAction: "View Building",
            },
            product: {
                planeDetection: "horizontal",
                allowsContentScaling: "1",
                callToAction: "View Product",
            },
            artwork: {
                planeDetection: "vertical",
                allowsContentScaling: "0",
                callToAction: "View Art",
            },
            default: {
                planeDetection: "horizontal",
                allowsContentScaling: "0",
                callToAction: "View in AR",
            },
        };

        return paramSets[useCase] || paramSets.default;
    }

    /**
     * Create Quick Look link element.
     * @param {String} usdzUrl USDZ file URL.
     * @param {Object} options Link options.
     * @returns {HTMLAnchorElement} Quick Look link element.
     */
    createQuickLookLink(usdzUrl, options = {}) {
        const link = document.createElement("a");

        // Set up basic Quick Look attributes
        link.href = this.createQuickLookURL(usdzUrl, options.params);
        link.rel = "ar";

        // Set link text
        link.textContent = options.text || "View in AR";

        // Apply styling if provided
        if (options.className) {
            link.className = options.className;
        }

        if (options.style) {
            Object.assign(link.style, options.style);
        }

        // Add data attributes for tracking
        link.setAttribute("data-quicklook-url", usdzUrl);
        link.setAttribute(
            "data-quicklook-version",
            this.iosVersion ? this.iosVersion.toString() : "unknown",
        );

        return link;
    }

    /**
     * Get device capabilities for Quick Look.
     * @returns {Object} Device capability information.
     */
    getDeviceCapabilities() {
        return {
            isIOS: this.isIOS,
            isSafari: this.isSafari,
            iosVersion: this.iosVersion,
            quickLookSupported: this.quickLookSupported,
            arkitSupported: this.supportsARKit(),
            maxTouchPoints: navigator.maxTouchPoints,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceMemory: navigator.deviceMemory || "unknown",
            hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
        };
    }

    /**
     * Log device and Quick Look information for debugging.
     */
    logDebugInfo() {
        const capabilities = this.getDeviceCapabilities();

        console.group("iOS Quick Look Debug Information");
        console.log("iOS Device:", capabilities.isIOS);
        console.log("Safari Browser:", capabilities.isSafari);
        console.log(
            "iOS Version:",
            capabilities.iosVersion
                ? capabilities.iosVersion.toString()
                : "Not detected",
        );
        console.log("Quick Look Supported:", capabilities.quickLookSupported);
        console.log("ARKit Supported:", capabilities.arkitSupported);
        console.log("Max Touch Points:", capabilities.maxTouchPoints);
        console.log("User Agent:", capabilities.userAgent);
        console.log("Platform:", capabilities.platform);
        console.groupEnd();
    }

    /**
     * Destroy the utility instance and clean up resources.
     */
    destroy() {
        this.clearUSDZCache();
        this.usdzCache = null;
    }
}

export { IOSQuickLookUtils };
