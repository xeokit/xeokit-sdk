/**
 The **Entity** interface defines the contract implemented by models in xeokit.
 
 @class EntityIF
 @module xeokit
 @submodule models
 */
class EntityIF {

    /**
     All contained {{#crossLink "Object"}}Objects{{/crossLink}}, mapped to their IDs.

     @property objects
     @final
     @type {{String:Object}}
     */

    /**
     {{#crossLink "Object"}}Objects{{/crossLink}} in this Entity that have GUIDs, mapped to their GUIDs.

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
     {{#crossLink "Object"}}Objects{{/crossLink}} in this Entity that have entity types, mapped to their IDs.

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
     Destroys all {{#crossLink "Component"}}Components{{/crossLink}} in this Entity.
     @method clear
     */

    /**
     Convenience array of entity type IDs in {{#crossLink "Entity/entityTypes:property"}}{{/crossLink}}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */

    /**
     Convenience array of entity type IDs in {{#crossLink "Entity/entityTypes:property"}}{{/crossLink}}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */


    /**
     Convenience array of IDs in {{#crossLink "Entity/entities:property"}}{{/crossLink}}.
     @property entityIds
     @final
     @type {Array of String}
     */

}
