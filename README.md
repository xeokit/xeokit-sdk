# xeokit-sdk

[![npm version](https://badge.fury.io/js/%40xeokit%2Fxeokit-sdk.svg)](https://badge.fury.io/js/%40xeokit%2Fxeokit-sdk)
[![](https://data.jsdelivr.com/v1/package/npm/@xeokit/xeokit-sdk/badge)](https://www.jsdelivr.com/package/npm/@xeokit/xeokit-sdk)
[![CodeSee](https://github.com/xeokit/xeokit-sdk/actions/workflows/codesee-arch-diagram.yml/badge.svg)](https://github.com/xeokit/xeokit-sdk/actions/workflows/codesee-arch-diagram.yml)

[xeokit](http://xeokit.io) is a JavaScript software development kit created by [xeolabs](http://xeolabs.com) for viewing
high-detail, full-precision 3D engineering and BIM models in the browser.

## Resources

* [xeokit.io](https://xeokit.io/)
* [Examples](http://xeokit.github.io/xeokit-sdk/examples/)
* [Guides](https://www.notion.so/xeokit/xeokit-Documentation-4598591fcedb4889bf8896750651f74e)
* [API Docs](https://xeokit.github.io/xeokit-sdk/docs/)
* [Features](https://xeokit.io/index.html?foo=1#features)
* [Changelog](https://github.com/xeokit/xeokit-sdk/blob/master/CHANGELOG.md)
* [FAQ](https://xeokit.io/index.html?foo=1#faq)
* [License](https://xeokit.io/index.html#pricing)

## Installing

````bash
npm i @xeokit/xeokit-sdk
````

## Usage

The xeokit SDK lets us develop our own browser-based BIM viewer, which we can fully customize and extend with
plugins. Let's create a [Viewer](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html) with
a [WebIFCLoaderPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/WebIFCLoaderPlugin/WebIFCLoaderPlugin.js~WebIFCLoaderPlugin.html)
to view a IFC model in the browser, then view a sample IFC model from
the [Open IFC Model Database](http://openifcmodel.cs.auckland.ac.nz/Model/Details/274).

This is just one way to load our models into xeokit. We can also load multiple models from other formats, 
including [CityJSON](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/CityJSONLoaderPlugin/CityJSONLoaderPlugin.js~CityJSONLoaderPlugin.html), 
[glTF](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js~GLTFLoaderPlugin.html), 
[LAZ](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/LASLoaderPlugin/LASLoaderPlugin.js~LASLoaderPlugin.html) 
and [OBJ](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/OBJLoaderPlugin/OBJLoaderPlugin.js~OBJLoaderPlugin.html), 
as well as xeokit's own native highly-compressed [XKT](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html) format, 
which we can pre-convert offline from other formats.  

 * [Run this example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_WebIFCLoaderPlugin_Duplex)
 * [Read the full tutorial](https://www.notion.so/xeokit/Viewing-an-IFC-Model-with-WebIFCLoaderPlugin-9a572b801af949bf87a21c88968bd251)

![](https://xeokit.io/img/docs/WebIFCLoaderPlugin/WebIFCLoaderPluginBig.png)

````html
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>xeokit Example</title>
    <style>
        body {
            margin: 0;
            width: 100%;
            height: 100%;
            user-select: none;
        }

        #xeokit_canvas {
            width: 100%;
            height: 100%;
            position: absolute;
            background: lightblue;
            background-image: linear-gradient(lightblue, white);
        }
    </style>
</head>
<body>
<canvas id="xeokit_canvas"></canvas>
</body>
<script id="source" type="module">

    import {WebIFCLoaderPlugin, Viewer} from
                    "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk/dist/xeokit-sdk.es.min.js";
    import * as WebIFC from "https://cdn.jsdelivr.net/npm/web-ifc@0.0.51/web-ifc-api.js";
    const viewer = new Viewer({
        canvasId: "xeokit_canvas",
        transparent: true,
        dtxEnabled: true
    });

    viewer.camera.eye = [-3.933, 2.855, 27.018];
    viewer.camera.look = [4.400, 3.724, 8.899];
    viewer.camera.up = [-0.018, 0.999, 0.039];

    const IfcAPI = new WebIFC.IfcAPI();
    IfcAPI.SetWasmPath("https://cdn.jsdelivr.net/npm/web-ifc@0.0.51/");

    IfcAPI.Init().then(() => {
        const ifcLoader = new WebIFCLoaderPlugin(viewer, {
            WebIFC,
            IfcAPI
        });

        const model = ifcLoader.load({
            src: "Duplex.ifc",
            edges: true
        });
    });
</script>
</html>
````








