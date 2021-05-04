/**
 * @desc Default initial properties for {@link Entity}s loaded from models accompanied by metadata.
 *
 * When loading a model, plugins such as {@link XKTLoaderPlugin} create
 * a tree of {@link Entity}s that represent the model. These loaders can optionally load metadata, to create
 * a {@link MetaModel} corresponding to the root {@link Entity}, with a {@link MetaObject} corresponding to each
 * object {@link Entity} within the tree.
 *
 * @type {{String:Object}}
 */
const IFCObjectDefaults = {

    IfcOpeningElement: {
        pickable: false,
        visible: false
    },

    IfcSpace: {
        colorize: [0.137255, 0.403922, 0.870588],
        pickable: false,
        visible: false,
        opacity: 0.4
    },

    IfcWindow: {
        colorize: [0.137255, 0.403922, 0.870588],
        opacity: 0.3
    },

    IfcPlate: {
        colorize: [0.8470588235, 0.427450980392, 0, 0.5],
        opacity: 0.3
    },

    DEFAULT: {
    }
};

export {IFCObjectDefaults}