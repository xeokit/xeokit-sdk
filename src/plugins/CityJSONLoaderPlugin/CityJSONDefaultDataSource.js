import {utils} from "../../viewer/index.js";

/**
 * Default data access strategy for {@link CityJSONLoaderPlugin}.
 */
class CityJSONDefaultDataSource {

    constructor() {
    }

    /**
     * Gets the contents of the given CityJSON file.
     *
     * @param {String|Number} src Path or ID of an CityJSON file.
     * @param {Function} ok Callback fired on success, argument is the CityJSON JSON.
     * @param {Function} error Callback fired on error.
     */
    getCityJSON(src, ok, error) {
        utils.loadJSON(src,
            (json) => {
                ok(json);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}

export {CityJSONDefaultDataSource};
