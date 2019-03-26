import {Plugin} from "././../../../src/viewer/Plugin.js";
import {math} from "../../../src/viewer/scene/math/math.js";
import {Scene} from "../../../src/viewer/scene/scene/Scene.js";
import {DirLight} from "./../../../src/viewer/scene/lights/DirLight.js";
import {Mesh} from "./../../../src/viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../../src/viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../../src/viewer/scene/materials/PhongMaterial.js";
import {Texture} from "../../../src/viewer/scene/materials/Texture.js";
import {buildPlaneGeometry} from "../../../src/viewer/scene/geometry/builders/buildPlaneGeometry.js";
import {buildCylinderGeometry} from "../../../src/viewer/scene/geometry/builders/buildCylinderGeometry.js";

import {CubeTextureCanvas} from "./CubeTextureCanvas.js";

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

/**
 * {@link Viewer} plugin that shows the axii of the World-space coordinate system.
 *
 * ## Usage
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_AxisGizmoPlugin)]
 *
 * ````JavaScript````
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {AxisGizmoPlugin} from "../src/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * new AxisGizmoPlugin(viewer, {size: [250, 250]});
 *
 * const model = gltfLoader.load({
 *     id: "myModel",
 *     src: "./models/gltf/schependomlaan/scene.gltf",
 *     metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
 *     edges: true
 * });
 *
 * const scene = viewer.scene;
 * const camera = scene.camera;
 *
 * camera.orbitPitch(20);
 *
 * model.on("loaded", () => {
 *     viewer.cameraFlight.jumpTo(modelNode);
 *     scene.on("tick", () => {
 *        camera.orbitYaw(0.4);
 *     })
 * });
 * ````
 */
class NavCubePlugin extends Plugin {

    constructor(viewer, cfg = {}) {

        super("NavCube", viewer, cfg);

        viewer.navCube = this;

        var visible = true;

        var size = cfg.size || 250;
        this._navCubeCanvas = document.createElement('canvas');
        this._navCubeCanvas.id = "cubeCanvas" + viewer.scene.canvas.canvas.id;

        this._left = cfg.left;
        this._right = cfg.right;
        this._top = cfg.top;
        this._bottom = cfg.bottom;

        var style = this._navCubeCanvas.style;
        style.height = size + "px";
        style.width = size + "px";
        style.padding = "0";
        style.margin = "0";
        style.left = "0px";
        style.top = "0px";
        style.position = "absolute";
        style["z-index"] = "2000000";
        style.visibility = visible ? "visible" : "hidden";

        document.body.appendChild(this._navCubeCanvas);

        var canvas = viewer.scene.canvas;

        canvas.on("boundary", function (boundary) {
            style.right = (-size / 4) + "px";
            style.top = (-size / 4) + "px";
        });

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
        this._navCubeCamera.ortho.far = 5000;

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
                eyeLookVec = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(eye, look, eyeLookVec)), 7);
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

        viewer.camera.on("matrix", this._synchCamera);
        viewer.camera.on("worldAxis", this._synchCamera);

        viewer.camera.perspective.on("fov", (fov) => {
            this._navCubeCamera.perspective.fov = fov;
        });

        viewer.camera.on("projection", (projection) => {
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

        // Mouse/touch rotation handlers

        // (function () {
        //
        //     var yaw = 0;
        //     var pitch = 0;
        //     var minPitch = null;
        //     var maxPitch = null;
        //     var sensitivity = 0.5;
        //
        //     var lastX;
        //     var lastY;
        //     var dragging = false;
        //
        //     var over = false;
        //
        //     function mouseDown(event) {
        //         lastX = event.clientX;
        //         lastY = event.clientY;
        //         dragging = true;
        //     }
        //
        //     function touchStart(event) {
        //         lastX = event.targetTouches[0].clientX;
        //         lastY = event.targetTouches[0].clientY;
        //         dragging = true;
        //     }
        //
        //     function mouseUp() {
        //         dragging = false;
        //     }
        //
        //     function touchEnd() {
        //         dragging = false;
        //     }
        //
        //     function mouseMove(event) {
        //         var posX = event.clientX;
        //         var posY = event.clientY;
        //         actionMove(posX, posY);
        //     }
        //
        //     function touchMove(event) {
        //         var posX = event.targetTouches[0].clientX;
        //         var posY = event.targetTouches[0].clientY;
        //         actionMove(posX, posY);
        //     }
        //
        //     function actionMove(posX, posY) {
        //         if (dragging) {
        //             var yawInc = (posX - lastX) * -sensitivity;
        //             var pitchInc = (posY - lastY) * -sensitivity;
        //             yaw -= yawInc;
        //             pitch -= pitchInc;
        //             if (minPitch !== undefined && pitch < minPitch) {
        //                 pitch = minPitch;
        //             }
        //             if (maxPitch !== undefined && pitch > maxPitch) {
        //                 pitch = maxPitch;
        //             }
        //             viewer.camera.orbitYaw(yawInc);
        //             viewer.camera.orbitPitch(-pitchInc);
        //             lastX = posX;
        //             lastY = posY;
        //         }
        //     }
        //
        //     self._navCubeCanvas.addEventListener('mousedown', mouseDown, true);
        //     self._navCubeCanvas.addEventListener('mousemove', mouseMove, true);
        //     self._navCubeCanvas.addEventListener('mouseup', mouseUp, true);
        //     self._navCubeCanvas.addEventListener('touchstart', touchStart, {passive: true});
        //     self._navCubeCanvas.addEventListener('touchmove', touchMove, {passive: true});
        //     self._navCubeCanvas.addEventListener('touchend', touchEnd, {passive: true});
        // })();

        (function () {

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

            self._navCubeCanvas.addEventListener("mousedown", function (e) {
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
            //
            // self._navCubeCanvas.addEventListener("mousemove", function (e) {
            //     if (down) {
            //         var posX = e.clientX;
            //         var posY = e.clientY;
            //         actionMove(posX, posY);
            //     }
            // });

            self._navCubeCanvas.addEventListener("mouseup", function (e) {
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

            self._navCubeCanvas.addEventListener("mousemove", function (e) {
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
                // if (down) {
                //     if (lastAreaId >= 0) {
                //         self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                //         self._repaint();
                //         lastAreaId = -1;
                //     }
                  //  self._repaint();
                  //   document.body.style.cursor = "move";
                 //   return;
    //            }
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
        })();
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

    /**
     * Sets if the NavCube is visible.
     *
     * @param {Boolean} visible Whether or not the NavCube is visible.
     */
    setVisible(visible = true) {
        this._cubeMesh.visible = visible;
        this._shadow.visible = visible;
        this._navCubeCanvas.style.visibility = visible ? "visible" : "hidden";
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
     * Since the canvas is square, the size is given for a single dimension.
     *
     * @param {number} size The canvas size.
     */
    setSize(size = 200) {
        this._size = size;
        this._navCubeCanvas.width = size;
        this._navCubeCanvas.height = size;
        var style = this._navCubeCanvas.style;
        style.width = size + "px";
        style.height = size + "px";
        style.right = (-size / 4) + "px";
        style.top = (-size / 4) + "px";
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

    destroy() {

        // TODO Deregister canvas handlers

        super.destroy();
    }
}

export {NavCubePlugin};

