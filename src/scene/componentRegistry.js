/**
 * Map of xeokit component classes.
 *
 * This assists:
 *
 * - validation of construction of component assemblies
 * - instantiation of components from JSON (ie. where the JSON specifies the class name in 'type')
 */
const registry = {
    types: {},
    roles: {},
    register: function(type, roles, claz) {

    }
};

export {registry};