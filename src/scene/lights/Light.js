import {Component} from '../Component.js';

/**
 A dynamic light source within a {@link Scene}.

 These are registered by {@link Light#id} in {@link Scene#lights}.
 */
class Light extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Light";
    }

    /**
     * @private
     */
    get isLight() {
        return true;
    }

    constructor(owner, cfg={}) {
        super(owner, cfg);
    }
}

export {Light};
