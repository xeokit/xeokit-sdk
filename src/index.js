export * from "./extras/index.js";
export * from "./plugins/index.js";
export * from "./viewer/index.js";

window.checkGlError = function() {
    const err = window.viewer.scene.canvas.gl.getError();
    if (err)
        debugger;
};
