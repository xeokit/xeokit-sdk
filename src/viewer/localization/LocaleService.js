import {Map} from "../scene/utils/Map.js";

/**
 * @desc Defines the abstract base class for a localization service that we can configure on a {@link Viewer}.
 *
 * A concrete sub-class of LocaleService can optionally be supplied to the {@link Viewer} constructor, to configure a central
 * service through which the Viewer and its {@link Plugin}s can obtain locale string translations.
 *
 * The LocalService will then be available at {@link Viewer#localeService}.
 *
 * @abstract
 * @since 2.0
 */
class LocaleService {

    /**
     * Constructs a new LocalService.
     */
    constructor() {

        this._eventSubIDMap = null;
        this._eventSubEvents = null;
        this._eventSubs = null;
        this._events = null;

        this._locale = "en";
    }

    /**
     * Gets the list of available locales.
     *
     * @returns {String[]} The list of available locale codes.
     */
    get locales() {
        return [];
    }

    /**
     * Sets the current locale.
     *
     * The given locale must be in the list of available locales returned by {@link LocaleService#locales}.
     *
     * When the local has been set and translations are loaded, the LocaleService will fire a "updated" event.
     *
     * At that point, it's possible to get the translations for the locale via {@link LocaleService#translate}
     * and {@link LocaleService#translatePlurals}.
     *
     * @param {String} locale The new current locale.
     */
    set locale(locale) {
        this._locale = locale;
        this.fire("locale", locale);
    }

    /**
     * Gets the current locale.
     *
     * @returns {string} The current locale code.
     */
    get locale() {
        return this._locale;
    }

    /**
     * Translates the given string according to the current locale.
     *
     * Returns null if no translation can be found.
     *
     * @param {String} msg String to translate.
     * @param {*} [args] Extra parameters.
     * @returns {String|null} Translated string if found, else null.
     */
    translate(msg, args = undefined) {
        return null;
    }

    /**
     * Translates the given phrase according to the current locale.
     *
     * Returns null if no translation can be found.
     *
     * @param {String} phrase Phrase to translate.
     * @param {Number} count The plural number.
     * @param {*} [args] Extra parameters.
     * @returns {String|null} Translated string if found, else null.
     */
    translatePlurals(phrase, count, args) {
        return null;
    }

    /**
     * Fires an event on this LocaleService.
     *
     * Notifies existing subscribers to the event, optionally retains the event to give to
     * any subsequent notifications on the event as they are made.
     *
     * @param {String} event The event type name.
     * @param {Object} value The event parameters.
     * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers.
     */
    fire(event, value, forget) {
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
     * Subscribes to an event on this LocalService.
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
     * Cancels an event subscription that was previously made with {@link LocalService#on}.
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

export {LocaleService};