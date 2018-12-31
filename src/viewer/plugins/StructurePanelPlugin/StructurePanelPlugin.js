import {Plugin} from "./../../Plugin.js";

/**
 * A {@link Viewer} plugin that renders an HTML explorer tree for navigating the structure metadata within {@link Viewer#metaScene}.
 *
 * Each node in the tree corresponds to an {@link MetaObject} in the structure metadata.
 *
 * Refreshes itself whenever it gets "metadata-created" and "metadata-destroyed" events from the {@link Viewer}.
 *
 * @example
 *
 * @class StructurePanelPlugin
 */
class StructurePanelPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="StructurePanel"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} cfg.domElementId ID of HTML DOM element within which to build the tree.
     */
    constructor(viewer, cfg) {

        super("StructurePanel", viewer);

        if (!cfg.domElementId) {
            throw "Config expected: domElementId";
        }

        this._domElement = document.getElementById(cfg.domElementId);

        if (!this._domElement) {
            throw "Document element not found: '" + cfg.domElementId + "'";
        }

        this.TOGGLE = 0;
        this.SELECT = 1;
        this.SELECT_EXCLUSIVE = 2;
        this.DESELECT = 3;

        this._initError = false;
        this._fromXml = false;
        this._domElements = {};
        this.selectionState = {};

        this._onLoaded = this.viewer.metaScene.on("metaModelCreated", modelId => {
            if (this.viewer.metaScene.metaModels[modelId]) {
                this._build();
            }
        });

        this._onUnloaded = this.viewer.metaScene.on("metaModelDestroyed", modelId => { // TODO: How to only rebuild when structure deleted?
            this._build();
        });
    }

    /**
     * @private
     */
    _build() {
        var metaModels = this.viewer.metaScene.metaModels;
        for (var modelId in metaModels) { // TODO: Blow away old HTMl elements
            if (metaModels.hasOwnProperty(modelId)) {
                const metaModel = metaModels[modelId];
                var div = document.createElement("div");
                div.className = "item";
                if (metaModel) {
                    const rootMetaObject = metaModel.rootMetaObject;
                    this._build2(modelId, div, rootMetaObject);
                }
                this._domElement.appendChild(div);
            }
        }
    }

    /**
     * @private
     */
    _build2(modelId, div, metaObject) {
        const label = document.createElement("div");
        const children = document.createElement("div");
        var name = metaObject.name;
        if (name && name.length > 30) {
            name = name.slice(0, 30) + "..";
        }
        label.className = "label";
        label.appendChild(document.createTextNode(name || metaObject.objectId));
        div.appendChild(label);
        children.className = "children";
        div.appendChild(children);
        this._domElements[metaObject.objectId] = label;

        const self = this;

        label.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            self.setSelected([metaObject.objectId], e.shiftKey ? self.TOGGLE : self.SELECT_EXCLUSIVE);
            self.fire("clicked", {
                objectId: metaObject.objectId
            });
            return false;
        };

        for (var i = 0; i < (metaObject.children || []).length; ++i) {
            const child = metaObject.children[i];
            const childDiv = document.createElement("div");
            childDiv.className = "item";
            children.appendChild(childDiv);
            this._build2(modelId, childDiv, child);
        }
    };

    /**
     * @private
     */
    send(name, value) {

    }

    /**
     * @private
     */
    _getOffset(elem) {
        var y = 0;
        while (true) {
            y += elem.offsetTop;
            if (elem === this._domElement) {
                break;
            }
            elem = elem.offsetParent;
        }
        return y;
    }

    /**
     * Sets which nodes in the StructurePanel are currently selected.
     * @param ids
     * @param mode
     */
    setSelected(ids, mode) {

        if (this.mode === this.SELECT_EXCLUSIVE) {
            this.setSelected(this.getSelected(true), this.DESELECT);
        }

        var self = this;

        ids.forEach(function (id) {
            var s = null;
            if (self.mode === self.TOGGLE) {
                s = self.selectionState[id] = !self.selectionState[id];
            } else if (self.mode === self.SELECT || self.mode === self.SELECT_EXCLUSIVE) {
                s = self.selectionState[id] = true;
            } else if (self.mode === self.DESELECT) {
                s = self.selectionState[id] = false;
            }
            self._domElements[id].className = s ? "label selected" : "label";
        });

        var desiredViewRange = this.getSelected().map(function (id) {
            return self._getOffset(self._domElements[id]);
        });

        if (desiredViewRange.length) {
            desiredViewRange.sort();
            desiredViewRange = [desiredViewRange[0], desiredViewRange[desiredViewRange.length - 1]];
            var domElement = this._domElement;
            var currentViewRange = [domElement.scrollTop, domElement.scrollTop + domElement.offsetHeight];
            if (!(desiredViewRange[0] >= currentViewRange[0] && desiredViewRange[1] <= currentViewRange[1])) {
                if ((desiredViewRange[1] - desiredViewRange[0]) > (currentViewRange[1] - currentViewRange[0])) {
                    domElement.scrollTop = desiredViewRange[0];
                } else {
                    var l = parseInt((desiredViewRange[1] + desiredViewRange[0]) / 2. - (currentViewRange[1] - currentViewRange[0]) / 2., 10);
                    l = Math.max(l, 0);
                    l = Math.min(l, domElement.scrollHeight - domElement.offsetHeight);
                    domElement.scrollTop = l;
                }
            }
        }

        this.fire("selection-changed", [this.getSelected(true)])
    }

    /**
     * Gets which nodes in the StructurePanel are currently selected.
     * @param b
     * @returns {Array}
     */
    getSelected(b) {
        b = typeof (b) === 'undefined' ? true : !!b;
        var l = [];
        const self = this;
        Object.keys(this.selectionState).forEach(function (k) {
            if (!!self.selectionState[k] === b) {
                l.push(k);
            }
        });
        return l;
    };

    /**
     * Destroys this StructurePanel.
     */
    destroy() {

        this.viewer.off(this._onLoaded);
        this.viewer.off(this._onUnloaded);

        super.destroy();
    }
}

export {StructurePanelPlugin}
