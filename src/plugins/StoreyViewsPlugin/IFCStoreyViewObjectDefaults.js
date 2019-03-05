/**
 * @desc Property states for {@link Entity}s in {@link StoreyView}s capture by a {@link StoreyViewsPlugin}.
 *
 * @type {{String:Object}}
 */
const IFCStoreyViewObjectDefaults = {
    IfcSlab: {
        visible: true,
        edges: true
    },
    IfcWall: {
        visible: true,
        edges: true
    },
    IfcWallStandardCase: {
        visible: true,
        edges: true
    },
    IfcDoor: {
        visible: true,
        edges: true
    },
    IfcWindow: {
        visible: true,
        edges: true
    },
    IfcColumn: {
        visible: true,
        edges: true
    },
    IfcCurtainWall: {
        visible: true,
        edges: true
    },
    IfcStair: {
        visible: true,
        edges: true
    },
    IfcStairFlight: {
        visible: true,
        edges: true
    },
    IfcRamp: {
        visible: true,
        edges: true
    },
    IfcFurniture: {
        visible: true,
        edges: true
    },
    IfcFooting: {
        visible: true,
        edges: true
    },
    DEFAULT: {
        visible: false
    }
};

export {IFCStoreyViewObjectDefaults}