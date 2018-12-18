/**
 A **Group** is an {@link Object} that groups other Objects.

 Group is subclassed by (at least) {@link Model}, which is the abstract base class for {@link GLTFModel}, {@link STLModel} etc.

 See {@link Object} for overall usage info.

 @class Group
 @module xeokit
 @submodule objects
 @constructor
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata.
 @param [cfg.entityType] {String} Optional entity classification when using within a semantic data model. See the {@link Object} documentation for usage.
 @param [cfg.parent] {Object} The parent.
 @param [cfg.position=[0,0,0]] {Float32Array} Local 3D position.
 @param [cfg.scale=[1,1,1]] {Float32Array} Local scale.
 @param [cfg.rotation=[0,0,0]] {Float32Array} Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
 @param [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} Local modelling transform matrix. Overrides the position, scale and rotation parameters.
 @param [cfg.visible=true] {Boolean}        Indicates if visible.
 @param [cfg.culled=false] {Boolean}        Indicates if culled from view.
 @param [cfg.pickable=true] {Boolean}       Indicates if pickable.
 @param [cfg.clippable=true] {Boolean}      Indicates if clippable.
 @param [cfg.collidable=true] {Boolean}     Indicates if included in boundary calculations.
 @param [cfg.castShadow=true] {Boolean}     Indicates if casting shadows.
 @param [cfg.receiveShadow=true] {Boolean}  Indicates if receiving shadows.
 @param [cfg.outlined=false] {Boolean}      Indicates if outline is rendered.
 @param [cfg.ghosted=false] {Boolean}       Indicates if rendered as ghosted.
 @param [cfg.highlighted=false] {Boolean}   Indicates if rendered as highlighted.
 @param [cfg.selected=false] {Boolean}      Indicates if rendered as selected.
 @param [cfg.edges=false] {Boolean}         Indicates if edges are emphasized.
 @param [cfg.aabbVisible=false] {Boolean}   Indicates if axis-aligned World-space bounding box is visible.
 @param [cfg.obbVisible=false] {Boolean}    Indicates if oriented World-space bounding box is visible.
 @param [cfg.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
 @param [cfg.opacity=1.0] {Number} Opacity factor, multiplies by the rendered fragment alpha.
 @param [cfg.children] {Array(Object)}      Children to add. Children must be in the same {@link Scene} and will be removed from whatever parents they may already have.
 @param [cfg.inheritStates=true] {Boolean}  Indicates if children given to this constructor should inherit state from this parent as they are added. RenderState includes {@link Object/visible}, {@link Object/culled}, {@link Object/pickable},
 {@link Object/clippable}, {@link Object/castShadow}, {@link Object/receiveShadow},
 {@link Object/outlined}, {@link Object/ghosted}, {@link Object/highlighted},
 {@link Object/selected}, {@link Object/colorize} and {@link Object/opacity}.
 @extends Object
 */
import {Object3D} from "./Object3D.js";

class Group extends Object3D {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Group";
    }

    /**
     * @private
     */
    get isGroup() {
        return true;
    }

    init(cfg) {
        super.init(cfg);
    }
}

export {Group};