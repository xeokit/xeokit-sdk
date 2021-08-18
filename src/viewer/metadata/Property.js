/**
 * @desc A property within a {@link PropertySet}.
 *
 * @class Property
 */
class Property {

    /**
     * @private
     */
    constructor(name, value, type) {

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