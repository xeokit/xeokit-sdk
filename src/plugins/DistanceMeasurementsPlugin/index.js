export * from "./DistanceMeasurementsPlugin.js";
export * from "./DistanceMeasurementsControl.js";
export * from "./DistanceMeasurementsMouseControl.js";
export * from "./DistanceMeasurementsTouchControl.js";

import {Component} from "../../viewer/scene/Component.js";
import {activateDraggableDots} from "../../../src/plugins/lib/ui/index.js";

class DistanceMeasurementEditControl extends Component {

    /**
     * Edits {@link DistanceMeasurement} with mouse and/or touch input.
     *
     * @param {DistanceMeasurement} [measurement] The DistanceMeasurement to edit.
     * @param [cfg] Configuration
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor.
     * @param {boolean} [cfg.snapping] Whether to enable snap-to-vertex and snap-to-edge.
     * @param {boolean} [handleMouseEvents] Whether to hangle mouse input.
     * @param {boolean} [handleTouchEvents] Whether to hangle touch input.
     */
    constructor(measurement, cfg, handleMouseEvents, handleTouchEvents) {

        const viewer = measurement.plugin.viewer;

        super(viewer.scene);

        const cleanup = activateDraggableDots({
            viewer: viewer,
            handleMouseEvents: handleMouseEvents,
            handleTouchEvents: handleTouchEvents,
            snapping: cfg.snapping,
            pointerLens: cfg.pointerLens,
            dots: [ measurement.origin, measurement.target ],
            onEdit: () => this.fire("edited")
        });

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

export class DistanceMeasurementEditMouseControl extends DistanceMeasurementEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, true, false);
    }
}

export class DistanceMeasurementEditTouchControl extends DistanceMeasurementEditControl {
    constructor(zone, cfg) {
        super(zone, cfg, false, true);
    }
}
