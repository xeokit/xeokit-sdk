import {Plugin} from "././../../../src/viewer/Plugin.js";
import {math} from "../../../src/viewer/scene/math/math.js";
import {Scene} from "../../../src/viewer/scene/scene/Scene.js";
import {DirLight} from "./../../../src/viewer/scene/lights/DirLight.js";
import {Mesh} from "./../../../src/viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../../src/viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../../src/viewer/scene/materials/PhongMaterial.js";
import {Texture} from "../../../src/viewer/scene/materials/Texture.js";
import {buildCylinderGeometry} from "../../../src/viewer/scene/geometry/builders/buildCylinderGeometry.js";
import {CubeTextureCanvas} from "./CubeTextureCanvas.js";

/**
 * {@link Viewer} plugin that provides a navigation cube gizmo, which enables us to quickly align the {@link Camera} along the World-space coordinate axii or diagonals.
 *
 * ## Usage
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_NavCubePlugin)]
 *
 * ````JavaScript````
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {NavCubePlugin} from "../src/plugins/NavCubePlugin/NavCubePlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.03];
 *
 * new NavCubePlugin(viewer, {
 *     visible: true, // Default
 *     size: 250, // NavCube canvas size in pixels (default is 200)
 *     alignment: "topRight", // "bottomLeft" (default) | "topLeft" | "topRight" | "bottomRight"
 *     topMargin: 170
 * });
 *
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/gltf/duplex/scene.gltf",
 *     metaModelSrc: "./metaModels/duplex/metaModel.json", // Sets visual states of object in model
 *     edges: true
 * });
 *
 * model.on("loaded", () => {
 *     viewer.cameraFlight.jumpTo(model);
 * });
 * ````
 */
class NavCubePlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg NavCubePlugin configuration.
     * @param {String} [cfg.id="NavCube"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Boolean} [cfg.visible=true] Initial visibility.
     * @param {Number} [cfg.size=200] Size of the NavCube area, in pixels.
     * @param {String} [cfg.alignment="bottomRight"] The alignment of the NavCube within the bounds of the {@link Viewer}'s {@link Canvas}. Accepted values are "bottomRight", "bottomLeft", "topLeft" and "topRight".
     * @param {Number} [cfg.leftMargin=10] The margin between the NavCube and the left edge of the {@link Viewer}'s {@link Canvas}, in pixels.
     * @param {Number} [cfg.rightMargin=10] The margin between the NavCube and the right edge of the {@link Viewer}'s {@link Canvas}, in pixels.
     * @param {Number} [cfg.topMargin=10] The margin between the NavCube and the top edge of the {@link Viewer}'s {@link Canvas}, in pixels.
     * @param {Number} [cfg.bottomMargin=10] The margin between the NavCube and the bottom edge of the {@link Viewer}'s {@link Canvas}, in pixels.
     */
    constructor(viewer, cfg = {}) {

        super("NavCube", viewer, cfg);

        viewer.navCube = this;

        var visible = true;

        var size = cfg.size || 250;
        this._navCubeCanvas = document.createElement('canvas');
        this._navCubeCanvas.id = "cubeCanvas" + viewer.scene.canvas.canvas.id;

        var style = this._navCubeCanvas.style;
        style.height = size + "px";
        style.width = size + "px";
        style.padding = "0";
        style.margin = "0";
        style.top = "0px";
        style.left = "0px";
        style.position = "absolute";
        style["z-index"] = "2000000";
        style.visibility = visible ? "visible" : "hidden";

        document.body.appendChild(this._navCubeCanvas);

        this.setVisible(cfg.visible);
        this.setSize(cfg.size);
        this.setAlignment(cfg.alignment);
        this.setLeftMargin(cfg.leftMargin);
        this.setRightMargin(cfg.rightMargin);
        this.setTopMargin(cfg.topMargin);
        this.setBottomMargin(cfg.bottomMargin);

        var navCubeScene = new Scene({
            canvasId: this._navCubeCanvas.id,
            transparent: true
        });

        navCubeScene.clearLights();

        new DirLight(navCubeScene, {dir: [0.4, -0.4, 0.8], color: [0.8, 1.0, 1.0], intensity: 1.0, space: "view"});
        new DirLight(navCubeScene, {dir: [-0.8, -0.3, -0.4], color: [0.8, 0.8, 0.8], intensity: 1.0, space: "view"});
        new DirLight(navCubeScene, {dir: [0.8, -0.6, -0.8], color: [1.0, 1.0, 1.0], intensity: 1.0, space: "view"});

        this._navCubeCamera = navCubeScene.camera;
        this._navCubeCamera.ortho.scale = 7.0;
        this._navCubeCamera.ortho.near = 0.1;
        this._navCubeCamera.ortho.far = 2000;

        this._zUp = false;

        var self = this;

        this._synchCamera = (function () {
            var matrix = math.rotationMat4c(-90 * math.DEGTORAD, 1, 0, 0);
            var eyeLookVec = math.vec3();
            var eyeLookVecCube = math.vec3();
            var upCube = math.vec3();
            return function () {
                var eye = viewer.camera.eye;
                var look = viewer.camera.look;
                var up = viewer.camera.up;
                eyeLookVec = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(eye, look, eyeLookVec)), 5);
                if (self._zUp) { // +Z up
                    math.transformVec3(matrix, eyeLookVec, eyeLookVecCube);
                    math.transformVec3(matrix, up, upCube);
                    self._navCubeCamera.look = [0, 0, 0];
                    self._navCubeCamera.eye = math.transformVec3(matrix, eyeLookVec, eyeLookVecCube);
                    self._navCubeCamera.up = math.transformPoint3(matrix, up, upCube);
                } else { // +Y up
                    self._navCubeCamera.look = [0, 0, 0];
                    self._navCubeCamera.eye = eyeLookVec;
                    self._navCubeCamera.up = up;
                }
            };
        }());

        this._onCameraMatrix = viewer.camera.on("matrix", this._synchCamera);

        this._onCameraWorldAxis = viewer.camera.on("worldAxis", this._synchCamera);

        this._onCameraFOV = viewer.camera.perspective.on("fov", (fov) => {
            this._navCubeCamera.perspective.fov = fov;
        });

        this._onCameraProjection = viewer.camera.on("projection", (projection) => {
            this._navCubeCamera.projection = projection;
        });

        viewer.camera.on("worldAxis", (projection) => {
            /*
        case "zUp":
            this._zUp = true;
            this._cubeTextureCanvas.setZUp();
            this._repaint();
            this._synchCamera();
            break;
        case "yUp":
            this._zUp = false;
            this._cubeTextureCanvas.setYUp();
            this._repaint();
            this._synchCamera();
            break;
            */
        });

        this._cubeTextureCanvas = new CubeTextureCanvas(viewer);

        const image = this._cubeTextureCanvas.getImage();

        this._cubeSampler = new Texture(navCubeScene, {
            image: image,
            flipY: true,
            wrapS: "clampToEdge",
            wrapT: "clampToEdge"
        });

        this._cubeMesh = new Mesh(navCubeScene, {
            geometry: new ReadableGeometry(navCubeScene, {
                primitive: "triangles",
                normals: [
                    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
                    0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1,
                    0, 0, -1, 0, 0, -1, 0, 0, -1
                ],
                positions: [
                    1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, -1,
                    1, -1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1,
                    1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1
                ],
                uv: [
                    0.5, 0.6666, 0.25, 0.6666, 0.25, 0.3333, 0.5, 0.3333, 0.5, 0.6666, 0.5, 0.3333, 0.75, 0.3333, 0.75, 0.6666,
                    0.5, 0.6666, 0.5, 1, 0.25, 1, 0.25, 0.6666, 0.25, 0.6666, 0.0, 0.6666, 0.0, 0.3333, 0.25, 0.3333,
                    0.25, 0, 0.50, 0, 0.50, 0.3333, 0.25, 0.3333, 0.75, 0.3333, 1.0, 0.3333, 1.0, 0.6666, 0.75, 0.6666
                ],
                indices: [
                    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16,
                    18, 19, 20, 21, 22, 20, 22, 23
                ]
            }),
            material: new PhongMaterial(navCubeScene, {
                diffuse: [0.4, 0.4, 0.4],
                specular: [0.4, 0.4, 0.4],
                emissive: [.6, .6, .6],
                diffuseMap: this._cubeSampler,
                emissiveMap: this._cubeSampler
            }),
            visible: !!visible,
            edges: true
        });

        this._shadow = new Mesh(navCubeScene, {
            geometry: new ReadableGeometry(navCubeScene, buildCylinderGeometry({
                center: [0, 0, 0],
                radiusTop: 0.001,
                radiusBottom: 1.4,
                height: 0.01,
                radialSegments: 20,
                heightSegments: 1,
                openEnded: true
            })),
            // geometry: new VBOGeometry(navCubeScene, buildPlaneGeometry({
            //     center: [0, -1.5, 0], xSize: 2.0, zSize: 2.0, xSegments: 2, zSegments: 2
            // })),
            material: new PhongMaterial(navCubeScene, {
                diffuse: [0.0, 0.0, 0.0], specular: [0, 0, 0], emissive: [0.0, 0.0, 0.0], alpha: 0.5
            }),
            position: [0, -1.5, 0],
            visible: !!visible,
            pickable: false,
            backfaces: false
        });

        var lastAreaId = -1;

        function actionMove(posX, posY) {
            var yawInc = (posX - lastX) * -sensitivity;
            var pitchInc = (posY - lastY) * -sensitivity;
            yaw -= yawInc;
            pitch -= pitchInc;
            if (minPitch !== undefined && pitch < minPitch) {
                pitch = minPitch;
            }
            if (maxPitch !== undefined && pitch > maxPitch) {
                pitch = maxPitch;
            }
            viewer.camera.orbitYaw(yawInc);
            viewer.camera.orbitPitch(-pitchInc);
            lastX = posX;
            lastY = posY;
        }

        function getCoordsWithinElement(event) {
            var coords = [0, 0];
            if (!event) {
                event = window.event;
                coords[0] = event.x;
                coords[1] = event.y;
            } else {
                var element = event.target;
                var totalOffsetLeft = 0;
                var totalOffsetTop = 0;
                while (element.offsetParent) {
                    totalOffsetLeft += element.offsetLeft;
                    totalOffsetTop += element.offsetTop;
                    element = element.offsetParent;
                }
                coords[0] = event.pageX - totalOffsetLeft;
                coords[1] = event.pageY - totalOffsetTop;
            }
            return coords;
        }

        {
            var downX = null;
            var downY = null;
            var down = false;

            var yaw = 0;
            var pitch = 0;
            var minPitch = null;
            var maxPitch = null;
            var sensitivity = 0.5;

            var lastX;
            var lastY;
            var dragging = false;

            self._navCubeCanvas.addEventListener("mousedown", self._onMouseDown = function (e) {
                downX = e.x;
                downY = e.y;
                lastX = e.clientX;
                lastY = e.clientY;
                var canvasPos = getCoordsWithinElement(e);
                var hit = navCubeScene.pick({
                    canvasPos: canvasPos
                });
                if (hit) {
                    down = true;

                } else {
                    down = false;
                }
            });

            document.addEventListener("mouseup", self._onMouseUp = function (e) {
                if (e.which !== 1) {// Left button
                    return;
                }
                down = false;
                if (downX === null) {
                    return;
                }
                var canvasPos = getCoordsWithinElement(e);
                var hit = navCubeScene.pick({
                    canvasPos: canvasPos,
                    pickSurface: true
                });
                if (hit) {
                    if (hit.uv) {
                        var areaId = self._cubeTextureCanvas.getArea(hit.uv);
                        if (areaId >= 0) {
                            document.body.style.cursor = "pointer";
                            if (lastAreaId >= 0) {
                                self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                                self._repaint();
                                lastAreaId = -1;
                            }
                            if (areaId >= 0) {
                                self._cubeTextureCanvas.setAreaHighlighted(areaId, true);
                                lastAreaId = areaId;
                                self._repaint();
                                if (e.x < (downX - 3) || e.x > (downX + 3) || e.y < (downY - 3) || e.y > (downY + 3)) {
                                    return;
                                }
                                var dir = self._cubeTextureCanvas.getAreaDir(areaId);
                                if (dir) {
                                    var up = self._cubeTextureCanvas.getAreaUp(areaId);
                                    flyTo(dir, up, function () {
                                        if (lastAreaId >= 0) {
                                            self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                                            self._repaint();
                                            lastAreaId = -1;
                                        }
                                        var hit = navCubeScene.pick({
                                            canvasPos: canvasPos,
                                            pickSurface: true
                                        });
                                        if (hit) {
                                            if (hit.uv) {
                                                var areaId = self._cubeTextureCanvas.getArea(hit.uv);
                                                if (areaId !== undefined) {
                                                    document.body.style.cursor = "pointer";
                                                    if (lastAreaId >= 0) {
                                                        self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                                                        self._repaint();
                                                        lastAreaId = -1;
                                                    }
                                                    if (areaId >= 0) {
                                                        self._cubeTextureCanvas.setAreaHighlighted(areaId, true);
                                                        lastAreaId = areaId;
                                                        self._repaint();
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            });

            document.addEventListener("mousemove", self._onMouseMove = function (e) {
                if (lastAreaId >= 0) {
                    self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                    self._repaint();
                    lastAreaId = -1;
                }
                if (down) {
                    var posX = e.clientX;
                    var posY = e.clientY;
                    document.body.style.cursor = "move";
                    actionMove(posX, posY);
                    return;
                }
                var canvasPos = getCoordsWithinElement(e);
                var hit = navCubeScene.pick({
                    canvasPos: canvasPos,
                    pickSurface: true
                });
                if (hit) {
                    if (hit.uv) {
                        document.body.style.cursor = "pointer";
                        var areaId = self._cubeTextureCanvas.getArea(hit.uv);
                        if (areaId === lastAreaId) {
                            return;
                        }
                        if (lastAreaId >= 0) {
                            self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                        }
                        if (areaId >= 0) {
                            self._cubeTextureCanvas.setAreaHighlighted(areaId, true);
                            self._repaint();
                            lastAreaId = areaId;
                        }
                    }
                } else {
                    document.body.style.cursor = "default";
                    if (lastAreaId >= 0) {
                        self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                        self._repaint();
                        lastAreaId = -1;
                    }
                }
            });

            var flyTo = (function () {
                var center = math.vec3();
                return function (dir, up, ok) {
                    var aabb = viewer.scene.aabb;
                    var diag = math.getAABB3Diag(aabb);
                    math.getAABB3Center(aabb, center);
                    var dist = Math.abs(diag / Math.tan(55.0 / 2));
                    viewer.cameraFlight.flyTo({
                        look: center,
                        eye: [center[0] - (dist * dir[0]), center[1] - (dist * dir[1]), center[2] - (dist * dir[2])],
                        up: up || [0, 1, 0],
                        orthoScale: diag * 1.3
                    }, ok);
                };
            })();
        }

        this._onCanvasBoundary = viewer.scene.canvas.on("boundary", () => {
            this._needUpdateLayout = true;
        });

        this._onSceneTick = viewer.scene.on("tick", () => {
            if (this._needUpdateLayout) {
                this._updateLayout();
            }
        });
    }

    send(name, value) {
        switch (name) {
            case "language":
                this._cubeTextureCanvas.clear();
                this._repaint();
                break;
        }
    }

    _repaint() {
        const image = this._cubeTextureCanvas.getImage();
        this._cubeMesh.material.diffuseMap.image = image;
        this._cubeMesh.material.emissiveMap.image = image;
    }

    _updateLayout() {
        const boundary = this.viewer.scene.canvas.boundary;
        const size = this._size;
        const style = this._navCubeCanvas.style;
        style.width = size + "px";
        style.height = size + "px";
        switch (this._alignment) {
            case "bottomRight":
                style.top = (boundary[1] + boundary[3] - size - this._bottomMargin) + "px";
                style.left = (boundary[0] + boundary[2] - size - this._rightMargin) + "px";
                break;
            case "bottomLeft":
                style.top = (boundary[1] + boundary[3] - size - this._bottomMargin) + "px";
                style.left = this._leftMargin + "px";
                break;
            case "topLeft":
                style.top = this._topMargin + "px";
                style.left = this._leftMargin + "px";
                break;
            case "topRight":
                style.top = this._topMargin + "px";
                style.left = (boundary[0] + boundary[2] - size - this._rightMargin) + "px";
                break;
        }
        this._needUpdateLayout = false;
    }


    /**
     * Sets if the NavCube is visible.
     *
     * @param {Boolean} visible Whether or not the NavCube is visible.
     */
    setVisible(visible = true) {
        this._cubeMesh.visible = visible;
        this._shadow.visible = visible;
        this._navCubeCanvas.style.visibility = visible ? "visible" : "hidden";
        this._needUpdateLayout = true;
    }

    /**
     * Gets if the NavCube is visible.
     *
     * @return {Boolean} True when the NavCube is visible.
     */
    getVisible() {
        return this._cubeMesh.visible;
    }

    /**
     * Sets the canvas size of the NavCube.
     *
     * Since the canvas is square, the size is given for a single dimension. Default value is ````200````.
     *
     * @param {number} size The canvas size, in pixels.
     */
    setSize(size = 200) {
        this._size = size;
        this._navCubeCanvas.width = size;
        this._navCubeCanvas.height = size;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the canvas size of the NavCube.
     *
     * Since the canvas is square, the size is given for a single dimension.
     *
     * @returns {number} The canvas size.
     */
    getSize() {
        return this._size;
    };

    /**
     * Sets the alignment of the NavCube within the bounds of the {@link Viewer}'s {@link Canvas}.
     *
     * Default value is "bottomRight".
     *
     * @param {String} alignment The alignment - "bottomRight" (default) | "bottomLeft" | "topLeft" | "topRight"
     */
    setAlignment(alignment = "bottomRight") {
        if (alignment !== "bottomRight" && alignment !== "bottomLeft" && alignment !== "topLeft" && alignment !== "topRight") {
            this.error("Illegal value for alignment - defaulting to `bottomRight'");
            alignment = "bottomRight";
        }
        this._alignment = alignment;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the alignment of the NavCube within the bounds of the {@link Viewer}'s {@link Canvas}.
     *
     * Default value is "bottomRight".
     *
     * @returns {String} The alignment - "bottomRight" (default) | "bottomLeft" | "topLeft" | "topRight"
     */
    getAlignment() {
        return this._alignment;
    }

    /**
     * Sets the margin between the NavCube and the left edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topLeft" or "bottomLeft". Default value is ````10````.
     *
     * @param {Number} leftMargin The left margin value, in pixels.
     */
    setLeftMargin(leftMargin) {
        this._leftMargin = (leftMargin !== null && leftMargin !== undefined) ? leftMargin : 10;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the margin between the NavCube and the left edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topLeft" or "bottomLeft". Default value is ````10````.
     *
     * @return {Number} leftMargin The left margin value, in pixels.
     */
    getLeftMargin() {
        return this._leftMargin;
    }

    /**
     * Sets the margin between the NavCube and the right edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topRight" or "bottomRight". Default value is ````10````.
     *
     * @param {Number} rightMargin The right margin value, in pixels.
     */
    setRightMargin(rightMargin) {
        this._rightMargin = (rightMargin !== null && rightMargin !== undefined) ? rightMargin : 10;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the margin between the NavCube and the right edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topRight" or "bottomRight". Default value is ````10````.
     *
     * @return {Number} rightMargin The right margin value, in pixels.
     */
    getRightMargin() {
        return this._rightMargin;
    }

    /**
     * Sets the margin between the NavCube and the top edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topRight" or "topLeft". Default value is ````10````.
     *
     * @param {Number} topMargin The top margin value, in pixels.
     */
    setTopMargin(topMargin) {
        this._topMargin = (topMargin !== null && topMargin !== undefined) ? topMargin : 10;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the margin between the NavCube and the top edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "topRight" or "topLeft". Default value is ````10````.
     *
     * @return {Number} topMargin The top margin value, in pixels.
     */
    getTopMargin() {
        return this._topMargin;
    }

    /**
     * Sets the margin between the NavCube and the bottom edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "bottomRight" or "bottomLeft". Default value is ````10````.
     *
     * @param {Number} bottomMargin The bottom margin value, in pixels.
     */
    setBottomMargin(bottomMargin) {
        this._bottomMargin = (bottomMargin !== null && bottomMargin !== undefined) ? bottomMargin : 10;
        this._needUpdateLayout = true;
    }

    /**
     * Gets the margin between the NavCube and the bottom edge of the {@link Viewer}'s {@link Canvas}.
     *
     * This applies when the NavCube's alignment is "bottomRight" or "bottomLeft". Default value is ````10````.
     *
     * @return {Number} bottomMargin The bottom margin value, in pixels.
     */
    getBottomMargin() {
        return this._bottomMargin;
    }

    destroy() {
        this.viewer.scene.canvas.off(this._onCanvasBoundary);
        this.viewer.scene.off(this._onSceneTick);
        this.viewer.camera.off(this._onCameraMatrix);
        this.viewer.camera.off(this._onCameraWorldAxis);
        this.viewer.camera.perspective.off(this._onCameraFOV);
        this.viewer.camera.off(this._onCameraProjection);
        this._navCubeCanvas.removeEventListener("mousedown", this._onMouseDown);
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mouseup", this._onMouseUp);

        super.destroy();
    }
}

export {NavCubePlugin};

