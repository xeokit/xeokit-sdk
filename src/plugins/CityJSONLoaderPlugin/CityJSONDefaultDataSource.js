import {utils} from "../../viewer/index.js";

/**
 * Default data access strategy for {@link CityJSONLoaderPlugin}.
 */
class CityJSONDefaultDataSource {

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
     * Gets the contents of the given CityJSON file.
     *
     * @param {String|Number} src Path or ID of an CityJSON file.
     * @param {Function} ok Callback fired on success, argument is the CityJSON JSON.
     * @param {Function} error Callback fired on error.
     */
    getCityJSON(src, ok, error) {
        utils.loadJSON(this._cacheBusterURL(src),
            (json) => {
                ok(json);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}

export {CityJSONDefaultDataSource};
