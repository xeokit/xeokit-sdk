import { XKTLoaderPlugin } from "../XKTLoaderPlugin/XKTLoaderPlugin.js";
import { Plugin } from "../../viewer/Plugin.js";

import Tileset from "./Tileset.js";

/**
 * A function used to compute tile view distance.
 *
 * @param { TSL.Tile } tile
 * @returns { number }
 */
function defaultComputeViewDistance(tile) {
  return (
    tile.tileset.viewDistance *
    Math.cbrt(tile.volume / tile.tileset.root.volume)
  );
}

/**
 * A function used to compute tile priority.
 *
 * @param { TSL.Tile } tile
 * @returns { number }
 */
function defaultComputePriority(tile) {
  return tile.depth;
}

/**
 * Plugin that loads [3D Tiles](https://cesium.com/why-cesium/3d-tiles/).
 *
 * WARNING: Only xkt files as Tile data are supported.
 *
 * ## Summary
 *
 * A Tileset is created from the tileset.json file.
 * The Tileset root Tile is always visible.
 * The Tileset display is done in two steps:
 * - the visibility of the Tile tree is updated (tile.visible & tile.priority) ==> tileset.updateVisibility()
 * - the visible tiles are loaded according to their priority (lower priority first) ==> tileset.render()
 *
 * The Tile loading process is done in two steps:
 * - the data is fetched
 * - the data is loaded using the xkt loader
 *
 * As they are asynchrones, Tile visibility is checked between the loading steps to prevent loading a Tile marked as not visible.
 *
 * ## Usage
 *
 * ```javascript
 * const tilesetLoaderPlugin = new xeokitSdk.TilesetLoaderPlugin(viewer);
 *
 * const tileset = this.tilesetLoaderPlugin.load(jsonTileset);
 * 
 * tileset.viewDistance = 30; // Can be dynamically updated
 *
 * // then
 * tileset.destroy();
 * ```
 *
 * It is possible to change the behaviour of this plugin using the two configuration functions `computeViewDistance`& `computePriority`.
 * 
 * @class TilesetLoaderPlugin
 */
class TilesetLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param { Viewer } viewer The Viewer.
   * @param { Object } cfg Plugin configuration.
   * @param { (tile: TSL.Tile) => number } [cfg.computeViewDistance] A function used to compute tile view distance.
   * @param { (tile: TSL.Tile) => number } [cfg.computePriority] A function used to compute tile priority.
   * @param { number } [cfg.viewDistance=100] The distance from the camera used to compute the tiles visibility.
   * @param { number } [cfg.distanceFactorToFreeData=3] The distance from the camera used to free tiles data.
   * 
   * @returns { TSL.TilesetLoaderPlugin }
   */
  constructor(viewer, cfg = {}) {
    super("TilesetLoader", viewer);

    const {
      computeViewDistance = defaultComputeViewDistance,
      computePriority = defaultComputePriority,
      viewDistance = 100,
      distanceFactorToFreeData = 3,
    } = cfg;

    this.cfg = {
      computeViewDistance,
      computePriority,
      distanceFactorToFreeData,
      viewDistance,
    };

    this.tilesets = new Set();

    viewer.camera.on("matrix", this._updateTilesetsVisibility = () => this.updateTilesetsVisibility());

    viewer.scene.on("tick", this._renderTilesets = () => this.renderTilesets());

    this.loader = new XKTLoaderPlugin(viewer);
  }

  /**
   * @returns { TSL.Tileset }
   */
  load(tilesetData) {
    const tileset = new Tileset(this, tilesetData);
    this.tilesets.add(tileset);

    return tileset;
  }

  updateTilesetsVisibility() {
    this.tilesets.forEach(tileset => tileset.updateVisibility());
  }

  renderTilesets() {
    this.tilesets.forEach(tileset => tileset.render());
  }

  /**
   * Destroys this TilesetLoaderPlugin.
   */
  destroy() {
    this.viewer.camera.off(this._updateTilesetsVisibility);

    this.viewer.scene.off(this._renderTilesets);

    this.tilesets.forEach(tileset => tileset.destroy());

    super.destroy();
  }
}

export { TilesetLoaderPlugin };
