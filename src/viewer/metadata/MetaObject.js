/**
 * @desc Metadata corresponding to an object within a model within a {@link Scene}.
 *
 * * Belongs to a {@link MetaModel}.
 * * Created by {@link MetaScene#createMetaModel}.
 * * Registered by {@link MetaObject#objectId} in {@link MetaScene#metaObjects}.
 * * A MetaObject may correspond to a real object within a {@link Scene}.
 * * A {@link Scene} object is represented by either a {@link Node} that has an {@link Node#objectId} or a {@link Mesh} that has a {@link Mesh#objectId}.
 * * {@link MetaModel} represents its composition structure with a tree of MetaObjects, with {@link MetaModel#rootMetaObject} referencing the root MetaObject.
 *
 * @class MetaObject
 */
class MetaObject {

    constructor(metaModel, objectId, extId, name, type, gid, properties, parent, children) {

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
         * External ID.
         *
         * This ID ties the MetaObject to systems external to xeokit, such as BIMServer.
         *
         * @property extId
         * @type {String|Number}
         */
        this.extId = extId;

        /**
         * Model metadata.
         *
         * @property metaModel
         * @type {MetaModel}
         */
        this.metaModel = metaModel;

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

        if (gid !== undefined && gid !== null) {

            /**
             * Geometry ID.
             *
             * Undefined when there is no geometry.
             *
             * @property gid
             * @type {Number|String}
             */
            this.gid = gid;
        }

        if (properties) {

            /**
             * Arbitrary properties.
             *
             * Undefined when no properties are represented.
             *
             * @property children
             * @type {{Array of MetaObject}}
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
    }

    getJSON() {

        function visit(metaObject) {
            metaObjects.push(metaObjects);
            for (var metaObjectId in metaObjects) {
                if (this.metaObjects.hasOwnProperty(metaObjectId)) {
                    var metaObject = this.metaObjects[metaObjectId];
                    metaObjects.push(metaObject.toJSON());
                }
            }
        }

        var json = {
            objectId: this.objectId,
            extId: this.extId,
            type: this.type,
            name: this.name
        };
        if (this.gid) {
            json.gid = this.gid;
        }
        if (this.parent) {
            json.parent = this.parent.objectId
        }
        return json;
    }
}

export {MetaObject};