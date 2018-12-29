
import {utils} from '../utils.js';
import {core} from '../core.js';
import {Geometry} from './Geometry.js';

/**
 * @desc Defines the shape of one of more {@link #Mesh}es to visualize the extents of an object-aligned bounding box (OBB).
 *
 * * A xeokit OBB is given as a 32-element array containing the homogeneous coordinates for the eight corner vertices, ie. each having elements [x,y,z,w].
 * * Set {@link OBBGeometry#targetOBB} to an OBB or set {@link OBBGeometry#target} to a {@link Geometry}.
 *
 * ## Usage
 *
 * ````javascript
 * // Create a Mesh with a TorusGeometry
 * var mesh = new Mesh(myViewer.scene, {
 *      geometry: new TorusGeometry(myViewer.scene, )
 * });
 *
 * // Create a second Mesh with an OBBGeometry that shows a wireframe box for the OBB of the first Mesh's TorusGeometry
 * var boundaryHelper = new Mesh(myViewer.scene, {
 *      geometry: new OBBGeometry(myViewer.scene, {
 *          target: mesh.geometry
 *      }),
 *      material: new PhongMaterial(myViewer.scene, {
 *          diffuse: [0.5, 1.0, 0.5],
 *          emissive: [0.5, 1.0, 0.5],
 *          lineWidth:2
 *      })
 * });
 * ````
 *
 * We can also directly configure the OBBGeometry with the {@link Geometry#obb}:
 *
 * ````javascript
 * var boundaryHelper2 = new Mesh(myViewer.scene, {
 *
 *      geometry: new OBBGeometry(myViewer.scene, {
 *          targetOBB: mesh.obb
 *      }),
 *
 *      material: new xeokit.PhongMaterial(myViewer.scene, {
 *          diffuse: [0.5, 1.0, 0.5],
 *          emissive: [0.5, 1.0, 0.5],
 *          lineWidth:2
 *      })
 * });
 * ````
*/
class OBBGeometry extends Geometry {

    /**
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] Configs
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene},
     generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this OBBGeometry.
     @param [cfg.target] {Component} ID or instance of a {@link Component} whose OBB we'll show.
     @param [cfg.targetOBB] {Float32Array} An mesh-oriented box (OBB) in a 32-element Float32Array
     containing homogeneous coordinates for the eight corner vertices, ie. each having elements (x,y,z,w).
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg={}) {
        super(owner, utils.apply(cfg, {
            combineGeometry: true,
            compressGeometry: false, // Quantized geometry is immutable
            primitive: cfg.primitive || "lines",
            positions: cfg.positions || [1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
                1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0],
            indices: [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
        }));
        if (cfg.target) {
            this.target = cfg.target;
        } else if (cfg.targetOBB) {
            this.targetOBB = cfg.targetOBB;
        }
    }

    /**
     A component whose OBB we'll dynamically fit this AABBGeometry to.

     This property effectively replaces the {@link OBBGeometry#targetOBB} property.

     @property target
     @type Component
     */
    set target(value) {
        let geometryDirty = false;
        const self = this;
        this._attach({
            name: "target",
            type: "Component",
            component: value,
            sceneDefault: false,
            on: {
                boundary: function () {
                    if (geometryDirty) {
                        return;
                    }
                    geometryDirty = true;
                    core.scheduleTask(function () {
                        self._setPositionsFromOBB(self._attached.target.obb);
                        geometryDirty = false;
                    });
                }
            },
            onAttached: function () {
                self._setPositionsFromOBB(self._attached.target.obb);
            }
        });
    }

    get target() {
        return this._attached.target;
    }

    /**
     Sets this OBBGeometry to an mesh-oriented bounding box (OBB), given as a 32-element Float32Array
     containing homogeneous coordinates for the eight corner vertices, ie. each having elements [x,y,z,w].

     This property effectively replaces the {@link OBBGeometry#boundary} property, causing it to become null.

     @property targetOBB
     @type Float32Array
     */
    set targetOBB(value) {
        if (!value) {
            return;
        }
        if (this._attached.target) {
            this.target = null;
        }
        this._setPositionsFromOBB(value);
    }

    _setPositionsFromOBB(obb) {
        this.positions = [
            obb[0], obb[1], obb[2],
            obb[4], obb[5], obb[6],
            obb[8], obb[9], obb[10],
            obb[12], obb[13], obb[14],
            obb[16], obb[17], obb[18],
            obb[20], obb[21], obb[22],
            obb[24], obb[25], obb[26],
            obb[28], obb[29], obb[30]
        ];
    }
}

export {OBBGeometry};
