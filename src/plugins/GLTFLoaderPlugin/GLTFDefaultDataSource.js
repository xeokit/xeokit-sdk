import {utils} from "../../viewer/scene/utils.js";
import {core} from "../../viewer/scene/core.js";

/**
 * Default data access strategy for {@link GLTFLoaderPlugin}.
 *
 * This just loads assets using XMLHttpRequest.
 */
class GLTFDefaultDataSource {

    constructor(cfg = {}) {
        this.cacheBuster = (cfg.cacheBuster !== false);
    }

    _cacheBusterURL(url) {
        if (!this.cacheBuster) {
            return url;
        }
        const timestamp = new Date().getTime();
        if (url.indexOf('?') > -1) {
            return url + '&_=' + timestamp;
        } else {
            return url + '?_=' + timestamp;
        }
    }

    /**
     * Gets metamodel JSON.
     *
     * @param {String|Number} metaModelSrc Identifies the metamodel JSON asset.
     * @param {Function} ok Fired on successful loading of the metamodel JSON asset.
     * @param {Function} error Fired on error while loading the metamodel JSON asset.
     */
    getMetaModel(metaModelSrc, ok, error) {
        utils.loadJSON(this._cacheBusterURL(metaModelSrc),
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
        utils.loadArraybuffer(this._cacheBusterURL(glTFSrc),
            (gltf) => {
                ok(gltf);
            },
            function (errMsg) {
                error(errMsg);
            });
    }

    /**
     * Gets binary glTF file.
     *
     * @param {String|Number} glbSrc Identifies the .glb asset.
     * @param {Function} ok Fired on successful loading of the .glb asset.
     * @param {Function} error Fired on error while loading the .glb asset.
     */
    getGLB(glbSrc, ok, error) {
        utils.loadArraybuffer(this._cacheBusterURL(glbSrc),
            (arraybuffer) => {
                ok(arraybuffer);
            },
            function (errMsg) {
                error(errMsg);
            });
    }

    /**
     * Gets glTF binary attachment.
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
        loadArraybuffer(this._cacheBusterURL(glTFSrc), binarySrc,
            (arrayBuffer) => {
                ok(arrayBuffer);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}

function loadArraybuffer(glTFSrc, binarySrc, ok, err) {
    // Check for data: URI
    var defaultCallback = () => {
    };
    ok = ok || defaultCallback;
    err = err || defaultCallback;
    const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
    const dataUriRegexResult = binarySrc.match(dataUriRegex);
    if (dataUriRegexResult) { // Safari can't handle data URIs through XMLHttpRequest
        const isBase64 = !!dataUriRegexResult[2];
        var data = dataUriRegexResult[3];
        data = window.decodeURIComponent(data);
        if (isBase64) {
            data = window.atob(data);
        }
        try {
            const buffer = new ArrayBuffer(data.length);
            const view = new Uint8Array(buffer);
            for (var i = 0; i < data.length; i++) {
                view[i] = data.charCodeAt(i);
            }
            core.scheduleTask(function () {
                ok(buffer);
            });
        } catch (error) {
            core.scheduleTask(function () {
                err(error);
            });
        }
    } else {
        const basePath = getBasePath(glTFSrc);
        const url = basePath + binarySrc;
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    ok(request.response);
                } else {
                    err('loadArrayBuffer error : ' + request.response);
                }
            }
        };
        request.send(null);
    }
}

function getBasePath(src) {
    var i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

export {GLTFDefaultDataSource};