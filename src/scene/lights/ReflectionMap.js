import {CubeTexture} from './CubeTexture.js';

/**
 * @desc A reflection cube map.
 *
 * ## Usage
 *
 * ````javascript
 * new ReflectionMap(myViewer.scene, {
 *     src: [
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PX.png",
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NX.png",
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PY.png",
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NY.png",
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PZ.png",
 *         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NZ.png"
 *     ]
 * });
 * ````
 */
class ReflectionMap extends CubeTexture {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type {String}
     @final
     */
    get type() {
        return "ReflectionMap";
    }

    /**
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID for this ReflectionMap, unique among all components in the parent scene, generated automatically when omitted.
     * @param {String[]} [cfg.src=null]  Paths to six image files to load into this ReflectionMap.
     * @param {Boolean} [cfg.flipY=false] Flips this ReflectionMap's source data along its vertical axis when true.
     * @param {String} [cfg.encoding="linear"]  Encoding format.  See the {@link ReflectionMap/encoding} property for more info.
     */
    constructor(owner, cfg = {}) {
        super(owner, cfg);
        this.scene._lightsState.addReflectionMap(this._state);
        this.scene._reflectionMapCreated(this);
    }

    /**
     * Destroys this ReflectionMap.
     */
    destroy() {
        super.destroy();
        this.scene._reflectionMapDestroyed(this);
    }
}

export {ReflectionMap};
