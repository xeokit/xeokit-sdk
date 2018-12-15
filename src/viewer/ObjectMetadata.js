/**
 * Metadata for a {@link Object} within a {@link Viewer}'s {@link Scene}.
 *
 * * Normally represents IFC metadata, but can represent other schemas as well.
 * * Kept within the object map and structure tree in {@link Viewer#metadata}.
 * * Only exist for {@link Model}s that were loaded by
 * {@link ModelsPlugin}s that also loaded metadata.
 *
 * @class ObjectMetadata
 */
class ObjectMetadata {

    constructor(cfg) {

        /**
         * ID of the ObjectMetadata.
         *
         * @property id
         * @type {String|Number}
         */
        this.id = cfg.id;

        /**
         * Human-readable name.
         *
         * @property name
         * @type {String}
         */
        this.name = cfg.name;

        /**
         * Type - usually IFC.
         *
         * @property type
         * @type {String}
         */
        this.type = cfg.type;

        /**
         * Globally-unique ID.
         *
         * @property guid
         * @type {String}
         */
        this.guid = cfg.guid;

        if (cfg.properties) {

            /**
             * Arbitrary properties.
             *
             * Undefined when no properties are represented.
             *
             * @property children
             * @type {{Array of ObjectMetadata}}
             */
            this.properties = cfg.properties;
        }

        if (cfg.parent !== undefined && cfg.parent !== null) {

            /**
             * ID of parent ObjectMetadata, unless this is a root.
             *
             * Undefined when this is a root.
             *
             * @property parent
             * @type {ObjectMetadata}
             */
            this.parent = cfg.parent;
        }
        
        if (cfg.gid !== undefined && cfg.gid !== null) {
            
            /**
             * Geometry ID.
             *
             * Undefined when there is no geometry.
             *
             * @property gid
             * @type {Number|String}
             */
            this.gid = cfg.gid;
        }
        
        if (cfg.children !== undefined && cfg.children !== null) {

            /**
             * Child ObjectMetadata instances, if this is a parent.
             *
             * Undefined when there are no children.
             *
             * @property children
             * @type {Array}
             */
            this.children = cfg.children;
        }
    }
}

export {ObjectMetadata};