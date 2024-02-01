/**
 * @desc Metadata corresponding to an {@link Entity} that represents an object.
 *
 * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````
 *
 * A MetaObject corresponds to an {@link Entity} by having the same {@link MetaObject#id} as the {@link Entity#id}.
 *
 * A MetaObject is created within {@link MetaScene#createMetaModel} and belongs to a {@link MetaModel}.
 *
 * Each MetaObject is registered by {@link MetaObject#id} in {@link MetaScene#metaObjects}.
 *
 * A {@link MetaModel} represents its object structure with a tree of MetaObjects, with {@link MetaModel#rootMetaObject} referencing
 * the root MetaObject.
 *
 * @class MetaObject
 */
class MetaObject {

    /**
     * @private
     */
    constructor(params) {

        /**
         * The MetaModels that share this MetaObject.
         * @type {MetaModel[]}
         */
        this.metaModels = [];

        /**
         * Globally-unique ID.
         *
         * MetaObject instances are registered by this ID in {@link MetaScene#metaObjects}.
         *
         * @property id
         * @type {String|Number}
         */
        this.id = params.id;

        /**
         * ID of the parent MetaObject.
         * @type {String|Number}
         */
        this.parentId = params.parentId;

        /**
         * The parent MetaObject.
         * @type {MetaObject | null}
         */
        this.parent = null;

        /**
         * ID of the corresponding object within the originating system, if any.
         *
         * @type {String}
         * @abstract
         */
        this.originalSystemId = params.originalSystemId;

        /**
         * Human-readable name.
         *
         * @property name
         * @type {String}
         */
        this.name = params.name;

        /**
         * Type - often an IFC product type.
         *
         * @property type
         * @type {String}
         */
        this.type = params.type;

        /**
         * IDs of PropertySets associated with this MetaObject.
         * @type {[]|*}
         */
        this.propertySetIds = params.propertySetIds;

        /**
         * The {@link PropertySet}s associated with this MetaObject.
         *
         * @property propertySets
         * @type {PropertySet[]}
         */
        this.propertySets = [];

        /**
         * The attributes of this MetaObject.
         * @type {{}}
         */
        this.attributes = params.attributes || {};

        if (params.external !== undefined && params.external !== null) {
        
            /**
             * External application-specific metadata
             *
             * Undefined when there are is no external application-specific metadata.
             *
             * @property external
             * @type {*}
             */
            this.external = params.external;
        }
    }

    /**
     * Backwards compatibility with the object belonging to a single MetaModel.
     * 
     * @property metaModel
     * @type {MetaModel|null}
     **/
    get metaModel() {
        if (this.metaModels.length == 1) {
            return this.metaModels[0];
        }

        return null;
    }

    /**
     * Gets the {@link MetaObject#id}s of the {@link MetaObject}s within the subtree.
     *
     * @returns {String[]} Array of {@link MetaObject#id}s.
     */
    getObjectIDsInSubtree() {
        const objectIds = [];

        function visit(metaObject) {
            if (!metaObject) {
                return;
            }
            objectIds.push(metaObject.id);
            const children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(this);
        return objectIds;
    }


    /**
     * Iterates over the {@link MetaObject}s within the subtree.
     *
     * @param {Function} callback Callback fired at each {@link MetaObject}.
     */
    withMetaObjectsInSubtree(callback) {

        function visit(metaObject) {
            if (!metaObject) {
                return;
            }
            callback(metaObject);
            const children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(this);
    }

    /**
     * Gets the {@link MetaObject#id}s of the {@link MetaObject}s within the subtree that have the given {@link MetaObject#type}s.
     *
     * @param {String[]} types {@link MetaObject#type} values.
     * @returns {String[]} Array of {@link MetaObject#id}s.
     */
    getObjectIDsInSubtreeByType(types) {
        const mask = {};
        for (var i = 0, len = types.length; i < len; i++) {
            mask[types[i]] = types[i];
        }
        const objectIds = [];

        function visit(metaObject) {
            if (!metaObject) {
                return;
            }
            if (mask[metaObject.type]) {
                objectIds.push(metaObject.id);
            }
            const children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(this);
        return objectIds;
    }

    /**
     * Returns properties of this MeteObject as JSON.
     *
     * @returns {{id: (String|Number), type: String, name: String, parent: (String|Number|Undefined)}}
     */
    getJSON() {
        var json = {
            id: this.id,
            type: this.type,
            name: this.name
        };
        if (this.parent) {
            json.parent = this.parent.id
        }
        return json;
    }
}

export {MetaObject};