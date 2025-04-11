import { math } from "../../viewer/scene/math/math.js";

import { buildCylinderGeometry } from "../../viewer/scene/geometry/builders/buildCylinderGeometry.js";
import { buildTorusGeometry } from "../../viewer/scene/geometry/builders/buildTorusGeometry.js";

import { ReadableGeometry } from "../../viewer/scene/geometry/ReadableGeometry.js";
import { PhongMaterial } from "../../viewer/scene/materials/PhongMaterial.js";
import { EmphasisMaterial } from "../../viewer/scene/materials/EmphasisMaterial.js";
import { Node } from "../../viewer/scene/nodes/Node.js";
import { Mesh } from "../../viewer/scene/mesh/Mesh.js";
import { buildSphereGeometry } from "../../viewer/scene/geometry/builders/buildSphereGeometry.js";
import { worldToRTCPos } from "../../viewer/scene/math/rtcCoords.js";
import { transformToNode } from "../lib/ui/index.js";

const translateElement = (element, worldAxis, translation, elementCenter) => {
  if (element) {
    let offset = [0, 0, 0];

    offset[0] += worldAxis[0] * translation[0];
    offset[1] += worldAxis[1] * translation[1];
    offset[2] += worldAxis[2] * translation[2];
    element.translate({ translation: offset, originLocalPivot: elementCenter, rotationPivot: elementCenter, localAABB: element.aabb });
  }
};

/**
 * Controls a {@link SectionPlane} with mouse and touch input.
 *
 * @private
 */
class MovementControl {

  /** @private */
  constructor(viewerInstance) {

    /**
     * ID of this Control.
     *
     * SectionPlaneControls are mapped by this ID in {@link SectionPlanesPlugin#sectionPlaneControls}.
     *
     * @property id
     * @type {String|Number}
     */
    this.id = null;

    const viewer = viewerInstance;
    const camera = viewer.camera;
    const cameraControl = viewer.cameraControl;
    const scene = viewer.scene;
    const canvas = scene.canvas.canvas;

    this._visible = false;

    let ignoreNextSectionPlaneDirUpdate = false;

    // Builds the Entities that represent this Control.
    const NO_STATE_INHERIT = false;
    const arrowLength = 1.0;
    const handleRadius = 0.09;
    const tubeRadius = 0.01;

    const rootNode = new Node(scene, { // Root of Node graph that represents this control in the 3D scene
      position: [0, 0, 0],
      scale: [1, 1, 1],
      isObject: false
    });

    const pos = math.vec3();
    const setPos = (function () {
      const origin = math.vec3();
      const rtcPos = math.vec3();
      return function (p) {
        pos.set(p);
        worldToRTCPos(p, origin, rtcPos);
        rootNode.origin = origin;
        rootNode.position = rtcPos;
      };
    })();

    const arrowGeometry = (radiusBottom, height) => new ReadableGeometry(rootNode, buildCylinderGeometry({
      radiusTop: 0.001,
      radiusBottom: radiusBottom,
      radialSegments: 32,
      heightSegments: 1,
      height: height,
      openEnded: false
    }));

    const tubeGeometry = (radius, height, radialSegments) => new ReadableGeometry(rootNode, buildCylinderGeometry({
      radiusTop: radius,
      radiusBottom: radius,
      radialSegments: radialSegments,
      heightSegments: 1,
      height: height,
      openEnded: false
    }));

    const torusGeometry = (tube, arcFraction, tubeSegments) => new ReadableGeometry(rootNode, buildTorusGeometry({
      radius: arrowLength - 0.2,
      tube: tube,
      radialSegments: 64,
      tubeSegments: tubeSegments,
      arc: (Math.PI * 2.0) * arcFraction
    }));

    const shapes = {// Reusable geometries

      curve: torusGeometry(tubeRadius, 0.25, 14),
      curveHandle: torusGeometry(handleRadius, 0.25, 14),
      hoop: torusGeometry(tubeRadius, 1, 8),

      arrowHead: arrowGeometry(0.07, 0.2),
      arrowHeadBig: arrowGeometry(0.09, 0.25),
      arrowHeadHandle: tubeGeometry(handleRadius, 0.37, 8),

      axis: tubeGeometry(tubeRadius, arrowLength, 20),
      axisHandle: tubeGeometry(handleRadius, arrowLength, 20)
    };

    const colorMaterial = (rgb) => new PhongMaterial(rootNode, {
      diffuse: rgb,
      emissive: rgb,
      ambient: [0.0, 0.0, 0.0],
      specular: [.6, .6, .3],
      shininess: 80,
      lineWidth: 2
    });

    const highlightMaterial = (rgb, fillAlpha) => new EmphasisMaterial(rootNode, {
      edges: false,
      fill: true,
      fillColor: rgb,
      fillAlpha: fillAlpha
    });

    const pickableMaterial = new PhongMaterial(rootNode, { // Invisible material for pickable handles, which define a pickable 3D area
      diffuse: [1, 1, 0],
      alpha: 0, // Invisible
      alphaMode: "blend"
    });

    const handlers = {};
    const addAxis = (rgb, hoopRot) => {
      math.mulVec3Scalar(rgb, -1, math.vec3());
      const material = colorMaterial(rgb);

      const hoopMatrix = math.quaternionToRotationMat4(hoopRot, math.identityMat4());
      math.mulMat4(math.rotationMat4v(Math.PI, [0, 1, 0], math.mat4()), hoopMatrix, hoopMatrix);
      const scale = math.scaleMat4v([0.6, 0.6, 0.6], math.identityMat4());
      const scaledArrowMatrix = (t, matR) => {
        const matT = math.translateMat4v(t, math.identityMat4());
        const ret = math.identityMat4();
        math.mulMat4(matT, matR, ret);
        math.mulMat4(hoopMatrix, ret, ret);
        return math.mulMat4(ret, scale, math.identityMat4());
      };

      const curve = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.curve,
        material: material,
        matrix: hoopMatrix,
        pickable: false,
        collidable: true,
        clippable: false,
        backfaces: true,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const rotateHandle = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.curveHandle,
        material: pickableMaterial,
        matrix: hoopMatrix,
        pickable: true,
        collidable: true,
        clippable: false,
        backfaces: true,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const arrow1 = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.arrowHead,
        material: material,
        matrix: scaledArrowMatrix([.8, .07, 0], math.rotationMat4v(180 * math.DEGTORAD, [0, 0, 1], math.identityMat4())),
        pickable: true,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const arrow2 = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.arrowHead,
        material: material,
        matrix: scaledArrowMatrix([.07, .8, 0], math.rotationMat4v(90 * math.DEGTORAD, [0, 0, 1], math.identityMat4())),
        pickable: true,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const hoop = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.hoop,
        material: material,
        highlighted: true,
        highlightMaterial: highlightMaterial(rgb, 0.6),
        matrix: hoopMatrix,
        pickable: false,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);


      const axisRotation = math.quaternionToRotationMat4(math.vec3PairToQuaternion([0, 1, 0], rgb), math.identityMat4());
      math.mulMat4(math.rotationMat4v(Math.PI, [0, 1, 0], math.mat4()), axisRotation, axisRotation);

      const translatedAxisMatrix = (yOffset) => math.mulMat4(axisRotation, math.translateMat4c(0, yOffset, 0, math.identityMat4()), math.identityMat4());
      const arrowMatrix = translatedAxisMatrix(arrowLength + .1);
      const shaftMatrix = translatedAxisMatrix(arrowLength / 2);

      const arrow = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.arrowHead,
        material: material,
        matrix: arrowMatrix,
        pickable: false,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const arrowHandle = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.arrowHeadHandle,
        material: pickableMaterial,
        matrix: arrowMatrix,
        pickable: true,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const shaft = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.axis,
        material: material,
        matrix: shaftMatrix,
        pickable: false,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const shaftHandle = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.axisHandle,
        material: pickableMaterial,
        matrix: shaftMatrix,
        pickable: true,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const bigArrowHead = rootNode.addChild(new Mesh(rootNode, {
        geometry: shapes.arrowHeadBig,
        material: material,
        matrix: arrowMatrix,
        pickable: false,
        collidable: true,
        clippable: false,
        visible: false,
        isObject: false
      }), NO_STATE_INHERIT);

      const localToWorldVec = (localVec, worldVec) => math.vec3ApplyQuaternion(rootNode.quaternion, localVec, worldVec);

      let count = 0;
      const closestPointOnAxis = (function () {
        const worldAxis = math.vec3();
        const org = math.vec3();
        const dir = math.vec3();

        return (canvasPos, dst) => {
          localToWorldVec(rgb, worldAxis);

          const P = pos;
          const D = worldAxis;

          math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, org, dir);

          const d01 = math.dotVec3(D, dir);
          const v = math.subVec3(org, P, dst);
          const v0 = math.dotVec3(v, D);
          const v1 = math.dotVec3(v, dir);
          const det = 1 - d01 * d01;

          if (Math.abs(det) > 1e-10) { // if lines are not parallel
            const s = (v0 - d01 * v1) / det;
            math.addVec3(P, math.mulVec3Scalar(D, s, dst), dst);
            return true;
          } else {
            return false;
          }
        };
      })();
      const initOffset = math.vec3();
      const tempVec3 = math.vec3();
      handlers[arrowHandle.id] = handlers[shaftHandle.id] = {
        setActivated: a => bigArrowHead.visible = a,
        initDragAction: (initCanvasPos) => {
          return closestPointOnAxis(initCanvasPos, initOffset) && math.subVec3(initOffset, pos, initOffset) && ((canvasPos) => {
            if (closestPointOnAxis(canvasPos, tempVec3)) {
              const elementCenter = this.getOriginalPos(this.element)
              math.subVec3(tempVec3, initOffset, tempVec3);

              setPos(tempVec3);
              this.element.translate({ translation: tempVec3, originLocalPivot: elementCenter, rotationPivot: elementCenter, localAABB: this.element.aabb });
            }
          });
        }
      };

      handlers[rotateHandle.id] = {
        setActivated: a => hoop.visible = a,
        initDragAction: (initCanvasPos) => {
          const rotationFromCanvasPos = (function () {
            const planeCanvasPos = camera.projectWorldPos(pos);
            localToWorldVec(rgb, tempVec3);
            math.transformVec3(camera.normalMatrix, tempVec3, tempVec3);
            const axisCoeff = Math.sign(tempVec3[2]);
            return (canvasPos) => {
              const dx = canvasPos[0] - planeCanvasPos[0];
              const dy = canvasPos[1] - planeCanvasPos[1];
              return axisCoeff * Math.atan2(-dy, dx);
            };
          })();

          let lastRotation = rotationFromCanvasPos(initCanvasPos);
          let angelSum = 0;
          return canvasPos => {
            const rotation = rotationFromCanvasPos(canvasPos);
            const angle = (rotation - lastRotation) * 180 / Math.PI
            rootNode.rotate(rgb, angle);
            if (this._sectionPlane) {
              ignoreNextSectionPlaneDirUpdate = true;
              this._sectionPlane.quaternion = rootNode.quaternion;
            }
            angelSum += angle;
            const rotationEulerAngle = math.vec3();
            math.quaternionToEuler(rootNode.quaternion, 'XYZ', rotationEulerAngle)

            const q1 = math.vec4();
            const q2 = math.vec4();
            const angleAxis = math.vec4(4);
            const engles = math.vec3();

            angleAxis[0] = rgb[0];
            angleAxis[1] = rgb[1];
            angleAxis[2] = rgb[2];
            angleAxis[3] = angle * math.DEGTORAD;
            math.angleAxisToQuaternion(angleAxis, q1);
            math.mulQuaternions(rootNode.quaternion, q1, q2);
            console.log("rotation:quaternion", rootNode.quaternion)
            console.log("rotation:NEW_QUATERNION", q2)
            console.log("rotation:ANGLE", angle)
            console.log("rotation:angelSum", angelSum)
            console.log("rotation:EULERAngle", rotationEulerAngle)
            math.mulVec3Scalar(rgb, angle, engles)
            const elementDimensions = this.element.aabb;
            const gizmoPosition = math.getAABB3Center(elementDimensions);
            console.log('gizmoPosition:   ', gizmoPosition)
            this.element.rotate({
              // rotation: [0, 0, angle],
              rotation: q2,
              // rotation: engles,
              pivot: pos,
              originLocalPivot: pos, localAABB: this.element.aabb,
              isAllModel: false
            });
            // this.element.rotate({
            //   radians: rotationEulerAngle,
            //   pivot: pos,
            // });
            lastRotation = rotation;
          };
        }
      };

      return {
        set visible(v) {
          arrow.visible = arrowHandle.visible = shaft.visible = shaftHandle.visible = curve.visible = rotateHandle.visible = arrow1.visible = arrow2.visible = v;
          if (!v) {
            bigArrowHead.visible = v;
            hoop.visible = v;
          }
        },
        set culled(c) {
          arrow.culled = arrowHandle.culled = shaft.culled = shaftHandle.culled = curve.culled = rotateHandle.culled = arrow1.culled = arrow2.culled = c;
          if (!c) {
            bigArrowHead.culled = c;
            hoop.culled = c;
          }
        }
      };
    };

    this._displayMeshes = [ // Meshes that are always visible
      rootNode.addChild(new Mesh(rootNode, { // cube
        geometry: new ReadableGeometry(rootNode, {
          primitive: "triangles",
          positions: [
            // Front face
            -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
            // Back face
            -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
            // Top face
            -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
            // Bottom face
            -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
            // Right face
            0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
            // Left face
            -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5
          ],
          indices: [
            // Front face
            0, 1, 2, 2, 3, 0,
            // Back face
            4, 5, 6, 6, 7, 4,
            // Top face
            8, 9, 10, 10, 11, 8,
            // Bottom face
            12, 13, 14, 14, 15, 12,
            // Right face
            16, 17, 18, 18, 19, 16,
            // Left face
            20, 21, 22, 22, 23, 20
          ]
        }),
        material: new PhongMaterial(rootNode, {
          emissive: [0, 0.0, 0],
          diffuse: [0, 0, 0],
          backfaces: true
        }),
        opacity: 0.6,
        ghosted: true,
        ghostMaterial: new EmphasisMaterial(rootNode, {
          edges: false,
          filled: true,
          fillColor: [1, 1, 0],
          edgeColor: [0, 0, 0],
          fillAlpha: 0.1,
          backfaces: true
        }),
        pickable: false,
        collidable: true,
        clippable: false,
        visible: false,
        scale: [2.4, 2.4, 2.4], // Adjust scale for the cube
        isObject: false
      }), NO_STATE_INHERIT),

      // rootNode.addChild(new Mesh(rootNode, { // center
      //   geometry: new ReadableGeometry(rootNode, buildSphereGeometry({
      //     radius: 0.05
      //   })),
      //   material: new PhongMaterial(rootNode, {
      //     diffuse: [0.0, 0.0, 0.0],
      //     emissive: [0, 0, 0],
      //     ambient: [0.0, 0.0, 0.0],
      //     specular: [.6, .6, .3],
      //     shininess: 80
      //   }),
      //   pickable: false,
      //   collidable: true,
      //   clippable: false,
      //   visible: false,
      //   isObject: false
      // }), NO_STATE_INHERIT),

      //----------------------------------------------------------------------------------------------------------
      //
      //----------------------------------------------------------------------------------------------------------

      addAxis([1, 0, 0], math.vec3PairToQuaternion([1, 0, 0], [0, 0, 1])),
      addAxis([0, 1, 0], math.eulerToQuaternion([90, 0, 0], "XYZ")),
      addAxis([0, 0, 1], math.identityQuaternion())
    ];

    const cleanups = [];

    { // Keep gizmo screen size constant
      let lastDist = -1;
      const setRootNodeScale = size => rootNode.scale = [size, size, size];
      const onSceneTick = scene.on("tick", () => {
        const dist = Math.abs(math.distVec3(camera.eye, pos));
        if (camera.projection === "perspective") {
          if (dist !== lastDist) {
            setRootNodeScale(0.07 * dist * Math.tan(camera.perspective.fov * math.DEGTORAD));
          }
        } else if (camera.projection === "ortho") {
          setRootNodeScale(camera.ortho.scale / 10);
        }
        lastDist = dist;
      });
      cleanups.push(() => scene.off(onSceneTick));
    }

    {
      let deactivateActive = null;
      let currentDrag = null;
      cleanups.push(() => { if (currentDrag) { currentDrag.cleanup(); } });
      const canvasPos = math.vec2();

      const copyCanvasPos = (event, vec2) => {
        vec2[0] = event.clientX;
        vec2[1] = event.clientY;
        transformToNode(canvas.ownerDocument.documentElement, canvas, vec2);
      };

      const pickHandler = (e) => {
        copyCanvasPos(e, canvasPos);
        const pickResult = viewer.scene.pick({ canvasPos: canvasPos });
        const pickEntity = pickResult && pickResult.entity;
        const pickId = pickEntity && pickEntity.id;
        return (pickId in handlers) && handlers[pickId];
      };

      const startDrag = (event, matchesEvent) => {
        const handler = pickHandler(matchesEvent(event));
        if (handler) {
          if (currentDrag) {
            currentDrag.cleanup();
          }

          const dragAction = handler.initDragAction(canvasPos);
          if (dragAction) {
            cameraControl.pointerEnabled = false; // or .active = false ?
            handler.setActivated(true);

            currentDrag = {
              onChange: event => {
                const e = matchesEvent(event);
                if (e) {
                  copyCanvasPos(e, canvasPos);
                  dragAction(canvasPos);
                }
              },
              cleanup: function () {
                currentDrag = null;
                cameraControl.pointerEnabled = true; // or .active = true ?
                handler.setActivated(false);
              }
            };
          }
        }
      };

      const addCanvasEventListener = (type, listener) => {
        canvas.addEventListener(type, listener);
        cleanups.push(() => canvas.removeEventListener(type, listener));
      };

      addCanvasEventListener("mousedown", (e) => {
        e.preventDefault();
        if (e.which === 1) {
          startDrag(e, event => (event.which === 1) && event);
        }
      });

      addCanvasEventListener("mousemove", (e) => {
        if (currentDrag) {
          currentDrag.onChange(e);
        } else {
          if (deactivateActive) {
            deactivateActive();
          }
          const handler = pickHandler(e);
          if (handler) {
            handler.setActivated(true);
            deactivateActive = () => handler.setActivated(false);
          } else {
            deactivateActive = null;
          }
        }
      });

      addCanvasEventListener("mouseup", (e) => {
        if (currentDrag) {
          currentDrag.onChange(e);
          currentDrag.cleanup();
        }
      });


      addCanvasEventListener("touchstart", event => {
        event.preventDefault();
        if (event.touches.length === 1) {
          const touchStartId = event.touches[0].identifier;
          startDrag(event, event => [...event.changedTouches].find(e => e.identifier === touchStartId));
        }
      });

      addCanvasEventListener("touchmove", event => {
        event.preventDefault();
        currentDrag && currentDrag.onChange(event);
      });

      addCanvasEventListener("touchend", event => {
        event.preventDefault();
        if (currentDrag) {
          currentDrag.onChange(event);
          currentDrag.cleanup();
        }
      });
    }

    this._unbindSectionPlane = () => { };
    this._unbindElement = () => { };

    this.__setElement = element => {
      this.id = element.id;
      this._element = element;
      const elementCenter = this.getOriginalPos(element)
      console.log('originCenter', elementCenter)
      const setPosFromSectionPlane = () => setPos(elementCenter);
      const setDirFromSectionPlane = () => rootNode.quaternion = [0, 0, 0, 1];
      setPosFromSectionPlane();
      setDirFromSectionPlane();

      this._unbindElement = () => {
        this.id = null;
        this._element = null;
        this._unbindElement = () => { };
      };
    };

    this.__destroy = () => {
      cleanups.forEach(c => c());
      this._unbindSectionPlane();
      rootNode.destroy();
      this._displayMeshes = [];
      for (let id in handlers) {
        delete handlers[id];
      }
    };
  }

  _destroy() {
    this.__destroy();
  }

  getOriginalPos(element) {
    if (!element) return math.vec3();
    const elementDimensions = element.aabb;
    const gizmoPosition = math.getAABB3Center(elementDimensions);
    gizmoPosition[0] += element.offset[0];
    gizmoPosition[1] += element.offset[1];
    gizmoPosition[2] += element.offset[2];
    return gizmoPosition;
  }

  /**
   * Called by SectionPlanesPlugin to assign this Control to a SectionPlane.
   * SectionPlanesPlugin keeps SectionPlaneControls in a reuse pool.
   * Call with a null or undefined value to disconnect the Control ffrom whatever SectionPlane it was assigned to.
   * @private
   */
  _setSectionPlane(sectionPlane) {
    this._unbindSectionPlane();
    if (sectionPlane) {
      this.__setSectionPlane(sectionPlane);
    }
  }
  /**
   * Called by SectionPlanesPlugin to assign this Control to a SectionPlane.
   * SectionPlanesPlugin keeps SectionPlaneControls in a reuse pool.
   * Call with a null or undefined value to disconnect the Control ffrom whatever SectionPlane it was assigned to.
   * @private
   */
  _setElement(element) {
    this._unbindElement();
    if (element) {
      this.__setElement(element);
    }
  }

  /**
   * Gets the {@link SectionPlane} controlled by this Control.
   * @returns {SectionPlane} The SectionPlane.
   */
  get element() {
    return this._element;
  }

  /**
   * Sets if this Control is visible.
   *
   * @type {Boolean}
   */
  setVisible(visible = true) {
    if (this._visible !== visible) {
      this._visible = visible;
      this._displayMeshes.forEach(m => m.visible = visible);
    }
  }

  /**
   * Gets if this Control is visible.
   *
   * @type {Boolean}
   */
  getVisible() {
    return this._visible;
  }

  /**
   * Sets if this Control is culled. This is called by SectionPlanesPlugin to
   * temporarily hide the Control while a snapshot is being taken by Viewer#getSnapshot().
   * @param culled
   */
  setCulled(culled) {
    this._displayMeshes.forEach(m => m.culled = culled);
  }
}

export { MovementControl };
