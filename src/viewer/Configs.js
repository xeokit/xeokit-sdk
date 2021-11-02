import {math} from "./scene/math/math.js";
import {core} from "./scene/core";

/**
 * Manages global configurations for all {@link Viewer}s.
 *
 * ## Example
 *
 * In the example below, we'll disable xeokit's double-precision support, which gives a performance and memory boost
 * on low-power devices, but also means that we can no longer render double-precision models without jittering.
 *
 * That's OK if we know that we're not going to view models that are geographically vast, or offset far from the World coordinate origin.
 *
 * We'll also switch xeokit from using ````window.requestAnimationFrame```` to ````window.setInterval```` for its render loop,
 * which may give a smoother experience in some cases.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#Configs_disableDoublePrecisionAndRAF)]
 *
 * ````javascript
 * import {Configs, Viewer, XKTLoaderPlugin} from "../dist/xeokit-sdk.min.es.js";
 *
 * // Access xeoit-sdk global configs.
 * // We typically set configs only before we create any Viewers.
 * const configs = new Configs();
 *
 * // Disable 64-bit precision for extra speed.
 * // Only set this config once, before you create any Viewers.
 * configs.doublePrecisionEnabled = false;
 *
 * // Disable window.requestAnimationFrame (RAF) and use
 * // window.setInterval for Viewer render loops.
 * // This config can be switched dynamically, if needed.
 * configs.rafEnabled = false;
 *
 * // Create a Viewer, to which our configs apply
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 *  });
 *
 * viewer.camera.eye = [-3.933, 2.855, 27.018];
 * viewer.camera.look = [4.400, 3.724, 8.899];
 * viewer.camera.up = [-0.018, 0.999, 0.039];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     src: "../assets/models/xkt/v8/ifc/Duplex.ifc.xkt"
 * });
 * ````
 */
class Configs {

    /**
     * Creates a Configs.
     */
    constructor() {

    }

    /**
     * Sets whether double precision mode is enabled for Viewers.
     *
     * When double precision mode is enabled (default), Viewers will accurately render models that contain
     * double-precision coordinates, without jittering.
     *
     * Internally, double precision incurs extra performance and memory overhead, so if we're certain that
     * we're not going to render models that rely on double-precision coordinates, then it's a good idea to disable
     * it, especially on low-power devices.
     *
     * This should only be set once, before creating any Viewers.
     *
     * @returns {boolean}
     */
    set doublePrecisionEnabled(doublePrecision) {
        math.setDoublePrecisionEnabled(doublePrecision);
    }

    /**
     * Gets whether double precision mode is enabled for all Viewers.
     *
     * @returns {boolean}
     */
    get doublePrecisionEnabled() {
        return math.getDoublePrecisionEnabled();
    }

    /**
     * Sets whether Viewers currently use ````window.requestAnimationFrame```` (RAF) or ````window.setInterval```` for animations.
     *
     * With RAF, the render loop is suspended whenever we switch away from the browser tab that
     * contains our application. With setInterval, the render loop will continue running. Since a Viewer only
     * renders frames when the view has actually updated, disabling RAF can actually give a performance boost.
     *
     * This is ````true```` by default, to use RAF.
     *
     * This can be dynamically set at any time.
     *
     * @returns {boolean}
     */
    set rafEnabled(rafEnabled) {
        core.setRAFEnabled(rafEnabled);
    }

    /**
     * Gets whether Viewers currently use ````window.requestAnimationFrame```` (RAF) or ````window.setInterval```` for animations.
     *
     * @returns {boolean}
     */
    get rafEnabled() {
        return core.getRAFEnabled();
    }


}

export {Configs};