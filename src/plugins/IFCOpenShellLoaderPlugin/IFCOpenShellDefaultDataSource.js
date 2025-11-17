
/**
 * Default data access strategy for {@link IFCOpenShellLoaderPlugin}.
 *
 * This just loads assets using XMLHttpRequest.
 */
export class IFCOpenShellDefaultDataSource {

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
     * Gets the contents of the given IFC file in an arraybuffer.
     *
     * @param {String|Number} src Path or ID of an IFC file.
     * @param {Function} ok Callback fired on success, argument is the IFC file in an arraybuffer.
     * @param {Function} error Callback fired on error.
     */
    getIFC(src, ok, error) {
        src = this._cacheBusterURL(src);

        var defaultCallback = () => {
        };
        ok = ok || defaultCallback;
        error = error || defaultCallback;
        const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
        const dataUriRegexResult = src.match(dataUriRegex);
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
                ok(buffer);
            } catch (errMsg) {
                error(errMsg);
            }
        } else {
            const request = new XMLHttpRequest();
            request.open('GET', src, true);
            request.responseType = 'text';
            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        ok(request.response);
                    } else {
                        error('getIFC error : ' + request.response);
                    }
                }
            };
            request.send(null);
        }
    }
}