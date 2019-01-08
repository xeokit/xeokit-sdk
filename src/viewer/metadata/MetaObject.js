/**
 * @desc Metadata corresponding to an {@link Entity} that represents an object.
 *
 * * Belongs to a {@link MetaModel}.
 * * Created by {@link MetaScene#createMetaModel}.
 * * Registered by {@link MetaObject#objectId} in {@link MetaScene#metaObjects}.
 * * {@link MetaModel} represents its composition structure with a tree of MetaObjects, with {@link MetaModel#rootMetaObject} referencing the root MetaObject.
 * * An {@link Entity} represents an object when it has an {@link Entity#objectId}.
 *
 * @class MetaObject
 */
class MetaObject {

    constructor(metaModel, objectId, name, type, properties, parent, children, external) {

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
         * MetaObject instances are registered by this ID in {@link MetaScene#metaObjects}.
         *
         * @property objectId
         * @type {String|Number}
         */
        this.objectId = objectId;

        /**
         * Human-readable name.
         *
         * @property name
         * @type {String}
         */
        this.name = name;

        /**
         * Type - often an IFC product type.
         *
         * @property type
         * @type {String}
         */
        this.type = type;

        if (properties) {

            /**
             * Arbitrary metadata properties.
             *
             * Undefined when no metadata properties are represented.
             *
             * @property properties
             * @type {*}
             */
            this.properties = properties;
        }

        if (parent !== undefined && parent !== null) {

            /**
             * The parent MetaObject within the structure hierarchy.
             *
             * Undefined when this is the root of its structure.
             *
             * @property parent
             * @type {MetaObject}
             */
            this.parent = parent;
        }

        if (children !== undefined && children !== null) {

            /**
             * Child ObjectMeta instances within the structure hierarchy.
             *
             * Undefined when there are no children.
             *
             * @property children
             * @type {Array}
             */
            this.children = children;
        }

        if (external !== undefined && external !== null) {

            /**
             * External application-specific metadata
             *
             * Undefined when there are is no external application-specific metadata.
             *
             * @property external
             * @type {*}
             */
            this.external = external;
        }
    }
}

export {MetaObject};