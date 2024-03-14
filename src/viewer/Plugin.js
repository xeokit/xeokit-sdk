import {Map} from "./scene/utils/Map.js";
import {core} from "./scene/core.js";

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
         * ID for this Plugin, unique within its {@link Viewer}.
         *
         * @type {string}
         */
        this.id = (cfg && cfg.id) ? cfg.id : id;

        /**
         * The Viewer that contains this Plugin.
         *
         * @type {Viewer}
         */
        this.viewer = viewer;

        this._subIdMap = null; // Subscription subId pool
        this._subIdEvents = null; // Subscription subIds mapped to event names
        this._eventSubs = null; // Event names mapped to subscribers
        this._eventSubsNum = null;
        this._events = null; // Maps names to events
        this._eventCallDepth = 0; // Helps us catch stack overflows from recursive events

        viewer.addPlugin(this);
    }

    /**
     * Schedule a task to perform on the next browser interval
     * @param task
     */
    scheduleTask(task) {
        core.scheduleTask(task, null);
    }

    /**
     * Fires an event on this Plugin.
     *
     * Notifies existing subscribers to the event, optionally retains the event to give to
     * any subsequent notifications on the event as they are made.
     *
     * @param {String} event The event type name
     * @param {Object} value The event parameters
     * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
     */
    fire(event, value, forget) {
        if (!this._events) {
            this._events = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
            this._eventSubsNum = {};
        }
        if (forget !== true) {
            this._events[event] = value || true; // Save notification
        }
        const subs = this._eventSubs[event];
        let sub;
        if (subs) { // Notify subscriptions
            for (const subId in subs) {
                if (subs.hasOwnProperty(subId)) {
                    sub = subs[subId];
                    this._eventCallDepth++;
                    if (this._eventCallDepth < 300) {
                        sub.callback.call(sub.scope, value);
                    } else {
                        this.error("fire: potential stack overflow from recursive event '" + event + "' - dropping this event");
                    }
                    this._eventCallDepth--;
                }
            }
        }
    }

    /**
     * Subscribes to an event on this Plugin.
     *
     * The callback is be called with this Plugin as scope.
     *
     * @param {String} event The event
     * @param {Function} callback Called fired on the event
     * @param {Object} [scope=this] Scope for the callback
     * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link #off}.
     */
    on(event, callback, scope) {
        if (!this._events) {
            this._events = {};
        }
        if (!this._subIdMap) {
            this._subIdMap = new Map(); // Subscription subId pool
        }
        if (!this._subIdEvents) {
            this._subIdEvents = {};
        }
        if (!this._eventSubs) {
            this._eventSubs = {};
        }
        if (!this._eventSubsNum) {
            this._eventSubsNum = {};
        }
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = {};
            this._eventSubs[event] = subs;
            this._eventSubsNum[event] = 1;
        } else {
            this._eventSubsNum[event]++;
        }
        const subId = this._subIdMap.addItem(); // Create unique subId
        subs[subId] = {
            callback: callback,
            scope: scope || this
        };
        this._subIdEvents[subId] = event;
        const value = this._events[event];
        if (value !== undefined) { // A publication exists, notify callback immediately
            callback.call(scope || this, value);
        }
        return subId;
    }

    /**
     * Cancels an event subscription that was previously made with {@link Plugin#on} or {@link Plugin#once}.
     *
     * @param {String} subId Subscription ID
     */
    off(subId) {
        if (subId === undefined || subId === null) {
            return;
        }
        if (!this._subIdEvents) {
            return;
        }
        const event = this._subIdEvents[subId];
        if (event) {
            delete this._subIdEvents[subId];
            const subs = this._eventSubs[event];
            if (subs) {
                delete subs[subId];
                this._eventSubsNum[event]--;
            }
            this._subIdMap.removeItem(subId); // Release subId
        }
    }

    /**
     * Subscribes to the next occurrence of the given event, then un-subscribes as soon as the event is subIdd.
     *
     * This is equivalent to calling {@link Plugin#on}, and then calling {@link Plugin#off} inside the callback function.
     *
     * @param {String} event Data event to listen to
     * @param {Function} callback Called when fresh data is available at the event
     * @param {Object} [scope=this] Scope for the callback
     */
    once(event, callback, scope) {
        const self = this;
        const subId = this.on(event,
            function (value) {
                self.off(subId);
                callback.call(scope || this, value);
            },
            scope);
    }

    /**
     * Returns true if there are any subscribers to the given event on this Plugin.
     *
     * @param {String} event The event
     * @return {Boolean} True if there are any subscribers to the given event on this Plugin.
     */
    hasSubs(event) {
        return (this._eventSubsNum && (this._eventSubsNum[event] > 0));
    }

    /**
     * Logs a message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    log(msg) {
        console.log(`[xeokit plugin ${this.id}]: ${msg}`);
    }

    /**
     * Logs a warning message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    warn(msg) {
        console.warn(`[xeokit plugin ${this.id}]: ${msg}`);
    }

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this Plugin.
     *
     * @param {String} msg The error message
     */
    error(msg) {
        console.error(`[xeokit plugin ${this.id}]: ${msg}`);
    }

    /**
     * Sends a message to this Plugin.
     *
     * @private
     */
    send(name, value) {
        //...
    }

    /**
     * Destroys this Plugin and removes it from its {@link Viewer}.
     */
    destroy() {
        this.viewer.removePlugin(this);
    }
}

export {Plugin}