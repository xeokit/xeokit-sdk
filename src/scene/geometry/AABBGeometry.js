import {utils} from '../utils.js';
import {core} from '../core.js';
import {Geometry} from './Geometry.js';

/**
 * @desc Defines the shape of one or more {@link Mesh}es to visualize the extents of a World-space axis-aligned bounding box (AABB).
 *
 * * A xeokit AABB indicates the min/max extents of an axis-aligned World-space volume as an array: ````[xmin,ymin,zmin,xmax,ymax,zmax]````.
 * * Set {@link AABBGeometry#targetAABB} to an AABB to fix it to those extents
 * * Set {@link AABBGeometry#target} to a {@link Node} or {@link Mesh} to dynamically fit it to the AABB of that component.
 *
 * ## Usage
 *
 * ````javascript
 * // First Mesh with a TorusGeometry
 * var mesh = new Mesh(myViewer.scene,{
 *      geometry: new xeokit.TorusGeometry(myViewer.scene)
 * });
 *
 * // Second Mesh with an AABBGeometry that shows a wireframe box
 * // for the World-space axis-aligned boundary of the first Mesh
 * var boundaryHelper = new Mesh(myViewer.scene, {
 *      geometry: new AABBGeometry(myViewer.scene, {
 *          targetAABB: mesh.aabb
 *      }),
 *      material: new PhongMaterial(myViewer.scene, {
 *          diffuse: [0.5, 1.0, 0.5],
 *          emissive: [0.5, 1.0, 0.5],
 *          lineWidth:2
 *      })
 * });
 * ````
 *
 * Now whenever our mesh {@link Mesh} changes shape or position, our AABBGeometry will automatically
 * update to stay fitted to it.
 *
 * We could also directly configure the AABBGeometry with the {@link Mesh#aabb}:
 *
 * ````javascript
 * var boundaryHelper2 = new Mesh(myViewer.scene, {
 *      geometry: new AABBGeometry(myViewer.scene, {
 *          targetAABB: mesh.aabb
 *      }),
 *      material: new PhongMaterial(myViewer.scene, {
 *          diffuse: [0.5, 1.0, 0.5],
 *          emissive: [0.5, 1.0, 0.5],
 *          lineWidth:2
 *      })
 * });
 * ````
 */
class AABBGeometry extends Geometry {

    /**
     *
     @class AABBGeometry
     @module xeokit
     @submodule geometry
     @constructor
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] Configs
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene},
     generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this AABBGeometry.
     @param [cfg.target] {Component} ID or instance of a {@link Component} subtype whose AABB we'll show.
     @param [cfg.targetAABB] {Float32Array} An axis-aligned box (AABB) in a six-element Float32Array
     containing the min/max extents of the axis-aligned volume, ie. ````(xmin,ymin,zmin,xmax,ymax,zmax)````.
     @extends Component
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, utils.apply(cfg, {
            combineGeometry: true,
            compressGeometry: true, // Quantized geometry is immutable
            primitive: cfg.primitive || "lines",
            indices: [
                0, 1, 1, 2, 2, 3, 3, 0, 4,
                5, 5, 6, 6, 7, 7, 4, 0, 4,
                1, 5, 2, 6, 3, 7
            ],
            positions: cfg.positions || [
                1.0, 1.0, 1.0,
                1.0, -1.0, 1.0,
                -1.0, -1.0, 1.0,
                -1.0, 1.0, 1.0,
                1.0, 1.0, -1.0,
                1.0, -1.0, -1.0,
                -1.0, -1.0, -1.0,
                -1.0, 1.0, -1.0
            ]
        }));

        if (cfg.target) {
            this.target = cfg.target;

        } else if (cfg.targetAABB) {
            this.targetAABB = cfg.targetAABB;
        }
    }


    /**
     A component whose AABB we'll dynamically fit this AABBGeometry to.

     This property effectively replaces the {@link AABBGeometry#targetAABB} property.

     @property target
     @type Component
     */
    set target(target) {
        let geometryDirty = false;
        const self = this;
        this._attach({
            name: "target",
            type: "Component",
            component: target,
            sceneDefault: false,
            on: {
                boundary: function () {
                    if (geometryDirty) {
                        return;
                    }
                    geometryDirty = true;
                    core.scheduleTask(function () {
                        self._setPositionsFromAABB(self._attached.target.aabb);
                        geometryDirty = false;
                    });
                }
            },
            onAttached: function () {
                self._setPositionsFromAABB(self._attached.target.aabb);
            }
        });
    }

    get target() {
        return this._attached.target;
    }

    /**
     Sets this AABBGeometry to an axis-aligned box (AABB), given as a six-element Float32Array
     containing the min/max extents of the
     axis-aligned volume, ie. ````[xmin,ymin,zmin,xmax,ymax,zmax]````.

     This property overrides the {@link AABBGeometry#target} property, causing it to become null.

     @property targetAABB
     @type Float32Array
     */
    set targetAABB(aabb) {
        if (!aabb) {
            return;
        }
        if (this._attached.target) {
            this.target = null;
        }
        this._setPositionsFromAABB(aabb);
    }

    _setPositionsFromAABB(aabb) {
        this.positions = [
            aabb[3], aabb[4], aabb[5],
            aabb[3], aabb[1], aabb[5],
            aabb[0], aabb[1], aabb[5],
            aabb[0], aabb[4], aabb[5],
            aabb[3], aabb[4], aabb[2],
            aabb[3], aabb[1], aabb[2],
            aabb[0], aabb[1], aabb[2],
            aabb[0], aabb[4], aabb[2]
        ];
    }
}

export {AABBGeometry};
