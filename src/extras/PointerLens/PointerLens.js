/**
 * A PointerLens shows a magnified view of a {@link Viewer}'s canvas, centered at the position of the
 * mouse or touch pointer.
 *
 * This component is used by {@link DistanceMeasurementsControl} and {@link AngleMeasurementsControl}
 * to help position the pointer when snap-to-vertex or snap-toedge is enabled.
 *
 * [[Run an example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_createWithMouse_snapping)]
 *
 * ````JavaScript
 *
 *  import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsMouseControl, PointerLens} from "../../dist/xeokit-sdk.es.js";
 *
 *  const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      dtxEnabled: true
 *  });
 *
 *  viewer.camera.eye = [-3.93, 2.85, 27.01];
 *  viewer.camera.look = [4.40, 3.72, 8.89];
 *  viewer.camera.up = [-0.01, 0.99, 0.039];
 *
 *  const xktLoader = new XKTLoaderPlugin(viewer);
 *
 *  const sceneModel = xktLoader.load({
 *      id: "myModel",
 *      src: "../../assets/models/xkt/v10/glTF-Embedded/Duplex_A_20110505.glTFEmbedded.xkt",
 *      edges: true
 *  });
 *
 *  const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 *  const angleMeasurementsMouseControl  = new AngleMeasurementsMouseControl(angleMeasurements, {
 *      pointerLens : new PointerLens(viewer, {
 *          zoomFactor: 2
 *      })
 *  })
 *
 *  angleMeasurementsMouseControl.activate();
 * ````
 */
export class PointerLens {

    /**
     * Constructs a new PointerLens.
     * @param viewer The Viewer
     * @param [cfg] PointerLens configuration.
     * @param [cfg.active=true] Whether PointerLens is active. The PointerLens can only be shown when this is `true` (default).
     */
    constructor(viewer, cfg={}) {

        this.viewer = viewer;
        this.scene = this.viewer.scene;

        this._lensCursorDiv = document.createElement('div');
        this._lensParams = { canvasSize: 300, cursorBorder: 2, cursorSize: 10 };
        this._lensCursorDiv.style.borderRadius = "50%";
        this._lensCursorDiv.style.width  = this._lensParams.cursorSize + "px";
        this._lensCursorDiv.style.height = this._lensParams.cursorSize + "px";
        this._lensCursorDiv.style.zIndex = "100000";
        this._lensCursorDiv.style.position = "absolute";
        this._lensCursorDiv.style.pointerEvents = "none";

        this._lensContainer = document.createElement('div');
        this._lensContainerId = cfg.containerId || 'xeokit-lens';
        this._lensContainer.setAttribute("id", this._lensContainerId);

        this._lensContainer.style.border = "1px solid black";
        this._lensContainer.style.background = "white";
    //    this._lensContainer.style.opacity = "0";
        this._lensContainer.style.borderRadius = "50%";
        this._lensContainer.style.width  = this._lensParams.canvasSize + "px";
        this._lensContainer.style.height = this._lensParams.canvasSize + "px";
        
        this._lensContainer.style.zIndex = "15000";
        this._lensContainer.style.position = "absolute";
        this._lensContainer.style.pointerEvents = "none";
        this._lensContainer.style.visibility = "hidden";

        this._lensCanvas = document.createElement('canvas');
        this._lensCanvas.id = `${this._lensContainerId}-canvas`;
        // this._lensCanvas.style.background = "darkblue";
        this._lensCanvas.style.borderRadius = "50%";

        this._lensCanvas.style.width  = this._lensParams.canvasSize + "px";
        this._lensCanvas.style.height = this._lensParams.canvasSize + "px";
        this._lensCanvas.style.zIndex = "15000";
        this._lensCanvas.style.pointerEvents = "none";

        document.body.appendChild(this._lensContainer);
        this._lensContainer.appendChild(this._lensCanvas);
        this._lensContainer.appendChild(this._lensCursorDiv);

        this._lensCanvasContext = this._lensCanvas.getContext('2d');
        this._canvasElement = this.viewer.scene.canvas.canvas;

        this._canvasPos = null;
        this._snappedCanvasPos = null;
        this._lensPosToggle = cfg.lensPosToggle || true;
        this._lensPosToggleAmount = cfg.lensPosToggleAmount || 85;
        this._lensPosMarginLeft = cfg.lensPosMarginLeft || 85;
        this._lensPosMarginTop = cfg.lensPosMarginTop || 25;
        this._lensContainer.style.marginTop = `${this._lensPosMarginTop}px`;
        this._lensContainer.style.marginLeft = `${this._lensPosMarginLeft}px`;

        this._zoomLevel = cfg.zoomLevel || 2;

        this._active = (cfg.active !== false);
        this._visible = false;
        this.snapped = false;

        this._onViewerRendering = this.viewer.scene.on("rendering", () => {
            if (this._active && this._visible) {
                this.update();
            }
        });
    }

    /**
     * Updates this PointerLens.
     */
    update() {
        if (!this._active || !this._visible) {
            return;
        }
        if (!this._canvasPos) {
            return;
        }
        const lensRect = this._lensContainer.getBoundingClientRect();
        const canvasRect = this._canvasElement.getBoundingClientRect();
        const pointerOnLens =
            this._canvasPos[0] < lensRect.right && this._canvasPos[0] > lensRect.left &&
            this._canvasPos[1] < lensRect.bottom && this._canvasPos[1] > lensRect.top;
            this._lensContainer.style.marginLeft = `${this._lensPosMarginLeft}px`;
        if (pointerOnLens) {
            if (this._lensPosToggle) {
                this._lensContainer.style.marginTop = `${canvasRect.bottom - canvasRect.top - this._lensCanvas.height - this._lensPosToggleAmount}px`;
            } else {
                this._lensContainer.style.marginTop = `${this._lensPosMarginTop}px`;
            }
            this._lensPosToggle = !this._lensPosToggle;
        }
        this._lensCanvasContext.clearRect(0, 0, this._lensCanvas.width, this._lensCanvas.height);
        const size = Math.max(this._lensCanvas.width, this._lensCanvas.height) / this._zoomLevel;
        this._lensCanvasContext.drawImage(
            this._canvasElement, // source canvas
            this._canvasPos[0] - size / 2, // source x (zoom center)
            this._canvasPos[1] - size / 2, // source y (zoom center)
            size, // source width
            size, // source height
            0, // destination x
            0, // destination y
            this._lensCanvas.width, // destination width
            this._lensCanvas.height // destination height
        );

        const middle = this._lensParams.canvasSize / 2 - this._lensParams.cursorSize / 2 - this._lensParams.cursorBorder;

        const deltaX = this._snappedCanvasPos ? (this._snappedCanvasPos[0] - this._canvasPos[0]) : 0;
        const deltaY = this._snappedCanvasPos ? (this._snappedCanvasPos[1] - this._canvasPos[1]) : 0;

        this._lensCursorDiv.style.left = `${middle + deltaX * this._zoomLevel}px`;
        this._lensCursorDiv.style.top  = `${middle + deltaY * this._zoomLevel}px`;
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
     * @param canvasPos
     */
    set canvasPos(canvasPos) {
        this._canvasPos = canvasPos;
        this.update();
    }

    /**
     * Gets the canvas central position of the lens.
     * @returns {Number[]}
     */
    get canvasPos() {
        return this._canvasPos;
    }

    /**
     * Sets the canvas coordinates of the pointer.
     * @param snappedCanvasPos
     */
    set snappedCanvasPos(snappedCanvasPos) {
        this._snappedCanvasPos = snappedCanvasPos;
        this.update();
    }

    /**
     * Gets the canvas coordinates of the snapped pointer.
     * @returns {Number[]}
     */
    get snappedCanvasPos() {
        return this._snappedCanvasPos;
    }

    /**
     * Sets if the cursor has snapped to anything.
     * This is set by plugins.
     * @param snapped
     * @private
     */
    set snapped(snapped) {
        this._snapped = snapped;
        const [ bg, border ] = snapped ? [ "greenyellow", "green" ] : [ "pink", "red" ];
        this._lensCursorDiv.style.background = bg;
        this._lensCursorDiv.style.border = this._lensParams.cursorBorder + "px solid " + border;
    }

    /**
     * Gets  if the cursor has snapped to anything.
     * This is called by plugins.
     * @returns {Boolean}
     * @private
     */
    get snapped() {
        return this._snapped;
    }

    _updateActiveVisible() {
        this._lensContainer.style.visibility = (this._active && this._visible) ? "visible" : "hidden";
        this.update();
    }

    /**
     * Sets if this PointerLens is active.
     * @param active
     */
    set active(active) {
        this._active = active;
        this._updateActiveVisible();
    }

    /**
     * Gets if this PointerLens is active.
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets if this PointerLens is visible.
     * This is set by plugins.
     * @param visible
     * @private
     */
    set visible(visible) {
        this._visible = visible;
        this._updateActiveVisible();
    }

    /**
     * Gets if this PointerLens is visible.
     * This is called by plugins.
     * @returns {Boolean}
     * @private
     */
    get visible() {
        return this._visible;
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