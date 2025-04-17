import { Map } from "../../viewer/scene/utils/Map.js";

const idMap = new Map();

/**
 * Internal data class that represents the state of a menu or a submenu.
 * @private
 */
class Menu {
    constructor(id) {
        this.id = id;
        this.parentItem = null; // Set to an Item when this Menu is a submenu
        this.groups = [];
        this.menuElement = null;
        this.shown = false;
        this.mouseOver = 0;
    }
}

/**
 * Internal data class that represents a group of Items in a Menu.
 * @private
 */
class Group {
    constructor() {
        this.items = [];
    }
}

/**
 * Internal data class that represents the state of a menu item.
 * @private
 */
class Item {
    constructor(id, getTitle, doAction, getEnabled, getShown) {
        this.id = id;
        this.getTitle = getTitle;
        this.doAction = doAction;
        this.getEnabled = getEnabled;
        this.getShown = getShown;
        this.itemElement = null;
        this.subMenu = null;
        this.enabled = true;
    }
}

/**
 * @desc A customizable HTML context menu.
 *
 * [<img src="http://xeokit.io/img/docs/ContextMenu/ContextMenu.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_Canvas_TreeViewPlugin_Custom)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_Canvas_TreeViewPlugin_Custom)]
 *
 * ## Overview
 *
 * * A pure JavaScript, lightweight context menu
 * * Dynamically configure menu items
 * * Dynamically enable or disable items
 * * Dynamically show or hide items
 * * Supports cascading sub-menus
 * * Configure custom style with CSS (see examples above)
 *
 * ## Usage
 *
 * In the example below we'll create a ````ContextMenu```` that pops up whenever we right-click on an {@link Entity} within
 * our {@link Scene}.
 *
 * First, we'll create the ````ContextMenu````, configuring it with a list of menu items.
 *
 * Each item has:
 *
 * * a ````title```` for the item,
 * * a ````doAction()```` callback to fire when the item's title is clicked,
 * * an optional ````getShown()```` callback that indicates if the item should shown in the menu or not, and
 * * an optional ````getEnabled()```` callback that indicates if the item should be shown enabled in the menu or not.
 *
 * <br>
 *
 * The ````getShown()```` and ````getEnabled()```` callbacks are invoked whenever the menu is shown.
 *
 * When an item's ````getShown()```` callback
 * returns ````true````, then the item is shown. When it returns ````false````, then the item is hidden. An item without
 * a ````getShown()```` callback is always shown.
 *
 * When an item's ````getEnabled()```` callback returns ````true````, then the item is enabled and clickable (as long as it's also shown). When it
 * returns ````false````, then the item is disabled and cannot be clicked. An item without a ````getEnabled()````
 * callback is always enabled and clickable.
 *
 * Note how the ````doAction()````,  ````getShown()```` and ````getEnabled()```` callbacks accept a ````context````
 * object. That must be set on the ````ContextMenu```` before we're able to we show it. The context object can be anything. In this example,
 * we'll use the context object to provide the callbacks with the Entity that we right-clicked.
 *
 * We'll also initially enable the ````ContextMenu````.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_Canvas_Custom)]
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
 *    ]
 * });
 * ````
 *
 * Next, we'll make the ````ContextMenu```` appear whenever we right-click on an Entity. Whenever we right-click
 * on the canvas, we'll attempt to pick the Entity at those mouse coordinates. If we succeed, we'll feed the
 * Entity into ````ContextMenu```` via the context object, then show the ````ContextMenu````.
 *
 * From there, each ````ContextMenu```` item's ````getEnabled()```` callback will be invoked (if provided), to determine if the item should
 * be enabled. If we click an item, its ````doAction()```` callback will be invoked with our context object.
 *
 * Remember that we must set the context on our ````ContextMenu```` before we show it, otherwise it will log an error to the console,
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
 * Note how we only show the ````ContextMenu```` if it's enabled. We can use that mechanism to switch between multiple
 * ````ContextMenu```` instances depending on what we clicked.
 *
 * ## Dynamic Item Titles
 *
 * To make an item dynamically regenerate its title text whenever we show the ````ContextMenu````, provide its title with a
 * ````getTitle()```` callback. The callback will fire each time you show ````ContextMenu````, which will dynamically
 * set the item title text.
 *
 * In the example below, we'll create a simple ````ContextMenu```` that allows us to toggle the selection of an object
 * via its first item, which changes text depending on whether we are selecting or deselecting the object.
 *
 * [[Run an example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_dynamicItemTitles)]
 *
 * ````javascript
 * const canvasContextMenu = new ContextMenu({
 *
 *    enabled: true,
 *
 *    items: [
 *       [
 *          {
 *              getTitle: (context) => {
 *                  return (!context.entity.selected) ? "Select" : "Undo Select";
 *              },
 *              doAction: function (context) {
 *                  context.entity.selected = !context.entity.selected;
 *              }
 *          },
 *          {
 *              title: "Clear Selection",
 *              getEnabled: function (context) {
 *                  return (context.viewer.scene.numSelectedObjects > 0);
 *              },
 *              doAction: function (context) {
 *                  context.viewer.scene.setObjectsSelected(context.viewer.scene.selectedObjectIds, false);
 *              }
 *          }
 *       ]
 *    ]
 * });
 * ````
 *
 * ## Sub-menus
 *
 * Each menu item can optionally have a sub-menu, which will appear when we hover over the item.
 *
 * In the example below, we'll create a much simpler ````ContextMenu```` that has only one item, called "Effects", which
 * will open a cascading sub-menu whenever we hover over that item.
 *
 * Note that our "Effects" item has no ````doAction```` callback, because an item with a sub-menu performs no
 * action of its own.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_subMenus)]
 *
 * ````javascript
 * const canvasContextMenu = new ContextMenu({
 *     items: [ // Top level items
 *         [
 *             {
 *                 getTitle: (context) => {
 *                     return "Effects";
 *                 },
 *
 *                 items: [ // Sub-menu
 *                     [
 *                         {
 *                             getTitle: (context) => {
 *                                 return (!context.entity.visible) ? "Show" : "Hide";
 *                             },
 *                             doAction: function (context) {
 *                                 context.entity.visible = !context.entity.visible;
 *                             }
 *                         },
 *                         {
 *                             getTitle: (context) => {
 *                                 return (!context.entity.selected) ? "Select" : "Undo Select";
 *                             },
 *                             doAction: function (context) {
 *                                 context.entity.selected = !context.entity.selected;
 *                             }
 *                         },
 *                         {
 *                             getTitle: (context) => {
 *                                 return (!context.entity.highlighted) ? "Highlight" : "Undo Highlight";
 *                             },
 *                             doAction: function (context) {
 *                                 context.entity.highlighted = !context.entity.highlighted;
 *                             }
 *                         }
 *                     ]
 *                 ]
 *             }
 *          ]
 *      ]
 * });
 * ````
 */
class ContextMenu {

    /**
     * Creates a ````ContextMenu````.
     *
     * The ````ContextMenu```` will be initially hidden.
     *
     * @param {Object} [cfg] ````ContextMenu```` configuration.
     * @param {Object} [cfg.items] The context menu items. These can also be dynamically set on {@link ContextMenu#items}. See the class documentation for an example.
     * @param {Object} [cfg.context] The context, which is passed into the item callbacks. This can also be dynamically set on {@link ContextMenu#context}. This must be set before calling {@link ContextMenu#show}.
     * @param {Boolean} [cfg.enabled=true] Whether this ````ContextMenu```` is initially enabled. {@link ContextMenu#show} does nothing while this is ````false````.
     * @param {Boolean} [cfg.hideOnMouseDown=true] Whether this ````ContextMenu```` automatically hides whenever we mouse-down or tap anywhere in the page.
     * @param {Boolean} [cfg.hideOnAction=true] Whether this ````ContextMenu```` automatically hides after we select a menu item. Se false if we want the menu to remain shown and show any updates to its item titles, after we've selected an item.
     * @param {Node | undefined} [cfg.parentNode] Optional reference to an existing DOM Node (e.g. ShadowRoot), to which the menu's HTML element will be appended, defaults to ````document.body````.
     */
    constructor(cfg = {}) {

        this._id = idMap.addItem();
        this._context = null;
        this._enabled = false;  // True when the ContextMenu is enabled
        this._itemsCfg = [];    // Items as given as configs
        this._rootMenu = null;  // The root Menu in the tree
        this._menuList = [];    // List of Menus
        this._menuMap = {};     // Menus mapped to their IDs
        this._itemList = [];    // List of Items
        this._itemMap = {};     // Items mapped to their IDs
        this._shown = false;    // True when the ContextMenu is visible
        this._nextId = 0;
        this._parentNode = cfg.parentNode || document.body;
        this._offsetParent = (this._parentNode instanceof ShadowRoot) ? this._parentNode.host : this._parentNode;
        
        /**
         * Subscriptions to events fired at this ContextMenu.
         * @private
         */
        this._eventSubs = {};

        if (cfg.hideOnMouseDown !== false) {
            this._parentNode.addEventListener("mousedown", (event) => {
                if (!event.target.classList.contains("xeokit-context-menu-item")) {
                    this.hide();
                }
            });
            this._parentNode.addEventListener("touchstart", this._canvasTouchStartHandler = (event) => {
                if (!event.target.classList.contains("xeokit-context-menu-item")) {
                    this.hide();
                }
            });
        }

        if (cfg.items) {
            this.items = cfg.items;
        }

        this._hideOnAction = (cfg.hideOnAction !== false);

        this.context = cfg.context;
        this.enabled = cfg.enabled !== false;
        this.hide();
    }


    /**
     Subscribes to an event fired at this ````ContextMenu````.

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
     Fires an event at this ````ContextMenu````.

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
     * Sets the ````ContextMenu```` items.
     *
     * These can be updated dynamically at any time.
     *
     * See class documentation for an example.
     *
     * @type {Object[]}
     */
    set items(itemsCfg) {
        this._clear();
        this._itemsCfg = itemsCfg || [];
        this._parseItems(itemsCfg);
        this._createUI();
    }

    /**
     * Gets the ````ContextMenu```` items.
     *
     * @type {Object[]}
     */
    get items() {
        return this._itemsCfg;
    }

    /**
     * Sets whether this ````ContextMenu```` is enabled.
     *
     * Hides the menu when disabling.
     *
     * @type {Boolean}
     */
    set enabled(enabled) {
        enabled = (!!enabled);
        if (enabled === this._enabled) {
            return;
        }
        this._enabled = enabled;
        if (!this._enabled) {
            this.hide();
        }
    }

    /**
     * Gets whether this ````ContextMenu```` is enabled.
     *
     * {@link ContextMenu#show} does nothing while this is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Sets the ````ContextMenu```` context.
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
     * Gets the ````ContextMenu```` context.
     *
     * @type {Object}
     */
    get context() {
        return this._context;
    }

    /**
     * Shows this ````ContextMenu```` at the given page coordinates.
     *
     * Does nothing when {@link ContextMenu#enabled} is ````false````.
     *
     * Logs error to console and does nothing if {@link ContextMenu#context} has not been set.
     *
     * Fires a "shown" event when shown.
     *
     * @param {Number} pageX Page X-coordinate.
     * @param {Number} pageY Page Y-coordinate.
     */
    show(pageX, pageY) {
        if (!this._context) {
            console.error("ContextMenu cannot be shown without a context - set context first");
            return;
        }
        if (!this._enabled) {
            return;
        }
        if (this._shown) {
            return;
        }
        this._hideAllMenus();
        this._updateItemsTitles();
        this._updateItemsEnabledStatus();
        this._showMenu(this._rootMenu.id, pageX, pageY);
        this._updateSubMenuInfo();
        this._shown = true;
        this.fire("shown", {});
    }

    /**
     * Gets whether this ````ContextMenu```` is currently shown or not.
     *
     * @returns {Boolean} Whether this ````ContextMenu```` is shown.
     */
    get shown() {
        return this._shown;
    }

    /**
     * Hides this ````ContextMenu````.
     *
     * Fires a "hidden" event when hidden.
     */
    hide() {
        if (!this._enabled) {
            return;
        }
        if (!this._shown) {
            return;
        }
        this._hideAllMenus();
        this._shown = false;
        this.fire("hidden", {});
    }

    /**
     * Destroys this ````ContextMenu````.
     */
    destroy() {
        this._context = null;
        this._clear();
        if (this._id !== null) {
            idMap.removeItem(this._id);
            this._id = null;
        }
    }

    _clear() { // Destroys DOM elements, clears menu data
        for (let i = 0, len = this._menuList.length; i < len; i++) {
            const menu = this._menuList[i];
            const menuElement = menu.menuElement;
            menuElement.remove();
        }
        this._itemsCfg = [];
        this._rootMenu = null;
        this._menuList = [];
        this._menuMap = {};
        this._itemList = [];
        this._itemMap = {};
    }

    _parseItems(itemsCfg) { // Parses "items" config into menu data

        const visitItems = (itemsCfg) => {

            const menuId = this._getNextId();
            const menu = new Menu(menuId);

            for (let i = 0, len = itemsCfg.length; i < len; i++) {

                const itemsGroupCfg = itemsCfg[i];

                const group = new Group();

                menu.groups.push(group);

                for (let j = 0, lenj = itemsGroupCfg.length; j < lenj; j++) {

                    const itemCfg = itemsGroupCfg[j];
                    const subItemsCfg = itemCfg.items;
                    const hasSubItems = (subItemsCfg && (subItemsCfg.length > 0));
                    const itemId = this._getNextId();

                    const getTitle = itemCfg.getTitle || (() => {
                        return (itemCfg.title || "");
                    });

                    const doAction = itemCfg.doAction || itemCfg.callback || (() => {
                    });

                    const getEnabled = itemCfg.getEnabled || (() => {
                        return true;
                    });

                    const getShown = itemCfg.getShown || (() => {
                        return true;
                    });

                    const item = new Item(itemId, getTitle, doAction, getEnabled, getShown);

                    item.parentMenu = menu;

                    group.items.push(item);

                    if (hasSubItems) {
                        const subMenu = visitItems(subItemsCfg);
                        item.subMenu = subMenu;
                        subMenu.parentItem = item;
                    }

                    this._itemList.push(item);
                    this._itemMap[item.id] = item;
                }
            }

            this._menuList.push(menu);
            this._menuMap[menu.id] = menu;

            return menu;
        };

        this._rootMenu = visitItems(itemsCfg);
    }

    _getNextId() { // Returns a unique ID
        return "ContextMenu_" + this._id + "_" + this._nextId++; // Start ID with alpha chars to make a valid DOM element selector
    }

    _createUI() { // Builds DOM elements for the entire menu tree

        const visitMenu = (menu) => {

            this._createMenuUI(menu);

            const groups = menu.groups;
            for (let i = 0, len = groups.length; i < len; i++) {
                const group = groups[i];
                const groupItems = group.items;
                for (let j = 0, lenj = groupItems.length; j < lenj; j++) {
                    const item = groupItems[j];
                    const subMenu = item.subMenu;
                    if (subMenu) {
                        visitMenu(subMenu);
                    }
                }
            }
        };

        visitMenu(this._rootMenu);
    }

    _createMenuUI(menu) { // Builds DOM elements for a menu

        const groups = menu.groups;
        const html = [];

        const menuElement= document.createElement("div");
        menuElement.classList.add("xeokit-context-menu", menu.id);
        menuElement.style.zIndex = 300000;
        menuElement.style.position = "absolute";

        html.push('<ul>');

        if (groups) {

            for (let i = 0, len = groups.length; i < len; i++) {

                const group = groups[i];
                const groupIdx = i;
                const groupLen = len;
                const groupItems = group.items;

                if (groupItems) {

                    for (let j = 0, lenj = groupItems.length; j < lenj; j++) {

                        const item = groupItems[j];
                        const itemSubMenu = item.subMenu;
                        const actionTitle = item.title || "";

                        if (itemSubMenu) {

                            html.push(
                                '<li id="' + item.id + '" class="xeokit-context-menu-item xeokit-context-menu-submenu">' +
                                actionTitle +
                                '</li>');
                            if (!((groupIdx === groupLen - 1) || (j < lenj - 1))) {
                                html.push(
                                    '<li id="' + item.id + '" class="xeokit-context-menu-item-separator"></li>'
                                );
                            }

                        } else {

                            html.push(
                                '<li id="' + item.id + '" class="xeokit-context-menu-item">' +
                                actionTitle +
                                '</li>');
                            if (!((groupIdx === groupLen - 1) || (j < lenj - 1))) {
                                html.push(
                                    '<li id="' + item.id + '" class="xeokit-context-menu-item-separator"></li>'
                                );
                            }
                        }
                    }
                }
            }
        }

        html.push('</ul>');

        const htmlString = html.join("");
        menuElement.innerHTML = htmlString;
        this._parentNode.appendChild(menuElement);

        menu.menuElement = menuElement;

        menuElement.style["border-radius"] = 4 + "px";
        menuElement.style.display = 'none';
        menuElement.style["z-index"] = 300000;
        menuElement.style.background = "white";
        menuElement.style.border = "1px solid black";
        menuElement.style["box-shadow"] = "0 4px 5px 0 gray";
        menuElement.oncontextmenu = (e) => {
            e.preventDefault();
        };

        // Bind event handlers

        const self = this;

        let lastSubMenu = null;

        if (groups) {

            for (let i = 0, len = groups.length; i < len; i++) {

                const group = groups[i];
                const groupItems = group.items;

                if (groupItems) {

                    for (let j = 0, lenj = groupItems.length; j < lenj; j++) {

                        const item = groupItems[j];
                        const itemSubMenu = item.subMenu;

                        item.itemElement = this._parentNode.querySelector(`#${item.id}`);

                        if (!item.itemElement) {
                            console.error("ContextMenu item element not found: " + item.id);
                            continue;
                        }

                        item.itemElement.addEventListener("mouseenter", (event) => {
                            event.preventDefault();

                            const subMenu = item.subMenu;
                            if (!subMenu) {
                                if (lastSubMenu) {
                                    self._hideMenu(lastSubMenu.id);
                                    lastSubMenu = null;
                                }
                                return;
                            }
                            if (lastSubMenu && (lastSubMenu.id !== subMenu.id)) {
                                self._hideMenu(lastSubMenu.id);
                                lastSubMenu = null;
                            }

                            if (item.enabled === false) {
                                return;
                            }

                            const itemElement = item.itemElement;
                            const subMenuElement = subMenu.menuElement;

                            const itemRect = itemElement.getBoundingClientRect();
                            const menuRect = subMenuElement.getBoundingClientRect();
                            const offsetRect = self._offsetParent.getBoundingClientRect();

                            const subMenuWidth = 200; // TODO
                            const showOnRight = (itemRect.right + subMenuWidth) < offsetRect.right;
                            const showOnLeft = (itemRect.left - subMenuWidth) > offsetRect.left;
                        
                            if(showOnRight)
                                self._showMenu(subMenu.id, itemRect.right + window.scrollX - 5, itemRect.top + window.scrollY - 1);
                            else if (showOnLeft)
                                self._showMenu(subMenu.id, itemRect.left - subMenuWidth + window.scrollX, itemRect.top + window.scrollY - 1);
                            else {
                                const spaceOnLeft = itemRect.left - offsetRect.left, spaceOnRight = offsetRect.right - itemRect.right;
                                if(spaceOnRight > spaceOnLeft) 
                                    self._showMenu(subMenu.id, itemRect.right - 5 - (subMenuWidth - spaceOnRight), itemRect.top + window.scrollY - 1);
                                else 
                                    self._showMenu(subMenu.id, itemRect.left - spaceOnLeft, itemRect.top + window.scrollY - 1);
                            }

                            lastSubMenu = subMenu;
                        });

                        if (!itemSubMenu) {

                            // Item without sub-menu
                            // clicking item fires the item's action callback

                            item.itemElement.addEventListener("click", (event) => {
                                event.preventDefault();
                                if (!self._context) {
                                    return;
                                }
                                if (item.enabled === false) {
                                    return;
                                }
                                if (item.doAction) {
                                    item.doAction(self._context);
                                }
                                if (this._hideOnAction) {
                                    self.hide();
                                } else {
                                    self._updateItemsTitles();
                                    self._updateItemsEnabledStatus();
                                }
                            });
                            item.itemElement.addEventListener("mouseup", (event) => {
                                if (event.which !== 3) {
                                    return;
                                }
                                event.preventDefault();
                                if (!self._context) {
                                    return;
                                }
                                if (item.enabled === false) {
                                    return;
                                }
                                if (item.doAction) {
                                    item.doAction(self._context);
                                }
                                if (this._hideOnAction) {
                                    self.hide();
                                } else {
                                    self._updateItemsTitles();
                                    self._updateItemsEnabledStatus();
                                }
                            });
                            item.itemElement.addEventListener("mouseenter", (event) => {
                                event.preventDefault();
                                if (item.enabled === false) {
                                    return;
                                }
                                if (item.doHover) {
                                    item.doHover(self._context);
                                }
                            });

                        }
                    }
                }
            }
        }
    }

    _updateItemsTitles() { // Dynamically updates the title of each Item to the result of Item#getTitle()
        if (!this._context) {
            return;
        }
        for (let i = 0, len = this._itemList.length; i < len; i++) {
            const item = this._itemList[i];
            const itemElement = item.itemElement;
            if (!itemElement) {
                continue;
            }
            const getShown = item.getShown;
            if (!getShown || !getShown(this._context)) {
                continue;
            }
            const title = item.getTitle(this._context);
            if (item.subMenu) {
                itemElement.innerText = title;
            } else {
                itemElement.innerText = title;
            }
        }
    }

    _updateItemsEnabledStatus() { // Enables or disables each Item, depending on the result of Item#getEnabled()
        if (!this._context) {
            return;
        }
        for (let i = 0, len = this._itemList.length; i < len; i++) {
            const item = this._itemList[i];
            const itemElement = item.itemElement;
            if (!itemElement) {
                continue;
            }
            const getEnabled = item.getEnabled;
            if (!getEnabled) {
                continue;
            }
            const getShown = item.getShown;
            if (!getShown) {
                continue;
            }
            const shown = getShown(this._context);
            item.shown = shown;
            if (!shown) {
                itemElement.style.display = "none";
                continue;
            } else {
                itemElement.style.display = "";

            }
            const enabled = getEnabled(this._context);
            item.enabled = enabled;
            if (!enabled) {
                itemElement.classList.add("disabled");
            } else {
                itemElement.classList.remove("disabled");
            }
        }
    }

    _updateSubMenuInfo() {
        if (!this._context) return;
        let itemElement, itemRect, subMenuElement, initialStyles, showOnLeft, subMenuWidth;
        this._itemList.forEach((item) => {
            if (item.subMenu) {
                itemElement = item.itemElement;
                itemRect = itemElement.getBoundingClientRect();
                subMenuElement = item.subMenu.menuElement;
                initialStyles = {
                    visibility: subMenuElement.style.visibility,
                    display: subMenuElement.style.display,
                }
                subMenuElement.style.display = "block";
                subMenuElement.style.visibility = "hidden";
                subMenuWidth = item.subMenu.menuElement.getBoundingClientRect().width;
                subMenuElement.style.visibility = initialStyles.visibility;
                subMenuElement.style.display = initialStyles.display;
                showOnLeft = ((itemRect.right + subMenuWidth) > window.innerWidth);
                itemElement.setAttribute("data-submenuposition", showOnLeft ? "left" : "right");
            }
        })
    }

    _showMenu(menuId, pageX, pageY) { // Shows the given menu, at the specified page coordinates
        const menu = this._menuMap[menuId];
        if (!menu) {
            console.error("Menu not found: " + menuId);
            return;
        }
        if (menu.shown) {
            return;
        }
        const menuElement = menu.menuElement;
        if (menuElement) {
            this._showMenuElement(menuElement, pageX, pageY);
            menu.shown = true;
        }
    }

    _hideMenu(menuId) { // Hides the given menu
        const menu = this._menuMap[menuId];
        if (!menu) {
            console.error("Menu not found: " + menuId);
            return;
        }
        if (!menu.shown) {
            return;
        }
        const menuElement = menu.menuElement;
        if (menuElement) {
            this._hideMenuElement(menuElement);
            menu.shown = false;
        }
    }

    _hideAllMenus() {
        for (let i = 0, len = this._menuList.length; i < len; i++) {
            const menu = this._menuList[i];
            this._hideMenu(menu.id);
        }
    }

    _showMenuElement(menuElement, pageX, pageY) { // Shows the given menu element, at the specified page coordinates
        menuElement.style.display = 'block';
        const menuHeight = menuElement.offsetHeight;
        const menuWidth = menuElement.offsetWidth;

        const offsetRect = this._offsetParent.getBoundingClientRect();
        
        const bottomContainerBorder = offsetRect.bottom + window.scrollY;
        const rightContainerBorder = offsetRect.right + window.scrollX;
        if ((pageY + menuHeight) > bottomContainerBorder) {
            pageY = bottomContainerBorder- menuHeight;
        }
        if ((pageX + menuWidth) > rightContainerBorder) {
            pageX = rightContainerBorder - menuWidth;
        }


        menuElement.style.left = pageX - offsetRect.left - window.scrollX + 'px';
        menuElement.style.top = pageY - offsetRect.top - window.scrollY + 'px';
    }

    _hideMenuElement(menuElement) {
        menuElement.style.display = 'none';
    }
}

export { ContextMenu };