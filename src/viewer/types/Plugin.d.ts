import { Viewer } from "./Viewer";

/**
 @desc Base class for {@link Viewer} plugin classes.
 */
export declare abstract class Plugin {
    /**
     * Creates this Plugin and installs it into the given {@link Viewer}.
     *
     * @param {string} id ID for this plugin, unique among all plugins in the viewer.
     * @param {Viewer} viewer The viewer.
     * @param {Object} [cfg] Options
     */
    constructor(id: string, viewer: Viewer, cfg?: {});

    /**
     * ID for this Plugin, unique within its {@link Viewer}.
     *
     * @type {string}
     */
    id: string;

    /**
     * The Viewer that contains this Plugin.
     *
     * @type {Viewer}
     */
    viewer: Viewer;

    /**
     * Subscribes to an event fired at this Plugin.
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     */
    on(event: string, callback: ()=> void): void;

    /**
     * Fires an event at this Plugin.
     * @param {String} event The event type name
     * @param {Object} value The event parameters
     */
    fire(event: string, value: any): void;

    /**
     * Logs a message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    log(msg: string): void;

    /**
     * Logs a warning message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    warn(msg: string): void;

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    error(msg: string): void;

    /**
     * Destroys this Plugin and removes it from its {@link Viewer}.
     */
    destroy(): void;
}
