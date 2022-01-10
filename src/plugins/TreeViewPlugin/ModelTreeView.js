import {Map} from "./../../viewer/scene/utils/Map.js";
import {
    validateMetaModelForTreeViewContainmentHierarchy,
    validateMetaModelForTreeViewStoreysHierarchy, validateMetaModelForTreeViewTypesHierarchy
} from "./modelValidation.js";

const idMap = new Map();

/**
 * @desc Represents a model tree view within a {@link TreeViewPlugin}.
 *
 * * Stored in {@link treeViewPlugin#modelTreeViews}, mapped to the model ID.
 * * Created by each call to {@link TreeViewPlugin#addModel}.
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

        /**
         * Contains messages for any errors found in the MetaModel for this ModelTreeView.
         * @type {String[]}
         */
        this.errors = [];

        /**
         * True if errors were found in the MetaModel for this ModelTreeView.
         * @type {boolean}
         */
        this.valid = true;

        /**
         * The MetaModel corresponding to this ModelTreeView.
         * @type {MetaModel}
         */
        this.metaModel = metaModel;

        this._id = idMap.addItem();
        this._baseId = "" + this._id;
        this._viewer = viewer;
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
        this._pruneEmptyNodes = cfg.pruneEmptyNodes;

        this._showListItemElementId = null;

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

        this.switchExpandHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._expandSwitchElement(switchElement);
        };

        this.switchCollapseHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._collapseSwitchElement(switchElement);
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
                const checkbox2 = document.getElementById(checkBoxId);
                if (checkbox2) {
                    checkbox2.checked = visible;
                }
                if (entity) {
                    entity.visible = visible;
                }
            });
            let parent = checkedNode.parent;
            while (parent) {
                parent.checked = visible;
                const checkbox2 = document.getElementById(parent.nodeId); // Parent checkboxes are always in DOM
                if (visible) {
                    parent.numVisibleEntities += numUpdated;
                } else {
                    parent.numVisibleEntities -= numUpdated;
                }
                const newChecked = (parent.numVisibleEntities > 0);
                if (newChecked !== checkbox2.checked) {
                    checkbox2.checked = newChecked;
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

    /**
     * @private
     * @param depth
     */
    setAutoExpandDepth(depth = 0) {
        this._autoExpandDepth = depth;
    }

    /**
     * @private
     * @param hierarchy
     */
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
        this._validate();
        if (this.valid || (this._hierarchy !== "storeys")) {
            this._createEnabledNodes();
        } else {
            this._createDisabledNodes();
        }
    }

    _validate() {
        this.errors = [];
        switch (this._hierarchy) {
            case "storeys":
                this.valid = validateMetaModelForTreeViewStoreysHierarchy(this.metaModel, this.errors);
                break;
            case "types":
                this.valid = validateMetaModelForTreeViewTypesHierarchy(this.metaModel, this.errors);
                break;
            case "containment":
            default:
                this.valid = validateMetaModelForTreeViewContainmentHierarchy(this.metaModel, this.errors);
                break;
        }
        return this.valid;
    }

    _createEnabledNodes() {
        if (this._pruneEmptyNodes) {
            this._findEmptyNodes();
        }
        switch (this._hierarchy) {
            case "storeys":
                this._createStoreysNodes();
                if (this._rootNodes.length === 0) {
                    this._treeViewPlugin.error("Failed to build storeys hierarchy for model '" + this.metaModel.id + "' - perhaps this model is not an IFC model?");
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

    _createDisabledNodes() {

        const metaObject = this._rootMetaObject;
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;

        const rootName = ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType);

        const ul = document.createElement('ul');
        const li = document.createElement('li');
        ul.appendChild(li);
        this._containerElement.appendChild(ul);
        this._rootElement = ul;

        const switchElement = document.createElement('a');
        switchElement.href = '#';
        switchElement.textContent = '!';
        switchElement.classList.add('warn');
        switchElement.classList.add('warning');
        li.appendChild(switchElement);

        const span = document.createElement('span');
        span.textContent = rootName;
        li.appendChild(span);
    }

    _findEmptyNodes(metaObject = this._rootMetaObject, countEntities = 0) {
        const viewer = this._treeViewPlugin.viewer;
        const scene = viewer.scene;
        const children = metaObject.children;
        const objectId = metaObject.id;
        const entity = scene.objects[objectId];
        metaObject._countEntities = 0;
        if (entity) {
            metaObject._countEntities++;
        }
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                childMetaObject._countEntities = this._findEmptyNodes(childMetaObject);
                metaObject._countEntities += childMetaObject._countEntities;
            }
        }
        return metaObject._countEntities;
    }

    _createStoreysNodes(
        metaObject = this._rootMetaObject,
        buildingNode,
        storeyNode,
        typeNodes) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        const children = metaObject.children;
        const objectId = metaObject.id;
        if (metaObjectType === "IfcBuilding") {
            buildingNode = {
                nodeId: this._objectToNodeID(objectId),
                objectId: objectId,
                title: this._rootName || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
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
                this._treeViewPlugin.error("Failed to build storeys hierarchy for model '" + this.metaModel.id + "' - model does not have an IfcBuilding object, or is not an IFC model");
                return;
            }
            storeyNode = {
                nodeId: this._objectToNodeID(objectId),
                objectId: objectId,
                title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
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
                const objects = this._viewer.scene.objects;
                const object = objects[objectId];
                if (object) {
                    typeNodes = typeNodes || {};
                    let typeNode = typeNodes[metaObjectType];
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
                        nodeId: this._objectToNodeID(objectId),
                        objectId: objectId,
                        title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
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
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createStoreysNodes(childMetaObject, buildingNode, storeyNode, typeNodes);
            }
        }
    }

    _createTypesNodes(metaObject = this._rootMetaObject, rootNode, typeNodes) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        const children = metaObject.children;
        const objectId = metaObject.id;
        if (metaObject.id === this._rootMetaObject.id) {
            rootNode = {
                nodeId: this._objectToNodeID(objectId),
                objectId: objectId,
                title: this._rootName || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                children: []
            };
            this._rootNodes.push(rootNode);
            this._objectNodes[rootNode.objectId] = rootNode;
            typeNodes = {};
        } else {
            if (rootNode) {
                const objects = this._viewer.scene.objects;
                const object = objects[objectId];
                if (object) {
                    let typeNode = typeNodes[metaObjectType];
                    if (!typeNode) {
                        typeNode = {
                            nodeId: this._objectToNodeID(rootNode.objectId + "." + metaObjectType),
                            objectId: rootNode.objectId + "." + metaObjectType,
                            title: metaObjectType,
                            type: metaObjectType,
                            parent: rootNode,
                            numEntities: 0,
                            numVisibleEntities: 0,
                            checked: false,
                            children: []
                        };
                        rootNode.children.push(typeNode);
                        this._objectNodes[typeNode.objectId] = typeNode;
                        typeNodes[metaObjectType] = typeNode;
                    }
                    const node = {
                        nodeId: this._objectToNodeID(objectId),
                        objectId: objectId,
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
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createTypesNodes(childMetaObject, rootNode, typeNodes);
            }
        }
    }

    _createContainmentNodes(metaObject = this._rootMetaObject, parent) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name || metaObjectType;
        const children = metaObject.children;
        const objectId = metaObject.id;
        const node = {
            nodeId: this._objectToNodeID(objectId),
            objectId: objectId,
            title: (!parent) ? (this._rootName || metaObjectName) : (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
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
            if (!node1.aabb || !node2.aabb) {
                // Sorting on lowest point of the AABB is likely more more robust when objects could overlap storeys
                if (!node1.aabb) {
                    node1.aabb = scene.getAABB(metaScene.getObjectIDsInSubtree(node1.objectId));
                }
                if (!node2.aabb) {
                    node2.aabb = scene.getAABB(metaScene.getObjectIDsInSubtree(node2.objectId));
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
            if (node1.aabb[idx] > node2.aabb[idx]) {
                return -1;
            }
            if (node1.aabb[idx] < node2.aabb[idx]) {
                return 1;
            }
            return 0;
        });
    }

    _alphaSortFunc(node1, node2) {
        const title1 = node1.title.toUpperCase(); // FIXME: Should be case sensitive?
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
        //const nodeId = this._objectToNodeID(node.objectId);
        const nodeId = node.nodeId;
        nodeElement.id = 'node-' + nodeId;
        if (node.children.length > 0) {
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.createElement('a');
            switchElement.href = '#';
            switchElement.id = switchElementId;
            switchElement.textContent = '+';
            switchElement.classList.add('plus');
            switchElement.addEventListener('click', this.switchExpandHandler);
            nodeElement.appendChild(switchElement);
        }
        const checkbox = document.createElement('input');
        checkbox.id = nodeId;
        checkbox.type = "checkbox";
        checkbox.checked = node.checked;
        checkbox.style["pointer-events"] = "all";
        checkbox.addEventListener("change", this._checkboxChangeHandler);
        nodeElement.appendChild(checkbox);
        const span = document.createElement('span');
        span.textContent = node.title;
        nodeElement.appendChild(span);
        span.oncontextmenu = (e) => {
            this._treeViewPlugin.fire("contextmenu", {
                event: e,
                viewer: this._viewer,
                treeViewPlugin: this._treeViewPlugin,
                treeViewNode: node
            });
            e.preventDefault();
        };
        span.onclick = (e) => {
            this._treeViewPlugin.fire("nodeTitleClicked", {
                event: e,
                viewer: this._viewer,
                treeViewPlugin: this._treeViewPlugin,
                treeViewNode: node
            });
            e.preventDefault();
        };
        return nodeElement;
    }

    /**
     * @private
     * @param depth
     */
    expandToDepth(depth) {
        const expand = (node, countDepth) => {
            if (countDepth === depth) {
                return;
            }
            const nodeId = node.nodeId;
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.getElementById(switchElementId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
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

    /**
     * @private
     */
    collapse() {
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            const objectId = rootNode.objectId;
            this._collapseNode(objectId);
        }
    }

    /**
     * @private
     * @param objectId
     */
    showNode(objectId) {
        if (this._showListItemElementId) {
            this.unShowNode();
        }
        const node = this._objectNodes[objectId];
        if (!node) {
            return; // Node may not exist for the given object if (this._pruneEmptyNodes == true)
        }
        const nodeId = node.nodeId;
        const switchElementId = "switch-" + nodeId;
        const switchElement = document.getElementById(switchElementId);
        if (switchElement) {
            this._expandSwitchElement(switchElement);
            switchElement.scrollIntoView();
            return;
        }
        const path = [];
        path.unshift(node);
        let parent = node.parent;
        while (parent) {
            path.unshift(parent);
            parent = parent.parent;
        }
        for (let i = 0, len = path.length; i < len; i++) {
            const node = path[i];
            const nodeId = node.nodeId;
            const switchElementId = "switch-" + nodeId;
            const switchElement = document.getElementById(switchElementId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
            }
        }
        const listItemElementId = 'node-' + nodeId;
        const listItemElement = document.getElementById(listItemElementId);
        listItemElement.scrollIntoView({block: "center"});
        listItemElement.classList.add("highlighted-node");
        this._showListItemElementId = listItemElementId;
    }

    /**
     * @private
     */
    unShowNode() {
        if (!this._showListItemElementId) {
            return;
        }
        const listItemElement = document.getElementById(this._showListItemElementId);
        if (!listItemElement) {
            this._showListItemElementId = null;
            return;
        }
        listItemElement.classList.remove("highlighted-node");
        this._showListItemElementId = null;
    }

    _expandSwitchElement(switchElement) {
        const parentElement = switchElement.parentElement;
        const expanded = parentElement.getElementsByTagName('li')[0];
        if (expanded) {
            return;
        }
        const nodeId = parentElement.id.replace('node-', '');
        const objectId = this._nodeToObjectID(nodeId);
        const switchNode = this._objectNodes[objectId];
        const childNodes = switchNode.children;
        const nodeElements = childNodes.map((node) => {
            return this._createNodeElement(node);
        });
        const ul = document.createElement('ul');
        nodeElements.forEach((nodeElement) => {
            ul.appendChild(nodeElement);
        });
        parentElement.appendChild(ul);
        switchElement.classList.remove('plus');
        switchElement.classList.add('minus');
        switchElement.textContent = '-';
        switchElement.removeEventListener('click', this.switchExpandHandler);
        switchElement.addEventListener('click', this.switchCollapseHandler);
    }

    _collapseNode(objectId) {
        const nodeId = this._objectToNodeID(objectId);
        const switchElementId = "switch-" + nodeId;
        const switchElement = document.getElementById(switchElementId);
        this._collapseSwitchElement(switchElement);
    }

    _collapseSwitchElement(switchElement) {
        if (!switchElement) {
            return;
        }
        const parent = switchElement.parentElement;
        if (!parent) {
            return;
        }
        const ul = parent.querySelector('ul');
        if (!ul) {
            return;
        }
        parent.removeChild(ul);
        switchElement.classList.remove('minus');
        switchElement.classList.add('plus');
        switchElement.textContent = '+';
        switchElement.removeEventListener('click', this.switchCollapseHandler);
        switchElement.addEventListener('click', this.switchExpandHandler);
    }

    /**
     * Destroys this ModelTreeView.
     * @private
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