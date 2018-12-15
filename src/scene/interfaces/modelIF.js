/**
 The **Model** interface defines the contract implemented by models in xeokit.

 Model is implemented by (at least):

 * {{#crossLink "GLTFModel"}}{{/crossLink}}, which loads its components from glTF files and supports physically-based materials, if needed for a realistic appearance.
 * {{#crossLink "OBJModel"}}{{/crossLink}}, which loads its components from .OBJ and .MTL files and renders using Phong shading.
 * {{#crossLink "STLModel"}}{{/crossLink}}, which loads its components from .STL files and renders using Phong shading.
 * {{#crossLink "SceneJSModel"}}{{/crossLink}}, which loads its components from SceneJS scene definitions and renders using Phong shading.
 * {{#crossLink "BuildableModel"}}{{/crossLink}}, which extends Model with a fluent API for building its components.

 @class ModelIF
 @module xeokit
 @submodule models
 */
class ModelIF {

    /**
     All contained {{#crossLink "Object"}}Objects{{/crossLink}}, mapped to their IDs.

     @property objects
     @final
     @type {{String:Object}}
     */

    /**
     {{#crossLink "Object"}}Objects{{/crossLink}} in this Model that have GUIDs, mapped to their GUIDs.

     Each Object is registered in this map when its {{#crossLink "Object/guid:property"}}{{/crossLink}} is
     assigned a value.

     @property guidObjects
     @final
     @type {{String:Object}}
     */

    /**
     All contained {{#crossLink "Mesh"}}Meshes{{/crossLink}}, mapped to their IDs.

     @property meshes
     @final
     @type {String:xeokit.Mesh}
     */

    /**
     {{#crossLink "Object"}}Objects{{/crossLink}} in this Model that have entity types, mapped to their IDs.

     Each Object is registered in this map when its {{#crossLink "Object/entityType:property"}}{{/crossLink}} is
     set to value.

     @property entities
     @final
     @type {{String:Object}}
     */

    /**
     For each entity type, a map of IDs to {{#crossLink "Object"}}Objects{{/crossLink}} of that entity type.

     Each Object is registered in this map when its {{#crossLink "Object/entityType:property"}}{{/crossLink}} is
     assigned a value.

     @property entityTypes
     @final
     @type {String:{String:xeokit.Component}}
     */


    /**
     Destroys all {{#crossLink "Component"}}Components{{/crossLink}} in this Model.
     @method clear
     */

    /**
     Convenience array of entity type IDs in {{#crossLink "Model/entityTypes:property"}}{{/crossLink}}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */

    /**
     Convenience array of entity type IDs in {{#crossLink "Model/entityTypes:property"}}{{/crossLink}}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */


    /**
     Convenience array of IDs in {{#crossLink "Model/entities:property"}}{{/crossLink}}.
     @property entityIds
     @final
     @type {Array of String}
     */

}
