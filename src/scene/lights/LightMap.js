/**
 A **LightMap** specifies a cube texture light map.

 ## Usage

 ````javascript

 new xeokit.LightMap({
    src: [
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PX.png",
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NX.png",
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PY.png",
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NY.png",
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PZ.png",
        "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NZ.png"
    ]
 });
 ````
 @class LightMap
 @module xeokit
 @submodule lighting
 @constructor
 @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
 @param {*} [cfg] Configs
 @param {String} [cfg.id] Optional ID for this LightMap, unique among all components in the parent scene, generated automatically when omitted.
 @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this LightMap.
 @param [cfg.src=null] {String[]} Paths to six image files to load into this LightMap.
 @param [cfg.flipY=false] {Boolean} Flips this LightMap's source data along its vertical axis when true.
 @param [cfg.encoding="linear"] {String} Encoding format.  See the {@link LightMap/encoding} property for more info.
 @extends Component
 */

import {CubeTexture} from './CubeTexture.js';

class LightMap extends CubeTexture {

    /**
     @private
     */
    get type() {
        return "LightMap";
    }

    constructor(owner, cfg={}) {
        super(owner, cfg);
        this.scene._lightMapCreated(this);
    }

    destroy() {
        super.destroy();
        this.scene._lightMapDestroyed(this);
    }
}

export {LightMap};
