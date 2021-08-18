/**
 * @desc A property within a {@link PropertySet}.
 *
 * @class Property
 */
class Property {

    /**
     * @private
     */
    constructor(propertySet, name, value, type) {

        /**
         * The {@link PropertySet} this Property belongs to.
         *
         * @property propertySet
         * @type {PropertySet}
         */
        this.propertySet = propertySet;

        /**
         * The name of this property.
         *
         * @property name
         * @type {String}
         */
        this.name = name;

        /**
         * The value of this property.
         *
         * @property value
         * @type {*}
         */
        this.value = value

        /**
         * The type of this property.
         *
         * @property type
         * @type {Number|String}
         */
        this.type = type
    }
}

export {Property};