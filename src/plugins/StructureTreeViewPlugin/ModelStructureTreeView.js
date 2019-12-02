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

        const rootMetaObject = metaModel.rootMetaObject;
        if (!rootMetaObject) {
            return;
        }

        this._viewer = viewer;
        this._metaModel = metaModel;
        this._rootMetaObject = rootMetaObject;
        this._model = model;
        this._containerElement = cfg.containerElement;
        this._rootElement = null;
        this._muteSceneEvents = false; // When true, ModelStructureTreeView ignores "objectVisibility" events from xeokit Scene
        this._muteTreeEvents = false; // When true, ModelStructureTreeView does not update xeokit Entity visibilities
        this._nodeList = [];
        this._nodeMap = {};

        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity) => {
            // When an object's visibility changes, update checkbox state on corresponding node and parents 
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const node = this._nodeMap[objectId];
            if (!node) {
                return; // Not in this tree
            }
            const visible = entity.visible;
            const updated = (visible !== node.checked);
            if (!updated) {
                return;
            }
            this._muteTreeEvents = true;
            node.checked = visible;
            if (visible) {
                node.numVisibleEntities++;
            } else {
                node.numVisibleEntities--;
            }
            const checkbox = document.getElementById(objectId);
            if (checkbox) {
                checkbox.checked = visible;
            }
            let parentId = node.parentId;
            while (parentId) {
                const parentNode = this._nodeMap[parentId];
                parentNode.checked = visible;
                if (visible) {
                    parentNode.numVisibleEntities++;
                } else {
                    parentNode.numVisibleEntities--;
                }
                const parentCheckbox = document.getElementById(parentId);
                if (parentCheckbox) {
                    const newChecked = (parentNode.numVisibleEntities > 0);
                    if (newChecked !== parentCheckbox.checked) {
                        parentCheckbox.checked = newChecked;
                    }
                }
                parentId = parentNode.parentId;
            }
            this._muteTreeEvents = false;
        });

        this.groupExpandHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const groupElement = event.target;
            this._expandGroupElement(groupElement);
        };

        this.groupCollapseHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const groupElement = event.target;
            this._collapseGroupElement(groupElement);
        };

        this._checkboxChangeHandler = (event) => {
            if (this._muteTreeEvents) {
                return;
            }
            this._muteSceneEvents = true;
            const checkbox = event.target;
            const visible = checkbox.checked;
            const checkedObjectId = checkbox.id;
            const checkedMetaObject = this._viewer.metaScene.metaObjects[checkedObjectId];
            let numUpdated = 0;
            this._withMetaObjectsInSubtree(checkedMetaObject, (metaObject) => {
                const objectId = metaObject.id;
                const node = this._nodeMap[objectId];
                node.numVisibleEntities = visible ? node.numEntities : 0;
                if (((!metaObject.children) || (metaObject.children.length === 0)) && (visible !== node.checked)) {
                    numUpdated++;
                }
                node.checked = visible;
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
            const node = this._nodeMap[checkedObjectId];
            let parentId = node.parentId;
            while (parentId) {
                const parentNode = this._nodeMap[parentId];
                parentNode.checked = visible;
                const checkbox = document.getElementById(parentId); // Parent checkboxes are always in DOM
                if (visible) {
                    parentNode.numVisibleEntities += numUpdated;
                } else {
                    parentNode.numVisibleEntities -= numUpdated;
                }
                const newChecked = (parentNode.numVisibleEntities > 0);
                if (newChecked !== checkbox.checked) {
                    checkbox.checked = newChecked;
                }
                parentId = parentNode.parentId;
            }
            this._muteSceneEvents = false;
        };


        this._init();

        if (cfg.autoExpandDepth) {
            this._expandToDepth(cfg.autoExpandDepth);
        }

        this._initWithoutError = true;
    }

    _init() {
        this._createData();
        this._synchDataToScene();
        this._createTrees();
    }

    _createData(metaObject = this._rootMetaObject) {
        // Build tree view data structure from meta model
        const metaObjectName = metaObject.name;
        const node = {
            id: metaObject.id,
            name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObject.type,
            parentId: metaObject.parent ? metaObject.parent.id : null,
            numEntities: 0,
            numVisibleEntities: 0,
            checked: false
        };
        this._nodeList.push(node);
        this._nodeMap[node.id] = node;
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createData(childMetaObject);
            }
        }
    }

    _synchDataToScene() {
        // Record entity and visibility counts at tree nodes
        const rootMetaObject = this._rootMetaObject;
        const objectIds = rootMetaObject.getObjectIDsInSubtree();
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const node = this._nodeMap[objectId];
            node.numEntities = 0;
            node.numVisibleEntities = 0;
            node.checked = false;
        }
        const metaObjects = this._viewer.metaScene.metaObjects;
        const objects = this._viewer.scene.objects;
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const metaObject = metaObjects[objectId];
            if (metaObject) {
                const node = this._nodeMap[objectId];
                const entity = objects[objectId];
                if (entity) {
                    const visible = entity.visible;
                    node.numEntities = 1;
                    if (visible) {
                        node.numVisibleEntities = 1;
                        node.checked = true;
                    } else {
                        node.numVisibleEntities = 0;
                        node.checked = false;
                    }
                    let parentId = node.parentId; // Synch parents
                    while (parentId) {
                        let parent = this._nodeMap[parentId];
                        parent.numEntities++;
                        if (visible) {
                            parent.numVisibleEntities++;
                            parent.checked = true;
                        }
                        parentId = parent.parentId;
                    }
                }
            }
        }
    }

    _createTrees() {
        // Create DOM element for the unexpanded root of each tree
        const rootNodes = this._nodeList.filter((node) => {
            return node.parentId === null;
        });
        if (rootNodes.length === 0) {
            return;
        }
        const rootNodeElements = rootNodes.map((rootNode) => {
            return this._createNodeElement(rootNode);
        });
        const ul = document.createElement('ul');
        rootNodeElements.forEach(function (nodeElement) {
            ul.appendChild(nodeElement);
            });
        this._containerElement.appendChild(ul);
        this._rootElement = ul;
    }

    _createNodeElement(node) {
        // Create a DOM element for a node, which represents an object
        const nodeElement = document.createElement('li');
        nodeElement.id = 'node-' + node.id;
        if (this._hasChildren(node.id)) {
            const groupElementId = "a-" + node.id;
            const groupElement = document.createElement('a');
            groupElement.href = '#';
            groupElement.id = groupElementId;
            groupElement.textContent = '+';
            groupElement.classList.add('plus');
            groupElement.addEventListener('click', this.groupExpandHandler);
            nodeElement.appendChild(groupElement);
        }
        const checkbox = document.createElement('input');
        checkbox.id = node.id;
        checkbox.type = "checkbox";
        checkbox.checked = node.checked;
        checkbox.addEventListener("change", this._checkboxChangeHandler);
        nodeElement.appendChild(checkbox);
        const span = document.createElement('span');
        span.textContent = node.name;
        nodeElement.appendChild(span);
        span.addEventListener('click', () =>{
            //alert("clicked");
        });
        return nodeElement;
    }

    _hasChildren(parentId) {
        return this._nodeList.some((node) => {
            return node.parentId === parentId;
        });
    }

    _expandToDepth(depth) {
        const expand = (metaObject, countDepth) => {
            if (countDepth === depth) {
                return;
            }
            const objectId = metaObject.id;
            const groupElementId = "a-" + objectId;
            const groupElement = document.getElementById(groupElementId);
            if (groupElement) {
                this._expandGroupElement(groupElement);
                const childMetaObjects = metaObject.children;
                for (var i = 0, len = childMetaObjects.length; i < len; i++) {
                    const childMetaObject = childMetaObjects[i];
                    expand(childMetaObject, countDepth + 1);
                }
            }
        };
        const rootMetaObject = this._rootMetaObject;
        expand(rootMetaObject, 0);
    }

    _expandNode(objectId) {
        //
        const groupElementId = "a-" + objectId;
        const groupElement = document.getElementById(groupElementId);
        if (groupElement) {
            this._expandGroupElement(groupElement);
            return;
        }
        const path = [];
        path.unshift(objectId);
        const node = this._nodeMap[objectId];
        let parentId = node.parentId;
        while (parentId) {
            let parent = this._nodeMap[parentId];
            path.unshift(parentId);
            parentId = parent.parentId;
        }
        for (var i = 0, len = path.length; i < len; i++) {
            //const element =
        }
    }

    _expandGroupElement(groupElement) {
        const parentElement = groupElement.parentElement;
        const id = parentElement.id.replace('node-', '');
        const childNodes = this._nodeList.filter((node) => {
            return node.parentId === id;
        });
        const nodeElements = childNodes.map((node) => {
            return this._createNodeElement(node);
        });
        const ul = document.createElement('ul');
        nodeElements.forEach((nodeElement) => {
            ul.appendChild(nodeElement);
        });
        parentElement.appendChild(ul);
        groupElement.classList.remove('plus');
        groupElement.classList.add('minus');
        groupElement.textContent = '-';
        groupElement.removeEventListener('click', this.groupExpandHandler);
        groupElement.addEventListener('click', this.groupCollapseHandler);
    }

    _collapseNode(objectId) {

    }

    _collapseGroupElement(groupElement) {
        const parent = groupElement.parentElement;
        const ul = parent.querySelector('ul');
        parent.removeChild(ul);
        groupElement.classList.remove('minus');
        groupElement.classList.add('plus');
        groupElement.textContent = '+';
        groupElement.removeEventListener('click', this.groupCollapseHandler);
        groupElement.addEventListener('click', this.groupExpandHandler);
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
        if (this._initWithoutError && !this._destroyed) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._viewer.scene.off(this._onObjectVisibility);
            this._model.off(this._onModelDestroyed);
            this._destroyed = true;
        }
    }
}

export {ModelStructureTreeView};