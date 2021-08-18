/**
 * @desc A set of properties associated with one or more {@link MetaObject}s.
 *
 * A PropertySet is used by an {@link MetaObject} when {@link MetaObject#propertySetId} matches {@link PropertySet#id}. Multiple {@link MetaObject}'s can  share the same PropertySets.
 *
 * A PropertySet is created within {@link MetaScene#createMetaModel} and belongs to a {@link MetaModel}.
 *
 * Each PropertySet is registered by {@link PropertySet#id} in {@link MetaScene#propertySets} and {@link MetaModel#propertySets}.
 *
 * @class PropertySet
 */
class PropertySet {

    constructor(metaModel, id, originalSystemId, name, type, properties) {

        /**
         * Model metadata.
         *
         * @property metaModel
         * @type {MetaModel}
         */
        this.metaModel = metaModel;

        /**
         * Globally-unique ID.
         *
         * PropertySet instances are registered by this ID in {@link MetaScene#propertySets} and {@link MetaModel#propertySets}.
         *
         * When a {@link MetaObject} uses this PropertySet, then {@link MetaObject#propertySetId} will match {@link MetaObject#id}.
         *
         * @property id
         * @type {String}
         */
        this.id = id;

        /**
         * ID of the corresponding object within the originating system, if any.
         *
         * @type {String}
         * @abstract
         */
        this.originalSystemId = originalSystemId;

        /**
         * Human-readable name.
         *
         * @property name
         * @type {String}
         */
        this.name = name;

        /**
         * Type.
         *
         * @property type
         * @type {String}
         */
        this.type = type;

        /**
         * Arbitrary properties.
         *
         * @property properties
         * @type {*}
         */
        this.properties = properties || [];
    }
}

export {PropertySet};