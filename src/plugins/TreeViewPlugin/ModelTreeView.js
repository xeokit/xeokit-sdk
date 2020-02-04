import {Map} from "./../../viewer/scene/utils/Map.js";
import {math} from "../../viewer/scene/math/math.js";

const idMap = new Map();

/** @private
 */
class ModelTreeView {

    /**
     * @private
     */
    constructor(viewer, treeViewPlugin, model, metaModel, cfg) {

        if (!cfg.containerElement) {
            throw "Config expected: containerElement";
        }

        const rootMetaObject = metaModel.rootMetaObject;
        if (!rootMetaObject) {
            return;
        }

        this._id = idMap.addItem();
        this._baseId = "" + this._id;
        this._viewer = viewer;
        this._metaModel = model;
        this._treeViewPlugin = treeViewPlugin;
        this._rootMetaObject = rootMetaObject;
        this._containerElement = cfg.containerElement;
        this._rootElement = null;
        this._muteSceneEvents = false;
        this._muteTreeEvents = false;
        this._rootNodes = [];
        this._objectNodes = {};
        this._rootName = cfg.rootName;
        this._sortNodes = cfg.sortNodes;
        this._shownNodeId = null;

        this._containerElement.oncontextmenu = (e) => {
            e.preventDefault();
        };
        
        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity) => {
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const node = this._objectNodes[objectId];
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
            const checkbox = document.getElementById(node.nodeId);
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
                const parentCheckbox = document.getElementById(parent.nodeId);
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
            const nodeId = checkbox.id;
            const checkedObjectId = this._nodeToObjectID(nodeId);
            const checkedNode = this._objectNodes[checkedObjectId];
            const objects = this._viewer.scene.objects;
            let numUpdated = 0;
            this._withNodeTree(checkedNode, (node) => {
                const objectId = node.objectId;
                const checkBoxId = node.nodeId;
                const entity = objects[objectId];
                const isLeaf = (node.children.length === 0);
                node.numVisibleEntities = visible ? node.numEntities : 0;
                if (isLeaf && (visible !== node.checked)) {
                    numUpdated++;
                }
                node.checked = visible;
                const checkbox = document.getElementById(checkBoxId);
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
                const checkbox = document.getElementById(parent.nodeId); // Parent checkboxes are always in DOM
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

        this._hierarchy = cfg.hierarchy || "containment";
        this._autoExpandDepth = cfg.autoExpandDepth || 0;

        this._createNodes();
    }

    _nodeToObjectID(nodeId) {
        return nodeId.substring(this._baseId.length);
    }

    _objectToNodeID(objectId) {
        return this._baseId + objectId;
    }

    setAutoExpandDepth(depth = 0) {
        this._autoExpandDepth = depth;
    }

    setHierarchy(hierarchy) {
        if (this._hierarchy === hierarchy) {
            return;
        }
        this._hierarchy = hierarchy;
        this._createNodes();
    }

    _createNodes() {
        if (this._rootElement) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._rootElement = null;
        }
        this._rootNodes = [];
        this._objectNodes = {};
        switch (this._hierarchy) {
            case "storeys":
                this._createStoreysNodes();
                if (this._rootNodes.length === 0) {
                    this._treeViewPlugin.error("Failed to build storeys hierarchy for model '" + this._metaModel.id + "' - perhaps this model is not an IFC model?");
                }
                break;
            case "types":
                this._createTypesNodes();
                break;
            case "containment":
            default:
                this._createContainmentNodes();
        }
        if (this._sortNodes) {
            this._doSortNodes();
        }
        this._synchNodesToEntities();
        this._createTrees();
        this.expandToDepth(this._autoExpandDepth);
    }

    _createStoreysNodes(
        metaObject = this._rootMetaObject,
        buildingNode,
        storeyNode,
        typeNodes) {
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        if (metaObjectType === "IfcBuilding") {
            buildingNode = {
                nodeId: this._objectToNodeID(metaObject.id),
                objectId: metaObject.id,
                title: this._rootName || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            this._rootNodes.push(buildingNode);
            this._objectNodes[buildingNode.objectId] = buildingNode;
        } else if (metaObjectType === "IfcBuildingStorey") {
            if (!buildingNode) {
                this._treeViewPlugin.error("Failed to build storeys hierarchy for model '" + this._metaModel.id + "' - model does not have an IfcBuilding object, or is not an IFC model");
                return;
            }
            storeyNode = {
                nodeId: this._objectToNodeID(metaObject.id),
                objectId: metaObject.id,
                title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                type: metaObjectType,
                parent: buildingNode,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            buildingNode.children.push(storeyNode);
            this._objectNodes[storeyNode.objectId] = storeyNode;
            typeNodes = {};
        } else {
            if (storeyNode) {
                typeNodes = typeNodes || {};
                var typeNode = typeNodes[metaObjectType];
                if (!typeNode) {
                    const typeNodeObjectId = storeyNode.objectId + "." + metaObjectType;
                    const typeNodeNodeId = this._objectToNodeID(typeNodeObjectId);
                    typeNode = {
                        nodeId: typeNodeNodeId,
                        objectId: typeNodeObjectId,
                        title: metaObjectType,
                        type: metaObjectType,
                        parent: storeyNode,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        children: []
                    };
                    storeyNode.children.push(typeNode);
                    this._objectNodes[typeNodeObjectId] = typeNode;
                    typeNodes[metaObjectType] = typeNode;
                }
                const node = {
                    nodeId: this._objectToNodeID(metaObject.id),
                    objectId: metaObject.id,
                    title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                    type: metaObjectType,
                    parent: typeNode,
                    numEntities: 0,
                    numVisibleEntities: 0,
                    checked: false,
                    children: []
                };
                typeNode.children.push(node);
                this._objectNodes[node.objectId] = node;
            }
        }
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createStoreysNodes(childMetaObject, buildingNode, storeyNode, typeNodes);
            }
        }
    }

    _createTypesNodes(
        metaObject = this._rootMetaObject,
        buildingNode,
        typeNodes) {
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        if (metaObjectType === "IfcBuilding") {
            buildingNode = {
                nodeId: this._objectToNodeID(metaObject.id),
                objectId: metaObject.id,
                title: this._rootName || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            this._rootNodes.push(buildingNode);
            this._objectNodes[buildingNode.objectId] = buildingNode;
            typeNodes = {};
        } else {
            if (buildingNode) {
                const objects = this._viewer.scene.objects;
                const object = objects[metaObject.id];
                if (object) {
                    const metaObjectType = metaObject.type;
                    const metaObjectName = metaObject.name;
                    var typeNode = typeNodes[metaObjectType];
                    if (!typeNode) {
                        typeNode = {
                            nodeId: this._objectToNodeID(metaObjectType),
                            objectId: metaObjectType,
                            title: metaObjectType,
                            type: metaObjectType,
                            parent: buildingNode,
                            numEntities: 0,
                            numVisibleEntities: 0,
                            checked: false,
                            children: []
                        };
                        buildingNode.children.push(typeNode);
                        this._objectNodes[typeNode.objectId] = typeNode;
                        typeNodes[metaObjectType] = typeNode;
                    }
                    const node = {
                        nodeId: this._objectToNodeID(metaObject.id),
                        objectId: metaObject.id,
                        title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                        type: metaObjectType,
                        parent: typeNode,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        children: []
                    };
                    typeNode.children.push(node);
                    this._objectNodes[node.objectId] = node;
                }
            }
        }
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createTypesNodes(childMetaObject, buildingNode, typeNodes);
            }
        }
    }

    _createContainmentNodes(metaObject = this._rootMetaObject, parent) {
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name || metaObjectType;
        const node = {
            nodeId: this._objectToNodeID(metaObject.id),
            objectId: metaObject.id,
            title: (!parent) ? (this._rootName || metaObjectName) : (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObject.type,
            type: metaObjectType,
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
        this._objectNodes[node.objectId] = node;
        const children = metaObject.children;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createContainmentNodes(childMetaObject, node);
            }
        }
    }

    _doSortNodes() {
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            this._sortChildren(rootNode);
        }
    }

    _sortChildren(node) {
        const children = node.children;
        if (!children || children.length === 0) {
            return;
        }
        if (this._hierarchy === "storeys" && node.type === "IfcBuilding") {
            // Assumes that children of an IfcBuilding will always be IfcBuildingStoreys
            children.sort(this._getSpatialSortFunc());
        } else {
            children.sort(this._alphaSortFunc);
        }
        for (let i = 0, len = children.length; i < len; i++) {
            const node = children[i];
            this._sortChildren(node);
        }
    }

    _getSpatialSortFunc() { // Creates cached sort func with Viewer in scope
        const viewer = this._treeViewPlugin.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const metaScene = viewer.metaScene;
        return this._spatialSortFunc || (this._spatialSortFunc = (node1, node2) => {
            if (!node1.center || !node2.center) {
                // Sorting on center more robust when objects could overlap storeys
                if (!node1.center) {
                    node1.center = math.getAABB3Center(scene.getAABB(metaScene.getObjectIDsInSubtree(node1.objectId)));
                }
                if (!node2.center) {
                    node2.center = math.getAABB3Center(scene.getAABB(metaScene.getObjectIDsInSubtree(node2.objectId)));
                }
            }
            let idx = 0;
            if (camera.xUp) {
                idx = 0;
            } else if (camera.yUp) {
                idx = 1;
            } else {
                idx = 2;
            }
            if (node1.center[idx] > node2.center[idx]) {
                return -1;
            }
            if (node1.center[idx] < node2.center[idx]) {
                return 1;
            }
            return 0;
        });
    }

    _alphaSortFunc(node1, node2) {
        const title1 = node1.title.toUpperCase();
        const title2 = node2.title.toUpperCase();
        if (title1 < title2) {
            return -1;
        }
        if (title1 > title2) {
            return 1;
        }
        return 0;
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
                const node = this._objectNodes[objectId];
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
        const nodeId = this._objectToNodeID(node.objectId);
        nodeElement.id = 'node-' + nodeId;
        if (node.children.length > 0) {
            const groupElementId = "a-" + nodeId;
            const groupElement = document.createElement('a');
            groupElement.href = '#';
            groupElement.id = groupElementId;
            groupElement.textContent = '+';
            groupElement.classList.add('plus');
            groupElement.addEventListener('click', this.groupExpandHandler);
            nodeElement.appendChild(groupElement);
        }
        const checkbox = document.createElement('input');
        checkbox.id = nodeId;
        checkbox.type = "checkbox";
        checkbox.checked = node.checked;
        checkbox.addEventListener("change", this._checkboxChangeHandler);
        nodeElement.appendChild(checkbox);
        const span = document.createElement('span');
        span.textContent = node.title;
        nodeElement.appendChild(span);
        span.addEventListener('click', () =>{
            //alert("clicked");
        });
        span.oncontextmenu = (e) => {
            this._treeViewPlugin.fire("contextmenu", {
                event: e,
                viewer: this._viewer,
                treeViewPlugin: this._treeViewPlugin,
                treeViewNode: node
            });
            e.preventDefault();
        };
        return nodeElement;
    }

    expandToDepth(depth) {
        const expand = (node, countDepth) => {
            if (countDepth === depth) {
                return;
            }
            const nodeId = node.nodeId;
            const groupElementId = "a-" + nodeId;
            const groupElement = document.getElementById(groupElementId);
            if (groupElement) {
                this._expandGroupElement(groupElement);
                const childNodes = node.children;
                for (var i = 0, len = childNodes.length; i < len; i++) {
                    const childNode = childNodes[i];
                    expand(childNode, countDepth + 1);
                }
            }
        };
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            expand(rootNode, 0);
        }
    }

    collapse() {
        if (!this._rootMetaObject) {
            return;
        }
        this._collapseNode(this._rootMetaObject.id);
    }

    showNode(objectId) {
        if (this._shownNodeId) {
            this.unShowNode();
        }
        const nodeId = this._objectToNodeID(objectId);
        const groupElementId = "a-" + nodeId;
        const groupElement = document.getElementById(groupElementId);
        if (groupElement) {
            this._expandGroupElement(groupElement);
            groupElement.scrollIntoView();
            return;
        }
        const path = [];
        const node = this._objectNodes[objectId];
        path.unshift(node);
        let parent = node.parent;
        while (parent) {
            path.unshift(parent);
            parent = parent.parent;
        }
        for (let i = 0, len = path.length; i < len; i++) {
            const node = path[i];
            const nodeId = node.nodeId;
            const groupElementId = "a-" + nodeId;
            const groupElement = document.getElementById(groupElementId);
            if (groupElement) {
                this._expandGroupElement(groupElement);
            }
        }
        const nodeElement = document.getElementById(nodeId);
        const spanElement = nodeElement.parentElement.getElementsByTagName('span')[0];
        spanElement.scrollIntoView({block: "center"});
        const background = spanElement.style.background;
        spanElement.style.background = "yellow";
        this._shownNodeId = nodeId;
    }

    unShowNode() {
        if (!this._shownNodeId) {
            return;
        }
        const nodeElement = document.getElementById(this._shownNodeId);
        if (!nodeElement) {
            this._shownNodeId = null;
            return;
        }
        const spanElement = nodeElement.parentElement.getElementsByTagName('span')[0];
        const background = spanElement.style.background;
        spanElement.style.background = background;
        this._shownNodeId = null;
    }

    _expandGroupElement(groupElement) {
        const parentElement = groupElement.parentElement;
        const expanded = parentElement.getElementsByTagName('li')[0];
        if (expanded) {
            return;
        }
        const nodeId = parentElement.id.replace('node-', '');
        const objectId = this._nodeToObjectID(nodeId);
        const groupNode = this._objectNodes[objectId];
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
        const nodeId = this._objectToNodeID(objectId);
        const groupElementId = "a-" + nodeId;
        const groupElement = document.getElementById(groupElementId);
        this._collapseGroupElement(groupElement);
    }

    _collapseGroupElement(groupElement) {
        if (!groupElement) {
            return;
        }
        const parent = groupElement.parentElement;
        if (!parent) {
            return;
        }
        const ul = parent.querySelector('ul');
        if (!ul) {
            return;
        }
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
        if (this._rootElement && !this._destroyed) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._viewer.scene.off(this._onObjectVisibility);
            this._destroyed = true;
            idMap.removeItem(this._id);
        }
    }
}

export {ModelTreeView};