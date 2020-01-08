import {utils} from "../../viewer/scene/utils.js";
import {Map} from "../../viewer/scene/utils/Map.js";

const idMap = new Map();

/**
 * @desc A customizable HTML context menu.
 *
 * [<img src="http://xeokit.io/img/docs/ContextMenu/ContextMenu.gif">](https://xeokit.github.io/xeokit-sdk/examples/#ContextMenu_Canvas_TreeViewPlugin_Custom)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#ContextMenu_Canvas_TreeViewPlugin_Custom)]
 *
 * ## Overview
 *
 * * Attach to anything that fires a [contextmenu](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) event
 * * Configure custom items
 * * Configure custom style with custom CSS (see examples above)
 *
 * ## Usage
 *
 * In the example below we'll create a ContextMenu that pops up whenever we right-click on an {@link Entity} within
 * our {@link Scene}.
 *
 * First, we'll create the ContextMenu, configuring it with a list of menu items. Each item has a title to display
 * in the menu, along with a callback to fire when its title is clicked. Note how each callback accepts a ````context````
 * object, which we set on the ContextMenu whenever we show it. The context object can be anything. In this example,
 * we'll use the context object to provide the callbacks with the Entity that we right-clicked.
 *
 * We'll also initially enable the ContextMenu.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#ContextMenu_Canvas_Custom)]
 *
 * ````javascript
 * const canvasContextMenu = new ContextMenu({
 *
 *    enabled: true,
 *
 *    items: [
 *       [
 *          {
 *             title: "Hide object",
 *             callback: function (context) {
 *                 context.entity.visible = false;
 *             }
 *          }
 *       ],
 *       [
 *          {
 *             title: "Select object",
 *             callback: function (context) {
 *                 context.entity.selected = true;
 *             }
 *          }
 *       ],
 *       [
 *          {
 *             title: "X-ray object",
 *             callback: function (context) {
 *                 context.entity.xrayed = true;
 *             }
 *          }
 *       ]
 *    });
 * ````
 *
 * Next, we'll make the ContextMenu appear whenever we right-click on an Entity. Whenever we right-click
 * on the canvas, we'll attempt to pick the Entity at those mouse coordinates. If we succeed, we'll feed the
 * Entity into ContextMenu via the context object, then show the ContextMenu.
 *
 * From there, if we click an item in the ContextMenu, the corresponding callback will be invoked with our
 * context object.
 *
 * ````javascript*
 * viewer.scene.canvas.canvas.oncontextmenu = (e) => { // Right-clicked on the canvas
 *
 *     if (!objectContextMenu.enabled) {
 *         return;
 *     }
 *
 *     var hit = viewer.scene.pick({ // Try to pick an Entity at the coordinates
 *         canvasPos: [e.pageX, e.pageY]
 *     });
 *
 *     if (hit) { // Picked an Entity
 *
 *         objectContextMenu.context = { // Feed entity to ContextMenu
 *             entity: hit.entity
 *         };
 *
 *         objectContextMenu.show(e.pageX, e.pageY); // Show the ContextMenu
 *     }
 *
 *     e.preventDefault();
 * });
 * ````
 *
 * Note how we only show the ContextMenu if it's enabled. We can use that mechanism to switch between multiple
 * ContextMenu instances depending on what we clicked.
 */
class ContextMenu {

    /**
     * Creates a context menu.
     *
     * @param {Object} [cfg] Context menu configuration.
     * @param {Object} [cfg.items] The context menu items. These can also be dynamically set on {@link ContextMenu#items}. See {@link DefaultEntityContextMenuItems} for an example.
     * @param {Object} [cfg.context] The context, which is passed into the item callbacks. This can also be dynamically set on {@link ContextMenu#context}.
     * @param {Boolean} [cfg.enabled=true] Whether this context menu is initially enabled. {@link ContextMenu#show} does nothing while this is ````false````.
     */
    constructor(cfg = {}) {
        this._id = idMap.addItem();
        this._context = {};
        this._menuElement = null;
        this._enabled = false;
        this._items = [];
        document.addEventListener("click", (e) => {
            this.hide();
        });
        if (cfg.items) {
            this.items = cfg.items;
        }
        this.context = cfg.context;
        this.enabled = cfg.enabled !== false;
        this.hide();
    }

    /**
     * Sets the context menu items.
     *
     * These can be dynamically updated.
     *
     * See {@link DefaultEntityContextMenuItems} for an example.
     *
     * @type {Object[]}
     */
    set items(items) {
        this._items = items || {};
        if (this._menuElement) {
            this._menuElement.parentElement.removeChild(this._menuElement);
            this._menuElement = null;
        }
        const html = [];
        const idClass = "xeokit-context-menu-" + this._id;
        html.push('<div class="xeokit-context-menu ' + idClass + '" style="z-index:300000; position: absolute;">');
        html.push('<ul>');
        this._buildActionLinks(this._items, html);
        html.push('</ul>');
        html.push('</div>');
        const htmlStr = html.join("");
        document.body.insertAdjacentHTML('beforeend', htmlStr);
        this._menuElement = document.querySelector("." + idClass);
        this._menuElement.style["border-radius"] = 4 + "px";
        this._menuElement.style.display = 'none';
        this._menuElement.style["z-index"] = 300000;
        this._menuElement.style.background = "white";
        this._menuElement.style.border = "1px solid black";
        this._menuElement.style["box-shadow"] = "0 4px 5px 0 gray";
        this._menuElement.oncontextmenu = (e) => {
            e.preventDefault();
        };
        this._bindActionLinks(this._items);
    }

    /**
     * Gets the context menu items.
     *
     * @type {Object[]}
     */
    get items() {
        return this._items;
    }

    _buildActionLinks(items, html, ctx = {id: 0}) {
        for (let i = 0, len = items.length; i < len; i++) {
            const itemsGroup = items[i];
            ctx.groupIdx = i;
            ctx.groupLen = len;
            this._buildActionLinks2(itemsGroup, html, ctx);
        }
    }

    _buildActionLinks2(itemsGroup, html, ctx) {
        for (let i = 0, len = itemsGroup.length; i < len; i++) {
            const action = itemsGroup[i];
            const actionId = "xeokit-context-menu-" + this._id + "-" + ctx.id++;
            const actionTitle = action.title;
            html.push('<li class="' + actionId + '" style="' + ((ctx.groupIdx === ctx.groupLen - 1) || ((i < len - 1)) ? 'border-bottom: 0' : 'border-bottom: 1px solid black') + '">' + actionTitle + '</li>');
        }
    }

    _bindActionLinks(items, ctx = {id: 0}) {
        const self = this;
        for (let i = 0, len = items.length; i < len; i++) {
            const action = items[i];
            if (utils.isArray(action)) {
                this._bindActionLinks(action, ctx);
            } else {
                const actionId = "xeokit-context-menu-" + this._id + "-" + ctx.id++;
                document.querySelector("." + actionId).addEventListener("click", (function () {
                    const callback = action.callback;
                    return function (event) {
                        if (!self._context) {
                            return;
                        }
                        callback(self._context);
                        self.hide();
                        event.preventDefault();
                    };
                })());
            }
        }
    }

    /**
     * Sets whether this context menu is enabled.
     *
     * When disabling, will hide the menu if currently shown.
     *
     * @type {Boolean}
     */
    set enabled(enabled) {
        this._enabled = enabled;
        if (!this._enabled) {
            this.hide();
        }
    }

    /**
     * Gets whether this context menu is enabled.
     *
     * {@link ContextMenu#show} does nothing while this is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Sets the menu's current context.
     *
     * The context can be any object that you need to be provides to the callbacks configured on {@link ContextMenu#items}.
     *
     * @type {Object}
     */
    set context(context) {
        this._context = context || {};
    }

    /**
     * Gets the menu's current context.
     *
     * @type {Object}
     */
    get context() {
        return this._context;
    }

    /**
     * Shows this context menu at the given page coordinates.
     *
     * Does nothing when {@link ContextMenu#enabled} is ````false````.
     *
     * @param {Number} pageX Page X-coordinate.
     * @param {Number} pageY Page Y-coordinate.
     */
    show(pageX, pageY) {
        if (!this._enabled || !this._menuElement) {
            return;
        }
        this._menuElement.style.display = 'block';
        const menuHeight = this._menuElement.offsetHeight;
        const menuWidth = this._menuElement.offsetWidth;
        if ((pageY + menuHeight) > window.innerHeight) {
            pageY = window.innerHeight - menuHeight;
        }
        if ((pageX + menuWidth) > window.innerWidth) {
            pageX = window.innerWidth - menuWidth;
        }
        this._menuElement.style.left = pageX + 'px';
        this._menuElement.style.top = pageY + 'px';
    }

    /**
     * Hides this context menu.
     */
    hide() {
        if (!this._menuElement) {
            return;
        }
        this._menuElement.style.display = 'none';
    }

    /**
     * Destroys this context menu.
     */
    destroy() {
        if (this._menuElement) {
            this._menuElement.parentElement.removeChild(this._menuElement);
            this._menuElement = null;
        }
        if (this._id !== null) {
            idMap.removeItem(this._id);
            this._id = null;
        }
    }
}

export {ContextMenu};