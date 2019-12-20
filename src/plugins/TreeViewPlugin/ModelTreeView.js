/** @private
 */
class ModelTreeView {

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
        this._rootMetaObject = rootMetaObject;
        this._model = model;
        this._containerElement = cfg.containerElement;
        this._rootElement = null;
        this._muteSceneEvents = false;
        this._muteTreeEvents = false;
        this._rootNodes = [];
        this._nodeMap = {};

        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity) => {
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
            let parent = node.parent;
            while (parent) {
                parent.checked = visible;
                if (visible) {
                    parent.numVisibleEntities++;
                } else {
                    parent.numVisibleEntities--;
                }
                const parentCheckbox = document.getElementById(parentId);
                if (parentCheckbox) {
                    const newChecked = (parent.numVisibleEntities > 0);
                    if (newChecked !== parentCheckbox.checked) {
                        parentCheckbox.checked = newChecked;
                    }
                }
                parent = parent.parent;
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
            const checkedNode = this._nodeMap[checkedObjectId];
            const objects = this._viewer.scene.objects;

            let numUpdated = 0;
            this._withNodeTree(checkedNode, (node) => {
                const objectId = node.id;
                const entity = objects[objectId];
                const isLeaf = (node.children.length === 0);
                node.numVisibleEntities = visible ? node.numEntities : 0;
                if (isLeaf && (visible !== node.checked)) {
                    numUpdated++;
                }
                node.checked = visible;
                const checkbox = document.getElementById(objectId);
                if (checkbox) {
                    checkbox.checked = visible;
                }
                if (entity) {
                    entity.visible = visible;
                }
            });
            let parent = checkedNode.parent;
            while (parent) {
                parent.checked = visible;
                const checkbox = document.getElementById(parent.id); // Parent checkboxes are always in DOM
                if (visible) {
                    parent.numVisibleEntities += numUpdated;
                } else {
                    parent.numVisibleEntities -= numUpdated;
                }
                const newChecked = (parent.numVisibleEntities > 0);
                if (newChecked !== checkbox.checked) {
                    checkbox.checked = newChecked;
                }
                parent = parent.parent;
            }
            this._muteSceneEvents = false;
        };

        this._mode = cfg.mode || "structure";

        this._createNodes();

        if (cfg.autoExpandDepth) {
            this._expandToDepth(cfg.autoExpandDepth);
        }

        this._createNodesWithoutError = true;
    }

    setMode(mode) {
        if (this._mode === mode) {
            return;
        }
        this._mode = mode;
        this._createNodes();
    }

    _createNodes() {
        if (this._rootElement) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._rootElement = null;
        }
        this._rootNodes = [];
        this._nodeMap = {};
        switch (this._mode) {
            case "storeys":
                this._createStoreysNodes();
                break;
            case "types":
                this._createTypesNodes();
                break;
            case "structure":
            default:
                this._createStructureNodes();
        }
        this._synchNodesToEntities();
        this._createTrees();
    }

    _createStoreysNodes(
        metaObject = this._rootMetaObject,
        projectNode,
        storeyNode,
        typeNodes) {
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        if (metaObjectType === "IfcProject") {
            projectNode = {
                id: metaObject.id,
                name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            this._rootNodes.push(projectNode);
            this._nodeMap[projectNode.id] = projectNode;
        } else if (metaObjectType === "IfcBuildingStorey") {
            storeyNode = {
                id: metaObject.id,
                name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                parent: projectNode,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            projectNode.children.push(storeyNode);
            this._nodeMap[storeyNode.id] = storeyNode;
            typeNodes = {};
        } else {
            if (storeyNode) {
                typeNodes = typeNodes || {};
                var typeNode = typeNodes[metaObjectType];
                if (!typeNode) {
                    typeNode = {
                        id: storeyNode.id + "." + metaObjectType,
                        name: metaObjectType,
                        parent: storeyNode,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        children: []
                    };
                    storeyNode.children.push(typeNode);
                    this._nodeMap[typeNode.id] = typeNode;
                    typeNodes[metaObjectType] = typeNode;
                }
                const node = {
                    id: metaObject.id,
                    name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                    parent: typeNode,
                    numEntities: 0,
                    numVisibleEntities: 0,
                    checked: false,
                    children: []
                };
                typeNode.children.push(node);
                this._nodeMap[node.id] = node;
            }
        }
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createStoreysNodes(childMetaObject, projectNode, storeyNode, typeNodes);
            }
        }
    }

    _createTypesNodes(metaObject = this._rootMetaObject, typeNodes = {}) {
        const objects = this._viewer.scene.objects;
        const object = objects[metaObject.id];
        if (object) {
            const metaObjectType = metaObject.type;
            const metaObjectName = metaObject.name;
            var typeNode = typeNodes[metaObjectType];
            if (!typeNode) {
                typeNode = {
                    id: metaObjectType,
                    name: metaObjectType,
                    parent: null,
                    numEntities: 0,
                    numVisibleEntities: 0,
                    checked: false,
                    children: []
                };
                this._rootNodes.push(typeNode);
                this._nodeMap[typeNode.id] = typeNode;
                typeNodes[metaObjectType] = typeNode;
            }
            const node = {
                id: metaObject.id,
                name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                parent: typeNode,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            typeNode.children.push(node);
            this._nodeMap[node.id] = node;
        }
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createTypesNodes(childMetaObject, typeNodes);
            }
        }
    }

    _createStructureNodes(metaObject = this._rootMetaObject, parent) {
        const metaObjectName = metaObject.name;
        const node = {
            id: metaObject.id,
            name: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObject.type,
            parent: parent,
            numEntities: 0,
            numVisibleEntities: 0,
            checked: false,
            children: []
        };
        if (parent) {
            parent.children.push(node);
        } else {
            this._rootNodes.push(node);
        }
        this._nodeMap[node.id] = node;
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createStructureNodes(childMetaObject, node);
            }
        }
    }

    _synchNodesToEntities() {
        const rootMetaObject = this._rootMetaObject;
        const objectIds = rootMetaObject.getObjectIDsInSubtree();
        const metaObjects = this._viewer.metaScene.metaObjects;
        const objects = this._viewer.scene.objects;
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const metaObject = metaObjects[objectId];
            if (metaObject) {
                const node = this._nodeMap[objectId];
                if (node) {
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
                        let parent = node.parent; // Synch parents
                        while (parent) {
                            parent.numEntities++;
                            if (visible) {
                                parent.numVisibleEntities++;
                                parent.checked = true;
                            }
                            parent = parent.parent;
                        }
                    }
                }
            }
        }
    }

    _withNodeTree(node, callback) {
        callback(node);
        const children = node.children;
        if (!children) {
            return;
        }
        for (let i = 0, len = children.length; i < len; i++) {
            this._withNodeTree(children[i], callback);
        }
    }

    _createTrees() {
        if (this._rootNodes.length === 0) {
            return;
        }
        const rootNodeElements = this._rootNodes.map((rootNode) => {
            return this._createNodeElement(rootNode);
        });
        const ul = document.createElement('ul');
        rootNodeElements.forEach((nodeElement) => {
            ul.appendChild(nodeElement);
        });
        this._containerElement.appendChild(ul);
        this._rootElement = ul;
    }

    _createNodeElement(node) {
        const nodeElement = document.createElement('li');
        nodeElement.id = 'node-' + node.id;
        if (node.children.length > 0) {
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
        const groupElementId = "a-" + objectId;
        const groupElement = document.getElementById(groupElementId);
        if (groupElement) {
            this._expandGroupElement(groupElement);
            return;
        }
        const path = [];
        path.unshift(objectId);
        const node = this._nodeMap[objectId];
        let parent = node.parent;
        while (parent) {
            path.unshift(parent.id);
            parent = parent.parent;
        }
        for (var i = 0, len = path.length; i < len; i++) {
            //const element =
        }
    }

    _expandGroupElement(groupElement) {
        const parentElement = groupElement.parentElement;
        const id = parentElement.id.replace('node-', '');
        const groupNode = this._nodeMap[id];
        const childNodes = groupNode.children;
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

    /**
     * Destroys this ModelTreeView.
     */
    destroy() {
        if (this._createNodesWithoutError && !this._destroyed) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._viewer.scene.off(this._onObjectVisibility);
            this._destroyed = true;
        }
    }
}

export {ModelTreeView};