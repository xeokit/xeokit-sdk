import {utils} from "../../viewer/scene/utils.js";

/**
 * Default data access strategy for {@link DotBIMLoaderPlugin}.
 *
 * This just loads assets using XMLHttpRequest.
 */
export class DotBIMDefaultDataSource {

    constructor() {
    }

    /**
     * Gets .BIM JSON.
     *
     * @param {String|Number} dotBIMSrc Identifies the .BIM JSON asset.
     * @param {Function} ok Fired on successful loading of the .BIM JSON asset.
     * @param {Function} error Fired on error while loading the .BIM JSON asset.
     */
    getDotBIM(dotBIMSrc, ok, error) {
        utils.loadJSON(dotBIMSrc,
            (json) => {
                ok(json);
            },
            function (errMsg) {
                error(errMsg);
            });
    }
}