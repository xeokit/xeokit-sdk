import {math} from "../../viewer/scene/math/math.js";

/**
 * @private
 */
function CubeTextureCanvas(viewer, navCubeScene, cfg = {}) {

    const cubeColor = "lightgrey";
    const cubeHighlightColor = cfg.hoverColor || "rgba(0,0,0,0.4)";
    const textColor = cfg.textColor || "black";
    const parentNode = cfg.canvasElement || document.body;

    const height = 500;
    const width = height + (height / 3);
    const scale = width / 24;

    const facesZUp = [
        {boundary: [6, 6, 6, 6], color: cfg.frontColor || cfg.color || "#55FF55"},
        {boundary: [18, 6, 6, 6], color: cfg.backColor || cfg.color || "#55FF55"},
        {boundary: [12, 6, 6, 6], color: cfg.rightColor || cfg.color || "#FF5555"},
        {boundary: [0, 6, 6, 6], color: cfg.leftColor || cfg.color || "#FF5555"},
        {boundary: [6, 0, 6, 6], color: cfg.topColor || cfg.color || "#7777FF"},
        {boundary: [6, 12, 6, 6], color: cfg.bottomColor || cfg.color || "#7777FF"}
    ];

    const areasZUp = [
        {label: "NavCube.front", boundaries: [[7, 7, 4, 4]], dir: [0, 1, 0], up: [0, 0, 1]},
        {label: "NavCube.back", boundaries: [[19, 7, 4, 4]], dir: [0, -1, 0], up: [0, 0, 1]},
        {label: "NavCube.right", boundaries: [[13, 7, 4, 4]], dir: [-1, 0, 0], up: [0, 0, 1]},
        {label: "NavCube.left", boundaries: [[1, 7, 4, 4]], dir: [1, 0, 0], up: [0, 0, 1]},
        {label: "NavCube.top", boundaries: [[7, 1, 4, 4]], dir: [0, 0, -1], up: [0, 1, 0]},
        {label: "NavCube.bottom", boundaries: [[7, 13, 4, 4]], dir: [0, 0, 1], up: [0, -1, 0]},
        {boundaries: [[7, 5, 4, 2]], dir: [0, 1, -1], up: [0, 1, 1]},
        {boundaries: [[1, 6, 4, 1], [6, 1, 1, 4]], dir: [1, 0, -1], up: [1, 0, 1]},
        {boundaries: [[7, 0, 4, 1], [19, 6, 4, 1]], dir: [0, -1, -1], up: [0, -1, 1]},
        {boundaries: [[13, 6, 4, 1], [11, 1, 1, 4]], dir: [-1, 0, -1], up: [-1, 0, 1]},
        {boundaries: [[7, 11, 4, 2]], dir: [0, 1, 1], up: [0, -1, 1]},
        {boundaries: [[1, 11, 4, 1], [6, 13, 1, 4]], dir: [1, 0, 1], up: [-1, 0, 1]},
        {boundaries: [[7, 17, 4, 1], [19, 11, 4, 1]], dir: [0, -1, 1], up: [0, 1, 1]},
        {boundaries: [[13, 11, 4, 1], [11, 13, 1, 4]], dir: [-1, 0, 1], up: [1, 0, 1]},
        {boundaries: [[5, 7, 2, 4]], dir: [1, 1, 0], up: [0, 0, 1]},
        {boundaries: [[11, 7, 2, 4]], dir: [-1, 1, 0], up: [0, 0, 1]},
        {boundaries: [[17, 7, 2, 4]], dir: [-1, -1, 0], up: [0, 0, 1]},
        {boundaries: [[0, 7, 1, 4], [23, 7, 1, 4]], dir: [1, -1, 0], up: [0, 0, 1]},
        {boundaries: [[5, 11, 2, 2]], dir: [1, 1, 1], up: [-1, -1, 1]},
        {boundaries: [[23, 11, 1, 1], [6, 17, 1, 1], [0, 11, 1, 1]], dir: [1, -1, 1], up: [-1, 1, 1]},
        {boundaries: [[5, 5, 2, 2]], dir: [1, 1, -1], up: [1, 1, 1]},
        {boundaries: [[11, 17, 1, 1], [17, 11, 2, 1]], dir: [-1, -1, 1], up: [1, 1, 1]},
        {boundaries: [[17, 6, 2, 1], [11, 0, 1, 1]], dir: [-1, -1, -1], up: [-1, -1, 1]},
        {boundaries: [[11, 11, 2, 2]], dir: [-1, 1, 1], up: [1, -1, 1]},
        {boundaries: [[0, 6, 1, 1], [6, 0, 1, 1], [23, 6, 1, 1]], dir: [1, -1, -1], up: [1, -1, 1]},
        {boundaries: [[11, 5, 2, 2]], dir: [-1, 1, -1], up: [-1, 1, 1]}
    ];

    const facesYUp = [
        {boundary: [6, 6, 6, 6], color: cfg.frontColor || cfg.color || "#55FF55"},
        {boundary: [18, 6, 6, 6], color: cfg.backColor || cfg.color || "#55FF55"},
        {boundary: [12, 6, 6, 6], color: cfg.rightColor || cfg.color || "#FF5555"},
        {boundary: [0, 6, 6, 6], color: cfg.leftColor || cfg.color || "#FF5555"},
        {boundary: [6, 0, 6, 6], color: cfg.topColor || cfg.color || "#7777FF"},
        {boundary: [6, 12, 6, 6], color: cfg.bottomColor || cfg.color || "#7777FF"}
    ];

    const areasYUp = [

        // Faces

        {yUp: "", label: "NavCube.front", boundaries: [[7, 7, 4, 4]], dir: [0, 0, -1], up: [0, 1, 0]},
        {label: "NavCube.back", boundaries: [[19, 7, 4, 4]], dir: [0, 0, 1], up: [0, 1, 0]},
        {label: "NavCube.right", boundaries: [[13, 7, 4, 4]], dir: [-1, 0, 0], up: [0, 1, 0]},
        {label: "NavCube.left", boundaries: [[1, 7, 4, 4]], dir: [1, 0, 0], up: [0, 1, 0]},
        {label: "NavCube.top", boundaries: [[7, 1, 4, 4]], dir: [0, -1, 0], up: [0, 0, -1]},
        {label: "NavCube.bottom", boundaries: [[7, 13, 4, 4]], dir: [0, 1, 0], up: [0, 0, 1]},
        {boundaries: [[7, 5, 4, 2]], dir: [0, -0.7071, -0.7071], up: [0, 0.7071, -0.7071]}, // Top-front edge
        {boundaries: [[1, 6, 4, 1], [6, 1, 1, 4]], dir: [1, -1, 0], up: [1, 1, 0]},  // Top-left edge
        {boundaries: [[7, 0, 4, 1], [19, 6, 4, 1]], dir: [0, -0.7071, 0.7071], up: [0, 0.7071, 0.7071]}, // Top-back edge
        {boundaries: [[13, 6, 4, 1], [11, 1, 1, 4]], dir: [-1, -1, 0], up: [-1, 1, 0]}, // Top-right edge
        {boundaries: [[7, 11, 4, 2]], dir: [0, 1, -1], up: [0, 1, 1]},  // Bottom-front edge
        {boundaries: [[1, 11, 4, 1], [6, 13, 1, 4]], dir: [1, 1, 0], up: [-1, 1, 0]}, // Bottom-left edge
        {boundaries: [[7, 17, 4, 1], [19, 11, 4, 1]], dir: [0, 1, 1], up: [0, 1, -1]}, // Bottom-back edge
        {boundaries: [[13, 11, 4, 1], [11, 13, 1, 4]], dir: [-1, 1, 0], up: [1, 1, 0]}, // Bottom-right edge
        {boundaries: [[5, 7, 2, 4]], dir: [1, 0, -1], up: [0, 1, 0]},// Front-left edge
        {boundaries: [[11, 7, 2, 4]], dir: [-1, 0, -1], up: [0, 1, 0]}, // Front-right edge
        {boundaries: [[17, 7, 2, 4]], dir: [-1, 0, 1], up: [0, 1, 0]},// Back-right edge
        {boundaries: [[0, 7, 1, 4], [23, 7, 1, 4]], dir: [1, 0, 1], up: [0, 1, 0]},// Back-left edge
        {boundaries: [[5, 11, 2, 2]], "dir": [0.5, 0.7071, -0.5], "up": [-0.5, 0.7071, 0.5]}, // Bottom-left-front corner
        {boundaries: [[23, 11, 1, 1], [6, 17, 1, 1], [0, 11, 1, 1]],"dir": [0.5, 0.7071, 0.5],"up": [-0.5, 0.7071, -0.5]},// Bottom-back-left corner
        {boundaries: [[5, 5, 2, 2]], "dir": [0.5, -0.7071, -0.5], "up": [0.5, 0.7071, -0.5]}, // Left-front-top corner
        {boundaries: [[11, 17, 1, 1], [17, 11, 2, 1]], "dir": [-0.5, 0.7071, 0.5], "up": [0.5, 0.7071, -0.5]}, // Bottom-back-right corner
        {boundaries: [[17, 6, 2, 1], [11, 0, 1, 1]], "dir": [-0.5, -0.7071, 0.5], "up": [-0.5, 0.7071, 0.5]}, // Top-back-right corner
        {boundaries: [[11, 11, 2, 2]], "dir": [-0.5, 0.7071, -0.5], "up": [0.5, 0.7071, 0.5]}, // Bottom-front-right corner
        {boundaries: [[0, 6, 1, 1], [6, 0, 1, 1], [23, 6, 1, 1]], "dir": [0.5, -0.7071, 0.5], "up": [0.5, 0.7071, 0.5]},// Top-back-left corner
        {boundaries: [[11, 5, 2, 2]], "dir": [-0.5, -0.7071, -0.5], "up": [-0.5, 0.7071, -0.5]}// Top-front-right corner
    ];

    for (let i = 0, len = areasZUp.length; i < len; i++) {
        math.normalizeVec3(areasZUp[i].dir, areasZUp[i].dir);
        math.normalizeVec3(areasZUp[i].up, areasZUp[i].up);
    }

    for (let i = 0, len = areasYUp.length; i < len; i++) {
        math.normalizeVec3(areasYUp[i].dir, areasYUp[i].dir);
        math.normalizeVec3(areasYUp[i].up, areasYUp[i].up);
    }

    var faces = facesYUp;
    var areas = areasYUp;

    this._textureCanvas = document.createElement('canvas');
    this._textureCanvas.width = width;
    this._textureCanvas.height = height;
    this._textureCanvas.style.width = width + "px";
    this._textureCanvas.style.height = height + "px";
    this._textureCanvas.style.padding = "0";
    this._textureCanvas.style.margin = "0";
    this._textureCanvas.style.top = "0";
    this._textureCanvas.style.background = cubeColor;
    this._textureCanvas.style.position = "absolute";
    this._textureCanvas.style.opacity = "1.0";
    this._textureCanvas.style.visibility = "hidden";
    this._textureCanvas.style["z-index"] = 2000000;

    parentNode.appendChild(this._textureCanvas);

    const context = this._textureCanvas.getContext("2d");

    let zUp = false;

    function paint() {

        for (let i = 0, len = facesZUp.length; i < len; i++) {
            const face = facesZUp[i];
            const boundary = face.boundary;
            const xmin = Math.round(boundary[0] * scale);
            const ymin = Math.round(boundary[1] * scale);
            const width = Math.round(boundary[2] * scale);
            const height = Math.round(boundary[3] * scale);
            context.fillStyle = face.color;
            context.fillRect(xmin, ymin, width, height);
        }

        for (let i = 0, len = areas.length; i < len; i++) {
            let xmin;
            let ymin;
            let width;
            let height;
            const area = areas[i];

            const boundaries = area.boundaries;
            for (var j = 0, lenj = boundaries.length; j < lenj; j++) {
                const boundary = boundaries[j];
                xmin = Math.round(boundary[0] * scale);
                ymin = Math.round(boundary[1] * scale);
                width = Math.round(boundary[2] * scale);
                height = Math.round(boundary[3] * scale);
                if (area.highlighted) {
                    context.fillStyle = area.highlighted ? cubeHighlightColor : (area.color || cubeColor);
                    context.fillRect(xmin, ymin, width, height);
                }
            }
            if (area.label) {
                context.fillStyle = textColor;
                context.font = '60px sans-serif';
                context.textAlign = "center";
                var xcenter = xmin + (width * 0.5);
                var ycenter = ymin + (height * 0.7);
                context.fillText(translateLabel(area.label), xcenter, ycenter, 80);
            }
        }

        navCubeScene.glRedraw();
    }

    const translateLabel = (function () {

        const swizzleYUp = {
            "NavCube.front": "NavCube.front",
            "NavCube.back": "NavCube.back",
            "NavCube.right": "NavCube.right",
            "NavCube.left": "NavCube.left",
            "NavCube.top": "NavCube.top",
            "NavCube.bottom": "NavCube.bottom"
        };

        const swizzleZUp = {
            "NavCube.front": "NavCube.front",
            "NavCube.back": "NavCube.back",
            "NavCube.right": "NavCube.right",
            "NavCube.left": "NavCube.left",
            "NavCube.top": "NavCube.top",
            "NavCube.bottom": "NavCube.bottom"
        };

        const defaultLabels = {
            "NavCube.front": "FRONT",
            "NavCube.back": "BACK",
            "NavCube.right": "RIGHT",
            "NavCube.left": "LEFT",
            "NavCube.top": "TOP",
            "NavCube.bottom": "BOTTOM"
        };

        return function (key) {
            const swizzle = zUp ? swizzleZUp : swizzleYUp;
            const swizzledKey = swizzle ? swizzle[key] : null;
            if (swizzledKey) {
                return viewer.localeService.translate(swizzledKey) || defaultLabels[swizzledKey] || swizzledKey;
            }
            return key;
        };
    })();

    this.setZUp = function () {
        zUp = true;
        faces = facesZUp;
        areas = areasZUp;
        this.clear();
    };

    this.setYUp = function () {
        zUp = false;
        faces = facesYUp;
        areas = areasYUp;
        this.clear();
    };

    this.clear = function () {
        context.fillStyle = cubeColor;
        context.fillRect(0, 0, width, height);
        for (var i = 0, len = areas.length; i < len; i++) {
            const area = areas[i];
            area.highlighted = false;
        }
        paint();
    };

    this.getArea = function (uv) {
        const s = uv[0] * width;
        const t = height - (uv[1] * height); // Correct for our texture Y-flipping
        for (var i = 0, len = areas.length; i < len; i++) {
            const area = areas[i];
            const boundaries = area.boundaries;
            for (var j = 0, lenj = boundaries.length; j < lenj; j++) {
                const boundary = boundaries[j];
                if (s >= (boundary[0] * scale) && s <= ((boundary[0] + boundary[2]) * scale) && t >= (boundary[1] * scale) && t <= ((boundary[1] + boundary[3]) * scale)) {
                    return i;
                }
            }
        }
        return -1;
    };

    this.setAreaHighlighted = function (areaId, highlighted) {
        var area = areas[areaId];
        if (!area) {
            throw "Area not found: " + areaId;
        }
        area.highlighted = !!highlighted;
        paint();
    };

    this.getAreaDir = function (areaId) {
        var area = areas[areaId];
        if (!area) {
            throw "Unknown area: " + areaId;
        }
        return area.dir;
    };

    this.getAreaUp = function (areaId) {
        var area = areas[areaId];
        if (!area) {
            throw "Unknown area: " + areaId;
        }
        return area.up;
    };

    this.getImage = function () {
        return this._textureCanvas;
    };

    this.destroy = function () {
        if (this._textureCanvas) {
            this._textureCanvas.parentNode.removeChild(this._textureCanvas);
            this._textureCanvas = null;
        }
    };
}

export {CubeTextureCanvas};
