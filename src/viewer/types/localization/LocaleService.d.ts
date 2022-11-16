export declare type LocaleServiceConfiguration = {
  messages: any;
  locale?: string;
};

/**
 * Localization service for a {@link Viewer}.
 */
export declare class LocaleService {
  /**
   * @constructor
   * @param {LocaleServiceConfiguration} cfg LocaleService configuration
   */
  constructor(cfg?: LocaleServiceConfiguration);

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

  set messages(arg: any);

  /**
   * Sets the current locale.
   *
   * * Fires an "updated" event when done.
   * * The given locale does not need to be in the list of available locales returned by {@link LocaleService.locales}, since
   * this method assumes that you may want to load the locales at a later point.
   * * Automatically refreshes any plugins that depend on the translations.
   * * We can then get translations for the locale, if translations have been loaded for it, via {@link LocaleService.translate} and {@link LocaleService.translatePlurals}.
   *
   * @param {String} locale The new current locale.
   */
  set locale(arg: string);

  /**
   * Gets the current locale.
   *
   * @returns {String} The current locale.
   */
  get locale(): string;

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
  loadMessages(messages?: any): void;

  /**
   * Clears all locale translations.
   *
   * * Fires an "updated" event when done.
   * * Does not change the current locale.
   * * Automatically refreshes any plugins that depend on the translations, which will cause those
   * plugins to fall back on their internal hard-coded text values, since this method removes all
   * our translations.
   */
  clearMessages(): void;

  /**
   * Gets the list of available locales.
   *
   * These are derived from the currently configured set of translations.
   *
   * @returns {String[]} The list of available locales.
   */

  get locales(): string[];
  /**
   * Translates the given string according to the current locale.
   *
   * Returns null if no translation can be found.
   *
   * @param {String} msg String to translate.
   * @param {*} [args] Extra parameters.
   * @returns {String|null} Translated string if found, else null.
   */

  translate(msg: string, args?: any): string | null;

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
  translatePlurals(msg: string, count: number, args?: any): string | null;

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
  fire(event: string, value: any, forget?: boolean): void;

  /**
   * Subscribes to an event on this LocaleService.
   *
   * @param {String} event The event
   * @param {Function} callback Callback fired on the event
   * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link .off}.
   */
  on(event: string, callback: Function): string;

  /**
   * Cancels an event subscription that was previously made with {@link LocaleService.on}.
   *
   * @param {String} subId Subscription ID
   */
  off(subId: string): void;

  /**
   * Fires when the messages or the locale are updated 
   * @param event The loaded event
   * @param callback Called fired on the event
   */
  on(event: "updated", callback: (e: LocaleService | string) => void): string
}
