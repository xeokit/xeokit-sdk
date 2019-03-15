import {mockData} from "./mockData.js";

class MockServer {

    constructor() {
        this._onResponse = null;
    }

    setOnResponse(onResponse) {
        this._onResponse = onResponse;
    }

    send(message) {
        this._processRequest(message);
    }

    _processRequest(message) {
        switch (message.message) {
            case "getModels":
                const modelIds = message.modelIds;
                if (!modelIds) {
                    throw "getModels; param expected: modelIds";
                }
            const models = [];
                for (let i = 0, len = modelIds; i < len; i++) {
                    const modelId = modelIds[i];
                    const model = mockData.models[modelId];
                    if (!model) {
                        this._sendResponse({"error": "model not found: " + modelId});
                        return;
                    }
                    models.push(model);
                }
                this._sendResponse({"message": "models", "models": models});
                break;

            case "getObjects":
                const objectIds = message.objectIds;
                if (!objectIds) {
                    throw "getModels; param expected: objectIds";
                }
                const objects = [];
                for (let i = 0, len = objectIds; i < len; i++) {
                    const objectId = objectIds[i];
                    const object = mockData.objects[objectId];
                    if (!object) {
                        this._sendResponse({"error": "object not found: " + objectId});
                        return;
                    }
                    objects.push(object);
                }
                this._sendResponse({"message": "objects", "objects": objects});
                break;

            case "getGeometries":
                const geometryIds = message.geometryIds;
                if (!geometryIds) {
                    throw "getModels; param expected: geometryIds";
                }
                const geometries = [];
                for (let i = 0, len = geometryIds; i < len; i++) {
                    const geometryId = geometryIds[i];
                    const geometry = mockData.geometries[geometryId];
                    if (!geometry) {
                        this._sendResponse({"error": "geometry not found: " + geometryId});
                        return;
                    }
                    geometries.push(geometry);
                }
                this._sendResponse({"message": "geometries", "geometries": geometries});
                break;
        }
    }

    _sendResponse(message) {
        if (this._onResponse) {
            this._onResponse(message);
        }
    }
}

export {MockServer};