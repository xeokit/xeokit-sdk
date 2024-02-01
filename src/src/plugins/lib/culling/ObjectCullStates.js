/**
 * For each Entity in its Scene, efficiently combines updates from multiple culling systems into a single "culled" state.
 *
 * Two culling systems are supported:
 *
 * * View culling - culls Entities when they fall outside the current view frustum, and
 * * Detail culling - momentarily culls less visually-significant Entities while we are moving the camera.
 *
 * @private
 */
class ObjectCullStates {

    /**
     * @private
     * @param scene
     */
    constructor(scene) {

        this._scene = scene;

        this._objects = []; // Array of all Entity instances that represent objects
        this._objectsViewCulled = []; // A flag for each object to indicate its view-cull status
        this._objectsDetailCulled = []; // A flag for each object to indicate its detail-cull status
        this._objectsChanged = []; // A flag for each object, set whenever its cull status has changed since last _applyChanges()
        this._objectsChangedList = []; // A list of objects whose cull status has changed, applied and cleared by _applyChanges()

        this._modelInfos = {};

        this._numObjects = 0;
        this._lenObjectsChangedList = 0;

        this._dirty = true;

        this._onModelLoaded = scene.on("modelLoaded", (modelId) => {
            const model = scene.models[modelId];
            if (model) {
                this._addModel(model);
            }
        });

        this._onTick = scene.on("tick", () => {
            if (this._dirty) {
                this._build();
            }
            this._applyChanges();
        });
    }

    _addModel(model) {
        const modelInfo = {
            model: model,
            onDestroyed: model.on("destroyed", () => {
                this._removeModel(model);
            })
        };
        this._modelInfos[model.id] = modelInfo;
        this._dirty = true;
    }

    _removeModel(model) {
        const modelInfo = this._modelInfos[model.id];
        if (modelInfo) {
            modelInfo.model.off(modelInfo.onDestroyed);
            delete this._modelInfos[model.id];
            this._dirty = true;
        }
    }

    _build() {
        if (!this._dirty) {
            return;
        }
        this._applyChanges();
        const objects = this._scene.objects;
        for (let i = 0; i < this._numObjects; i++) {
            this._objects[i] = null;
        }
        this._numObjects = 0;
        for (let objectId in objects) {
            const entity = objects[objectId];
            this._objects[this._numObjects++] = entity;
        }
        this._lenObjectsChangedList = 0;
        this._dirty = false;
    }

    _applyChanges() {
        if (this._lenObjectsChangedList > 0) {
            for (let i = 0; i < this._lenObjectsChangedList; i++) {
                const objectIdx = this._objectsChangedList[i];
                const object = this._objects[objectIdx];
                const viewCulled = this._objectsViewCulled[objectIdx];
                const detailCulled = this._objectsDetailCulled[objectIdx];
                const culled = (viewCulled || detailCulled);
                object.culled = culled;
                this._objectsChanged[objectIdx] = false;
            }
            this._lenObjectsChangedList = 0;
        }
    }

    /**
     * Array of {@link Entity} instances that represent objects in the {@link Scene}.
     *
     * ObjectCullStates rebuilds this from {@link Scene#objects} whenever ````Scene```` fires a ````modelLoaded```` event.
     *
     * @returns {Entity[]}
     */
    get objects() {
        if (this._dirty) {
            this._build();
        }
        return this._objects;
    }

    /**
     * Number of objects in {@link ObjectCullStates#objects},
     *
     * Updated whenever ````Scene```` fires a ````modelLoaded```` event.
     *
     * @returns {Number}
     */
    get numObjects() {
        if (this._dirty) {
            this._build();
        }
        return this._numObjects;
    }

    /**
     * Updates an object's view-cull status.
     *
     * @param {Number} objectIdx Index of the object in {@link ObjectCullStates#objects}
     * @param {boolean} culled Whether to view-cull or not.
     */
    setObjectViewCulled(objectIdx, culled) {
        if (this._dirty) {
            this._build();
        }
        if (this._objectsViewCulled[objectIdx] === culled) {
            return;
        }
        this._objectsViewCulled[objectIdx] = culled;
        if (!this._objectsChanged[objectIdx]) {
            this._objectsChanged[objectIdx] = true;
            this._objectsChangedList[this._lenObjectsChangedList++] = objectIdx;
        }
    }

    /**
     * Updates an object's detail-cull status.
     *
     * @param {Number} objectIdx Index of the object in {@link ObjectCullStates#objects}
     * @param {boolean} culled Whether to detail-cull or not.
     */
    setObjectDetailCulled(objectIdx, culled) {
        if (this._dirty) {
            this._build();
        }
        if (this._objectsDetailCulled[objectIdx] === culled) {
            return;
        }
        this._objectsDetailCulled[objectIdx] = culled;
        if (!this._objectsChanged[objectIdx]) {
            this._objectsChanged[objectIdx] = true;
            this._objectsChangedList[this._lenObjectsChangedList++] = objectIdx;
        }
    }

    /**
     * Destroys this ObjectCullStAtes.
     */
    _destroy() {
        this._clear();
        this._scene.off(this._onModelLoaded);
        this._scene.off(this._onTick);
    }

    _clear() {
        for (let modelId in this._modelInfos) {
            const modelInfo = this._modelInfos[modelId];
            modelInfo.model.off(modelInfo.onDestroyed);
        }
        this._modelInfos = {};
        this._dirty = true;
    }
}

const sceneObjectCullStates = {};

/**
 * @private
 */
function getObjectCullStates(scene) {
    const sceneId = scene.id;
    let objectCullStates = sceneObjectCullStates[sceneId];
    if (!objectCullStates) {
        objectCullStates = new ObjectCullStates(scene);
        sceneObjectCullStates[sceneId] = objectCullStates;
        scene.on("destroyed", () => {
            delete sceneObjectCullStates[sceneId];
            objectCullStates._destroy();
        });
    }
    return objectCullStates;
}

export {getObjectCullStates};