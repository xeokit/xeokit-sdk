/**
 * @desc Information about an ````IfcBuildingStorey````.
 *
 * These are provided by a {@link StoreyViewsPlugin}.
 */
class Storey {

    /**
     * @private
     */
    constructor(plugin, modelAABB, storeyAABB, modelId, storeyId, numObjects) {

        /**
         * The {@link StoreyViewsPlugin} this Storey belongs to.
         *
         * @property plugin
         * @type {StoreyViewsPlugin}
         */
        this.plugin = plugin;

        /**
         * ID of the IfcBuildingStorey.
         *
         * This matches IDs of the IfcBuildingStorey's {@link MetaObject} and {@link Entity}.
         *
         * @property storeyId
         * @type {String}
         */
        this.storeyId = storeyId;

        /**
         * ID of the model.
         *
         * This matches the ID of the {@link MetaModel} that contains the IfcBuildingStorey's {@link MetaObject}.
         *
         * @property modelId
         * @type {String|Number}
         */
        this.modelId = modelId;

        /**
         * Axis-aligned World-space boundary of the {@link Entity}s that represent the IfcBuildingStorey.
         *
         * The boundary is a six-element Float64Array containing the min/max extents of the
         * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
         *
         * @property storeyAABB
         * @type {Number[]}
         */
        this.storeyAABB = storeyAABB.slice();

        /**
         * Axis-aligned World-space boundary of the {@link Entity}s that represent the IfcBuildingStorey.
         *
         * The boundary is a six-element Float64Array containing the min/max extents of the
         * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
         *
         * @deprecated
         * @property storeyAABB
         * @type {Number[]}
         */
        this.aabb = this.storeyAABB;

        /**
         * Axis-aligned World-space boundary of the {@link Entity}s that represent the model.
         *
         * The boundary is a six-element Float64Array containing the min/max extents of the
         * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
         *
         * @property modelAABB
         * @type {Number[]}
         */
        this.modelAABB = modelAABB.slice();

        /** Number of {@link Entity}s within the IfcBuildingStorey.
         *
         * @property numObjects
         * @type {Number}
         */
        this.numObjects = numObjects;
    }
}

export {Storey};