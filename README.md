# xeokit-sdk

The **xeokit-sdk** is a WebGL-based toolkit from [xeolabs](http://xeolabs.com) for the development of high-performance
Web-based 3D viewers for BIM and engineering.

xeokit-sdk is the product of ten years experience developing WebGL platforms
for medical, BIM and CAD visualization.

The SDK is released under a [GPL V3](https://github.com/xeolabs/xeokit.io/wiki/License) dual-license, which allows free
use for non-commercial purposes, with the option to buy a licence for commercial use.

![](https://xeokit.io/images/officePlan300x200.png)

## Links

* [Website](https://xeokit.io/)
* [Examples](http://xeolabs.com/xeokit-sdk/examples/)
* [Docs](http://xeolabs.com/xeokit-sdk/docs/)
* [Source code](https://github.com/xeolabs/xeokit-sdk)
* [Wiki](https://github.com/xeolabs/xeokit.io/wiki)
* [License](https://github.com/xeolabs/xeokit.io/wiki/License)
* [Contact](http://xeolabs.com/)

## WebGL Engine

xeokit-sdk is built around a general-purpose WebGL engine that’s optimized to view large engineering models with low memory and
rendering overhead.  The engine is derived from xeogl and is extensively reworked and optimized to focus on performance for BIM and engineering.

Engine features include:

| Feature | Demo | Docs |
|:--------------------------- | :-------- | :-------- |
| Scene graph | Demo | Docs |
| Load glTF models with accompanying IFC metadata to assist model navigation | Demo | Docs
| Load models and IFC metadata from BIMServer | Demo | Docs
| Load multiple models into the same scene, from formats including glTF, OBJ & 3DXML | Demo | Docs
| Physically-based materials, as well as Phong and Lambert materials for performance | Demo | Docs
| Quantized GPU-resident geometry (not stored in browser memory, for lower memory footprint) | Demo | Docs
| Support for large models (using hardware instancing and geometry batching) | Demo | Docs
| Emphasis effects to assist model navigation (xray, highlight, edge enhance etc) | Demo | Docs
| Canvas and ray-picking | Demo | Docs

## Viewer

A xeogl-sdk Viewer is built around a WebGL engine instance. A Viewer
is container for plugins to support application functionality on top of the engine.

So far, xeokit-sdk has the following plugins:

| Plugin | Description | Demo | Docs |
|:--------------------------- | :------------- | :-------- | :-------- |
| BCFViewPointsPlugin   | Saves and loads BCF viewpoints | [Demo](http://xeolabs.com/xeokit-sdk/examples/#BCF_LoadViewpoint) | [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/BCFViewpointsPlugin/BCFViewpointsPlugin.js~BCFViewpointsPlugin.html) |
| BIMServerLoaderPlugin | Loads models and metadata from BIMServer | - | [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/BIMServerLoaderPlugin/BIMServerLoaderPlugin.js~BIMServerLoaderPlugin.html) |
| GLTFLoaderPlugin      | Loads models from glTF, with accompanying IFC metadata| [Demo](http://xeolabs.com/xeokit-sdk/examples/#BIMOffline_treeView_OTCConferenceCenter) | [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js~GLTFLoaderPlugin.html) |
| OBJLoaderPlugin       | Loads models from OBJ | [Demo](http://xeolabs.com/xeokit-sdk/examples/#loading_OBJ_SportsCar) | [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/OBJLoaderPlugin/OBJLoaderPlugin.js~OBJLoaderPlugin.html) |
| XML3DLoaderPlugin     | Loads models from 3DXML | [Demo](http://xeolabs.com/xeokit-sdk/examples/#loading_3DXML_Widget) |  [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/XML3DLoaderPlugin/XML3DLoaderPlugin.js~XML3DLoaderPlugin.html) |
| STLLoaderPlugin       | Loads models from STL | [Demo](http://xeolabs.com/xeokit-sdk/examples/#loading_STL_SpurGear) |  [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/STLLoaderPlugin/STLLoaderPlugin.js~STLLoaderPlugin.html) |
| AxisGizmoPlugin       | A gizmo that shows the coordinate system axis | [Demo](http://xeolabs.com/xeokit-sdk/examples/#gizmos_AxisGizmoPlugin) | [Docs](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js~AxisGizmoPlugin.html) |


