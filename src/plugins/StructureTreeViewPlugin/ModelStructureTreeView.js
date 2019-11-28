/** @private
 */
class ModelStructureTreeView {

    /**
     * @private
     */
    constructor(viewer, model, metaModel, cfg) {

        if (!cfg.containerElement) {
            throw "Config expected: containerElement";
        }

        this._viewer = viewer;
        this._metaModel = metaModel;
        this._model = model;
        this._containerElement = cfg.containerElement;
        this._rootElement = null;
        this._muteSceneEvents = false; // When true, ModelStructureTreeView ignores "objectVisibility" events from xeokit Scene
        this._muteTreeEvents = false; // When true, ModelStructureTreeView does not update xeokit Entity visibilities
        this._data = [];
        this._dataMap = {};

        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity) => {
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const item = this._dataMap[objectId];
            if (!item) {
                return; // Not in this tree
            }
            const visible = entity.visible;
            const updated = (visible !== item.checked);
            if (!updated) {
                return;
            }
            this._muteTreeEvents = true;
            item.checked = visible;
            if (visible) {
                item.numVisibleEntities++;
            } else {
                item.numVisibleEntities--;
            }
            const checkbox = document.getElementById(objectId);
            if (checkbox) {
                checkbox.checked = visible;
            }
            let parentId = item.parent;
            while (parentId) {
                const parentItem = this._dataMap[parentId];
                parentItem.checked = visible;
                if (visible) {
                    parentItem.numVisibleEntities++;
                } else {
                    parentItem.numVisibleEntities--;
                }
                const parentCheckbox = document.getElementById(parentId);
                if (parentCheckbox) {
                    const newChecked = (parentItem.numVisibleEntities > 0);
                    if (newChecked !== parentCheckbox.checked) {
                        parentCheckbox.checked = newChecked;
                    }
                }
                parentId = parentItem.parent;
            }
            this._muteTreeEvents = false;
        });

        this._onModelDestroyed = this._model.on("destroyed", () => {
            this.destroy();
        });
        
        this._expandHandler = (e) => {
            this._expand(e);
        };

        this._collapseHandler = (e) => {
            this._collapse(e);
        };

        this._treeNodeCheckedHandler = (e) => {
            this._treeNodeChecked(e);
        };

        this._addModelTreeData();
        
        this._initWithoutError = true;
    }

    _addModelTreeData() {
        this._addMetaObjectTreeData(this._metaModel.rootMetaObject);
        this._synchModelTreeDataToScene();
        this._addOrphans();
    }

    _addMetaObjectTreeData(metaObject) { // Add a node for the given object
        if (!metaObject) {
            return;
        }
        const metaObjectName = metaObject.name;
        const item = {
            id: metaObject.id,
            name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObject.type,
            parent: metaObject.parent ? metaObject.parent.id : null,
            numEntities: 0,
            numVisibleEntities: 0,
            checked: false
        };
        this._data.push(item);
        this._dataMap[item.id] = item;
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                this._addMetaObjectTreeData(children[i]);
            }
        }
    }

    _synchModelTreeDataToScene() {
        const objectIds = this._metaModel.rootMetaObject.getObjectIDsInSubtree();
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const item = this._dataMap[objectId];
            item.numEntities = 0;
            item.numVisibleEntities = 0;
            item.checked = false;
        }
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const metaObject = this._viewer.metaScene.metaObjects[objectId];
            if (metaObject) {
                const item = this._dataMap[objectId];
                const entity = this._viewer.scene.objects[objectId];
                if (entity) {
                    const visible = entity.visible;
                    item.numEntities = 1;
                    if (visible) {
                        item.numVisibleEntities = 1;
                        item.checked = true;
                    } else {
                        item.numVisibleEntities = 0;
                        item.checked = false;
                    }
                    let parentId = item.parent; // Synch parents
                    while (parentId) {
                        let parent = this._dataMap[parentId];
                        parent.numEntities++;
                        if (visible) {
                            parent.numVisibleEntities++;
                            parent.checked = true;
                        }
                        parentId = parent.parent;
                    }
                }
            }
        }
    }

    _addOrphans() {
        const orphansArray = this._data.filter((item) => {
            return item.parent === null;
        });
        if (orphansArray.length > 0) {
            const items = orphansArray.map((item) => {
                return this._generateListItem(item);
            });
            const ul = document.createElement('ul');
            items.forEach(function (li) {
                ul.appendChild(li);
            });
            this._containerElement.appendChild(ul);
            this._rootElement = ul;
        }
    }

    _getChildren(parentId) {
        return this._data.filter((item) => {
            return item.parent === parentId;
        });
    }

    _generateListItem(item) {
        const li = document.createElement('li');
        li.id = 'item-' + item.id;
        if (this._hasChildren(item.id)) {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = '+';
            a.classList.add('plus');
            a.addEventListener('click', this._expandHandler);
            li.appendChild(a);
        }
        const checkbox = document.createElement('input');
        checkbox.id = item.id;
        checkbox.type = "checkbox";
        checkbox.checked = item.checked;
        checkbox.addEventListener("change", this._treeNodeCheckedHandler);
        li.appendChild(checkbox);
        const span = document.createElement('span');
        span.textContent = item.name;
        li.appendChild(span);
        span.addEventListener('click', () =>{
            alert("clicked");
        });
        return li;
    }

    _hasChildren(parentId) {
        return this._data.some((item) => {
            return item.parent === parentId;
        });
    }

    _treeNodeChecked(event) {
        if (this._muteTreeEvents) {
            return;
        }
        this._muteSceneEvents = true;
        const node = event.target;
        const visible = node.checked;
        const checkedObjectId = node.id;
        const checkedMetaObject = this._viewer.metaScene.metaObjects[checkedObjectId];
        let numUpdated = 0;
        this._withMetaObjectsInSubtree(checkedMetaObject, (metaObject) => {
            const objectId = metaObject.id;
            const item = this._dataMap[objectId];
            item.numVisibleEntities = visible ? item.numEntities : 0;
            if (visible !== item.checked) {
                numUpdated++;
            }
            item.checked = visible;
            const checkbox = document.getElementById(objectId);
            if (checkbox) {
                // Checkbox element is currently in DOM
                checkbox.checked = visible;
            }
            const entity = this._viewer.scene.objects[objectId];
            if (entity) {
                entity.visible = visible;
            }
        });
        const item = this._dataMap[checkedObjectId];
        let parentId = item.parent;
        while (parentId) {
            const parentItem = this._dataMap[parentId];
            parentItem.checked = visible;
            const checkbox = document.getElementById(parentId); // Parent checkboxes are always in DOM
            if (visible) {
                parentItem.numVisibleEntities += numUpdated;
            } else {
                parentItem.numVisibleEntities -= numUpdated;
            }
            const newChecked = (parentItem.numVisibleEntities > 0);
            if (newChecked !== checkbox.checked) {
                checkbox.checked = newChecked;
            }
            parentId = parentItem.parent;
        }
        this._muteSceneEvents = false;
    }

    _expand(event) {
        event.preventDefault();
        event.stopPropagation();
        const element = event.target;
        const parentElement = element.parentElement;
        const id = parentElement.id.replace('item-', '');
        const childElements = this._getChildren(id);
        const items = childElements.map((item) => {
            return this._generateListItem(item);
        });
        const ul = document.createElement('ul');
        items.forEach((li) => {
            ul.appendChild(li);
        });
        parentElement.appendChild(ul);
        element.classList.remove('plus');
        element.classList.add('minus');
        element.textContent = '-';
        element.removeEventListener('click', this._expandHandler);
        element.addEventListener('click', this._collapseHandler);
    }

    _collapse(event) {
        event.preventDefault();
        event.stopPropagation();
        const element = event.target;
        const parent = element.parentElement;
        const ul = parent.querySelector('ul');
        parent.removeChild(ul);
        element.classList.remove('minus');
        element.classList.add('plus');
        element.textContent = '+';
        element.removeEventListener('click', this._collapseHandler);
        element.addEventListener('click', this._expandHandler);
    }

    _withMetaObjectsInSubtree(metaObject, callback) {
        const visit = (metaObject) => {
            if (!metaObject) {
                return;
            }
            callback(metaObject);
            const children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        };
        visit(metaObject);
    }

    /**
     * Destroys this ModelTreeView.
     */
    destroy() {
        if (this._initWithoutError) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._viewer.scene.off(this._onObjectVisibility);
            this._model.off(this._onModelDestroyed);
        }
    }
}

export {ModelStructureTreeView};