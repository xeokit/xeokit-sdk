/**
 * @desc A property within a {@link PropertySet}.
 *
 * @class Property
 */
class Property {

    /**
     * @private
     */
    constructor(name, value, type, valueType, description) {

        /**
         * The name of this property.
         *
         * @property name
         * @type {String}
         */
        this.name = name;

        /**
         * The type of this property.
         *
         * @property type
         * @type {Number|String}
         */
        this.type = type

        /**
         * The value of this property.
         *
         * @property value
         * @type {*}
         */
        this.value = value

        /**
         * The type of this property's value.
         *
         * @property valueType
         * @type {Number|String}
         */
        this.valueType = valueType;

        /**
         * Informative text to explain the property.
         *
         * @property name
         * @type {String}
         */
        this.description = description;
    }
}

export {Property};