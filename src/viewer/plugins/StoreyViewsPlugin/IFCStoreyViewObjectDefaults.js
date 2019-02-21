/**
 * @desc Default initial properties for {@link Entity}s loaded from models accompanied by metadata.
 *
 * When loading a model, a loader plugins such as {@link GLTFLoaderPlugin} and {@link BIMServerLoaderPlugin} create
 * a tree of {@link Entity}s that represent the model. These loaders can optionally load metadata, to create
 * a {@link MetaModel} corresponding to the root {@link Entity}, with a {@link MetaObject} corresponding to each
 * object {@link Entity} within the tree.
 *
 * @type {{String:Object}}
 */
const IFCStoreyViewObjectDefaults = {
    IfcBuildingStorey: {
      visible: true
    },
    IfcSlab: {
        colorize: [0.637255, 0.603922, 0.670588],
        visible: true
    },
    IfcWall: {
        colorize: [0.537255, 0.337255, 0.237255],
        visible: true
    },
    IfcWallStandardCase: {
        colorize: [0.537255, 0.337255, 0.237255],
        visible: true
    },
    IfcDoor: {
        colorize: [0.637255, 0.603922, 0.670588],
        visible: true
    },
    IfcWindow: {
        colorize: [0.137255, 0.403922, 0.870588],
        visible: true,
        pickable: false,
        opacity: 0.4
    },
    IfcColumn: {
        colorize: [0.137255, 0.403922, 0.870588],
        visible: true
    },
    IfcCurtainWall: {
        colorize: [0.137255, 0.403922, 0.870588],
        visible: true
    },
    IfcStair: {
        colorize: [0.637255, 0.603922, 0.670588],
        visible: true
    },
    IfcStairFlight: {
        colorize: [0.637255, 0.603922, 0.670588],
        visible: true
    },
    IfcRamp: {
        colorize: [0.8470588235, 0.427450980392, 0],
        visible: true
    },
    IfcFurniture: {
        colorize: [0.8470588235, 0.427450980392, 0],
        visible: true
    },
    IfcFooting: {
        colorize: [0.8470588235, 0.427450980392, 0],
        visible: true
    },
    DEFAULT: {
        visible: false
    }
};

export {IFCStoreyViewObjectDefaults}