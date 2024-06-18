export * from "./AngleMeasurementsPlugin.js";
export * from "./AngleMeasurementsControl.js";
export * from "./AngleMeasurementsMouseControl.js";
export * from "./AngleMeasurementsTouchControl.js";

import {Component} from "../../viewer/scene/Component.js";
import {activateDraggableDots} from "../../../src/plugins/lib/ui/index.js";

class AngleMeasurementEditControl extends Component {

    /**
     * Edits {@link AngleMeasurement} with mouse and/or touch input.
     *
     * @param {AngleMeasurement} [measurement] The AngleMeasurement to edit.
     * @param [cfg] Configuration
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor.
     * @param {boolean} [cfg.snapping] Whether to enable snap-to-vertex and snap-to-edge.
     * @param {boolean} [handleMouseEvents] Whether to hangle mouse input.
     * @param {boolean} [handleTouchEvents] Whether to hangle touch input.
     */
    constructor(measurement, cfg, handleMouseEvents, handleTouchEvents) {

        const viewer = measurement.plugin.viewer;

        super(viewer.scene);

        const cleanup = activateDraggableDots(
            viewer,
            handleMouseEvents,
            handleTouchEvents,
            cfg.snapping,
            cfg.pointerLens,
            measurement.color,
            [ measurement.origin, measurement.corner, measurement.target ],
            () => this.fire("edited"));

        const destroyCb = measurement.on("destroyed", cleanup);

        this._deactivate = function() {
            measurement.off("destroyed", destroyCb);
            cleanup();
        };
    }

    deactivate() {
        this._deactivate();
        super.destroy();
    }
}

export class AngleMeasurementEditMouseControl extends AngleMeasurementEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, true, false);
    }
}

export class AngleMeasurementEditTouchControl extends AngleMeasurementEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, false, true);
    }
}
