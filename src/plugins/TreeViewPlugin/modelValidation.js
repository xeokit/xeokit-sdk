/**
 * Tests if {@link TreeViewPlugin} would be able to create a "types" hierarchy for the given {@link MetaModel}.
 *
 * @param {MetaModel} metaModel The MetaModel.
 * @param {String[]} errors Accumulates messages for validation errors.
 * @return {boolean} Returns ````true```` if no errors found, else ````false````.
 */
function validateMetaModelForTreeViewTypesHierarchy(metaModel, errors) {
    const rootMetaObject = metaModel.rootMetaObject;
    if (!rootMetaObject) {
        errors.push("Can't build types hierarchy: model is empty");
        return false;
    }
    return true;
}

/**
 * Tests if {@link TreeViewPlugin} would be able to create a "storeys" hierarchy for the given {@link MetaModel}.
 *
 * @param {MetaModel} metaModel The MetaModel.
 * @param {String[]} errors Accumulates messages for validation errors.
 * @return {boolean} Returns ````true```` if no errors found, else ````false````.
 */
function validateMetaModelForTreeViewStoreysHierarchy(metaModel, errors) {
    const rootMetaObject = metaModel.rootMetaObject;
    if (!rootMetaObject) {
        errors.push("Can't build storeys hierarchy: model is empty");
        return false;
    }
    return _validateMetaModelForStoreysHierarchy(rootMetaObject, errors);
}

/**
 * Tests if {@link TreeViewPlugin} would be able to create a "containment" hierarchy for the given {@link MetaModel}.
 *
 * @param {MetaModel} metaModel The MetaModel.
 * @param {String[]} errors Accumulates messages for validation errors.
 * @return {boolean} Returns ````true```` if no errors found, else ````false````.
 */
function validateMetaModelForTreeViewContainmentHierarchy(metaModel, errors) {
    const rootMetaObject = metaModel.rootMetaObject;
    if (!rootMetaObject) {
        errors.push("Can't build containment hierarchy: model is empty");
        return false;
    }
    return true;
}

/**
 * @private
 */
function _validateMetaModelForStoreysHierarchy(metaObject, errors, level = 0, ctx, buildingNode) {
    ctx = ctx || {
        foundIFCBuildingStoreys: false
    };
    const metaObjectType = metaObject.type;
    const children = metaObject.children;
    if (metaObjectType === "IfcBuilding") {
        buildingNode = true;
    } else if (metaObjectType === "IfcBuildingStorey") {
        if (!buildingNode) {
            errors.push("Can't build storeys hierarchy: IfcBuildingStorey found without parent IfcBuilding");
            return false;
        }
        ctx.foundIFCBuildingStoreys = true;
    }
    if (children) {
        for (let i = 0, len = children.length; i < len; i++) {
            const childMetaObject = children[i];
            if (!_validateMetaModelForStoreysHierarchy(childMetaObject, errors, level + 1, ctx, buildingNode)) {
                return false;
            }
        }
    }
    if (level === 0) {
        if (!ctx.foundIFCBuildingStoreys) {
            // errors.push("Can't build storeys hierarchy: no IfcBuildingStoreys found");
        }
    }
    return true;
}

export {
    validateMetaModelForTreeViewTypesHierarchy,
    validateMetaModelForTreeViewStoreysHierarchy,
    validateMetaModelForTreeViewContainmentHierarchy
};