/**
 * Default data access strategy for {@link STLLoaderPlugin}.
 *
 * This implementation simply loads STL files using XMLHttpRequest.
 */
class STLDefaultDataSource {

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
     * Gets STL data.
     *
     * @param {String|Number} src Identifies the STL file.
     * @param {Function} ok Fired on successful loading of the STL file.
     * @param {Function} error Fired on error while loading the STL file.
     */
    getSTL(src, ok, error) {
        src = this._cacheBusterURL(src);
        const request = new XMLHttpRequest();
        request.overrideMimeType("application/json");
        request.open('GET', src, true);
        request.responseType = 'arraybuffer';
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    ok(request.response);
                } else {
                    error(request.statusText);
                }
            }
        };
        request.send(null);
    }
}

export {STLDefaultDataSource};