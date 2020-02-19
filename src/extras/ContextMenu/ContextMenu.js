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
 * * Allows to dynamically enable or disable items
 * * Configure custom style with custom CSS (see examples above)
 *
 * ## Usage
 *
 * In the example below we'll create a ContextMenu that pops up whenever we right-click on an {@link Entity} within
 * our {@link Scene}.
 *
 * First, we'll create the ContextMenu, configuring it with a list of menu items.
 *
 * Each item has:
 *
 * * a title to display it in the menu,
 * * a ````doAction()```` callback to fire when the item's title is clicked, and
 * * an optional ````getEnabled()```` callback that indicates if the item should enabled in the menu or not.
 *
 * The ````getEnabled()```` callbacks are invoked whenever the menu is shown. When an item's ````getEnabled()```` callback
 * returns ````true````, then the item is enabled and clickable. When it returns ````false````, then the item is disabled
 * and cannot be clicked. An item without a ````getEnabled()```` callback is always enabled and clickable.
 *
 *
 * Note how the ````doAction()```` and ````getEnabled()```` callbacks accept a ````context````
 * object. That must be set on the ContextMenu before we're able to we show it. The context object can be anything. In this example,
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
 *             title: "Hide Object",
 *             getEnabled: (context) => {
 *                 return context.entity.visible; // Can't hide entity if already hidden
 *             },
 *             doAction: function (context) {
 *                 context.entity.visible = false;
 *             }
 *          }
 *       ],
 *       [
 *          {
 *             title: "Select Object",
 *             getEnabled: (context) => {
 *                 return (!context.entity.selected); // Can't select an entity that's already selected
 *             },
 *             doAction: function (context) {
 *                 context.entity.selected = true;
 *             }
 *          }
 *       ],
 *       [
 *          {
 *             title: "X-Ray Object",
 *             getEnabled: (context) => {
 *                 return (!context.entity.xrayed); // Can't X-ray an entity that's already X-rayed
 *             },
 *             doAction: (context) => {
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
 * From there, each ContextMenu item's ````getEnabled()```` callback will be invoked (if provided), to determine if the item should
 * be enabled. If we click an item, its ````doAction()```` callback will be invoked with our context object.
 *
 * Remember that we must set the context on our ContextMenu before we show it, otherwise it will log an error to the console,
 * and ignore our attempt to show it.
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
     * @param {Object} [cfg.items] The context menu items. These can also be dynamically set on {@link ContextMenu#items}. See the class documentation for an example.
     * @param {Object} [cfg.context] The context, which is passed into the item callbacks. This can also be dynamically set on {@link ContextMenu#context}. This must be set before calling {@link ContextMenu#show}.
     * @param {Boolean} [cfg.enabled=true] Whether this context menu is initially enabled. {@link ContextMenu#show} does nothing while this is ````false````.
     */
    constructor(cfg = {}) {
        this._id = idMap.addItem();
        this._context = null;
        this._menuElement = null;
        this._enabled = false;
        this._items = [];
        document.addEventListener("mousedown", (event) => {
            if (!event.target.classList.contains("xeokit-context-menu-item")) {
                this.hide();
            }
            event.preventDefault();
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
     * See class documentation for an example.
     *
     * @type {Object[]}
     */
    set items(items) {
        this._items = items || [];
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
            const item = itemsGroup[i];
            if (!item.title) {
                console.error("ContextMenu item without title - will not include in ContextMenu");
                continue;
            }
            if ((!item.doAction) && (!item.callback)) {
                console.error("ContextMenu item without doAction() or callback() - will not include in ContextMenu");
                continue;
            }
            if (item.callback) {
                console.error("ContextMenu item has deprecated 'callback' - rename to 'doAction'");
                continue;
            }
            const itemId = "xeokit-context-menu-" + this._id + "-" + ctx.id++;
            const actionTitle = item.title;
            html.push('<li id="' + itemId + '" class="xeokit-context-menu-item" style="' + ((ctx.groupIdx === ctx.groupLen - 1) || ((i < len - 1)) ? 'border-bottom: 0' : 'border-bottom: 1px solid black') + '">' + actionTitle + '</li>');
            item._itemId = itemId;
        }
    }

    _bindActionLinks(items, ctx = {id: 0}) {
        const self = this;
        for (let i = 0, len = items.length; i < len; i++) {
            const item = items[i];
            if (utils.isArray(item)) {
                this._bindActionLinks(item, ctx);
            } else {
                item._itemElement = document.getElementById(item._itemId);
                if (!item._itemElement) {
                    console.error("ContextMenu item element not found: " + item._itemId);
                    continue;
                }
                item._itemElement.addEventListener("click", (function () {
                    const doAction = item.doAction || item.callback;
                    return function (event) {
                        if (!self._context) {
                            return;
                        }
                        doAction(self._context);
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
     * This must be set before calling {@link ContextMenu#show}.
     *
     * @type {Object}
     */
    set context(context) {
        this._context = context;
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
     * Also calls the ````getEnabled()```` callback on the menu items, where supplied, to enable or disable them. See the class documentation for more info.
     *
     * Does nothing when {@link ContextMenu#enabled} is ````false````.
     *
     * Logs error to console and does nothing if {@link ContextMenu#context} has not been set.
     *
     * @param {Number} pageX Page X-coordinate.
     * @param {Number} pageY Page Y-coordinate.
     */
    show(pageX, pageY) {
        if (!this._context) {
            console.error("ContextMenu cannot be shown without a context - set context first");
            return;
        }
        if (!this._enabled || !this._menuElement) {
            return;
        }
        this._enableItems();
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

    _enableItems() {
        if (!this._context) {
            return;
        }
        for (let i = 0, len = this._items.length; i < len; i++) {
            const itemsGroup = this._items[i];
            for (let j = 0, lenj = itemsGroup.length; j < lenj; j++) {
                const item = itemsGroup[j];
                if (!item._itemElement) {
                    continue;
                }
                const getEnabled = item.getEnabled;
                if (getEnabled) {
                    const enabled = getEnabled(this._context);
                    if (!enabled) {
                        item._itemElement.classList.add("disabled");
                    } else {
                        item._itemElement.classList.remove("disabled");
                    }
                }
            }
        }
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