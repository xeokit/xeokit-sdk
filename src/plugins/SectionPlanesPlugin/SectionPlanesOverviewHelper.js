import {math} from "../../viewer/scene/math/math.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";



/**
 * Represents a SectionPlane within the overview canvas of a SectionPlanesPlugin.
 * @private
 */
class SectionPlanesOverviewHelper {

    /** @private */
    constructor(overviewScene, sectionPlane) {

        this.id = sectionPlane.id;

        this.sectionPlane = sectionPlane;

        this.mesh = new Mesh(overviewScene, {
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
                backfaces: true
            }),
            scale: [3, 3, 3],
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            opacity: 0.3,
            edges: true
        });

        {
          //  const origin = math.vec3([0, 0, 0]);
            const vec = math.vec3([0, 0, 0]);
            const pos2 = math.vec3();
            const zeroVec = new Float32Array([0, 0, 1]);
            const quat = new Float32Array(4);

            const update = () => {

                const origin = this.sectionPlane.scene.center;

                const negDir = [-this.sectionPlane.dir[0], -this.sectionPlane.dir[1], -this.sectionPlane.dir[2]];
                math.subVec3(origin, this.sectionPlane.pos, vec);
                const dist = -math.dotVec3(negDir, vec);

                math.normalizeVec3(negDir);
                math.mulVec3Scalar(negDir, dist, pos2);
                this.mesh.quaternion = math.vec3PairToQuaternion(zeroVec, this.sectionPlane.dir, quat);
                this.mesh.position = [pos2[0]*0.1, pos2[1]*0.1, pos2[2]*0.1, ];
            };

            this._onSectionPlanePos = this.sectionPlane.on("pos", update);
            this._onSectionPlaneDir = this.sectionPlane.on("dir", update);
        }
    }

    /** @private */
    setHighlighted(highlighted) {
        this.mesh.material.emissive = highlighted ? [0, 1, 0] : [1, 1, 1];
    }

    /** @private */
    destroy() {
        this.sectionPlane.off(this._onSectionPlanePos);
        this.sectionPlane.off(this._onSectionPlaneDir);
        this.mesh.destroy();
    }
}

export {SectionPlanesOverviewHelper};
