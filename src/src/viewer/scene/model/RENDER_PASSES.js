/**
 * @private
 */
const RENDER_PASSES = {

    // Skipped - suppress rendering

    NOT_RENDERED: 0,

    // Normal rendering - mutually exclusive modes

    COLOR_OPAQUE: 1,
    COLOR_TRANSPARENT: 2,

    // Emphasis silhouette rendering - mutually exclusive modes

    SILHOUETTE_HIGHLIGHTED: 3,
    SILHOUETTE_SELECTED: 4,
    SILHOUETTE_XRAYED: 5,

    // Edges rendering - mutually exclusive modes

    EDGES_COLOR_OPAQUE: 6,
    EDGES_COLOR_TRANSPARENT: 7,
    EDGES_HIGHLIGHTED: 8,
    EDGES_SELECTED: 9,
    EDGES_XRAYED: 10,

    // Picking

    PICK: 11
};

export {RENDER_PASSES};