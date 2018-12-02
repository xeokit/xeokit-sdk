# xeokit-sdk

**xeokit-sdk** is a software development kit from [xeolabs](http://xeolabs.com) for developing high-performance Web-based 3D viewers on the
[xeogl](http://xeogl.org) WebGL library.

At its heart of the kit is the [Viewer](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html) class which wraps a [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html) and
acts as a container for [Plugin](http://xeolabs.com/xeokit-sdk/docs/class/src/viewer/Plugin.js~Plugin.html) subclasses that implement application-specific functionality. The viewer
is also able to save and restore its state, and the state of its plugins, as JSON bookmark objects.

The boilerplate comes with a bunch of bundled plugins to get you started, including
some that load models from various formats formats, widgets and gizmos etc.

## Features

| Feature  | Description |
| ------------- | ------------- |
| Extensible plugin-based architecture | A modular, extensible architecture that can be extended with plugins. |
| Loads glTF, OBJ, STL & 3DXML| Can be extended to load more formats as required. |
| Loads models with 1M+ elements | Able to load very high-detail models from glTF. |
| BCF viewpoints | Includes a plugin to save and load viewpoints as BCF records, allowing you to share viewpoints with other BIM platforms. |
| Written in ECMA6 | Implemented in modern JavaScript. |
| Built on xeogl | Has a commercially-proven open source (MIT) 3D WebGL library at it's core.  |
| Uses WebGL 1 | Built on WebGL 1, this ensures that xeokit-sdk will work in most Web browsers, on high-end and low-end hardware. |


* Compatible with xeogl V1.0
* Written as EC6 modules
* Built using gulp
* Documentation generated using ESDoc (xeogl still uses YUIDoc at this point)

## Examples

| Example  | Description |
| ------------- | ------------- |
| [gltfviewer](http://xeolabs.com/xeokit-sdk/apps/gltfviewer/index.html)  | Minimal application that loads a model from glTF. |
| [objviewer](http://xeolabs.com/xeokit-sdk/apps/objviewer/index.html) | Minimal application that loads a model from OBJ. |
| [gltfbigviewer](http://xeolabs.com/xeokit-sdk/apps/gltfbigviewer/index.html) |Minimal application that loads a large glTF model, using xeogl's support for large models.|
| [xml3dviewer](http://xeolabs.com/xeokit-sdk/apps/xml3dviewer/index.html) | Minimal application that loads a model from 3DXML. |

## Resources

* [Docs](http://xeolabs.com/xeokit-sdk/docs)
* [Wiki](https://github.com/xeolabs/xeokit-sdk/wiki)
* [Issues](https://github.com/xeolabs/xeokit-sdk/issues)

## License

TODO: Some sort of license that allows:

- access to source code
- unlimited deployments
- don't redistribute

## Building Docs

This project requires [Node.js](https://nodejs.org/en/download/) to be installed.

````
git clone https://github.com/xeolabs/xeokit-sdk.git
cd xeokit-sdk
npm install
````

````
./node_modules/.bin/esdoc
````

Documentation will then be generated in ````./docs````.

## Change notes

TODO


