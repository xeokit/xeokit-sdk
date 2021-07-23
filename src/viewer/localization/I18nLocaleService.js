import {LocaleService} from "./LocaleService.js";

/**
 * @desc An in8n-based localization service for a {@link Viewer}.
 *
 * * A ````I18nLocaleService```` is a container of string translations for various locales.
 * * A {@link Viewer} has its own default ````I18nLocaleService```` at {@link Viewer#localeService}.
 * * We can replace that with our own ````I18nLocaleService```` (or any custom {@link LocaleService} subclass), via the Viewer's constructor.
 * * Viewer plugins that show text will attempt to fetch translations for the currently active locale from the ````I18nLocaleService````.
 * * Whenever we switch the ````I18nLocaleService```` to a different locale, plugins will automatically re-fetch their translations for that locale.
 *
 * ## Usage
 *
 * In the example below, we'll create a {@link Viewer} that uses an {@link XKTLoaderPlugin} to load a BIM model, and a
 * {@link NavCubePlugin}, which shows a camera navigation cube in the corner of the canvas.
 *
 * We'll also configure our Viewer with our own ````I18nLocaleService```` instance, configured with English, Māori and French
 * translations for our NavCubePlugin. Remember that we could also just use the Viewer's default ````I18nLocaleService````,
 * but this example also shows how we might configure the Viewer our own custom {@link LocaleService} subclass, if we needed to
 * do that.
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
 * For example, if  the ````I18nLocaleService````'s locale is set to "fr", then the path "NavCube.back" will drill down
 * into ````messages->fr->NavCube->front```` and fetch "Arrière".
 *
 * If we didn't provide that particular translation in our ````I18nLocaleService````, or any translations for that locale,
 * then the NavCubePlugin will just fall back on its own default hard-coded translation, which in this case is "BACK".
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#localization_NavCubePlugin)]
 *
 * ````javascript
 * import {Viewer, I18nLocaleService, NavCubePlugin, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *
 *      canvasId: "myCanvas",
 *
 *      localeService: new I18nLocaleService({
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
 * We can get an "updated" event from the ````I18nLocaleService```` whenever we switch locales or load messages, which is useful
 * for triggering UI elements to refresh themselves with updated translations. Internally, our {@link NavCubePlugin}
 * subscribes to this event, fetching new strings for itself via {@link I18nLocaleService#translate} each time the
 * event is fired.
 *
 * ````javascript
 * viewer.localeService.on("updated", () => {
 *     console.log( viewer.localeService.translate("NavCube.left") );
 * });
 * ````

 * @extends {LocaleService}
 * @since 2.0
 */
class I18nLocaleService extends LocaleService {

    /**
     * Constructs an I18LocaleService.
     *
     * @param {*} [params={}]
     * @param {JSON} [params.messages]
     * @param {String} [params.locale]
     */
    constructor(params = {}) {

        super();

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
     * * The given locale must be in the list of available locales returned by {@link I18nLocaleService#locales}.
     * * Automatically refreshes any plugins that depend on the translations.
     * * We can then get translations for the locale via {@link I18nLocaleService#translate} and {@link I18nLocaleService#translatePlurals}.
     *
     * @param {String} locale The new current locale.
     */
    set locale(locale) {
        if (this._locale === locale) {
            return;
        }
        if (this._locales.indexOf(locale) === -1) {
            console.error(`Locale not found: '${locale}'`);
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

export {I18nLocaleService};