import {Component} from "../../Component.js";
import {utils} from "../../utils.js";
import {parseSplat} from "./parseSplat.js";
import {packSplats} from "./packSplats.js";
import {GaussianSplatTechnique} from "./GaussianSplatTechnique.js";

/**
 * Dirty-PoC loader for compact `.splat` 3D-Gaussian-Splatting files.
 *
 * A bare {@link Component} (not a Plugin): fetch -> parse -> pack -> register a
 * {@link GaussianSplatTechnique} as a transparent drawable on the Scene's
 * Renderer. Rendering only - no SceneModel, no metadata, no picking.
 *
 * ```js
 * const loader = new GaussianSplatLoader(viewer.scene);
 * loader.load({ src: "scene.splat", id: "mySplats" });
 * ```
 *
 * @private
 */
class GaussianSplatLoader extends Component {

    /**
     * @param {Component|Scene} owner Owner (typically `viewer.scene`).
     * @param {*} [cfg]
     */
    constructor(owner, cfg = {}) {
        super(owner, cfg);
        this._techniques = {};
    }

    /**
     * Loads a `.splat` file and shows it on the scene.
     *
     * @param {Object} params
     * @param {string} params.src `.splat` URL (an `http(s):`, `blob:` or `data:` URL).
     * @param {string} [params.id="splats"] drawable id (reloading the same id replaces it).
     * @param {ArrayLike<number>} [params.worldMatrix] column-major Mat4 baked into the
     *        splats at pack time - use it to correct the source frame (e.g. Y-down .splat
     *        into the viewer's Y-up world). Omit to load as-authored.
     * @param {function(GaussianSplatTechnique):void} [params.loaded] called once the
     *        splats are on-screen; receives the technique (has `.aabb` for camera framing).
     * @param {function(*):void} [params.error] called on failure.
     * @returns {this}
     */
    load({src, id = "splats", worldMatrix = null, loaded, error}) {
        utils.loadArraybuffer(src, (buf) => {
            try {
                const {count, positions, scales, colors, rotations} = parseSplat(buf);

                // parseSplat yields file-order (w, x, y, z); covariance wants (x, y, z, w).
                const rotXYZW = new Float32Array(rotations.length);
                for (let i = 0; i < rotations.length; i += 4) {
                    rotXYZW[i]     = rotations[i + 1]; // x
                    rotXYZW[i + 1] = rotations[i + 2]; // y
                    rotXYZW[i + 2] = rotations[i + 3]; // z
                    rotXYZW[i + 3] = rotations[i];     // w
                }

                const packed = packSplats({positions, scales, colors, rotations: rotXYZW}, worldMatrix);
                const tech = new GaussianSplatTechnique(this.scene.canvas.gl, packed, count);

                if (this._techniques[id]) {
                    this._renderer.removeDrawable(id);
                    this._techniques[id].destroy();
                }
                this._renderer.addDrawable(id, tech);
                this._techniques[id] = tech;
                this.scene.glRedraw();
                this.log(`[GaussianSplatLoader] loaded ${count} splats ("${id}")`);
                loaded && loaded(tech);
            } catch (e) {
                this.error("[GaussianSplatLoader] " + (e && e.message ? e.message : e));
                error && error(e);
            }
        }, (err) => {
            this.error("[GaussianSplatLoader] " + err);
            error && error(err);
        });
        return this;
    }

    destroy() {
        for (const id in this._techniques) {
            this._renderer.removeDrawable(id);
            this._techniques[id].destroy();
        }
        this._techniques = {};
        super.destroy();
    }
}

export {GaussianSplatLoader};
