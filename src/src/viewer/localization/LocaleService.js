import {Map} from "./../scene/utils/Map.js";

/**
 * @desc Localization service for a {@link Viewer}.
 *
 * * A LocaleService is a container of string translations ("messages") for various locales.
 * * A {@link Viewer} has its own default LocaleService at {@link Viewer#localeService}.
 * * We can replace that with our own LocaleService, or a custom subclass, via the Viewer's constructor.
 * * Viewer plugins that need localized translations will attempt to them for the currently active locale from the LocaleService.
 * * Whenever we switch the LocaleService to a different locale, plugins will automatically refresh their translations for that locale.
 *
 * ## Usage
 *
 * In the example below, we'll create a {@link Viewer} that uses an {@link XKTLoaderPlugin} to load a BIM model, and a
 * {@link NavCubePlugin}, which shows a camera navigation cube in the corner of the canvas.
 *
 * We'll also configure our Viewer with our own LocaleService instance, configured with English, Māori and French
 * translations for our NavCubePlugin.
 *
 * We could instead have just used the Viewer's default LocaleService, but this example demonstrates how we might
 * configure the Viewer our own custom LocaleService subclass.
 *
 * The translations fetched by our NavCubePlugin will be:
 *
 *  * "NavCube.front"
 *  * "NavCube.back"
 *  * "NavCube.top"
 *  * "NavCube.bottom"
 *  * "NavCube.left"
 *  * "NavCube.right"
 *
 * <br>
 * These are paths that resolve to our translations for the currently active locale, and are hard-coded within
 * the NavCubePlugin.
 *
 * For example, if  the LocaleService's locale is set to "fr", then the path "NavCube.back" will drill down
 * into ````messages->fr->NavCube->front```` and fetch "Arrière".
 *
 * If we didn't provide that particular translation in our LocaleService, or any translations for that locale,
 * then the NavCubePlugin will just fall back on its own default hard-coded translation, which in this case is "BACK".
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#localization_NavCubePlugin)]
 *
 * ````javascript
 * import {Viewer, LocaleService, NavCubePlugin, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *
 *      canvasId: "myCanvas",
 *
 *      localeService: new LocaleService({
 *          messages: {
 *              "en": { // English
 *                  "NavCube": {
 *                      "front": "Front",
 *                      "back": "Back",
 *                      "top": "Top",
 *                      "bottom": "Bottom",
 *                      "left": "Left",
 *                      "right": "Right"
 *                  }
 *              },
 *              "mi": { // Māori
 *                  "NavCube": {
 *                      "front": "Mua",
 *                      "back": "Tuarā",
 *                      "top": "Runga",
 *                      "bottom": "Raro",
 *                      "left": "Mauī",
 *                      "right": "Tika"
 *                  }
 *              },
 *              "fr": { // Francais
 *                  "NavCube": {
 *                      "front": "Avant",
 *                      "back": "Arrière",
 *                      "top": "Supérieur",
 *                      "bottom": "Inférieur",
 *                      "left": "Gauche",
 *                      "right": "Droit"
 *                  }
 *              }
 *          },
 *          locale: "en"
 *      })
 *  });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.03];
 *
 * const navCubePlugin = new NavCubePlugin(viewer, {
 *      canvasID: "myNavCubeCanvas"
 *  });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/Duplex.ifc.xkt",
 *     edges: true
 * });
 * ````
 *
 * We can dynamically switch our Viewer to a different locale at any time, which will update the text on the
 * faces of our NavCube:
 *
 * ````javascript
 * viewer.localeService.locale = "mi"; // Switch to Māori
 * ````
 *
 * We can load new translations at any time:
 *
 * ````javascript
 * viewer.localeService.loadMessages({
 *     "jp": { // Japanese
 *         "NavCube": {
 *             "front": "前部",
 *             "back": "裏",
 *             "top": "上",
 *             "bottom": "底",
 *             "left": "左",
 *             "right": "右"
 *         }
 *     }
 * });
 * ````
 *
 * And we can clear the translations if needed:
 *
 * ````javascript
 * viewer.localeService.clearMessages();
 * ````
 *
 * We can get an "updated" event from the LocaleService whenever we switch locales or load messages, which is useful
 * for triggering UI elements to refresh themselves with updated translations. Internally, our {@link NavCubePlugin}
 * subscribes to this event, fetching new strings for itself via {@link LocaleService#translate} each time the
 * event is fired.
 *
 * ````javascript
 * viewer.localeService.on("updated", () => {
 *     console.log( viewer.localeService.translate("NavCube.left") );
 * });
 * ````
 * @since 2.0
 */
class LocaleService {

    /**
     * Constructs a LocaleService.
     *
     * @param {*} [params={}]
     * @param {JSON} [params.messages]
     * @param {String} [params.locale]
     */
    constructor(params = {}) {

        this._eventSubIDMap = null;
        this._eventSubEvents = null;
        this._eventSubs = null;
        this._events = null;

        this._locale = "en";
        this._messages = {};
        this._locales = [];
        this._locale = "en";

        this.messages = params.messages;
        this.locale = params.locale;
    }

    /**
     * Replaces the current set of locale translations.
     *
     * * Fires an "updated" event when done.
     * * Automatically refreshes any plugins that depend on the translations.
     * * Does not change the current locale.
     *
     * ## Usage
     *
     * ````javascript
     * viewer.localeService.setMessages({
     *     messages: {
     *         "en": { // English
     *             "NavCube": {
     *                 "front": "Front",
     *                 "back": "Back",
     *                 "top": "Top",
     *                 "bottom": "Bottom",
     *                 "left": "Left",
     *                 "right": "Right"
     *             }
     *         },
     *         "mi": { // Māori
     *             "NavCube": {
     *                 "front": "Mua",
     *                 "back": "Tuarā",
     *                 "top": "Runga",
     *                 "bottom": "Raro",
     *                 "left": "Mauī",
     *                 "right": "Tika"
     *             }
     *         }
     *    }
     * });
     * ````
     *
     * @param {*} messages The new translations.
     */
    set messages(messages) {
        this._messages = messages || {};
        this._locales = Object.keys(this._messages);
        this.fire("updated", this);
    }

    /**
     * Loads a new set of locale translations, adding them to the existing translations.
     *
     * * Fires an "updated" event when done.
     * * Automatically refreshes any plugins that depend on the translations.
     * * Does not change the current locale.
     *
     * ## Usage
     *
     * ````javascript
     * viewer.localeService.loadMessages({
     *     "jp": { // Japanese
     *         "NavCube": {
     *             "front": "前部",
     *             "back": "裏",
     *             "top": "上",
     *             "bottom": "底",
     *             "left": "左",
     *             "right": "右"
     *         }
     *     }
     * });
     * ````
     *
     * @param {*} messages The new translations.
     */
    loadMessages(messages = {}) {
        for (let locale in messages) {
            this._messages[locale] = messages[locale];
        }
        this.messages = this._messages;
    }

    /**
     * Clears all locale translations.
     *
     * * Fires an "updated" event when done.
     * * Does not change the current locale.
     * * Automatically refreshes any plugins that depend on the translations, which will cause those
     * plugins to fall back on their internal hard-coded text values, since this method removes all
     * our translations.
     */
    clearMessages() {
        this.messages = {};
    }

    /**
     * Gets the list of available locales.
     *
     * These are derived from the currently configured set of translations.
     *
     * @returns {String[]} The list of available locales.
     */
    get locales() {
        return this._locales;
    }

    /**
     * Sets the current locale.
     *
     * * Fires an "updated" event when done.
     * * The given locale does not need to be in the list of available locales returned by {@link LocaleService#locales}, since
     * this method assumes that you may want to load the locales at a later point.
     * * Automatically refreshes any plugins that depend on the translations.
     * * We can then get translations for the locale, if translations have been loaded for it, via {@link LocaleService#translate} and {@link LocaleService#translatePlurals}.
     *
     * @param {String} locale The new current locale.
     */
    set locale(locale) {
        locale = locale || "de";
        if (this._locale === locale) {
            return;
        }
        this._locale = locale;
        this.fire("updated", locale);
    }

    /**
     * Gets the current locale.
     *
     * @returns {String} The current locale.
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
    translate(msg, args) {
        const localeMessages = this._messages[this._locale];
        if (!localeMessages) {
            return null;
        }
        const localeMessage = resolvePath(msg, localeMessages);
        if (localeMessage) {
            if (args) {
                return vsprintf(localeMessage, args);
            }
            return localeMessage;
        }
        return null;
    }

    /**
     * Translates the given phrase according to the current locale.
     *
     * Returns null if no translation can be found.
     *
     * @param {String} msg Phrase to translate.
     * @param {Number} count The plural number.
     * @param {*} [args] Extra parameters.
     * @returns {String|null} Translated string if found, else null.
     */
    translatePlurals(msg, count, args) {
        const localeMessages = this._messages[this._locale];
        if (!localeMessages) {
            return null;
        }
        let localeMessage = resolvePath(msg, localeMessages);
        count = parseInt("" + count, 10);
        if (count === 0) {
            localeMessage = localeMessage.zero;
        } else {
            localeMessage = (count > 1) ? localeMessage.other : localeMessage.one;
        }
        if (!localeMessage) {
            return null;
        }
        localeMessage = vsprintf(localeMessage, [count]);
        if (args) {
            localeMessage = vsprintf(localeMessage, args);
        }
        return localeMessage;
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
     * Subscribes to an event on this LocaleService.
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
     * Cancels an event subscription that was previously made with {@link LocaleService#on}.
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

function resolvePath(key, json) {
    if (json[key]) {
        return json[key];
    }
    const parts = key.split(".");
    let obj = json;
    for (let i = 0, len = parts.length; obj && (i < len); i++) {
        const part = parts[i];
        obj = obj[part];
    }
    return obj;
}

function vsprintf(msg, args = []) {
    return msg.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
        if (m === "{{") {
            return "{";
        }
        if (m === "}}") {
            return "}";
        }
        return args[n];
    });
}

export {LocaleService};