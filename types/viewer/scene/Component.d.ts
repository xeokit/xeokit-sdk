import { Viewer } from "../Viewer";
import { Scene } from "./scene/Scene";

/**
 * Base class for all xeokit components.
 */
export abstract class Component {
    constructor(owner?: any, cfg?: {});

    /**
     * The parent {@link Scene} that contains this Component.
     *
     * @property scene
     * @type {Scene}
     * @final
     */
    scene: Scene;

    /**
     * The viewer that contains this Scene.
     * @property viewer
     * @type {Viewer}
     */
    viewer: Viewer;

    /**
     Arbitrary, user-defined metadata on this component.

     @property metadata
     @type Object
     */
    meta: any;

    /**
     * ID of this Component, unique within the {@link Scene}.
     *
     * Components are mapped by this ID in {@link Scene.components}.
     *
     * @property id
     * @type {String}
     */
    id: string;

    /**
     * The {@link Component} that owns the lifecycle of this Component, if any.
     *
     * When that component is destroyed, this component will be automatically destroyed also.
     *
     * Will be null if this Component has no owner.
     *
     * @property owner
     * @type {Component}
     */
    get owner(): Component;

    /**
     * Tests if this component is of the given type, or is a subclass of the given type.
     * @type {Boolean}
     */
    isType(type: any): boolean;

    /**
     * Fires an event on this component.
     *
     * Notifies existing subscribers to the event, optionally retains the event to give to
     * any subsequent notifications on the event as they are made.
     *
     * @param {String} event The event type name
     * @param {Object} value The event parameters
     * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
     */
    fire(event: string, value: any, forget?: boolean): void;

    /**
     * Subscribes to an event on this component.
     *
     * The callback is be called with this component as scope.
     *
     * @param {String} event The event
     * @param {Function} callback Called fired on the event
     * @param {Object} [scope=this] Scope for the callback
     * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link .off}.
     */
    on(event: string, callback: Function, scope?: any): string;

    /**
     * Cancels an event subscription that was previously made with {@link Component.on} or {@link Component.once}.
     *
     * @param {String} subId Subscription ID
     */
    off(subId: string): void;

    /**
     * Subscribes to the next occurrence of the given event, then un-subscribes as soon as the event is subIdd.
     *
     * This is equivalent to calling {@link Component.on}, and then calling {@link Component.off} inside the callback function.
     *
     * @param {String} event Data event to listen to
     * @param {Function} callback Called when fresh data is available at the event
     * @param {Object} [scope=this] Scope for the callback
     */
    once(event: string, callback: Function, scope?: any): void;

    /**
     * Returns true if there are any subscribers to the given event on this component.
     *
     * @param {String} event The event
     * @return {Boolean} True if there are any subscribers to the given event on this component.
     */
    hasSubs(event: string): boolean;

    /**
     * Logs a console debugging message for this component.
     *
     * The console message will have this format: *````[LOG] [<component type> <component id>: <message>````*
     *
     * Also fires the message as a "log" event on the parent {@link Scene}.
     *
     * @param {String} message The message to log
     */
    log(message: string): void;

    /**
     * Logs a warning for this component to the JavaScript console.
     *
     * The console message will have this format: *````[WARN] [<component type> =<component id>: <message>````*
     *
     * Also fires the message as a "warn" event on the parent {@link Scene}.
     *
     * @param {String} message The message to log
     */
    warn(message: string): void;

    /**
     * Logs an error for this component to the JavaScript console.
     *
     * The console message will have this format: *````[ERROR] [<component type> =<component id>: <message>````*
     *
     * Also fires the message as an "error" event on the parent {@link Scene}.
     *
     * @param {String} message The message to log
     */
    error(message: string): void;

    /**
     * Destroys all {@link Component}s that are owned by this. These are Components that were instantiated with
     * this Component as their first constructor argument.
     */
    clear(): void;

    /**
     * Destroys this component.
     */
    destroy(): void;
}
