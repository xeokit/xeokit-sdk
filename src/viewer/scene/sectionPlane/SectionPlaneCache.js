import {Component} from '../Component.js';
import {math} from "../math/math.js";
import {SectionPlane} from "./SectionPlane";

const tempVec3a = math.vec3();

/**
 *  @desc A set of arbitrarily-aligned World-space clipping planes.

 */
export class SectionPlaneCache extends Component {

    constructor(owner, cfg = {}) {
        super(owner, cfg);

        this._sectionPlanesMap = {};
        this._sectionPlanesState = {};

        if (cfg.size) {
            for (let i = 0, len = cfg.size; i < len; i++) {
                const sectionPlane = new SectionPlane(this.viewer.scene, {
                    id: math.createUUID(),
                    pos: [0, 0, 0],
                    dir: [0, -1, 0],
                    active: false
                });
                this._sectionPlanesMap[sectionPlane.id] = sectionPlane;
                this._sectionPlanesState[sectionPlane.id] = {
                    sectionPlane: sectionPlane,
                    used: false
                };
            }
        }
    }

    getSectionPlane(params = {}) {
        for (let id in this._sectionPlanesState) {
            const state = this._sectionPlanesState[id];
            if (!state.used) {
                state.used = true;
                const sectionPlane = state.sectionPlane;
                sectionPlane.active = true;
                sectionPlane.pos = params.pos;
                sectionPlane.dir = params.dir;
                return sectionPlane;
            }
        }
        const sectionPlane = new SectionPlane(this.viewer.scene, {
            id: params.id, // Optional
            pos: params.pos,
            dir: params.dir,
            active: true
        });
        this._sectionPlanesState[sectionPlane.id] = {
            sectionPlane: sectionPlane,
            used: true
        };
        return sectionPlane;
    }

    putSectionPlane(sectionPlane) {
        let state = this._sectionPlanesState[sectionPlane.id];
        sectionPlane.active = false;
        if (state) {
            state.used = false;
            return;
        }
        this._sectionPlanesState[sectionPlane.id] = {
            sectionPlane: sectionPlane,
            used: false
        };
    }

    putAllSectionPlanes() {
        for (let id in this._sectionPlanesState) {
            const state = this._sectionPlanesState[id];
            state.used = false;
            state.sectionPlane.active = false;
        }
    }

    getSectionPlanesInUse() {
        const sectionPlanes = [];
        for (let id in this._sectionPlanesState) {
            const state = this._sectionPlanesState[id];
            if (state.used) {
                sectionPlanes.push(state.sectionPlane);
            }
        }
        return sectionPlanes;
    }

    /**
     * @destroy
     */
    destroy() {
        this.scene._sectionPlaneDestroyed(this);
        super.destroy();
    }
}

