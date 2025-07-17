/**
 * AR Button component for the WebXR plugin.
 *
 * Provides a customizable button interface for entering/exiting AR mode,
 * with built-in styling, state management, and accessibility features.
 *
 * @private
 */
class WebXRButton {

    /**
     * @constructor
     * @param {Object} cfg Button configuration.
     */
    constructor(cfg = {}) {
        this.cfg = cfg;

        // Button properties
        this.id = cfg.id || "xeokit-webxr-button";
        this.text = cfg.text || "AR";
        this.exitText = cfg.exitText || "Exit AR";
        this.enabled = cfg.enabled !== false;
        this.autoHide = cfg.autoHide !== false;

        // Custom element or auto-create
        this.element = cfg.element || null;
        this.container = cfg.container || document.body;

        // State
        this.isARActive = false;
        this.isSupported = false;
        this.isVisible = false;

        // Event callbacks
        this.onClick = cfg.onClick || null;
        this.onStateChange = cfg.onStateChange || null;

        // Styling options
        this.customStyles = cfg.styles || {};
        this.theme = cfg.theme || "default";

        this._init();
    }

    /**
     * Initialize the button.
     * @private
     */
    _init() {
        this._createElement();
        this._applyStyles();
        this._setupEventHandlers();
        this._updateState();
    }

    /**
     * Create the button element.
     * @private
     */
    _createElement() {
        if (this.element) {
            // Use provided element
            return;
        }

        // Create button element
        this.element = document.createElement("button");
        this.element.id = this.id;
        this.element.type = "button";
        this.element.setAttribute("aria-label", "Enter Augmented Reality");

        // Add to container
        this.container.appendChild(this.element);
    }

    /**
     * Apply styling to the button.
     * @private
     */
    _applyStyles() {
        const defaultStyles = this._getDefaultStyles();
        const themeStyles = this._getThemeStyles();

        // Merge styles: default < theme < custom
        const finalStyles = {
            ...defaultStyles,
            ...themeStyles,
            ...this.customStyles
        };

        // Apply styles
        Object.assign(this.element.style, finalStyles);

        // Add CSS class
        this.element.className = `xeokit-webxr-button xeokit-webxr-button-${this.theme}`;
    }

    /**
     * Get default button styles.
     * @returns {Object} Style properties.
     * @private
     */
    _getDefaultStyles() {
        return {
            position: "absolute",
            bottom: "20px",
            right: "20px",
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            fontWeight: "500",
            cursor: "pointer",
            zIndex: "10000",
            display: "none",
            userSelect: "none",
            outline: "none",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            minWidth: "80px",
            textAlign: "center"
        };
    }

    /**
     * Get theme-specific styles.
     * @returns {Object} Style properties.
     * @private
     */
    _getThemeStyles() {
        const themes = {
            default: {
                backgroundColor: "#007bff",
                color: "#ffffff",
                border: "1px solid #007bff"
            },
            primary: {
                backgroundColor: "#007bff",
                color: "#ffffff",
                border: "1px solid #007bff"
            },
            secondary: {
                backgroundColor: "#6c757d",
                color: "#ffffff",
                border: "1px solid #6c757d"
            },
            success: {
                backgroundColor: "#28a745",
                color: "#ffffff",
                border: "1px solid #28a745"
            },
            danger: {
                backgroundColor: "#dc3545",
                color: "#ffffff",
                border: "1px solid #dc3545"
            },
            warning: {
                backgroundColor: "#ffc107",
                color: "#212529",
                border: "1px solid #ffc107"
            },
            info: {
                backgroundColor: "#17a2b8",
                color: "#ffffff",
                border: "1px solid #17a2b8"
            },
            light: {
                backgroundColor: "#f8f9fa",
                color: "#212529",
                border: "1px solid #dee2e6"
            },
            dark: {
                backgroundColor: "#343a40",
                color: "#ffffff",
                border: "1px solid #343a40"
            },
            minimal: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#333333",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(10px)"
            },
            glass: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(20px)"
            }
        };

        return themes[this.theme] || themes.default;
    }

    /**
     * Set up event handlers.
     * @private
     */
    _setupEventHandlers() {
        // Click handler
        this.element.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!this.enabled) {
                return;
            }

            if (this.onClick) {
                this.onClick(this.isARActive);
            }
        });

        // Hover effects
        this.element.addEventListener("mouseenter", () => {
            if (this.enabled) {
                this._applyHoverStyles();
            }
        });

        this.element.addEventListener("mouseleave", () => {
            if (this.enabled) {
                this._removeHoverStyles();
            }
        });

        // Focus handling for accessibility
        this.element.addEventListener("focus", () => {
            this.element.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.25)";
        });

        this.element.addEventListener("blur", () => {
            this.element.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
        });

        // Keyboard support
        this.element.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                this.element.click();
            }
        });
    }

    /**
     * Apply hover styles.
     * @private
     */
    _applyHoverStyles() {
        const currentBgColor = this.element.style.backgroundColor;
        const hoverColor = this._darkenColor(currentBgColor, 0.1);
        this.element.style.backgroundColor = hoverColor;
        this.element.style.transform = "translateY(-1px)";
        this.element.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
    }

    /**
     * Remove hover styles.
     * @private
     */
    _removeHoverStyles() {
        this._applyStyles(); // Reset to original styles
    }

    /**
     * Darken a color by a given factor.
     * @param {string} color Color string.
     * @param {number} factor Darkening factor (0-1).
     * @returns {string} Darkened color.
     * @private
     */
    _darkenColor(color, factor) {
        // Simple darkening - in a real implementation you might want more sophisticated color manipulation
        if (color.startsWith("#")) {
            // Handle hex colors
            const hex = color.substring(1);
            const num = parseInt(hex, 16);
            const r = Math.max(0, Math.floor((num >> 16) * (1 - factor)));
            const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - factor)));
            const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - factor)));
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        } else if (color.startsWith("rgb")) {
            // Handle rgb/rgba colors - simplified
            return color.replace(/(\d+)/g, (match) => {
                return Math.max(0, Math.floor(parseInt(match) * (1 - factor))).toString();
            });
        }
        return color; // Return original if can't parse
    }

    /**
     * Update button state and appearance.
     * @private
     */
    _updateState() {
        // Update text
        this.element.textContent = this.isARActive ? this.exitText : this.text;

        // Update ARIA label
        const ariaLabel = this.isARActive ? "Exit Augmented Reality" : "Enter Augmented Reality";
        this.element.setAttribute("aria-label", ariaLabel);

        // Update enabled state
        this.element.disabled = !this.enabled;

        // Update opacity based on enabled state
        this.element.style.opacity = this.enabled ? "1" : "0.5";
        this.element.style.cursor = this.enabled ? "pointer" : "not-allowed";

        // Update visibility
        this.element.style.display = this.isVisible ? "block" : "none";

        // Update theme for AR active state
        if (this.isARActive) {
            this.element.style.backgroundColor = "#dc3545"; // Red for exit
            this.element.style.borderColor = "#dc3545";
        } else {
            this._applyStyles(); // Reset to theme styles
        }

        // Notify state change
        if (this.onStateChange) {
            this.onStateChange({
                isARActive: this.isARActive,
                isSupported: this.isSupported,
                isVisible: this.isVisible,
                enabled: this.enabled
            });
        }
    }

    /**
     * Set whether AR is currently active.
     * @param {boolean} active
     */
    setARActive(active) {
        if (this.isARActive !== active) {
            this.isARActive = active;
            this._updateState();
        }
    }

    /**
     * Set whether WebXR is supported.
     * @param {boolean} supported
     */
    setSupported(supported) {
        if (this.isSupported !== supported) {
            this.isSupported = supported;

            if (this.autoHide) {
                this.setVisible(supported);
            }
        }
    }

    /**
     * Set button visibility.
     * @param {boolean} visible
     */
    setVisible(visible) {
        if (this.isVisible !== visible) {
            this.isVisible = visible;
            this._updateState();
        }
    }

    /**
     * Set button enabled state.
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            this._updateState();
        }
    }

    /**
     * Set button text.
     * @param {string} text Normal text.
     * @param {string} [exitText] Text when AR is active.
     */
    setText(text, exitText) {
        this.text = text;
        if (exitText !== undefined) {
            this.exitText = exitText;
        }
        this._updateState();
    }

    /**
     * Set button theme.
     * @param {string} theme Theme name.
     */
    setTheme(theme) {
        if (this.theme !== theme) {
            this.theme = theme;
            this.element.className = `xeokit-webxr-button xeokit-webxr-button-${theme}`;
            this._applyStyles();
        }
    }

    /**
     * Update button position.
     * @param {Object} position Position properties.
     */
    setPosition(position) {
        Object.assign(this.element.style, position);
    }

    /**
     * Add custom CSS class to the button.
     * @param {string} className
     */
    addClass(className) {
        this.element.classList.add(className);
    }

    /**
     * Remove custom CSS class from the button.
     * @param {string} className
     */
    removeClass(className) {
        this.element.classList.remove(className);
    }

    /**
     * Get the button element.
     * @returns {HTMLElement}
     */
    getElement() {
        return this.element;
    }

    /**
     * Check if button is currently visible.
     * @returns {boolean}
     */
    isVisible() {
        return this.isVisible;
    }

    /**
     * Check if button is currently enabled.
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Animate button appearance/disappearance.
     * @param {string} animation Animation type: 'fadeIn', 'fadeOut', 'slideIn', 'slideOut'.
     * @param {number} [duration=300] Animation duration in milliseconds.
     * @returns {Promise} Promise that resolves when animation completes.
     */
    animate(animation, duration = 300) {
        return new Promise((resolve) => {
            const element = this.element;
            const originalTransition = element.style.transition;

            element.style.transition = `all ${duration}ms ease`;

            switch (animation) {
                case 'fadeIn':
                    element.style.opacity = '0';
                    element.style.display = 'block';
                    requestAnimationFrame(() => {
                        element.style.opacity = this.enabled ? '1' : '0.5';
                    });
                    break;

                case 'fadeOut':
                    element.style.opacity = '0';
                    break;

                case 'slideIn':
                    element.style.transform = 'translateX(100%)';
                    element.style.display = 'block';
                    requestAnimationFrame(() => {
                        element.style.transform = 'translateX(0)';
                    });
                    break;

                case 'slideOut':
                    element.style.transform = 'translateX(100%)';
                    break;
            }

            setTimeout(() => {
                if (animation === 'fadeOut' || animation === 'slideOut') {
                    element.style.display = 'none';
                }
                element.style.transition = originalTransition;
                resolve();
            }, duration);
        });
    }

    /**
     * Destroy the button and clean up resources.
     */
    destroy() {
        if (this.element) {
            // Remove event listeners (they'll be cleaned up with element removal)

            // Remove from DOM if we created it
            if (!this.cfg.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
        }

        // Clear callbacks
        this.onClick = null;
        this.onStateChange = null;
    }
}

export {WebXRButton};
