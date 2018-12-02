/**
 @desc Base class for {@link Viewer} plugin classes.
 */
class Plugin {

    /**
     * Creates this Plugin and installs it into the given {@link Viewer}.
     *
     * @param {string} id ID for this plugin, unique among all plugins in the viewer.
     * @param {Viewer} viewer The viewer.
     * @param {Object} [cfg] Options
     */
    constructor(id, viewer, cfg) {

        /**
         * ID for this Plugin, unique within the {@link Viewer}.
         *
         * @type {string}
         */
        this.id = (cfg && cfg.id) ? cfg.id : id;

        /**
         * The viewer that contains this plugin.
         * @type {Viewer}
         */
        this.viewer = viewer;

        /**
         * Subscriptions to events fired on this plugin.
         * @private
         */
        this._eventSubs = {};

        viewer.addPlugin(this);
    }

    /**
     Subscribes to an event on this plugin.
     @param {String} event The event
     @param {Function} callback Callback fired on the event
     */
    on(event, callback) {
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = [];
            this._eventSubs[event] = subs;
        }
        subs.push(callback);
    }

    /**
     Fires an event on this plugin.
     @param {String} event The event type name
     @param {Object} value The event parameters
     */
    fire(event, value) {
        const subs = this._eventSubs[event];
        if (subs) {
            for (let i = 0, len = subs.length; i < len; i++) {
                subs[i](value);
            }
        }
    }

    /**
     * Logs a message to the JavaScript developer console, prefixed with the ID of this plugin.
     * @param {String} msg The error message
     */
    log(msg) {
        console.log(`[xeoviewer plugin ${this.id}]: ${msg}`);
    }

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this plugin.
     * @param {String} msg The error message
     */
    error(msg) {
        console.error(`[xeoviewer plugin ${this.id}]: ${msg}`);
    }

    /**
     * Sends a message to this plugin.
     * @private
     */
    send(name, value) {
        //...
    }

    /**
     * Saves the state of this plugin to a bookmark.
     * @private
     */
    writeBookmark(bookmark) {
        //...
    }

    /**
     * Restores the state of this plugin from a bookmark.
     * @private
     */
    readBookmark(bookmark) {
        //...
    }

    /**
     * Destroys this plugin and removes it from its viewer.
     */
    destroy() {
        this.viewer.removePlugin(this);
    }
}

export {Plugin}