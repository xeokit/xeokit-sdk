import "./lodash.js";
import "./inspire-tree.min.js";

class MetaSceneTreeView {

    constructor(viewer, cfg) {

        if (!cfg.domElementId) {
            throw "Config expected: domElementId";
        }

        this._domElement = document.getElementById(cfg.domElementId);

        if (!this._domElement) {
            throw "Document element not found: '" + cfg.domElementId + "'";
        }

        this.viewer = viewer;

        this._onLoaded = this.viewer.metaScene.on("metaModelCreated", id => {
            if (this.viewer.metaScene.metaModels[id]) {
                this._build();
            }
        });

        this._onUnloaded = this.viewer.metaScene.on("metaModelDestroyed", id => { // TODO: How to only rebuild when structure deleted?
            this._build();
        });
    }

    /**
     * @private
     */
    _build() {
        var metaModels = this.viewer.metaScene.metaModels;
        for (var id in metaModels) { // TODO: Blow away old HTMl elements
            if (metaModels.hasOwnProperty(id)) {
                const metaModel = metaModels[id];
                // var div = document.createElement("div");
                // div.className = "item";
                // if (metaModel) {
                //     const rootMetaObject = metaModel.rootMetaObject;
                //     this._build2(id, div, rootMetaObject);
                // }
                // this._domElement.appendChild(div);
            }
        }
    }

}

export {MetaSceneTreeView}
