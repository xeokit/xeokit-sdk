import {utils} from "../scene";

/**
 * @desc An I18n provider that loads translations from a directory of JSON files.
 */
class I18n {

    /**
     * Constructs an I18n.
     *
     * @param {*} options Constructor options.
     */
    constructor(options) {

        this._localeCache = {}

        this.defaultLocale = "en";
        this.directory = "/locales";
        this.extension = ".json";

        for (let prop in options) {
            this[prop] = options[prop];
        }

        this.setLocale(this.locale);
    }

    /**
     * Gets the current locale.
     *
     * @return {String} The current locale.
     */
    getLocale() {
        return this.locale;
    }

    /**
     * Sets the current locale.
     *
     * @param {String} locale The new locale.
     * @param {Function} ok Callback fired once the locale has been set and translations become available.
     */
    setLocale(locale, ok) {
        if (!ok) {
            throw "Argument expected: ok";
        }
        if (!locale) {
            locale = document.documentElement.lang;
        }
        if (!locale) {
            locale = this.defaultLocale;
        }
        this.locale = locale;
        if (locale in this._localeCache) {
            return;
        }
        this._getLocaleFileFromServer(ok);
    }

    _getLocaleFileFromServer(ok) {
        utils.loadJSON(this.directory + "/" + this.locale + this.extension,
            (json) => {
                this._localeCache[this.locale] = json;
                ok();
            },
            function (errMsg) {
                console.error(errMsg);
                ok()
            });
    }

    /**
     * Translates a single phrase and adds it to locales if unknown.
     *
     * Returns translated parsed and substituted string.
     *
     * @public
     * @return {String}
     */
    __() {
        let msg = this._localeCache[this.locale][arguments[0]];
        if (arguments.length > 1) {
            msg = vsprintf(msg, Array.prototype.slice.call(arguments, 1));
        }
        return msg;
    }

    /**
     * Plurals translation of a single phrase. Singular and plural forms will get added to locales if unknown.
     * Returns translated parsed and substituted string based on last count parameter.
     *
     * @public
     * @param {String} singular The phrase.
     * @param {Number} count The plural count.
     * @return {String} The translated phrase.
     */
    __n(singular, count) {
        let msg = this._localeCache[this.locale][singular];
        count = parseInt("" + count, 10);
        if (count === 0) {
            msg = msg.zero;
        } else {
            msg = count > 1 ? msg.other : msg.one;
        }
        msg = vsprintf(msg, [count]);
        if (arguments.length > 2) {
            msg = vsprintf(msg, Array.prototype.slice.call(arguments, 2));
        }
        return msg;
    }
}

function vsprintf(msg, args = []) {
    return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
        if (m === "{{") {
            return "{";
        }
        if (m === "}}") {
            return "}";
        }
        return args[n];
    });
}

export {I18n};