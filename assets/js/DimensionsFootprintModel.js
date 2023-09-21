import {VBOSceneModel} from "../../src/viewer/scene/models/VBOSceneModel/VBOSceneModel.js";
import {buildVectorTextGeometry} from "../../src/viewer/scene/geometry/builders/buildVectorTextGeometry.js";
import {utils} from "../../src/viewer/scene/utils.js";

/**
 * An experimental {@link VBOSceneModel} subclass that shows the dimensions of Entities
 * as a 2D wireframe footprint in the ground plane.
 */
class DimensionsFootprintModel extends VBOSceneModel {

    constructor(owner, cfg) {

        super(owner, cfg);

        this.dimensionsEntities = {}; // Maps dimensions to the Entities that represent them in this DimensionsFootprintModel
    }

    /**
     * Creates dimensions for the given axis-aligned bounding box.
     *
     * @param {String|Number} cfg.id ID for the new dimensions.
     * @param {Number[]} cfg.aabb Axis-aligned bounding box to create the dimensions from.
     */
    createDimensions(cfg) {
        this._createAABBDimensions(cfg.id, cfg.aabb);
    }

    _createAABBDimensions(id, aabb) {

        const lineColor = [0, 0, 0];
        const labelColor = [0, 0, 0];

        const Z_POS = aabb[1] ;

        let offset = 3;
        let offset2 = 0.5
        let arrowLength = 0.4;
        let arrowWidth = 0.15;
        let textSize = 0.2;

        const dimensionsEntityId = id + "." + "dimensions";

        const meshIds = [];

        for (let i = 0; i < 4; i++) {

            const axisLineMeshId = id + "." + "axisLineMesh." + i;
            const axisLabelMeshId = id + "." + "axisLabelMesh." + i;

            switch (i) {

                case 0:

                    this.createMesh({
                        id: axisLineMeshId,
                        primitive: "lines",
                        positions: [
                            aabb[0], Z_POS, aabb[2] - offset, // Line
                            aabb[3], Z_POS, aabb[2] - offset,
                            aabb[0] + arrowLength, Z_POS, aabb[2] - arrowWidth - offset, // Arrow heads
                            aabb[0] + arrowLength, Z_POS, aabb[2] + arrowWidth - offset,
                            aabb[3] - arrowLength, Z_POS, aabb[2] - arrowWidth - offset,
                            aabb[3] - arrowLength, Z_POS, aabb[2] + arrowWidth - offset,
                            aabb[0], Z_POS, (aabb[2] + aabb[5]) * .5, // Limit extents
                            aabb[0], Z_POS, aabb[2] - offset - offset2,
                            aabb[3], Z_POS, (aabb[2] + aabb[5]) * .5,
                            aabb[3], Z_POS, aabb[2] - offset - offset2
                        ],
                        indices: [0, 1, 0, 2, 0, 3, 1, 4, 1, 5, 6, 7, 8, 9],
                        color: lineColor
                    });

                    this.createMesh(utils.apply(buildVectorTextGeometry({
                        text: "123.0 mm",
                        size: textSize
                    }), {
                        id: axisLabelMeshId,
                        position: [(aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[0] - offset - 0.5],
                        rotation: [-90, 0, 180],
                        color: labelColor
                    }));
                    break;

                case 1:

                    this.createMesh({
                        id: axisLineMeshId,
                        primitive: "lines",
                        positions: [
                            aabb[0] - offset, Z_POS, aabb[2],
                            aabb[0] - offset, Z_POS, aabb[5],

                            aabb[0] + 0.5 - offset, Z_POS, aabb[2] + 0.5,
                            aabb[0] - 0.5 - offset, Z_POS, aabb[2] + 0.5,
                            aabb[0] + 0.5 - offset, Z_POS, aabb[5] - 0.5,
                            aabb[0] - 0.5 - offset, Z_POS, aabb[5] - 0.5,

                            aabb[0] - offset - offset2, Z_POS, aabb[2],
                            (aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[2],
                            aabb[0] - offset - offset2, Z_POS, aabb[5],
                            (aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[5]
                        ],
                        indices: [0, 1, 0, 2, 0, 3, 1, 4, 1, 5, 6, 7, 8, 9],
                        color: lineColor
                    });

                    this.createMesh(utils.apply(buildVectorTextGeometry({
                        text: "123.0 mm",
                        size: textSize
                    }), {
                        id: axisLabelMeshId,
                        position: [aabb[0] - offset - 0.5, Z_POS, (aabb[2] + aabb[5]) * 0.5],
                        rotation: [90, 180, 90],
                        color: labelColor
                    }));

                    break;

                case 2:

                    this.createMesh({
                        id: axisLineMeshId,
                        primitive: "lines",
                        positions: [
                            aabb[0], Z_POS, aabb[5] + offset,
                            aabb[3], Z_POS, aabb[5] + offset,

                            aabb[0] + 0.5, Z_POS, aabb[5] - 0.5 + offset,
                            aabb[0] + 0.5, Z_POS, aabb[5] + 0.5 + offset,
                            aabb[3] - 0.5, Z_POS, aabb[5] - 0.5 + offset,
                            aabb[3] - 0.5, Z_POS, aabb[5] + 0.5 + offset,

                            aabb[0], Z_POS, (aabb[2] + aabb[5]) * .5,
                            aabb[0], Z_POS, aabb[5] + offset + offset2,
                            aabb[3], Z_POS, (aabb[2] + aabb[5]) * .5,
                            aabb[3], Z_POS, aabb[5] + offset + offset2
                        ],
                        indices: [0, 1, 0, 2, 0, 3, 1, 4, 1, 5, 6, 7, 8, 9],
                        color: lineColor
                    });

                    this.createMesh(utils.apply(buildVectorTextGeometry({
                        text: "123.0 mm",
                        size: textSize
                    }), {
                        id: axisLabelMeshId,
                        position: [(aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[5] + offset + 0.5],
                        rotation: [90, 180, 180],
                        color: labelColor
                    }));

                    break;


                case 3:

                    this.createMesh({
                        id: axisLineMeshId,
                        primitive: "lines",
                        positions: [
                            aabb[3] + offset, Z_POS, aabb[2],
                            aabb[3] + offset, Z_POS, aabb[5],
                            aabb[3] + 0.5 + offset, Z_POS, aabb[2] + 0.5,
                            aabb[3] - 0.5 + offset, Z_POS, aabb[2] + 0.5,
                            aabb[3] + 0.5 + offset, Z_POS, aabb[5] - 0.5,
                            aabb[3] - 0.5 + offset, Z_POS, aabb[5] - 0.5,

                            aabb[3] + offset + offset2, Z_POS, aabb[2],
                            (aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[2],
                            aabb[3] + offset + offset2, Z_POS, aabb[5],
                            (aabb[0] + aabb[3]) * 0.5, Z_POS, aabb[5]
                        ],
                        indices: [0, 1, 0, 2, 0, 3, 1, 4, 1, 5, 6, 7, 8, 9],
                        color: lineColor
                    });

                    this.createMesh(utils.apply(buildVectorTextGeometry({
                        text: "123.0 mm",
                        size: textSize
                    }), {
                        id: axisLabelMeshId,
                        position: [aabb[3] + offset + 0.5, Z_POS, (aabb[2] + aabb[5]) * 0.5],
                        rotation: [90, 180, -90],
                        color: labelColor
                    }));

                    break;
            }

            meshIds.push(axisLineMeshId);
            meshIds.push(axisLabelMeshId);
        }

        const dimensionsEntity = this.createEntity({
            id: dimensionsEntityId,
            meshIds: meshIds
        });

        this.dimensionsEntities[id] = dimensionsEntity;

        return dimensionsEntity;
    }

    /**
     * Shows or hides the dimensions with the given ID.
     *
     * The ID should correspond to dimensions that were created earlier with {@link createDimensions}.
     *
     * @param {String|Number} id ID of the target dimensions.
     * @param {Boolean} visible Whether to show or hide the target dimensions.
     */
    setDimensionsVisible(id, visible) {
        const entity = this.dimensionsEntities[id];
        if (!entity) {
            return;
        }
        entity.visible = visible;
    }
}

export {DimensionsFootprintModel};