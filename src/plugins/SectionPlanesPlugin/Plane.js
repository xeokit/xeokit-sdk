import {math} from "../../viewer/scene/math/math.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";


/**
 * Renders a 3D plane within a {@link Overview} to indicate its {@link SectionPlane}'s current position and orientation.
 *
 * @private
 */
class Plane {

    /** @private */
    constructor(overview, overviewScene, sectionPlane) {

        /**
         * The ID of this SectionPlanesOverviewPlane.
         *
         * @type {String}
         */
        this.id = sectionPlane.id;

        /**
         * The {@link SectionPlane} represented by this SectionPlanesOverviewPlane.
         *
         * @type {SectionPlane}
         */
        this._sectionPlane = sectionPlane;

        this._mesh = new Mesh(overviewScene, {
            id: sectionPlane.id,
            geometry: new ReadableGeometry(overviewScene, {
                primitive: "triangles",
                positions: [
                    0.5, 0.5, 0.0, 0.5, -0.5, 0.0, // 0
                    -0.5, -0.5, 0.0, -0.5, 0.5, 0.0, // 1
                    0.5, 0.5, -0.0, 0.5, -0.5, -0.0, // 2
                    -0.5, -0.5, -0.0, -0.5, 0.5, -0.0 // 3
                ],
                indices: [0, 1, 2, 2, 3, 0]
            }),
            material: new PhongMaterial(overviewScene, {
                emissive: [1, 1, 1],
                diffuse: [0,0,0],
                backfaces: true
            }),
            scale: [3, 3, 3],
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            opacity: 0.3,
            edges: true
        });

        {
            const vec = math.vec3([0, 0, 0]);
            const pos2 = math.vec3();
            const zeroVec = new Float32Array([0, 0, 1]);
            const quat = new Float32Array(4);

            const update = () => {

                const origin = this._sectionPlane.scene.center;

                const negDir = [-this._sectionPlane.dir[0], -this._sectionPlane.dir[1], -this._sectionPlane.dir[2]];
                math.subVec3(origin, this._sectionPlane.pos, vec);
                const dist = -math.dotVec3(negDir, vec);

                math.normalizeVec3(negDir);
                math.mulVec3Scalar(negDir, dist, pos2);
                this._mesh.quaternion = math.vec3PairToQuaternion(zeroVec, this._sectionPlane.dir, quat);
                this._mesh.position = [pos2[0] * 0.1, pos2[1] * 0.1, pos2[2] * 0.1,];
            };

            this._onSectionPlanePos = this._sectionPlane.on("pos", update);
            this._onSectionPlaneDir = this._sectionPlane.on("dir", update);

            // update();
        }

        this._highlighted = false;
        this._selected = false;
    }

    /**
     * Sets if this SectionPlanesOverviewPlane is highlighted.
     *
     * @type {Boolean}
     * @private
     */
    setHighlighted(highlighted) {
        this._highlighted = !!highlighted;
        this._mesh.material.emissive = this._selected ? [0,1,0] : (this._highlighted ? [1, 0, 0] : [1, 1, 1]);
    }

    /**
     * Gets if this SectionPlanesOverviewPlane is highlighted.
     *
     * @type {Boolean}
     * @private
     */
    getHighlighted() {
        return this._highlighted;
    }

    /**
     * Sets if this SectionPlanesOverviewPlane is selected.
     *
     * @type {Boolean}
     * @private
     */
    setSelected(selected) {
        this._selected = !!selected;
        this._mesh.material.emissive = this._selected ? [0,1,0] : (this._highlighted ? [1, 0, 0] : [1, 1, 1]);
    }

    /**
     * Gets if this SectionPlanesOverviewPlane is selected.
     *
     * @type {Boolean}
     * @private
     */
    getSelected() {
        return this._selected;
    }

    /** @private */
    destroy() {
        this._sectionPlane.off(this._onSectionPlanePos);
        this._sectionPlane.off(this._onSectionPlaneDir);
        this._mesh.destroy();
    }
}

export {Plane};
