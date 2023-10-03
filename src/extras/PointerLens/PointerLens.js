/**
 * A PointerLens shows a magnified view of a {@link Viewer's | Viewer} canvas, centered at the position of the
 * mouse or touch pointer.
 */
export class PointerLens {

    /**
     * Constructs a new PointerLens.
     * @param viewer The Viewer
     * @param [cfg]
     */
    constructor(viewer, cfg={}) {

        this.viewer = viewer;
        this.scene = this.viewer.scene;

        this._lensCursorDiv = document.createElement('div');
        this.viewer.scene.canvas.canvas.parentNode.insertBefore(this._lensCursorDiv, this.viewer.scene.canvas.canvas);
        this._lensCursorDiv.style.background = "greenyellow";
        this._lensCursorDiv.style.border = "2px solid green";
        this._lensCursorDiv.style.borderRadius = "20px";
        this._lensCursorDiv.style.width = "10px";
        this._lensCursorDiv.style.height = "10px";
        this._lensCursorDiv.style.margin = "-200px -200px";
        this._lensCursorDiv.style.zIndex = "100000";
        this._lensCursorDiv.style.position = "absolute";
        this._lensCursorDiv.style.pointerEvents = "none";

        this._lensContainer = document.createElement('div');
        this._lensContainer.style.border = "1px solid black";
        this._lensContainer.style.background = "white";
    //    this._lensContainer.style.opacity = "0";
        this._lensContainer.style.borderRadius = "50%";
        this._lensContainer.style.width = "300px";
        this._lensContainer.style.height = "300px";
        this._lensContainer.style.marginTop = "85px";
        this._lensContainer.style.marginLeft = "25px";
        this._lensContainer.style.zIndex = "15000";
        this._lensContainer.style.position = "absolute";
        this._lensContainer.style.pointerEvents = "none";
        this._lensContainer.style.visibility = "hidden";

        this._lensCanvas = document.createElement('canvas');
        // this._lensCanvas.style.background = "darkblue";
        this._lensCanvas.style.borderRadius = "50%";

        this._lensCanvas.style.width = "300px";
        this._lensCanvas.style.height = "300px";
        this._lensCanvas.style.zIndex = "15000";
        this._lensCanvas.style.pointerEvents = "none";

        document.body.appendChild(this._lensContainer);
        this._lensContainer.appendChild(this._lensCanvas);

        this._lensCanvasContext = this._lensCanvas.getContext('2d');
        this._canvasElement = this.viewer.scene.canvas.canvas;

        this._centerPos = null;
        this._cursorPos = null;
        this._lensPosToggle = true;

        this._zoomLevel = 2;

        this._onViewerRendering = this.viewer.scene.on("rendering", () => {
            if (this._active) {
                this.update();
            }
        });
    }

    /**
     * Updates this PointerLens.
     */
    update() {
        if (!this._active) {
            return;
        }
        if (!this._centerPos) {
            return;
        }
        const lensRect = this._lensContainer.getBoundingClientRect();
        const canvasRect = this._canvasElement.getBoundingClientRect();
        const pointerOnLens =
            this._centerPos[0] < lensRect.right && this._centerPos[0] > lensRect.left &&
            this._centerPos[1] < lensRect.bottom && this._centerPos[1] > lensRect.top;
        this._lensContainer.style.marginLeft = `25px`;
        if (pointerOnLens) {
            if (this._lensPosToggle) {
                this._lensContainer.style.marginTop = `${canvasRect.bottom - canvasRect.top - this._lensCanvas.height - 85}px`;
            } else {
                this._lensContainer.style.marginTop = `85px`;
            }
            this._lensPosToggle = !this._lensPosToggle;
        }
        this._lensCanvasContext.clearRect(0, 0, this._lensCanvas.width, this._lensCanvas.height);
        const size = Math.max(this._lensCanvas.width, this._lensCanvas.height) / this._zoomLevel;
        this._lensCanvasContext.drawImage(
            this._canvasElement, // source canvas
            this._centerPos[0] - size / 2, // source x (zoom center)
            this._centerPos[1] - size / 2, // source y (zoom center)
            size, // source width
            size, // source height
            0, // destination x
            0, // destination y
            this._lensCanvas.width, // destination width
            this._lensCanvas.height // destination height
        );

        const centerLensCanvas = [
            (lensRect.left + lensRect.right) / 2,
            (lensRect.top + lensRect.bottom) / 2
        ];

        if (this._cursorPos) {
            const deltaX = this._cursorPos[0] - this._centerPos[0];
            const deltaY = this._cursorPos[1] - this._centerPos[1];

            this._lensCursorDiv.style.marginLeft = `${centerLensCanvas[0] + deltaX * this._zoomLevel - 10}px`;
            this._lensCursorDiv.style.marginTop = `${centerLensCanvas[1] + deltaY * this._zoomLevel - 10}px`;
            this._lensCursorDiv.style.background = "greenyellow";
            this._lensCursorDiv.style.border = "2px solid green";
        } else {
            this._lensCursorDiv.style.marginLeft = `${centerLensCanvas[0] - 10}px`;
            this._lensCursorDiv.style.marginTop = `${centerLensCanvas[1] - 10}px`;
            this._lensCursorDiv.style.background = "pink";
            this._lensCursorDiv.style.border = "2px solid red";
        }
    }


    /**
     * Sets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @param zoomFactor
     */
    set zoomFactor(zoomFactor) {
        this._zoomFactor = zoomFactor;
        this.update();
    }

    /**
     * Gets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @returns Number
     */
    get zoomFactor() {
        return this._zoomFactor;
    }

    /**
     * Sets the canvas central position of the lens.
     * @param centerPos
     */
    set centerPos(centerPos) {
        this._centerPos = centerPos;
        this.update();
    }

    /**
     * Gets the canvas central position of the lens.
     * @returns {Number[]}
     */
    get centerPos() {
        return this._centerPos;
    }

    /**
     * Sets the canvas coordinates of the pointer.
     * @param cursorPos
     */
    set cursorPos(cursorPos) {
        this._cursorPos = cursorPos;
        this.update();
    }

    /**
     * Gets the canvas coordinates of the pointer.
     * @returns {Number[]}
     */
    get cursorPos() {
        return this._cursorPos;
    }

    /**
     * Sets if this PointerLens is active.
     * @param active
     */
    set active(active) {
        this._active = active;
        this._lensContainer.style.visibility = active ? "visible" : "hidden";
        if (!active) {
            this._lensCursorDiv.style.marginLeft = `-100px`;
            this._lensCursorDiv.style.marginTop = `-100px`;
        }
        this.update();
    }

    /**
     * Gets if this PointerLens is active.
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Destroys this PointerLens.
     */
    destroy() {
        if (!this._destroyed) {
            this.viewer.scene.off(this._onViewerRendering);
            this._lensContainer.removeChild(this._lensCanvas);
            document.body.removeChild(this._lensContainer);
            this._destroyed = true;
        }
    }
}