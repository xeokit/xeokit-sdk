import {Map} from "../scene/utils/Map.js";

/**
 * @desc A {@link LocaleService} that wraps an {@link I18n} provider.
 *
 * @implements {LocaleService}
 */
class I18nLocaleService {

    /**
     * Constructs an I18LocaleService.
     *
     * The I18LocaleService is configured with an {@link I18n} (or equivalent implementation), through which
     * it can fetch translations.
     *
     * @param {I18n} i18nProvider The i18n provider.
     */
    constructor(i18nProvider) {

        /**
         * The configured i18n service provider.
         *
         * @property i18nProvider
         * @type {I18n}
         */
        this.i18nProvider = i18nProvider;

        // Event management

        this._eventSubIDMap = null;
        this._eventSubEvents = null;
        this._eventSubs = null;
        this._events = null;
    }

    /**
     * Gets the current locale.
     *
     * @returns {String} The current locale code.
     */
    getCurrentLocale() {
        return this.i18nProvider ? this.i18nProvider.getLocale() : "en";
    }

    /**
     * Gets the list of available locales.
     *
     * @returns {String[]} The list of available locale codes.
     */
    getLocales() {
        return this.i18nProvider ? this.i18nProvider.getLocales() : ["en"];
    }

    /**
     * Sets the current locale.
     *
     * The given locale must be in the list of available locales returned by {@link I18nLocaleService#locales}.
     *
     * When the local has been set and translations are loaded, the I18nLocaleService
     * will fire a "locale" event. At that point, it's possible to get the translations via
     * {@link I18nLocaleService#translate} and {@link I18nLocaleService#translatePlurals}.
     *
     * @param {String} locale The locale to set.
     */
    setLocale(locale) {
        if (this.i18nProvider && this.getLocales().indexOf(locale) !== -1) {
            this.i18nProvider.setLocale(locale, () => {
                this._fire("locale", locale);
            });
        }
    }

    /**
     * Translates the given string according to the current locale.
     *
     * Returns the untranslated phrase if no translation can be found.
     *
     * @param {String} string String to translate.
     * @param {*} args Extra parameters.
     * @returns {String} Translated string.
     */
    translate(string, args = undefined) {
        return this.i18nProvider ? this.i18nProvider.__(string, args) : string;
    }

    /**
     * Translates the given phrase according to the current locale.
     *
     * Returns the untranslated phrase if no translation can be found.
     *
     * @param {String} phrase Phrase to translate.
     * @param {Number} count The plural number.
     * @returns {String} Translated string.
     */
    translatePlurals(phrase, count) {
        return this.i18nProvider ? this.i18nProvider.__n(phrase, count) : phrase;
    }

    /**
     * Fires an event on this I18nLocaleService.
     *
     * Notifies existing subscribers to the event, optionally retains the event to give to
     * any subsequent notifications on the event as they are made.
     *
     * @private
     * @param {String} event The event type name
     * @param {Object} value The event parameters
     * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
     */
    _fire(event, value, forget) {
        if (!this._events) {
            this._events = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
        }
        if (forget !== true) {
            this._events[event] = value || true; // Save notification
        }
        const subs = this._eventSubs[event];
        if (subs) {
            for (const subId in subs) {
                if (subs.hasOwnProperty(subId)) {
                    const sub = subs[subId];
                    sub.callback(value);
                }
            }
        }
    }

    /**
     * Subscribes to an event on this I18nLocaleService.
     *
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link #off}.
     */
    on(event, callback) {
        if (!this._events) {
            this._events = {};
        }
        if (!this._eventSubIDMap) {
            this._eventSubIDMap = new Map(); // Subscription subId pool
        }
        if (!this._eventSubEvents) {
            this._eventSubEvents = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
        }
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = {};
            this._eventSubs[event] = subs;
        }
        const subId = this._eventSubIDMap.addItem(); // Create unique subId
        subs[subId] = {
            callback: callback
        };
        this._eventSubEvents[subId] = event;
        const value = this._events[event];
        if (value !== undefined) {
            callback(value);
        }
        return subId;
    }

    /**
     * Cancels an event subscription that was previously made with {@link I18nLocaleService#on}.
     *
     * @param {String} subId Subscription ID
     */
    off(subId) {
        if (subId === undefined || subId === null) {
            return;
        }
        if (!this._eventSubEvents) {
            return;
        }
        const event = this._eventSubEvents[subId];
        if (event) {
            delete this._eventSubEvents[subId];
            const subs = this._eventSubs[event];
            if (subs) {
                delete subs[subId];
            }
            this._eventSubIDMap.removeItem(subId); // Release subId
        }
    }
}

export {I18nLocaleService};