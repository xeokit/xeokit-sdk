import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {GLTFBigModel} from "../../../xeogl/GLTFBigModel/GLTFBigModel.js";

/**
 Viewer plugin that loads glTF models into the viewer.

 @class ClipsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer.
 */
class GLTFBigModelsPlugin extends ModelsPlugin {

    constructor(viewer, cfg) {
        super("GLTFBigModels", viewer, GLTFBigModel, cfg);
    }

    /**
     Loads a glTF model from the file system into the viewer.

     @param params {*} Configs
     @param [params.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}},
     generated automatically when omitted.
     @param [params.entityType] {String} Optional entity classification when using within a semantic data model. See the {{#crossLink "Object"}}{{/crossLink}} documentation for usage.
     @param [params.meta] {String:Object} Optional map of user-defined metadata to attach to this GLTFModel.
     @param [params.parent] The parent Object.
     @param [params.visible=true] {Boolean}  Indicates if this GLTFModel is visible.
     @param [params.culled=false] {Boolean}  Indicates if this GLTFModel is culled from view.
     @param [params.pickable=true] {Boolean}  Indicates if this GLTFModel is pickable.
     @param [params.clippable=true] {Boolean} Indicates if this GLTFModel is clippable.
     @param [params.outlined=false] {Boolean} Whether an outline is rendered around this GLTFModel.
     @param [params.ghosted=false] {Boolean} Whether this GLTFModel is rendered ghosted.
     @param [params.highlighted=false] {Boolean} Whether this GLTFModel is rendered highlighted.
     @param [params.selected=false] {Boolean} Whether this GLTFModel is rendered selected.
     @param [params.edges=false] {Boolean} Whether this GLTFModel is rendered with edges emphasized.
     @param [params.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
     @param [params.opacity=1.0] {Number} Opacity factor, multiplies by the rendered fragment alpha.
     @param [params.position=[0,0,0]] {Float32Array} The GLTFModel's local 3D position.
     @param [params.scale=[1,1,1]] {Float32Array} The GLTFModel's local scale.
     @param [params.rotation=[0,0,0]] {Float32Array} The GLTFModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     @param [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} GLTFThe Model's local modelling transform matrix. Overrides the position, scale and rotation parameters.
     @param [params.src] {String} Path to a glTF file. You can set this to a new file path at any time, which will cause the
     @param [params.lambertMaterials=false] {Boolean} When true, gives each {{#crossLink "Mesh"}}{{/crossLink}} the same {{#crossLink "LambertMaterial"}}{{/crossLink}} and a {{#crossLink "Mesh/colorize:property"}}{{/crossLink}} value set the to diffuse color extracted from the glTF material. This is typically used for CAD models with huge amounts of objects, and will ignore textures.
     @param [params.quantizeGeometry=true] {Boolean} When true, quantizes geometry to reduce memory and GPU bus usage.
     @param [params.combineGeometry=true] {Boolean} When true, combines geometry vertex buffers to improve rendering performance.
     @param [params.backfaces=false] {Boolean} When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     @param [params.edgeThreshold=20] {Number} When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     @param [params.handleNode] {Function} Optional callback to mask which {{#crossLink "Object"}}Objects{{/crossLink}} are loaded. Each Object will only be loaded when this callback returns ````true``` for its ID.
     */
    load(params) {
        if (!params.id) {
            this.error("load() param expected: id");
            return;
        }
        if (this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + id);
            return;
        }
        var model = new GLTFBigModel(this.viewer.scene, params);
        return model; // TODO: register loading params within this plugin for inclusion in bookmarks
    }
}

export {GLTFBigModelsPlugin}
