import {Group} from "../objects/Group.js";

/**
 A model implemented by a {@link Group}.

 @implements {Model}

 */
class GroupModel extends Group {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "GroupModel";
    }

    /**
     * @private
     */
    get isModel() {
        return true;
    }
}

export {GroupModel};