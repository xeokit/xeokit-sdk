import {Map} from "../utils/Map.js";

const ids = new Map({});

/**
 A **RenderState** represents a chunk of state changes applied by the {{#crossLink "Scene"}}Scene{{/crossLink}}'s renderer while it renders a frame.

 * Contains properties that represent the state changes.
 * Has a unique automatically-generated numeric ID, which the renderer can use to sort these, in order to avoid applying redundant state changes for each frame.
 * Initialize your own properties on a RenderState via its constructor.

 @class RenderState
 @constructor
 @module xeokit
 @submodule webgl
 @param cfg {*} RenderState configuration
 */
class RenderState {

    constructor(cfg) {

        /**
         The RenderState's ID, unique within the renderer.
         @property
         @type Number
         @final
         */
        this.id = ids.addItem({});
        for (const key in cfg) {
            if (cfg.hasOwnProperty(key)) {
                this[key] = cfg[key];
            }
        }
    }

    /**
     Destroys this RenderState.
     @method destroy
     */
    destroy() {
        ids.removeItem(this.id);
    }
}

export {RenderState};