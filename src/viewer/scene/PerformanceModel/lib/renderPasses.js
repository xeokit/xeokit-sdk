/**
 * @private
 */
const RENDER_PASSES = {

    // Skipped

    NOT_RENDERED: 0,

    // Normal rendering - mutually exclusive modes

    OPAQUE_FILL: 1,
    TRANSPARENT_FILL: 2,

    // Emphasis rendering - mutually exclusive modes

    HIGHLIGHTED_FILL: 3,
    SELECTED_FILL: 4,
    XRAYED_FILL: 5,

    // Edges rendering - mutually exclusive modes

    OPAQUE_EDGES: 6,
    TRANSPARENT_EDGES: 7,
    HIGHLIGHTED_EDGES: 8,
    SELECTED_EDGES: 9,
    XRAYED_EDGES: 10,

    // Picking

    PICK: 11
};

export {RENDER_PASSES};