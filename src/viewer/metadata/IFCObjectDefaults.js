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
const IFCObjectDefaults = {
    IfcSpace: {
        colorize: [0.137255, 0.403922, 0.870588],
        pickable: false,
        visible: false,
        opacity: 0.5,
        priority: 4
    },
    IfcRoof: {
        colorize: [0.837255, 0.203922, 0.270588],
        priority: 1
    },
    IfcSlab: {
        colorize: [0.637255, 0.603922, 0.670588],
        priority: 1
    },
    IfcWall: {
        colorize: [0.537255, 0.337255, 0.237255],
        priority: 1
    },
    IfcWallStandardCase: {
        colorize: [0.537255, 0.337255, 0.237255],
        priority: 1
    },
    IfcDoor: {
        colorize: [0.637255, 0.603922, 0.670588],
        priority: 2
    },
    IfcWindow: {
        colorize: [0.137255, 0.403922, 0.870588],
        pickable: false,
        opacity: 0.4,
        priority: 1
    },
    IfcOpeningElement: {
        colorize: [0.137255, 0.403922, 0.870588],
        pickable: false,
        visible: false,
        priority: 10
    },
    IfcRailing: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 5
    },
    IfcColumn: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 3
    },
    IfcBeam: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 3
    },
    IfcFurnishingElement: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 5
    },
    IfcCurtainWall: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 3
    },
    IfcStair: {
        colorize: [0.637255, 0.603922, 0.670588],
        priority: 2
    },
    IfcStairFlight: {
        colorize: [0.637255, 0.603922, 0.670588],
        priority: 2
    },
    IfcBuildingElementProxy: {
        colorize: [0.5, 0.5, 0.5],
        priority: 4
    },
    IfcFlowSegment: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 6
    },
    IfcFlowitting: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 6
    },
    IfcFlowTerminal: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 6
    },
    IfcProxy: {
        colorize: [0.137255, 0.403922, 0.870588],
        priority: 2
    },
    IfcSite: {
        colorize: [0.137255, 0.403922, 0.870588]
    },
    IfcLightFixture: {
        colorize: [0.8470588235, 0.8470588235, 0.870588],
        priority: 7
    },
    IfcDuctSegment: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 6
    },
    IfcDistributionFlowElement: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 6
    },
    IfcDuctFitting: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 6
    },
    IfcPlate: {
        colorize: [0.8470588235, 0.427450980392, 0, 0.5],
        opacity: 0.5,
        priority: 3
    },
    IfcAirTerminal: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 8
    },
    IfcMember: {
        colorize: [0.8470588235, 0.427450980392, 0]
    },
    IfcCovering: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 0
    },
    IfcTransportElement: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 3
    },
    IfcFlowController: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 6
    },
    IfcFlowFitting: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 6
    },
    IfcRamp: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 2
    },
    IfcFurniture: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 5
    },
    IfcFooting: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 3
    },
    IfcSystemFurnitureElement: {
        colorize: [0.8470588235, 0.427450980392, 0],
        priority: 5
    },
    DEFAULT: {
        colorize: [0.5, 0.5, 0.5],
        priotity: 3
    }
};

export {IFCObjectDefaults}