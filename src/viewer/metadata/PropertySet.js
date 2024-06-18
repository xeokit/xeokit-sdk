import {Property} from "./Property.js";

/**
 * @desc A set of properties associated with one or more {@link MetaObject}s.
 *
 * A PropertySet is created within {@link MetaScene#createMetaModel} and belongs to a {@link MetaModel}.
 *
 * Each PropertySet is registered by {@link PropertySet#id} in {@link MetaScene#propertySets} and {@link MetaModel#propertySets}.
 *
 * @class PropertySet
 */
class PropertySet {

    /**
     * @private
     */
    constructor(params) {

        /**
         * Globally-unique ID for this PropertySet.
         *
         * PropertySet instances are registered by this ID in {@link MetaScene#propertySets} and {@link MetaModel#propertySets}.
         *
         * @property id
         * @type {String}
         */
        this.id = params.id;

        /**
         * ID of the corresponding object within the originating system, if any.
         *
         * @type {String}
         * @abstract
         */
        this.originalSystemId = params.originalSystemId;

        /**
         * The MetaModels that share this PropertySet.
         * @type {MetaModel[]}
         */
        this.metaModels = [];

        /**
         * Human-readable name of this PropertySet.
         *
         * @property name
         * @type {String}
         */
        this.name = params.name;

        /**
         * Type of this PropertySet.
         *
         * @property type
         * @type {String}
         */
        this.type = params.type;

        /**
         * Properties within this PropertySet.
         *
         * @property properties
         * @type {Property[]}
         */
        this.properties = [];

        if (params.properties) {
            const properties = params.properties;
            for (let i = 0, len = properties.length; i < len; i++) {
                const property = properties[i];
                if (Number.isInteger(property)) { // Will decompress in MetaModel.finalize();
                    this.properties.push(property);
                } else {
                    this.properties.push(new Property(property.name, property.value, property.type, property.valueType, property.description));
                }
            }
        }
    }
}

export {PropertySet};