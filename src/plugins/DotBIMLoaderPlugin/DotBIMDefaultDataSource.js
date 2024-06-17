import {utils} from "../../viewer/scene/utils.js";

/**
 * Default data access strategy for {@link DotBIMLoaderPlugin}.
 *
 * This just loads assets using XMLHttpRequest.
 */
export class DotBIMDefaultDataSource {

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
     * Gets .BIM JSON.
     *
     * @param {String|Number} dotBIMSrc Identifies the .BIM JSON asset.
     * @param {Function} ok Fired on successful loading of the .BIM JSON asset.
     * @param {Function} error Fired on error while loading the .BIM JSON asset.
     */
    getDotBIM(dotBIMSrc, ok, error) {
        utils.loadJSON(this._cacheBusterURL(dotBIMSrc),
            (json) => {
                ok(json);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}