import {Plugin} from "../../viewer/Plugin.js";
import {math} from "../../viewer/scene/math/math.js";
import {Scene} from "../../viewer/scene/scene/Scene.js";
import {DirLight} from "./../../viewer/scene/lights/DirLight.js";
import {Mesh} from "./../../viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {Texture} from "../../viewer/scene/materials/Texture.js";
import {buildCylinderGeometry} from "../../viewer/scene/geometry/builders/buildCylinderGeometry.js";
import {CubeTextureCanvas} from "./CubeTextureCanvas.js";
import {ClampToEdgeWrapping} from "../../viewer/scene/constants/constants.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

/**
 * {@link Viewer} plugin that lets us look at the entire {@link Scene} from along a chosen axis or diagonal.
 *
 *  [<img src="https://user-images.githubusercontent.com/83100/55674490-c93c2e00-58b5-11e9-8a28-eb08876947c0.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#gizmos_NavCubePlugin)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#gizmos_NavCubePlugin)]
 *
 * ## Overview
 *
 * * Rotating the NavCube causes the Viewer's {@link Camera} to orbit its current
 * point-of-interest. Conversely, orbiting the Camera causes the NavCube to rotate accordingly.
 * * The faces of the NavCube are aligned with the Viewer's {@link Scene}'s World-space coordinate axis. Clicking on a face moves
 * the Camera to look at the entire Scene along the corresponding axis. Clicking on an edge or a corner looks at
 * the entire Scene along a diagonal.
 * * The NavCube can be configured to either jump or fly the Camera to each new position. We can configure how tightly the
 * NavCube fits the Scene to view, and when flying, we can configure how fast it flies. We can also configure whether the
 * NavCube fits all objects to view, or just the currently visible objects. See below for a usage example.
 * * Clicking the NavCube also sets {@link CameraControl#pivotPos} to the center of the fitted objects.
 *
 * ## Usage
 *
 * In the example below, we'll create a Viewer and add a NavCubePlugin, which will create a NavCube gizmo in the canvas
 * with the given ID. Then we'll use the {@link XKTLoaderPlugin} to load a model into the Viewer's Scene. We can then
 * use the NavCube to look at the model along each axis or diagonal.
 *
 * ````JavaScript
 * import {Viewer, XKTLoaderPlugin, NavCubePlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.03];
 *
 * const navCube = new NavCubePlugin(viewer, {
 *
 *     canvasID: "myNavCubeCanvas",
 *
 *     visible: true,         // Initially visible (default)
 *
 *     cameraFly: true,       // Fly camera to each selected axis/diagonal
 *     cameraFitFOV: 45,      // How much field-of-view the scene takes once camera has fitted it to view
 *     cameraFlyDuration: 0.5,// How long (in seconds) camera takes to fly to each new axis/diagonal
 *
 *     fitVisible: false,     // Fit whole scene, including invisible objects (default)
 *
 *     synchProjection: false // Keep NavCube in perspective projection, even when camera switches to ortho (default)
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/Duplex.ifc.xkt",
 *     edges: true
 * });
 * ````
 */
class NavCubePlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg NavCubePlugin configuration.
     * @param {String} [cfg.id="NavCube"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.canvasId] ID of an existing HTML canvas to display the NavCube - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLCanvasElement} [cfg.canvasElement] Reference of an existing HTML canvas to display the NavCube - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {Boolean} [cfg.visible=true] Initial visibility.
     * @param {Boolean} [cfg.shadowVisible=true] Whether the shadow of the cube is visible.
     * @param {String} [cfg.cameraFly=true] Whether the {@link Camera} flies or jumps to each selected axis or diagonal.
     * @param {String} [cfg.cameraFitFOV=45] How much of the field-of-view, in degrees, that the 3D scene should fill the {@link Canvas} when the {@link Camera} moves to an axis or diagonal.
     * @param {String} [cfg.cameraFlyDuration=0.5] When flying the {@link Camera} to each new axis or diagonal, how long, in seconds, that the Camera takes to get there.
     * @param {String} [cfg.color="lightgrey"] Custom uniform color for the faces of the NavCube.
     * @param {String} [cfg.frontColor="#55FF55"] Custom color for the front face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.backColor="#55FF55"] Custom color for the back face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.leftColor="#FF5555"] Custom color for the left face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.rightColor="#FF5555"] Custom color for the right face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.topColor="#5555FF"] Custom color for the top face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.bottomColor="#5555FF"] Custom color for the bottom face of the NavCube. Overrides ````color````.
     * @param {String} [cfg.hoverColor="rgba(0,0,0,0.4)"] Custom color for highlighting regions on the NavCube as we hover the pointer over them.
     * @param {String} [cfg.textColor="black"] Custom text color for labels of the NavCube.
     * @param {Boolean} [cfg.fitVisible=false] Sets whether the axis, corner and edge-aligned views will fit the
     * view to the entire {@link Scene} or just to visible object-{@link Entity}s. Entitys are visible objects when {@link Entity#isObject} and {@link Entity#visible} are both ````true````.
     * @param {Boolean} [cfg.synchProjection=false] Sets whether the NavCube switches between perspective and orthographic projections in synchrony with the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection.
     * @param {Boolean} [cfg.isProjectNorth] sets whether the NavCube switches between true north and project north - using the project north offset angle.
     * @param {number} [cfg.projectNorthOffsetAngle] sets the NavCube project north offset angle - when the {@link isProjectNorth} is true.
     */
    constructor(viewer, cfg = {}) {

        super("NavCube", viewer, cfg);

        viewer.navCube = this;

        var visible = true;

        try {
            this._navCubeScene = new Scene(viewer, {
                canvasId: cfg.canvasId,
                canvasElement: cfg.canvasElement,
                transparent: true,
            });

            this._navCubeCanvas = this._navCubeScene.canvas.canvas;

            this._navCubeScene.input.keyboardEnabled = false; // Don't want keyboard input in the NavCube

        } catch (error) {
            this.error(error);
            return;
        }

        const navCubeScene = this._navCubeScene;

        navCubeScene.clearLights();

        new DirLight(navCubeScene, {dir: [0.4, -0.4, 0.8], color: [0.8, 1.0, 1.0], intensity: 1.0, space: "view"});
        new DirLight(navCubeScene, {dir: [-0.8, -0.3, -0.4], color: [0.8, 0.8, 0.8], intensity: 1.0, space: "view"});
        new DirLight(navCubeScene, {dir: [0.8, -0.6, -0.8], color: [1.0, 1.0, 1.0], intensity: 1.0, space: "view"});

        this._navCubeCamera = navCubeScene.camera;
        this._navCubeCamera.ortho.scale = 7.0;
        this._navCubeCamera.ortho.near = 0.1;
        this._navCubeCamera.ortho.far = 2000;

        navCubeScene.edgeMaterial.edgeColor = [0.2, 0.2, 0.2];
        navCubeScene.edgeMaterial.edgeAlpha = 0.6;

        this._zUp = Boolean(viewer.camera.zUp);

        var self = this;

        this.setIsProjectNorth(cfg.isProjectNorth);
        this.setProjectNorthOffsetAngle(cfg.projectNorthOffsetAngle);

        const rotateTrueNorth = (function () {
            const trueNorthMatrix = math.mat4();
            return function (dir, vec, dest) {
                math.identityMat4(trueNorthMatrix);
                math.rotationMat4v(dir * self._projectNorthOffsetAngle * math.DEGTORAD, [0, 1, 0], trueNorthMatrix);
                return math.transformVec3(trueNorthMatrix, vec, dest)
            }
        }())

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

                if (self._isProjectNorth && self._projectNorthOffsetAngle) {
                    eyeLookVec = rotateTrueNorth(-1, eyeLookVec, tempVec3a);
                    up = rotateTrueNorth(-1, up, tempVec3b);
                }

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

        this._cubeTextureCanvas = new CubeTextureCanvas(viewer, navCubeScene, cfg);

        this._cubeSampler = new Texture(navCubeScene, {
            image: this._cubeTextureCanvas.getImage(),
            flipY: true,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping
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

        this._shadow = cfg.shadowVisible === false ? null : new Mesh(navCubeScene, {
            geometry: new ReadableGeometry(navCubeScene, buildCylinderGeometry({
                center: [0, 0, 0],
                radiusTop: 0.001,
                radiusBottom: 1.4,
                height: 0.01,
                radialSegments: 20,
                heightSegments: 1,
                openEnded: true
            })),
            material: new PhongMaterial(navCubeScene, {
                diffuse: [0.0, 0.0, 0.0], specular: [0, 0, 0], emissive: [0.0, 0.0, 0.0], alpha: 0.5
            }),
            position: [0, -1.5, 0],
            visible: !!visible,
            pickable: false,
            backfaces: false
        });

        this._onCameraMatrix = viewer.camera.on("matrix", this._synchCamera);
        this._onCameraWorldAxis = viewer.camera.on("worldAxis", () => {
            if (viewer.camera.zUp) {
                this._zUp = true;
                this._cubeTextureCanvas.setZUp();
                this._repaint();
                this._synchCamera();
            } else if (viewer.camera.yUp) {
                this._zUp = false;
                this._cubeTextureCanvas.setYUp();
                this._repaint();
                this._synchCamera();
            }
        });
        this._onCameraFOV = viewer.camera.perspective.on("fov", (fov) => {
            if (this._synchProjection) {
                this._navCubeCamera.perspective.fov = fov;
            }
        });
        this._onCameraProjection = viewer.camera.on("projection", (projection) => {
            if (this._synchProjection) {
                this._navCubeCamera.projection = (projection === "ortho" || projection === "perspective") ? projection : "perspective";
            }
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
            var over = false;

            var yaw = 0;
            var pitch = 0;
            var minPitch = null;
            var maxPitch = null;
            var sensitivity = 0.5;

            var lastX;
            var lastY;


            self._navCubeCanvas.addEventListener("mouseenter", self._onMouseEnter = function (e) {
                over = true;
            });


            self._navCubeCanvas.addEventListener("mouseleave", self._onMouseLeave = function (e) {
                over = false;
            });

            self._navCubeCanvas.addEventListener("mousedown", self._onMouseDown = function (e) {
                if (e.which !== 1) {
                    return;
                }
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

            self._navCubeCanvas.addEventListener("mouseup", self._onMouseUp = function (e) {
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
                            self._navCubeCanvas.style.cursor = "pointer";
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
                                    if (self._isProjectNorth && self._projectNorthOffsetAngle) {
                                        dir = rotateTrueNorth(+1, dir, tempVec3a);
                                        up = rotateTrueNorth(+1, up, tempVec3b);
                                    }
                                    flyTo(dir, up, function () {
                                        if (lastAreaId >= 0) {
                                            self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                                            self._repaint();
                                            lastAreaId = -1;
                                        }
                                        self._navCubeCanvas.style.cursor = "pointer";
                                        if (lastAreaId >= 0) {
                                            self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                                            self._repaint();
                                            lastAreaId = -1;
                                        }
                                        if (areaId >= 0) {
                                            self._cubeTextureCanvas.setAreaHighlighted(areaId, false);
                                            lastAreaId = -1;
                                            self._repaint();
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            });

            self._navCubeCanvas.addEventListener("mousemove", self._onMouseMove = function (e) {
                if (lastAreaId >= 0) {
                    self._cubeTextureCanvas.setAreaHighlighted(lastAreaId, false);
                    self._repaint();
                    lastAreaId = -1;
                }
                if (e.buttons === 1 && !down) {
                    return;
                }
                if (down) {
                    var posX = e.clientX;
                    var posY = e.clientY;
                    self._navCubeCanvas.style.cursor = "move";
                    actionMove(posX, posY);
                    return;
                }
                if (!over) {
                    return;
                }
                var canvasPos = getCoordsWithinElement(e);
                var hit = navCubeScene.pick({
                    canvasPos: canvasPos,
                    pickSurface: true
                });
                if (hit) {
                    if (hit.uv) {
                        self._navCubeCanvas.style.cursor = "pointer";
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
                    self._navCubeCanvas.style.cursor = "default";
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
                    var aabb = self._fitVisible ? viewer.scene.getAABB(viewer.scene.visibleObjectIds) : viewer.scene.aabb;
                    var diag = math.getAABB3Diag(aabb);
                    math.getAABB3Center(aabb, center);
                    var dist = Math.abs(diag / Math.tan(self._cameraFitFOV * math.DEGTORAD));
                    viewer.cameraControl.pivotPos = center;
                    if (self._cameraFly) {
                        viewer.cameraFlight.flyTo({
                            look: center,
                            eye: [center[0] - (dist * dir[0]), center[1] - (dist * dir[1]), center[2] - (dist * dir[2])],
                            up: up || [0, 1, 0],
                            orthoScale: diag * 1.1,
                            fitFOV: self._cameraFitFOV,
                            duration: self._cameraFlyDuration
                        }, ok);
                    } else {
                        viewer.cameraFlight.jumpTo({
                            look: center,
                            eye: [center[0] - (dist * dir[0]), center[1] - (dist * dir[1]), center[2] - (dist * dir[2])],
                            up: up || [0, 1, 0],
                            orthoScale: diag * 1.1,
                            fitFOV: self._cameraFitFOV
                        }, ok);
                    }
                };
            })();
        }

        this._onUpdated = viewer.localeService.on("updated", () => {
            this._cubeTextureCanvas.clear();
            this._repaint();
        });

        this.setVisible(cfg.visible);
        this.setCameraFitFOV(cfg.cameraFitFOV);
        this.setCameraFly(cfg.cameraFly);
        this.setCameraFlyDuration(cfg.cameraFlyDuration);
        this.setFitVisible(cfg.fitVisible);
        this.setSynchProjection(cfg.synchProjection);
    }

    send(name, value) {
        switch (name) {
            case "language":
                this._cubeTextureCanvas.clear();
                this._repaint(); // CubeTextureCanvas gets language from Viewer
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
        if (!this._navCubeCanvas) {
            return;
        }
        this._cubeMesh.visible = visible;
        if (this._shadow) {
            this._shadow.visible = visible;
        }
        this._navCubeCanvas.style.visibility = visible ? "visible" : "hidden";
    }

    /**
     * Gets if the NavCube is visible.
     *
     * @return {Boolean} True when the NavCube is visible.
     */
    getVisible() {
        if (!this._navCubeCanvas) {
            return false;
        }
        return this._cubeMesh.visible;
    }


    /**
     * Sets whether the axis, corner and edge-aligned views will fit the
     * view to the entire {@link Scene} or just to visible object-{@link Entity}s.
     *
     * Entitys are visible objects when {@link Entity#isObject} and {@link Entity#visible} are both ````true````.
     *
     * @param {Boolean} fitVisible Set ````true```` to fit only visible object-Entitys.
     */
    setFitVisible(fitVisible = false) {
        this._fitVisible = fitVisible;
    }

    /**
     * Gets whether the axis, corner and edge-aligned views will fit the
     * view to the entire {@link Scene} or just to visible object-{@link Entity}s.
     *
     * Entitys are visible objects when {@link Entity#isObject} and {@link Entity#visible} are both ````true````.
     *
     * @return {Boolean} True when fitting only visible object-Entitys.
     */
    getFitVisible() {
        return this._fitVisible;
    }

    /**
     * Sets whether the {@link Camera} flies or jumps to each selected axis or diagonal.
     *
     * Default is ````true````, to fly.
     *
     * @param {Boolean} cameraFly Set ````true```` to fly, else ````false```` to jump.
     */
    setCameraFly(cameraFly = true) {
        this._cameraFly = cameraFly;
    }

    /**
     * Gets whether the {@link Camera} flies or jumps to each selected axis or diagonal.
     *
     * Default is ````true````, to fly.
     *
     * @returns {Boolean} Returns ````true```` to fly, else ````false```` to jump.
     */
    getCameraFly() {
        return this._cameraFly;
    }

    /**
     * Sets how much of the field-of-view, in degrees, that the {@link Scene} should
     * fill the canvas when flying or jumping the {@link Camera} to each selected axis or diagonal.
     *
     * Default value is ````45````.
     *
     * @param {Number} cameraFitFOV New FOV value.
     */
    setCameraFitFOV(cameraFitFOV = 45) {
        this._cameraFitFOV = cameraFitFOV;
    }

    /**
     * Gets how much of the field-of-view, in degrees, that the {@link Scene} should
     * fill the canvas when flying or jumping the {@link Camera} to each selected axis or diagonal.
     *
     * Default value is ````45````.
     *
     * @returns {Number} Current FOV value.
     */
    getCameraFitFOV() {
        return this._cameraFitFOV;
    }

    /**
     * When flying the {@link Camera} to each new axis or diagonal, sets how long, in seconds, that the Camera takes to get there.
     *
     * Default is ````0.5````.
     *
     * @param {Boolean} cameraFlyDuration Camera flight duration in seconds.
     */
    setCameraFlyDuration(cameraFlyDuration = 0.5) {
        this._cameraFlyDuration = cameraFlyDuration;
    }

    /**
     * When flying the {@link Camera} to each new axis or diagonal, gets how long, in seconds, that the Camera takes to get there.
     *
     * Default is ````0.5````.
     *
     * @returns {Boolean} Camera flight duration in seconds.
     */
    getCameraFlyDuration() {
        return this._cameraFlyDuration;
    }

    /**
     * Sets whether the NavCube switches between perspective and orthographic projections in synchrony with
     * the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection.
     *
     * @param {Boolean} synchProjection Set ````true```` to keep NavCube projection synchronized with {@link Camera#projection}.
     */
    setSynchProjection(synchProjection = false) {
        this._synchProjection = synchProjection;
    }

    /**
     * Gets whether the NavCube switches between perspective and orthographic projections in synchrony with
     * the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection.
     *
     * @return {Boolean} True when NavCube projection is synchronized with {@link Camera#projection}.
     */
    getSynchProjection() {
        return this._synchProjection;
    }

    /**
     * Sets whether the NavCube switches between project north and true north
     *
     * @param {Boolean} isProjectNorth Set ````true```` to use project north offset
     */
    setIsProjectNorth(isProjectNorth = false) {
        this._isProjectNorth = isProjectNorth;
    }

    /**
     * Gets whether the NavCube switches between project north and true north
     *
     * @return {Boolean} isProjectNorth when ````true```` - use project north offset
     */
    getIsProjectNorth() {
        return this._isProjectNorth;
    }

    /**
     * Sets the NavCube project north offset angle (used when {@link isProjectNorth} is ````true````
     *
     * @param {number} projectNorthOffsetAngle Set the vector offset for project north
     */
    setProjectNorthOffsetAngle(projectNorthOffsetAngle) {
        this._projectNorthOffsetAngle = projectNorthOffsetAngle;
    }

    /**
     * Gets the offset angle between project north and true north
     *
     * @return {number} projectNorthOffsetAngle
     */
    getProjectNorthOffsetAngle() {
        return this._projectNorthOffsetAngle;
    }

    /**
     * Destroys this NavCubePlugin.
     *
     * Does not destroy the canvas the NavCubePlugin was configured with.
     */
    destroy() {

        if (this._navCubeCanvas) {

            this.viewer.localeService.off(this._onUpdated);
            this.viewer.camera.off(this._onCameraMatrix);
            this.viewer.camera.off(this._onCameraWorldAxis);
            this.viewer.camera.perspective.off(this._onCameraFOV);
            this.viewer.camera.off(this._onCameraProjection);

            this._navCubeCanvas.removeEventListener("mouseenter", this._onMouseEnter);
            this._navCubeCanvas.removeEventListener("mouseleave", this._onMouseLeave);
            this._navCubeCanvas.removeEventListener("mousedown", this._onMouseDown);

            this._navCubeCanvas.removeEventListener("mousemove", this._onMouseMove);
            this._navCubeCanvas.removeEventListener("mouseup", this._onMouseUp);

            this._navCubeCanvas = null;
            this._cubeTextureCanvas.destroy();
            this._cubeTextureCanvas = null;

            this._onMouseEnter = null;
            this._onMouseLeave = null;
            this._onMouseDown = null;
            this._onMouseMove = null;
            this._onMouseUp = null;
        }

        this._navCubeScene.destroy();
        this._navCubeScene = null;
        this._cubeMesh = null;
        this._shadow = null;

        super.destroy();
    }
}

export {NavCubePlugin};
