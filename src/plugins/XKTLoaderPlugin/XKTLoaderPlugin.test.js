/* eslint-disable no-undef */

import { MetaScene } from "../../viewer/metadata/MetaScene";
import { Scene } from "../../viewer/scene/scene/Scene";

beforeEach(()=>{
  // hacking way of setting ANGLE_instanced_arrays to true
  const WEBGL_INFO = require("../../viewer/scene/webglInfo").WEBGL_INFO;
  WEBGL_INFO.SUPPORTED_EXTENSIONS.ANGLE_instanced_arrays = true;
  
})
test("test xkt loading", () => {
  // defer the loading here, so that ANGLE_instanced_arrays can be set to true;
  const XKTLoaderPlugin = require("./XKTLoaderPlugin").XKTLoaderPlugin;

  const canvas = document.createElement("canvas");
  const div = document.createElement("div");
  div.appendChild(canvas);

  const viewer = {
    addPlugin: () => {},
  };

  const scene = new Scene(viewer, {
    canvasElement: canvas,
  });
  viewer.scene = scene;
  viewer.metaScene = new MetaScene(viewer, scene);


  const xktLoader2 = new XKTLoaderPlugin(viewer, {});

  const model1 = xktLoader2.load({
    id: "myModel1",
    src: "local://assets/models/xkt/v9/ifc/rac_advanced_sample_project.ifc.xkt",
  });

  expect(model1.numTriangles).toBe(410206);

});
