import {utils} from "../../viewer/scene/utils.js";

/**
 * Default data access strategy for {@link GLTFLoaderPlugin}.
 *
 * This just loads assets using XMLHttpRequest.
 */
class GLTFDefaultDataSource {

    constructor() {

    }

    /**
     * Gets metamodel JSON.
     *
     * @param {String|Number} metaModelSrc Identifies the metamodel JSON asset.
     * @param {{Function(*)}} ok Fired on successful loading of the metamodel JSON asset.
     * @param {{Function(*)}} error Fired on error while loading the metamodel JSON asset.
     */
    getMetaModel(metaModelSrc, ok, error) {
        utils.loadJSON(metaModelSrc,
            (json) => {
                ok(json);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
    
    /**
     * Gets glTF JSON.
     *
     * @param {String|Number} glTFSrc Identifies the glTF JSON asset.
     * @param {Function} ok Fired on successful loading of the glTF JSON asset.
     * @param {Function} error Fired on error while loading the glTF JSON asset.
     */
    getGLTF(glTFSrc, ok, error) {
        utils.loadJSON(glTFSrc, 
            (gltf) => {
                ok(gltf);
            },
            function (errMsg) {
                error(errMsg);
            });
    }

    /**
     * Gets glTF JSON.
     *
     * Note that this method requires the source of the glTF JSON asset. This is because the binary attachment
     * source could be relative to the glTF source, IE. it may not be a global ID.
     *
     * @param {String|Number} glTFSrc Identifies the glTF JSON asset.
     * @param {String|Number} binarySrc Identifies the glTF binary asset.
     * @param {Function} ok Fired on successful loading of the glTF binary asset.
     * @param {Function} error Fired on error while loading the glTF binary asset.
     */
    getArrayBuffer(glTFSrc, binarySrc, ok, error) {
        utils.loadArraybuffer(binarySrc,
            (arrayBuffer) => {
                ok(arrayBuffer);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}

export {GLTFDefaultDataSource};