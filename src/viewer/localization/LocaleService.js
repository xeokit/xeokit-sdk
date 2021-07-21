/**
 * @desc Defines the abstract interface for a localization service that we can configure on a {@link Viewer}.
 *
 * An instance of LocaleService can optionally be supplied to the {@link Viewer} constructor, to configure a central
 * service through which the Viewer and its {@link Plugin}s can obtain locale string translations. The LocalService
 * will then be available at {@link Viewer#localeService}.
 *
 * @interface
 * @abstract
 */
class LocaleService {

    /**
     * @abstract
     */
    constructor() {
    }

    /**
     * Gets the current locale.
     *
     * @returns {string} The current locale code.
     */
    getCurrentLocale() {
    }

    /**
     * Gets the list of available locales.
     *
     * @returns {String[]} The list of available locale codes.
     */
    getLocales() {
    }

    /**
     * Sets the current locale.
     *
     * The given locale must be in the list of available locales returned by {@link LocaleService#locales}.
     *
     * When the local has been set and translations are loaded, the LocaleService will fire a "locale" event, which
     * can be handled via {@link LocaleService#}. At that point, it's then possible to get the translations via
     * {@link LocaleService#translate} and {@link LocaleService#translatePlurals}.
     *
     * @abstract
     * @param {String} locale The locale to set.
     */
    setLocale(locale) {
    }

    /**
     * Translates the given string according to the current locale.
     *
     * Returns the untranslated string if no translation can be found.
     *
     * @abstract
     * @param {String} string String to translate.
     * @param {*} args Extra parameters.
     * @returns {String} Translated string.
     */
    translate(string, args = undefined) {
    }

    /**
     * Translates the given phrase according to the current locale.
     *
     * Returns the untranslated phrase if no translation can be found.
     *
     * @abstract
     * @param {String} phrase Phrase to translate.
     * @param {Number} count The plural number.
     * @returns {String} Translated string.
     */
    translatePlurals(phrase, count) {
    }

    /**
     * Subscribes to an event on this LocaleService.
     *
     * @abstract
     * @param {String} event The event.
     * @param {Function} callback Callback fired on the event.
     * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link LocaleService#off}.
     */
    on(event, callback) {
    }

    /**
     * Cancels an event subscription that was previously made with {@link LocaleService#on}.
     *
     * @abstract
     * @param {String} subId Subscription ID.
     */
    off(subId) {
    }
}

export {LocaleService};