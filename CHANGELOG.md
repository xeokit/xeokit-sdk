## xeokit-sdk Changelog

# [v2.6.11](https://github.com/xeokit/xeokit-sdk/compare/v2.6.10...v2.6.11)

### 15 May 2024

-  Cancellable measurements - [#1490](https://github.com/xeokit/xeokit-sdk/pull/1490)

# [v2.6.10](https://github.com/xeokit/xeokit-sdk/compare/v2.6.9...v2.6.10)

### 15 May 2024

-  [FIX] Fix CameraControl mouse picking alignment for oversized scrolling canvas - [#1489](https://github.com/xeokit/xeokit-sdk/pull/1489)
-  fix Marker docs - [#1437](https://github.com/xeokit/xeokit-sdk/pull/1437)

# [v2.6.9](https://github.com/xeokit/xeokit-sdk/compare/v2.6.8...v2.6.9)

### 8 May 2024

-  Fix measurement dot position - [#1484](https://github.com/xeokit/xeokit-sdk/pull/1484)

# [v2.6.8](https://github.com/xeokit/xeokit-sdk/compare/v2.6.7...v2.6.8)

### 3 May 2024

-  [FIX] Add canvasToPagePos typedef for measurement plugins #1481 - [#1482](https://github.com/xeokit/xeokit-sdk/pull/1482)

# [v2.6.7](https://github.com/xeokit/xeokit-sdk/compare/v2.6.6...v2.6.7)

### 2 May 2024

-  Fix SceneModel.createTransform - [#1478](https://github.com/xeokit/xeokit-sdk/pull/1478)
-  Updates types for CrossSections and adds documentation description - [#1477](https://github.com/xeokit/xeokit-sdk/pull/1477)
-  Revert "[FIX] SceneModelTransform: parentTransformId parameter doesn't work x…" - [#1476](https://github.com/xeokit/xeokit-sdk/pull/1476)
-  [FEATURE] Cross section highlight - [#1394](https://github.com/xeokit/xeokit-sdk/pull/1394)
-  [REFACTOR] Updates in examples - [#1475](https://github.com/xeokit/xeokit-sdk/pull/1475)

# [v2.6.6](https://github.com/xeokit/xeokit-sdk/compare/v2.6.5...v2.6.6)

### 2 May 2024

-  Add missing TypeScript definitions for measurement plugins, plus tidy ups - [#1474](https://github.com/xeokit/xeokit-sdk/pull/1474)
-  [FIX] SceneModelTransform: parentTransformId parameter doesn't work x… - [#1471](https://github.com/xeokit/xeokit-sdk/pull/1471)

# [v2.6.5](https://github.com/xeokit/xeokit-sdk/compare/v2.6.3...v2.6.5)

### 29 April 2024

-  Fix Marker/Annotation occlusion for scene graph rep - [#1470](https://github.com/xeokit/xeokit-sdk/pull/1470)
-  Context menu enhancements - [#1466](https://github.com/xeokit/xeokit-sdk/pull/1466)
-  Fixed BCFViewpointsPlugin setViewpoint setting IfcSpaces visible when spaces_visible is false - [#1464](https://github.com/xeokit/xeokit-sdk/pull/1464)

# [v2.6.3](https://github.com/xeokit/xeokit-sdk/compare/v2.6.2...v2.6.3)

### 22 April 2024

-  [FIX] Ensure no interference between ContextMenus on measurements and Canvas  - [#1463](https://github.com/xeokit/xeokit-sdk/pull/1463)
-  [FIX] Fix interference between ContextMenus on measurements and Canvas - [#1462](https://github.com/xeokit/xeokit-sdk/pull/1462)

# [v2.6.2](https://github.com/xeokit/xeokit-sdk/compare/v2.6.1...v2.6.2)

### 22 April 2024

-  [FIX] Fix `undefined` TypeError for missing glTF material #1458 - [#1460](https://github.com/xeokit/xeokit-sdk/pull/1460)
-  [FIX] SceneModelTransform: parentTransformId parameter doesn't work #… - [#1459](https://github.com/xeokit/xeokit-sdk/pull/1459)

# [v2.6.1](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0...v2.6.1)

### 22 April 2024

-  [FIX] SceneModelTransform: parentTransformId parameter doesn't work - [#1457](https://github.com/xeokit/xeokit-sdk/pull/1457)
-  [EXAMPLE] First-person pointer locking example - [#1456](https://github.com/xeokit/xeokit-sdk/pull/1456)
-  [DOC] Add Pointer Lock on CameraControl firstPerson example - [#1455](https://github.com/xeokit/xeokit-sdk/pull/1455)

# [v2.6.0](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-9...v2.6.0)

### 21 April 2024

-  [FIX] Make Shadow class private - [#1454](https://github.com/xeokit/xeokit-sdk/pull/1454)
-  [FIX] Fix building positioning examples #1379 - [#1453](https://github.com/xeokit/xeokit-sdk/pull/1453)
-  [FIX] Fix broken example links - [#1452](https://github.com/xeokit/xeokit-sdk/pull/1452)
-  Make PickResult public part of API #1314 - [#1451](https://github.com/xeokit/xeokit-sdk/pull/1451)
-  Include Entities on distance and angle measurements #1337 - [#1450](https://github.com/xeokit/xeokit-sdk/pull/1450)
-  Fix GLTFLoaderPlugin.load() backfaces option - [#1449](https://github.com/xeokit/xeokit-sdk/pull/1449)
-  Fix SceneModel.createTransform() parentTransformId - [#1448](https://github.com/xeokit/xeokit-sdk/pull/1448)
-  Feature - Add support for Pointer Lock Web API - [#1445](https://github.com/xeokit/xeokit-sdk/pull/1445)
-  Prevent ability to create SectionPlanes on SectionPlane Control - [#1444](https://github.com/xeokit/xeokit-sdk/pull/1444)
-  Touch measurements - [#1440](https://github.com/xeokit/xeokit-sdk/pull/1440)
-  FIX Viewer.js breaking import - [#1434](https://github.com/xeokit/xeokit-sdk/pull/1434)
-  Add canvasToPagePos callback for measurement controls - [#1433](https://github.com/xeokit/xeokit-sdk/pull/1433)
-  [FIX] Distance measurement tool not working when model has a slice on specific axis #1428 - [#1429](https://github.com/xeokit/xeokit-sdk/pull/1429)

# [v2.6.0-beta-9](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-8...v2.6.0-beta-9)

### 28 March 2024

-  Add FastNavPlugin.defaultScaleCanvasResolutionFactor - [#1426](https://github.com/xeokit/xeokit-sdk/pull/1426)

# [v2.6.0-beta-8](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-7...v2.6.0-beta-8)

### 28 March 2024

-  Add selection glowThrough support to DTX triangles renderer layer - [#1425](https://github.com/xeokit/xeokit-sdk/pull/1425)
-  [FIX] Reset CameraControl default values when followPointer config is dynamically changed - [#1423](https://github.com/xeokit/xeokit-sdk/pull/1423)

# [v2.6.0-beta-7](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-6...v2.6.0-beta-7)

### 17 March 2024

-  Robust placement of measurement dot - [#1418](https://github.com/xeokit/xeokit-sdk/pull/1418)
-  Add missing .js endings for import - [#1416](https://github.com/xeokit/xeokit-sdk/pull/1416)

# [v2.6.0-beta-6](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-5...v2.6.0-beta-6)

### 14 March 2024

-  [FIX] No default metaobjects when loading XKTs and JSONs from manifest - [#1413](https://github.com/xeokit/xeokit-sdk/pull/1413)

# [v2.6.0-beta-5](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-4...v2.6.0-beta-5)

### 13 March 2024

-  [FIX] Tolerate metamodel PropertySets with missing properties - [#1412](https://github.com/xeokit/xeokit-sdk/pull/1412)

# [v2.6.0-beta-4](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-3...v2.6.0-beta-4)

### 13 March 2024

-  [FIX] Create dummy SceneEntity for unused SceneMeshes - [#1410](https://github.com/xeokit/xeokit-sdk/pull/1410)

# [v2.6.0-beta-16](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-15...v2.6.0-beta-16)

### 20 April 2024

-  Make PickResult public part of API #1314 - [#1451](https://github.com/xeokit/xeokit-sdk/pull/1451)

# [v2.6.0-beta-15](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-13...v2.6.0-beta-15)

### 20 April 2024

-  Include Entities on distance and angle measurements #1337 - [#1450](https://github.com/xeokit/xeokit-sdk/pull/1450)
-  Fix GLTFLoaderPlugin.load() backfaces option - [#1449](https://github.com/xeokit/xeokit-sdk/pull/1449)
-  Fix SceneModel.createTransform() parentTransformId - [#1448](https://github.com/xeokit/xeokit-sdk/pull/1448)
-  Feature - Add support for Pointer Lock Web API - [#1445](https://github.com/xeokit/xeokit-sdk/pull/1445)
-  Prevent ability to create SectionPlanes on SectionPlane Control - [#1444](https://github.com/xeokit/xeokit-sdk/pull/1444)

# [v2.6.0-beta-13](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-12...v2.6.0-beta-13)

### 16 April 2024

-  Touch measurements - [#1440](https://github.com/xeokit/xeokit-sdk/pull/1440)

# [v2.6.0-beta-12](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-11...v2.6.0-beta-12)

### 10 April 2024

-  FIX Viewer.js breaking import - [#1434](https://github.com/xeokit/xeokit-sdk/pull/1434)

# [v2.6.0-beta-11](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-10...v2.6.0-beta-11)

### 9 April 2024

-  Add canvasToPagePos callback for measurement controls - [#1433](https://github.com/xeokit/xeokit-sdk/pull/1433)

# [v2.6.0-beta-10](https://github.com/xeokit/xeokit-sdk/compare/v2.6.0-beta-1...v2.6.0-beta-10)

### 1 April 2024

-  [FIX] Distance measurement tool not working when model has a slice on specific axis #1428 - [#1429](https://github.com/xeokit/xeokit-sdk/pull/1429)
-  Add FastNavPlugin.defaultScaleCanvasResolutionFactor - [#1426](https://github.com/xeokit/xeokit-sdk/pull/1426)
-  Add selection glowThrough support to DTX triangles renderer layer - [#1425](https://github.com/xeokit/xeokit-sdk/pull/1425)
-  [FIX] Reset CameraControl default values when followPointer config is dynamically changed - [#1423](https://github.com/xeokit/xeokit-sdk/pull/1423)
-  Robust placement of measurement dot - [#1418](https://github.com/xeokit/xeokit-sdk/pull/1418)
-  Add missing .js endings for import - [#1416](https://github.com/xeokit/xeokit-sdk/pull/1416)
-  [FIX] No default metaobjects when loading XKTs and JSONs from manifest - [#1413](https://github.com/xeokit/xeokit-sdk/pull/1413)
-  [FIX] Tolerate metamodel PropertySets with missing properties - [#1412](https://github.com/xeokit/xeokit-sdk/pull/1412)
-  [FIX] Create dummy SceneEntity for unused SceneMeshes - [#1410](https://github.com/xeokit/xeokit-sdk/pull/1410)
-  Fix dot initial visibility - [#1406](https://github.com/xeokit/xeokit-sdk/pull/1406)
-  An alternative setInterval that does not use a Worker - [#1402](https://github.com/xeokit/xeokit-sdk/pull/1402)

# [v2.6.0-beta-1](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-8...v2.6.0-beta-1)

### 6 March 2024

-  [BREAKING] Modify WebIFCLoaderPlugin to expect externally-provided web-ifc API - [#1401](https://github.com/xeokit/xeokit-sdk/pull/1401)
-  Fix WebIFC element name - [#1397](https://github.com/xeokit/xeokit-sdk/pull/1397)
-  Bump web ifc to 0.0.51 - [#1396](https://github.com/xeokit/xeokit-sdk/pull/1396)
-  Align measurement marker div correctly for canvas offset by div - [#1395](https://github.com/xeokit/xeokit-sdk/pull/1395)
-  [EXAMPLE] Section path example - [#1390](https://github.com/xeokit/xeokit-sdk/pull/1390)
-  Fix transparent DTX mesh picking - [#1389](https://github.com/xeokit/xeokit-sdk/pull/1389)
-  Updating types for buildPolylineGeometryFromCurve method - [#1387](https://github.com/xeokit/xeokit-sdk/pull/1387)
-  Change default far plane distance from 2000 to 10000 - [#1386](https://github.com/xeokit/xeokit-sdk/pull/1386)
-  Handle glTF triangles without indices; add some examples - [#1385](https://github.com/xeokit/xeokit-sdk/pull/1385)
-  [FEATURE] Drawing curves using polyline - [#1384](https://github.com/xeokit/xeokit-sdk/pull/1384)
-  [EXAMPLE] Longer slider with resizable length - [#1383](https://github.com/xeokit/xeokit-sdk/pull/1383)
-  [EXAMPLE] Adding example of controlling the position on the CameraPath by slider - [#1382](https://github.com/xeokit/xeokit-sdk/pull/1382)
-  Fix undefined _markerDiv bug in AngleMeasurementsMouseControl - [#1380](https://github.com/xeokit/xeokit-sdk/pull/1380)
-  Adding missing types for Polyline geometry - [#1376](https://github.com/xeokit/xeokit-sdk/pull/1376)
-  [FEATURE] Adding ability to draw 3d polylines - [#1374](https://github.com/xeokit/xeokit-sdk/pull/1374)
-  Add missing types for buildBoxLinesGeometryFromAABB - [#1369](https://github.com/xeokit/xeokit-sdk/pull/1369)
-  [FIX] Ensure DTX-enabled SceneModel still uses VBOs for textures - [#1368](https://github.com/xeokit/xeokit-sdk/pull/1368)
-  [FEATURE] AABB representation - [#1367](https://github.com/xeokit/xeokit-sdk/pull/1367)
-  .d.ts file update for DistanceMeasurement - [#1366](https://github.com/xeokit/xeokit-sdk/pull/1366)
-  [FEATURE] Adding ability to show labels one below the other for measurement plugin - [#1365](https://github.com/xeokit/xeokit-sdk/pull/1365)
-  [FIX] Fix MetaObject.metaModels value after unloading multiple metamodels with shared metaobjects - [#1363](https://github.com/xeokit/xeokit-sdk/pull/1363)
-  Fix shader inheritance for batched VBO selection/highlight/xray - [#1362](https://github.com/xeokit/xeokit-sdk/pull/1362)
-  Use custom setTimeout that works in an unfocused browser tab - [#1361](https://github.com/xeokit/xeokit-sdk/pull/1361)
-  fix for issue #1356 - [#1357](https://github.com/xeokit/xeokit-sdk/pull/1357)
-  [EXAMPLE] Add slider control to exploding OBJ model example - [#1359](https://github.com/xeokit/xeokit-sdk/pull/1359)

# [v2.5.2-beta-8](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-7...v2.5.2-beta-8)

### 26 January 2024

-  [Fix] Correct DistanceMeasurementsMouseControl pointer for offset canvas - [#1351](https://github.com/xeokit/xeokit-sdk/pull/1351)
-  [Fix] Correct AngleMeasurementsMouseControl pointer for offset canvas - [#1350](https://github.com/xeokit/xeokit-sdk/pull/1350)
-  Adding exploded model example - [#1347](https://github.com/xeokit/xeokit-sdk/pull/1347)
-  Update SceneModel.createMesh() types - [#1346](https://github.com/xeokit/xeokit-sdk/pull/1346)

# [v2.5.2-beta-7](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-5...v2.5.2-beta-7)

### 20 January 2024

-  Throws when one try to create a scene with an unused mesh during finalize. - [#1338](https://github.com/xeokit/xeokit-sdk/pull/1338)
-  Adding benchmarking example with Spector - [#1342](https://github.com/xeokit/xeokit-sdk/pull/1342)
-  Updated typings - [#1340](https://github.com/xeokit/xeokit-sdk/pull/1340)
-  [EXAMPLE] Added additional icons for regular ifc types - [#1339](https://github.com/xeokit/xeokit-sdk/pull/1339)
-  [EXAMPLE] Add icons for different types of nodes in tree view - [#1334](https://github.com/xeokit/xeokit-sdk/pull/1334)
-  [FIX] Update TreeViewNode class documentation - [#1333](https://github.com/xeokit/xeokit-sdk/pull/1333)
-  [Fix] Fixed links to assets, removed link to roboto condensed - [#1332](https://github.com/xeokit/xeokit-sdk/pull/1332)

# [v2.5.2-beta-32](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-3...v2.5.2-beta-32)

### 5 March 2024

-  Fix WebIFC element name - [#1397](https://github.com/xeokit/xeokit-sdk/pull/1397)
-  Bump web ifc to 0.0.51 - [#1396](https://github.com/xeokit/xeokit-sdk/pull/1396)
-  Align measurement marker div correctly for canvas offset by div - [#1395](https://github.com/xeokit/xeokit-sdk/pull/1395)
-  [EXAMPLE] Section path example - [#1390](https://github.com/xeokit/xeokit-sdk/pull/1390)
-  Fix transparent DTX mesh picking - [#1389](https://github.com/xeokit/xeokit-sdk/pull/1389)
-  Updating types for buildPolylineGeometryFromCurve method - [#1387](https://github.com/xeokit/xeokit-sdk/pull/1387)
-  Change default far plane distance from 2000 to 10000 - [#1386](https://github.com/xeokit/xeokit-sdk/pull/1386)
-  Handle glTF triangles without indices; add some examples - [#1385](https://github.com/xeokit/xeokit-sdk/pull/1385)
-  [FEATURE] Drawing curves using polyline - [#1384](https://github.com/xeokit/xeokit-sdk/pull/1384)
-  [EXAMPLE] Longer slider with resizable length - [#1383](https://github.com/xeokit/xeokit-sdk/pull/1383)
-  [EXAMPLE] Adding example of controlling the position on the CameraPath by slider - [#1382](https://github.com/xeokit/xeokit-sdk/pull/1382)
-  Fix undefined _markerDiv bug in AngleMeasurementsMouseControl - [#1380](https://github.com/xeokit/xeokit-sdk/pull/1380)
-  Adding missing types for Polyline geometry - [#1376](https://github.com/xeokit/xeokit-sdk/pull/1376)
-  [FEATURE] Adding ability to draw 3d polylines - [#1374](https://github.com/xeokit/xeokit-sdk/pull/1374)
-  Add missing types for buildBoxLinesGeometryFromAABB - [#1369](https://github.com/xeokit/xeokit-sdk/pull/1369)
-  [FIX] Ensure DTX-enabled SceneModel still uses VBOs for textures - [#1368](https://github.com/xeokit/xeokit-sdk/pull/1368)
-  [FEATURE] AABB representation - [#1367](https://github.com/xeokit/xeokit-sdk/pull/1367)
-  .d.ts file update for DistanceMeasurement - [#1366](https://github.com/xeokit/xeokit-sdk/pull/1366)
-  [FEATURE] Adding ability to show labels one below the other for measurement plugin - [#1365](https://github.com/xeokit/xeokit-sdk/pull/1365)
-  [FIX] Fix MetaObject.metaModels value after unloading multiple metamodels with shared metaobjects - [#1363](https://github.com/xeokit/xeokit-sdk/pull/1363)
-  Fix shader inheritance for batched VBO selection/highlight/xray - [#1362](https://github.com/xeokit/xeokit-sdk/pull/1362)
-  Use custom setTimeout that works in an unfocused browser tab - [#1361](https://github.com/xeokit/xeokit-sdk/pull/1361)
-  fix for issue #1356 - [#1357](https://github.com/xeokit/xeokit-sdk/pull/1357)
-  [EXAMPLE] Add slider control to exploding OBJ model example - [#1359](https://github.com/xeokit/xeokit-sdk/pull/1359)
-  [Fix] Correct DistanceMeasurementsMouseControl pointer for offset canvas - [#1351](https://github.com/xeokit/xeokit-sdk/pull/1351)
-  [Fix] Correct AngleMeasurementsMouseControl pointer for offset canvas - [#1350](https://github.com/xeokit/xeokit-sdk/pull/1350)
-  Adding exploded model example - [#1347](https://github.com/xeokit/xeokit-sdk/pull/1347)
-  Update SceneModel.createMesh() types - [#1346](https://github.com/xeokit/xeokit-sdk/pull/1346)
-  Throws when one try to create a scene with an unused mesh during finalize. - [#1338](https://github.com/xeokit/xeokit-sdk/pull/1338)
-  Adding benchmarking example with Spector - [#1342](https://github.com/xeokit/xeokit-sdk/pull/1342)
-  Updated typings - [#1340](https://github.com/xeokit/xeokit-sdk/pull/1340)
-  [EXAMPLE] Added additional icons for regular ifc types - [#1339](https://github.com/xeokit/xeokit-sdk/pull/1339)
-  [EXAMPLE] Add icons for different types of nodes in tree view - [#1334](https://github.com/xeokit/xeokit-sdk/pull/1334)
-  [FIX] Update TreeViewNode class documentation - [#1333](https://github.com/xeokit/xeokit-sdk/pull/1333)
-  [Fix] Fixed links to assets, removed link to roboto condensed - [#1332](https://github.com/xeokit/xeokit-sdk/pull/1332)
-  Added renderService example - [#1331](https://github.com/xeokit/xeokit-sdk/pull/1331)
-  Custom label color for NavCube - [#1328](https://github.com/xeokit/xeokit-sdk/pull/1328)
-  [FEATURE] Pluggable render service for TreeViewPlugin - [#1329](https://github.com/xeokit/xeokit-sdk/pull/1329)
-  Updated the typings - [#1330](https://github.com/xeokit/xeokit-sdk/pull/1330)
-  Removes 404 background in examples by fixing a path - [#1327](https://github.com/xeokit/xeokit-sdk/pull/1327)
-  Fixes 1225: enable override rootname in treeview - [#1324](https://github.com/xeokit/xeokit-sdk/pull/1324)
-  fix code comment typo in XKTLoaderPlugin.js - [#1322](https://github.com/xeokit/xeokit-sdk/pull/1322)
-  FIX: Enable model to load while different tab is open - [#1318](https://github.com/xeokit/xeokit-sdk/pull/1318)
-  Use setTimeout to pump XKTLoaderPlugin XKT loading queue, not RAF - [#1317](https://github.com/xeokit/xeokit-sdk/pull/1317)

# [v2.5.2-beta-29](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-27...v2.5.2-beta-29)

### 4 March 2024

-  Align measurement marker div correctly for canvas offset by div - [#1395](https://github.com/xeokit/xeokit-sdk/pull/1395)
-  [EXAMPLE] Section path example - [#1390](https://github.com/xeokit/xeokit-sdk/pull/1390)

# [v2.5.2-beta-27](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-26...v2.5.2-beta-27)

### 29 February 2024

-  Fix transparent DTX mesh picking - [#1389](https://github.com/xeokit/xeokit-sdk/pull/1389)
-  Updating types for buildPolylineGeometryFromCurve method - [#1387](https://github.com/xeokit/xeokit-sdk/pull/1387)

# [v2.5.2-beta-26](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-22...v2.5.2-beta-26)

### 28 February 2024

-  Change default far plane distance from 2000 to 10000 - [#1386](https://github.com/xeokit/xeokit-sdk/pull/1386)
-  Handle glTF triangles without indices; add some examples - [#1385](https://github.com/xeokit/xeokit-sdk/pull/1385)
-  [FEATURE] Drawing curves using polyline - [#1384](https://github.com/xeokit/xeokit-sdk/pull/1384)
-  [EXAMPLE] Longer slider with resizable length - [#1383](https://github.com/xeokit/xeokit-sdk/pull/1383)
-  [EXAMPLE] Adding example of controlling the position on the CameraPath by slider - [#1382](https://github.com/xeokit/xeokit-sdk/pull/1382)
-  Fix undefined _markerDiv bug in AngleMeasurementsMouseControl - [#1380](https://github.com/xeokit/xeokit-sdk/pull/1380)
-  Adding missing types for Polyline geometry - [#1376](https://github.com/xeokit/xeokit-sdk/pull/1376)
-  [FEATURE] Adding ability to draw 3d polylines - [#1374](https://github.com/xeokit/xeokit-sdk/pull/1374)
-  Add missing types for buildBoxLinesGeometryFromAABB - [#1369](https://github.com/xeokit/xeokit-sdk/pull/1369)

# [v2.5.2-beta-22](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-21...v2.5.2-beta-22)

### 13 February 2024

-  [FIX] Ensure DTX-enabled SceneModel still uses VBOs for textures - [#1368](https://github.com/xeokit/xeokit-sdk/pull/1368)

# [v2.5.2-beta-21](https://github.com/xeokit/xeokit-sdk/compare/v2.5.2-beta-13...v2.5.2-beta-21)

### 13 February 2024

-  [FEATURE] AABB representation - [#1367](https://github.com/xeokit/xeokit-sdk/pull/1367)
-  .d.ts file update for DistanceMeasurement - [#1366](https://github.com/xeokit/xeokit-sdk/pull/1366)
-  [FEATURE] Adding ability to show labels one below the other for measurement plugin - [#1365](https://github.com/xeokit/xeokit-sdk/pull/1365)
-  [FIX] Fix MetaObject.metaModels value after unloading multiple metamodels with shared metaobjects - [#1363](https://github.com/xeokit/xeokit-sdk/pull/1363)

# [v2.5.2-beta-13](https://github.com/xeokit/xeokit-sdk/compare/v2.5.1-beta...v2.5.2-beta-13)

### 2 February 2024

-  Fix shader inheritance for batched VBO selection/highlight/xray - [#1362](https://github.com/xeokit/xeokit-sdk/pull/1362)
-  Use custom setTimeout that works in an unfocused browser tab - [#1361](https://github.com/xeokit/xeokit-sdk/pull/1361)
-  fix for issue #1356 - [#1357](https://github.com/xeokit/xeokit-sdk/pull/1357)
-  [EXAMPLE] Add slider control to exploding OBJ model example - [#1359](https://github.com/xeokit/xeokit-sdk/pull/1359)
-  [Fix] Correct DistanceMeasurementsMouseControl pointer for offset canvas - [#1351](https://github.com/xeokit/xeokit-sdk/pull/1351)
-  [Fix] Correct AngleMeasurementsMouseControl pointer for offset canvas - [#1350](https://github.com/xeokit/xeokit-sdk/pull/1350)
-  Adding exploded model example - [#1347](https://github.com/xeokit/xeokit-sdk/pull/1347)
-  Update SceneModel.createMesh() types - [#1346](https://github.com/xeokit/xeokit-sdk/pull/1346)
-  Throws when one try to create a scene with an unused mesh during finalize. - [#1338](https://github.com/xeokit/xeokit-sdk/pull/1338)
-  Adding benchmarking example with Spector - [#1342](https://github.com/xeokit/xeokit-sdk/pull/1342)
-  Updated typings - [#1340](https://github.com/xeokit/xeokit-sdk/pull/1340)
-  [EXAMPLE] Added additional icons for regular ifc types - [#1339](https://github.com/xeokit/xeokit-sdk/pull/1339)
-  [EXAMPLE] Add icons for different types of nodes in tree view - [#1334](https://github.com/xeokit/xeokit-sdk/pull/1334)
-  [FIX] Update TreeViewNode class documentation - [#1333](https://github.com/xeokit/xeokit-sdk/pull/1333)
-  [Fix] Fixed links to assets, removed link to roboto condensed - [#1332](https://github.com/xeokit/xeokit-sdk/pull/1332)
-  Added renderService example - [#1331](https://github.com/xeokit/xeokit-sdk/pull/1331)
-  Custom label color for NavCube - [#1328](https://github.com/xeokit/xeokit-sdk/pull/1328)
-  [FEATURE] Pluggable render service for TreeViewPlugin - [#1329](https://github.com/xeokit/xeokit-sdk/pull/1329)
-  Updated the typings - [#1330](https://github.com/xeokit/xeokit-sdk/pull/1330)
-  Removes 404 background in examples by fixing a path - [#1327](https://github.com/xeokit/xeokit-sdk/pull/1327)
-  Fixes 1225: enable override rootname in treeview - [#1324](https://github.com/xeokit/xeokit-sdk/pull/1324)
-  fix code comment typo in XKTLoaderPlugin.js - [#1322](https://github.com/xeokit/xeokit-sdk/pull/1322)
-  FIX: Enable model to load while different tab is open - [#1318](https://github.com/xeokit/xeokit-sdk/pull/1318)
-  Use setTimeout to pump XKTLoaderPlugin XKT loading queue, not RAF - [#1317](https://github.com/xeokit/xeokit-sdk/pull/1317)
-  fix: make containerElement and containerElementId optioanl on TreeViewPluginConfiguration - [#1310](https://github.com/xeokit/xeokit-sdk/pull/1310)
-  Fix BitMap auto-scaling - [#1309](https://github.com/xeokit/xeokit-sdk/pull/1309)
-  Refactor SceneModel; Add snapping for line and point primitives - [#1308](https://github.com/xeokit/xeokit-sdk/pull/1308)

# [v2.5.1-beta](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-9...v2.5.1-beta)

### 14 December 2023

-  Make measurements click-though - [#1302](https://github.com/xeokit/xeokit-sdk/pull/1302)
-  Fix LineSet precision - [#1300](https://github.com/xeokit/xeokit-sdk/pull/1300)
-  Expose configs to experiment with SceneModel buffer sizes - [#1296](https://github.com/xeokit/xeokit-sdk/pull/1296)
-  Make culled DTX objects un-pickable - [#1295](https://github.com/xeokit/xeokit-sdk/pull/1295)
-  Add entity to measurement endpoints - [#1292](https://github.com/xeokit/xeokit-sdk/pull/1292)
-  Refactor SceneModel AABB / transforms management - [#1291](https://github.com/xeokit/xeokit-sdk/pull/1291)
-  Fix StoreyViewsPlugin - [#1290](https://github.com/xeokit/xeokit-sdk/pull/1290)
-  extend treeViewPlugin to support HTMLElement and ID of an HTMLElement - [#1288](https://github.com/xeokit/xeokit-sdk/pull/1288)
-  added logic to destroy MarkerDiv on deactivation and on reset, on bot… - [#1286](https://github.com/xeokit/xeokit-sdk/pull/1286)
-  Fix TypeScript for LoadXKTModel #1279 - [#1283](https://github.com/xeokit/xeokit-sdk/pull/1283)
-  Sample data for XKTLoaderPlugin.load() - [#1282](https://github.com/xeokit/xeokit-sdk/pull/1282)
-  Option to provide XKT manifest as object param to XKTLoaderPlugin.load(), also option to provide HTTP URLs to files  - [#1281](https://github.com/xeokit/xeokit-sdk/pull/1281)
-  Support object translucency per BCF v4 - [#1278](https://github.com/xeokit/xeokit-sdk/pull/1278)
-  OPTIMIZATION: Optimize SectionPlane creation and destruction  - [#1273](https://github.com/xeokit/xeokit-sdk/pull/1273)
-  FIX: SceneModel AABB not updating when moving model - [#1277](https://github.com/xeokit/xeokit-sdk/pull/1277)
-  Cache and reuse pick results on CameraControl PickController - [#1269](https://github.com/xeokit/xeokit-sdk/pull/1269)
-  FEATURE: Unify pick and snap within Scene.pick() - [#1268](https://github.com/xeokit/xeokit-sdk/pull/1268)
-  OPTIMIZATION: tickify `mousemove` and `mousewheel` events - [#1265](https://github.com/xeokit/xeokit-sdk/pull/1265)
-  Fix race condtion and optimize `PickControler.js` - [#1261](https://github.com/xeokit/xeokit-sdk/pull/1261)
-  FEATURE: Marquee Picking - [#1260](https://github.com/xeokit/xeokit-sdk/pull/1260)
-  Make snap pick result return snapped Entity, not Mesh #1248 - [#1259](https://github.com/xeokit/xeokit-sdk/pull/1259)
-  FEATURE: Save and load object X-ray states in BCF - [#1257](https://github.com/xeokit/xeokit-sdk/pull/1257)

# [v2.4.2-beta-9](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-8...v2.4.2-beta-9)

### 22 November 2023

-  OPTIMIZATION: Properties reuse to compress metadata JSON - [#1256](https://github.com/xeokit/xeokit-sdk/pull/1256)

# [v2.4.2-beta-8](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-7...v2.4.2-beta-8)

### 21 November 2023

-  FEATURE: More vibrant default Selection and Highlight materials - [#1253](https://github.com/xeokit/xeokit-sdk/pull/1253)
-  Movable SceneModel Objects - [#1229](https://github.com/xeokit/xeokit-sdk/pull/1229)
-  FEATURE: add entity to snap pick result - [#1248](https://github.com/xeokit/xeokit-sdk/pull/1248)
-  Return `string` instead of `void` to `DistanceMeasurementsPlugin`'s subscribers - [#1245](https://github.com/xeokit/xeokit-sdk/pull/1245)
-  Add type definitions for `measurementEnd` and `measurementCancel` in `DistanceMeasurementsPlugin.d.ts` - [#1244](https://github.com/xeokit/xeokit-sdk/pull/1244)
-  Add `"activated"` event definition to `DistanceMeasurementsControl.d.ts` - [#1243](https://github.com/xeokit/xeokit-sdk/pull/1243)
-  Fire `"activated"` events from `DistanceMeasurementsMouseControl` - [#1242](https://github.com/xeokit/xeokit-sdk/pull/1242)
-  Fix `_subPortionSetMatrix` in `TrianglesDataTextureLayer` - [#1241](https://github.com/xeokit/xeokit-sdk/pull/1241)
-  chore: JSDoc types for `uniquifyPositions` and `rebucketPositions` - [#1238](https://github.com/xeokit/xeokit-sdk/pull/1238)

# [v2.4.2-beta-7](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-6...v2.4.2-beta-7)

### 15 November 2023

-  Fix typo #1228 - [#1230](https://github.com/xeokit/xeokit-sdk/pull/1230)
-  Fix: also unserialize `metaObject.external` when generating the `MetaModel` - [#1233](https://github.com/xeokit/xeokit-sdk/pull/1233)
-  Add a backwards-compatible `MetaObject.metaModel` property - [#1235](https://github.com/xeokit/xeokit-sdk/pull/1235)
-  Add a backwards-compatible `MetaModel.rootMetaObject property - [#1237](https://github.com/xeokit/xeokit-sdk/pull/1237)

# [v2.4.2-beta-48](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-47...v2.4.2-beta-48)

### 13 December 2023

-  Fix LineSet precision - [#1300](https://github.com/xeokit/xeokit-sdk/pull/1300)

# [v2.4.2-beta-46](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-43...v2.4.2-beta-46)

### 13 December 2023

-  Expose configs to experiment with SceneModel buffer sizes - [#1296](https://github.com/xeokit/xeokit-sdk/pull/1296)

# [v2.4.2-beta-43](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-42...v2.4.2-beta-43)

### 12 December 2023

-  Make culled DTX objects un-pickable - [#1295](https://github.com/xeokit/xeokit-sdk/pull/1295)

# [v2.4.2-beta-41](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-38...v2.4.2-beta-41)

### 12 December 2023

-  Add entity to measurement endpoints - [#1292](https://github.com/xeokit/xeokit-sdk/pull/1292)

# [v2.4.2-beta-35](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-32...v2.4.2-beta-35)

### 11 December 2023

-  Refactor SceneModel AABB / transforms management - [#1291](https://github.com/xeokit/xeokit-sdk/pull/1291)
-  Fix StoreyViewsPlugin - [#1290](https://github.com/xeokit/xeokit-sdk/pull/1290)
-  extend treeViewPlugin to support HTMLElement and ID of an HTMLElement - [#1288](https://github.com/xeokit/xeokit-sdk/pull/1288)

# [v2.4.2-beta-32](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-31...v2.4.2-beta-32)

### 6 December 2023

-  added logic to destroy MarkerDiv on deactivation and on reset, on bot… - [#1286](https://github.com/xeokit/xeokit-sdk/pull/1286)

# [v2.4.2-beta-31](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-3...v2.4.2-beta-31)

### 3 December 2023

-  Fix TypeScript for LoadXKTModel #1279 - [#1283](https://github.com/xeokit/xeokit-sdk/pull/1283)
-  Sample data for XKTLoaderPlugin.load() - [#1282](https://github.com/xeokit/xeokit-sdk/pull/1282)
-  Option to provide XKT manifest as object param to XKTLoaderPlugin.load(), also option to provide HTTP URLs to files  - [#1281](https://github.com/xeokit/xeokit-sdk/pull/1281)
-  Support object translucency per BCF v4 - [#1278](https://github.com/xeokit/xeokit-sdk/pull/1278)
-  OPTIMIZATION: Optimize SectionPlane creation and destruction  - [#1273](https://github.com/xeokit/xeokit-sdk/pull/1273)
-  FIX: SceneModel AABB not updating when moving model - [#1277](https://github.com/xeokit/xeokit-sdk/pull/1277)
-  Cache and reuse pick results on CameraControl PickController - [#1269](https://github.com/xeokit/xeokit-sdk/pull/1269)
-  FEATURE: Unify pick and snap within Scene.pick() - [#1268](https://github.com/xeokit/xeokit-sdk/pull/1268)
-  OPTIMIZATION: tickify `mousemove` and `mousewheel` events - [#1265](https://github.com/xeokit/xeokit-sdk/pull/1265)
-  Fix race condtion and optimize `PickControler.js` - [#1261](https://github.com/xeokit/xeokit-sdk/pull/1261)
-  FEATURE: Marquee Picking - [#1260](https://github.com/xeokit/xeokit-sdk/pull/1260)
-  Make snap pick result return snapped Entity, not Mesh #1248 - [#1259](https://github.com/xeokit/xeokit-sdk/pull/1259)
-  FEATURE: Save and load object X-ray states in BCF - [#1257](https://github.com/xeokit/xeokit-sdk/pull/1257)
-  OPTIMIZATION: Properties reuse to compress metadata JSON - [#1256](https://github.com/xeokit/xeokit-sdk/pull/1256)
-  FEATURE: More vibrant default Selection and Highlight materials - [#1253](https://github.com/xeokit/xeokit-sdk/pull/1253)
-  Movable SceneModel Objects - [#1229](https://github.com/xeokit/xeokit-sdk/pull/1229)
-  FEATURE: add entity to snap pick result - [#1248](https://github.com/xeokit/xeokit-sdk/pull/1248)
-  Return `string` instead of `void` to `DistanceMeasurementsPlugin`'s subscribers - [#1245](https://github.com/xeokit/xeokit-sdk/pull/1245)
-  Add type definitions for `measurementEnd` and `measurementCancel` in `DistanceMeasurementsPlugin.d.ts` - [#1244](https://github.com/xeokit/xeokit-sdk/pull/1244)
-  Add `"activated"` event definition to `DistanceMeasurementsControl.d.ts` - [#1243](https://github.com/xeokit/xeokit-sdk/pull/1243)
-  Fire `"activated"` events from `DistanceMeasurementsMouseControl` - [#1242](https://github.com/xeokit/xeokit-sdk/pull/1242)
-  Fix `_subPortionSetMatrix` in `TrianglesDataTextureLayer` - [#1241](https://github.com/xeokit/xeokit-sdk/pull/1241)
-  chore: JSDoc types for `uniquifyPositions` and `rebucketPositions` - [#1238](https://github.com/xeokit/xeokit-sdk/pull/1238)
-  Fix typo #1228 - [#1230](https://github.com/xeokit/xeokit-sdk/pull/1230)
-  Fix: also unserialize `metaObject.external` when generating the `MetaModel` - [#1233](https://github.com/xeokit/xeokit-sdk/pull/1233)
-  Add a backwards-compatible `MetaObject.metaModel` property - [#1235](https://github.com/xeokit/xeokit-sdk/pull/1235)
-  Add a backwards-compatible `MetaModel.rootMetaObject property - [#1237](https://github.com/xeokit/xeokit-sdk/pull/1237)

# [v2.4.2-beta-24](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-21...v2.4.2-beta-24)

### 29 November 2023

-  OPTIMIZATION: Optimize SectionPlane creation and destruction  - [#1273](https://github.com/xeokit/xeokit-sdk/pull/1273)

# [v2.4.2-beta-21](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-20...v2.4.2-beta-21)

### 28 November 2023

-  FIX: SceneModel AABB not updating when moving model - [#1277](https://github.com/xeokit/xeokit-sdk/pull/1277)

# [v2.4.2-beta-20](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-14...v2.4.2-beta-20)

### 27 November 2023

-  Cache and reuse pick results on CameraControl PickController - [#1269](https://github.com/xeokit/xeokit-sdk/pull/1269)
-  FEATURE: Unify pick and snap within Scene.pick() - [#1268](https://github.com/xeokit/xeokit-sdk/pull/1268)
-  OPTIMIZATION: tickify `mousemove` and `mousewheel` events - [#1265](https://github.com/xeokit/xeokit-sdk/pull/1265)

# [v2.4.2-beta-14](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-13...v2.4.2-beta-14)

### 24 November 2023

-  Fix race condtion and optimize `PickControler.js` - [#1261](https://github.com/xeokit/xeokit-sdk/pull/1261)

# [v2.4.2-beta-13](https://github.com/xeokit/xeokit-sdk/compare/v2.4.2-beta-10...v2.4.2-beta-13)

### 24 November 2023

-  FEATURE: Marquee Picking - [#1260](https://github.com/xeokit/xeokit-sdk/pull/1260)
-  Make snap pick result return snapped Entity, not Mesh #1248 - [#1259](https://github.com/xeokit/xeokit-sdk/pull/1259)

# [v2.4.2-beta-10](https://github.com/xeokit/xeokit-sdk/compare/2.4.2-beta-1...v2.4.2-beta-10)

### 22 November 2023

-  FEATURE: Save and load object X-ray states in BCF - [#1257](https://github.com/xeokit/xeokit-sdk/pull/1257)
-  OPTIMIZATION: Properties reuse to compress metadata JSON - [#1256](https://github.com/xeokit/xeokit-sdk/pull/1256)
-  FEATURE: More vibrant default Selection and Highlight materials - [#1253](https://github.com/xeokit/xeokit-sdk/pull/1253)
-  Movable SceneModel Objects - [#1229](https://github.com/xeokit/xeokit-sdk/pull/1229)
-  FEATURE: add entity to snap pick result - [#1248](https://github.com/xeokit/xeokit-sdk/pull/1248)
-  Return `string` instead of `void` to `DistanceMeasurementsPlugin`'s subscribers - [#1245](https://github.com/xeokit/xeokit-sdk/pull/1245)
-  Add type definitions for `measurementEnd` and `measurementCancel` in `DistanceMeasurementsPlugin.d.ts` - [#1244](https://github.com/xeokit/xeokit-sdk/pull/1244)
-  Add `"activated"` event definition to `DistanceMeasurementsControl.d.ts` - [#1243](https://github.com/xeokit/xeokit-sdk/pull/1243)
-  Fire `"activated"` events from `DistanceMeasurementsMouseControl` - [#1242](https://github.com/xeokit/xeokit-sdk/pull/1242)
-  Fix `_subPortionSetMatrix` in `TrianglesDataTextureLayer` - [#1241](https://github.com/xeokit/xeokit-sdk/pull/1241)
-  chore: JSDoc types for `uniquifyPositions` and `rebucketPositions` - [#1238](https://github.com/xeokit/xeokit-sdk/pull/1238)
-  Fix typo #1228 - [#1230](https://github.com/xeokit/xeokit-sdk/pull/1230)
-  Fix: also unserialize `metaObject.external` when generating the `MetaModel` - [#1233](https://github.com/xeokit/xeokit-sdk/pull/1233)
-  Add a backwards-compatible `MetaObject.metaModel` property - [#1235](https://github.com/xeokit/xeokit-sdk/pull/1235)
-  Add a backwards-compatible `MetaModel.rootMetaObject property - [#1237](https://github.com/xeokit/xeokit-sdk/pull/1237)
-  Fix TreeView rendering when using globalizeObjectIds #1224 - [#1227](https://github.com/xeokit/xeokit-sdk/pull/1227)
-  Update MetaScene.d.ts - [#1226](https://github.com/xeokit/xeokit-sdk/pull/1226)
-  Make measurements sliced by SectionPlanes #1217 - [#1222](https://github.com/xeokit/xeokit-sdk/pull/1222)

# [2.4.2-beta-1](https://github.com/xeokit/xeokit-sdk/compare/v2.4.1...2.4.2-beta-1)

### 9 November 2023

-  FIX: force triangle instancing pick normals flat renderer - [#1214](https://github.com/xeokit/xeokit-sdk/pull/1214)

# [v2.4.1](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-beta-2...v2.4.1)

### 2 November 2023

-  Add multi output Renderbuffer feature and snap pick normals with it - [#1209](https://github.com/xeokit/xeokit-sdk/pull/1209)
-  fix: make sure to weld vertices when `index-bucketting` is enabled - [#1207](https://github.com/xeokit/xeokit-sdk/pull/1207)

# [v2.4.0-beta-2](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-99...v2.4.0-beta-2)

### 29 October 2023

-  Fix angle measurement highlighting on mouseover - [#1202](https://github.com/xeokit/xeokit-sdk/pull/1202)
-  Example tweaks - [#1201](https://github.com/xeokit/xeokit-sdk/pull/1201)
-  Fix BCF line set rounding error and bitmap Y-flipping - [#1200](https://github.com/xeokit/xeokit-sdk/pull/1200)
-  Fix SceneModel DTX edge renderer for entity offsetting #1196 - [#1197](https://github.com/xeokit/xeokit-sdk/pull/1197)
-  Use gradient technique to depth-init snapping buffers - [#1195](https://github.com/xeokit/xeokit-sdk/pull/1195)

# [v2.4.0-alpha-99](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-96...v2.4.0-alpha-99)

### 21 October 2023

-  Fix name &lt;-&gt; type in IFC loader - [#1191](https://github.com/xeokit/xeokit-sdk/pull/1191)

# [v2.4.0-alpha-96](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-90...v2.4.0-alpha-96)

### 18 October 2023

-  Pick normals using a 3x3 viewport - [#1177](https://github.com/xeokit/xeokit-sdk/pull/1177)
-  fix pick normal - [#1176](https://github.com/xeokit/xeokit-sdk/pull/1176)

# [v2.4.0-alpha-90](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-82...v2.4.0-alpha-90)

### 13 October 2023

-  1 x 1 picking viewport - [#1168](https://github.com/xeokit/xeokit-sdk/pull/1168)
-  Automatic LAS point set chunking to fit VBOs - tweak max point set length - [#1174](https://github.com/xeokit/xeokit-sdk/pull/1174)
-  Automatically split LAS point sets to fit in SceneModel VBOs - [#1173](https://github.com/xeokit/xeokit-sdk/pull/1173)
-  Draw pick normal using 32 bits per color channel instead of default 8 - [#1172](https://github.com/xeokit/xeokit-sdk/pull/1172)
-  Make measurements controllers pluggable - [#1170](https://github.com/xeokit/xeokit-sdk/pull/1170)
-  fix BCF plugin set viewpoint - [#1169](https://github.com/xeokit/xeokit-sdk/pull/1169)
-  Improve vbo scene model snap pick performance - [#1161](https://github.com/xeokit/xeokit-sdk/pull/1161)
-  Distance and angle measurement snapping - [#1157](https://github.com/xeokit/xeokit-sdk/pull/1157)
-  Update node.js import to make them es compatible - [#1159](https://github.com/xeokit/xeokit-sdk/pull/1159)
-  Feature: add dual snap mode =&gt; vertex + edge - [#1158](https://github.com/xeokit/xeokit-sdk/pull/1158)
-  replace some console.log with console.info - [#1143](https://github.com/xeokit/xeokit-sdk/pull/1143)
-  Fix XKT 9 globalize IDs - [#1152](https://github.com/xeokit/xeokit-sdk/pull/1152)

# [v2.4.0-alpha-82](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-80...v2.4.0-alpha-82)

### 2 October 2023

-  Add ./src to package dist - [#1151](https://github.com/xeokit/xeokit-sdk/pull/1151)
-  Fixed occlusion shader for data textures #1148 - [#1150](https://github.com/xeokit/xeokit-sdk/pull/1150)
-  Load LAS/LAZ header data into MetaModel - [#1149](https://github.com/xeokit/xeokit-sdk/pull/1149)

# [v2.4.0-alpha-80](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-78...v2.4.0-alpha-80)

### 22 September 2023

-  Add pivot sphere - [#529](https://github.com/xeokit/xeokit-sdk/pull/529)

# [v2.4.0-alpha-78](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-73...v2.4.0-alpha-78)

### 20 September 2023

-  Ability to dynamically position & rotate SceneModel anywhere within World coordinate system  - [#1136](https://github.com/xeokit/xeokit-sdk/pull/1136)

# [v2.4.0-alpha-73](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-54...v2.4.0-alpha-73)

### 13 September 2023

-  Enable Viewer logarithmicDepthBuffer by default - [#1133](https://github.com/xeokit/xeokit-sdk/pull/1133)
-  Remove default colors for IFC objects from XKTLoaderPlugin - [#1132](https://github.com/xeokit/xeokit-sdk/pull/1132)
-  Fix perspective & ortho for canvas resize - [#1131](https://github.com/xeokit/xeokit-sdk/pull/1131)
-  MetaObject attributes - [#1129](https://github.com/xeokit/xeokit-sdk/pull/1129)
-  Add MetaModel types for multi XKT loading support - [#1127](https://github.com/xeokit/xeokit-sdk/pull/1127)
-  Extend XKTLoaderPlugin, MetaScene & MetaModel to batch-load split XKT… - [#1126](https://github.com/xeokit/xeokit-sdk/pull/1126)
-  Integrate refactorings - [#1125](https://github.com/xeokit/xeokit-sdk/pull/1125)

# [v2.4.0-alpha-54](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-53...v2.4.0-alpha-54)

### 21 August 2023

-  Use a `ResizeObserver` to detect changes in canvas size - [#1121](https://github.com/xeokit/xeokit-sdk/pull/1121)

# [v2.4.0-alpha-51](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-49...v2.4.0-alpha-51)

### 8 August 2023

-  Fix pset originalSystemId - [#1120](https://github.com/xeokit/xeokit-sdk/pull/1120)
-  Fix pset originalSystemId - [#1119](https://github.com/xeokit/xeokit-sdk/pull/1119)
-  simplify getSnapshotWithPlugins - [#1118](https://github.com/xeokit/xeokit-sdk/pull/1118)
-  VBOSceneModel: Support skew in instancing matrices for AABB initialization - [#1115](https://github.com/xeokit/xeokit-sdk/pull/1115)
-  DataTextureSceneModel: Support skew in instancing matrices for AABB initialization - [#1116](https://github.com/xeokit/xeokit-sdk/pull/1116)

# [v2.4.0-alpha-49](https://github.com/xeokit/xeokit-sdk/compare/2.4.0-alpha-47...v2.4.0-alpha-49)

### 3 August 2023

-  Support line-strip geometry in XKT - [#1114](https://github.com/xeokit/xeokit-sdk/pull/1114)
-  VBO Scene Model Renderers refactoring and performance improvement - [#1113](https://github.com/xeokit/xeokit-sdk/pull/1113)
-  use Uniform Block Buffer for main matrices in VBO Scene Model triangle layers - [#9](https://github.com/xeokit/xeokit-sdk/pull/9)

# [2.4.0-alpha-47](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-39...2.4.0-alpha-47)

### 29 July 2023

-  Fix texture binding in instancing renderer - [#1111](https://github.com/xeokit/xeokit-sdk/pull/1111)
-  Fix MetaScene.js - metaObject is undefined - [#1106](https://github.com/xeokit/xeokit-sdk/pull/1106)
-  Fix snapshots =&gt; flip Y - [#1104](https://github.com/xeokit/xeokit-sdk/pull/1104)
-  Improved merging algorithm for federated models - [#1103](https://github.com/xeokit/xeokit-sdk/pull/1103)
-  Update MousePanRotateDollyHandler.js - Add page scroll support - [#1100](https://github.com/xeokit/xeokit-sdk/pull/1100)

# [v2.4.0-alpha-39](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-27...v2.4.0-alpha-39)

### 12 July 2023

-  Fix pick triangle surface of mesh with origin - [#1092](https://github.com/xeokit/xeokit-sdk/pull/1092)
-  fix ray picking -&gt; RenderBuffer read y - [#1098](https://github.com/xeokit/xeokit-sdk/pull/1098)
-  FaceAlignedSectionPlanesPlugin - [#1088](https://github.com/xeokit/xeokit-sdk/pull/1088)
-  Fix entity `.destroy()` memory leaks linked to Scene.*Updated functions - [#1090](https://github.com/xeokit/xeokit-sdk/pull/1090)
-  Fix metaObject leaks - [#1087](https://github.com/xeokit/xeokit-sdk/pull/1087)
-  Stats `fps` field - [#1084](https://github.com/xeokit/xeokit-sdk/pull/1084)
-  Add stats typings - [#1085](https://github.com/xeokit/xeokit-sdk/pull/1085)
-  data-tex: use 12 instead of 16 floats to store entity matrices - [#1082](https://github.com/xeokit/xeokit-sdk/pull/1082)
-  VBOSceneModel - TriangleBatching - Only draw pick depth & normals of the picked mesh - [#1078](https://github.com/xeokit/xeokit-sdk/pull/1078)
-  fix & clean VBOSceneModel renderers - [#1077](https://github.com/xeokit/xeokit-sdk/pull/1077)
-  data-tex: reduce number of per-portion matrices - [#1075](https://github.com/xeokit/xeokit-sdk/pull/1075)
-  Remove useless Renderer picking commented code - [#1071](https://github.com/xeokit/xeokit-sdk/pull/1071)
-  Fix full precision picking in triangle instancing layer - [#1074](https://github.com/xeokit/xeokit-sdk/pull/1074)
-  Adapt the `DistanceMeasurementControl` so it can snap to vertex. - [#6](https://github.com/xeokit/xeokit-sdk/pull/6)

# [v2.4.0-alpha-27](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-23...v2.4.0-alpha-27)

### 1 June 2023

-  Show annotations and measurements in snapshots - [#1068](https://github.com/xeokit/xeokit-sdk/pull/1068)
-  Reduce VBOSceneModel flags memory footprint - [#1060](https://github.com/xeokit/xeokit-sdk/pull/1060)
-  Fire error event when loading a modal fails - [#1058](https://github.com/xeokit/xeokit-sdk/pull/1058)
-  Expose rtc maths globally - [#1056](https://github.com/xeokit/xeokit-sdk/pull/1056)

# [v2.4.0-alpha-23](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-22...v2.4.0-alpha-23)

### 22 May 2023

-  remove buffer.flags & flags2 arrays - [#1051](https://github.com/xeokit/xeokit-sdk/pull/1051)
-  Fix missing GLSL version on top of PointsBatchingOcclusionRenderer fragment shader - [#1047](https://github.com/xeokit/xeokit-sdk/pull/1047)
-  [fix]: make sure to restore `gl.pixelStatei` changes in `Texture2D` class - [#1044](https://github.com/xeokit/xeokit-sdk/pull/1044)

# [v2.4.0-alpha-21](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-2...v2.4.0-alpha-21)

### 12 May 2023

-  Upgrade CodeSee workflow to version 2 - [#968](https://github.com/xeokit/xeokit-sdk/pull/968)
-  Enable SAO rendering in Safari. - [#1038](https://github.com/xeokit/xeokit-sdk/pull/1038)
-  Annotation plugin custom z-index for markers & labels - [#1017](https://github.com/xeokit/xeokit-sdk/pull/1017)
-  [data-textures]: implement a smart deferred flags update mechanism - [#1037](https://github.com/xeokit/xeokit-sdk/pull/1037)
-  use project north - [#1035](https://github.com/xeokit/xeokit-sdk/pull/1035)
-  Remove duplicated line in Component.js - [#1036](https://github.com/xeokit/xeokit-sdk/pull/1036)
-  Chrome-for-Mac: improved mitigation for data-textures when SAO enabled - [#1029](https://github.com/xeokit/xeokit-sdk/pull/1029)
-  Add SAO support when using data-textures - [#1028](https://github.com/xeokit/xeokit-sdk/pull/1028)
-  Additional data-textures feature toggles - [#1027](https://github.com/xeokit/xeokit-sdk/pull/1027)
-  data-textures: make `VFC` mechanism support non-identity `model.worldMatrix` - [#1026](https://github.com/xeokit/xeokit-sdk/pull/1026)

# [v2.4.0-alpha-17](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-16...v2.4.0-alpha-17)

### 9 May 2023

-  Upgrade CodeSee workflow to version 2 - [#968](https://github.com/xeokit/xeokit-sdk/pull/968)

# [v2.4.0-alpha-16](https://github.com/xeokit/xeokit-sdk/compare/v2.4.0-alpha-12...v2.4.0-alpha-16)

### 4 May 2023

-  Enable SAO rendering in Safari. - [#1038](https://github.com/xeokit/xeokit-sdk/pull/1038)
-  Annotation plugin custom z-index for markers & labels - [#1017](https://github.com/xeokit/xeokit-sdk/pull/1017)
-  [data-textures]: implement a smart deferred flags update mechanism - [#1037](https://github.com/xeokit/xeokit-sdk/pull/1037)
-  use project north - [#1035](https://github.com/xeokit/xeokit-sdk/pull/1035)
-  Remove duplicated line in Component.js - [#1036](https://github.com/xeokit/xeokit-sdk/pull/1036)

# [v2.4.0-alpha-105](https://github.com/xeokit/xeokit-sdk/compare/v2.3.9...v2.4.0-alpha-105)

### 26 October 2023

-  Fix angle measurement highlighting on mouseover - [#1202](https://github.com/xeokit/xeokit-sdk/pull/1202)
-  Example tweaks - [#1201](https://github.com/xeokit/xeokit-sdk/pull/1201)
-  Fix BCF line set rounding error and bitmap Y-flipping - [#1200](https://github.com/xeokit/xeokit-sdk/pull/1200)
-  Fix SceneModel DTX edge renderer for entity offsetting #1196 - [#1197](https://github.com/xeokit/xeokit-sdk/pull/1197)
-  Use gradient technique to depth-init snapping buffers - [#1195](https://github.com/xeokit/xeokit-sdk/pull/1195)
-  Fix name &lt;-&gt; type in IFC loader - [#1191](https://github.com/xeokit/xeokit-sdk/pull/1191)
-  Pick normals using a 3x3 viewport - [#1177](https://github.com/xeokit/xeokit-sdk/pull/1177)
-  fix pick normal - [#1176](https://github.com/xeokit/xeokit-sdk/pull/1176)
-  1 x 1 picking viewport - [#1168](https://github.com/xeokit/xeokit-sdk/pull/1168)
-  Automatic LAS point set chunking to fit VBOs - tweak max point set length - [#1174](https://github.com/xeokit/xeokit-sdk/pull/1174)
-  Automatically split LAS point sets to fit in SceneModel VBOs - [#1173](https://github.com/xeokit/xeokit-sdk/pull/1173)
-  Draw pick normal using 32 bits per color channel instead of default 8 - [#1172](https://github.com/xeokit/xeokit-sdk/pull/1172)
-  Make measurements controllers pluggable - [#1170](https://github.com/xeokit/xeokit-sdk/pull/1170)
-  fix BCF plugin set viewpoint - [#1169](https://github.com/xeokit/xeokit-sdk/pull/1169)
-  Improve vbo scene model snap pick performance - [#1161](https://github.com/xeokit/xeokit-sdk/pull/1161)
-  Distance and angle measurement snapping - [#1157](https://github.com/xeokit/xeokit-sdk/pull/1157)
-  Update node.js import to make them es compatible - [#1159](https://github.com/xeokit/xeokit-sdk/pull/1159)
-  Feature: add dual snap mode =&gt; vertex + edge - [#1158](https://github.com/xeokit/xeokit-sdk/pull/1158)
-  replace some console.log with console.info - [#1143](https://github.com/xeokit/xeokit-sdk/pull/1143)
-  Fix XKT 9 globalize IDs - [#1152](https://github.com/xeokit/xeokit-sdk/pull/1152)
-  Add ./src to package dist - [#1151](https://github.com/xeokit/xeokit-sdk/pull/1151)
-  Fixed occlusion shader for data textures #1148 - [#1150](https://github.com/xeokit/xeokit-sdk/pull/1150)
-  Load LAS/LAZ header data into MetaModel - [#1149](https://github.com/xeokit/xeokit-sdk/pull/1149)
-  Add pivot sphere - [#529](https://github.com/xeokit/xeokit-sdk/pull/529)
-  Ability to dynamically position & rotate SceneModel anywhere within World coordinate system  - [#1136](https://github.com/xeokit/xeokit-sdk/pull/1136)
-  Enable Viewer logarithmicDepthBuffer by default - [#1133](https://github.com/xeokit/xeokit-sdk/pull/1133)
-  Remove default colors for IFC objects from XKTLoaderPlugin - [#1132](https://github.com/xeokit/xeokit-sdk/pull/1132)
-  Fix perspective & ortho for canvas resize - [#1131](https://github.com/xeokit/xeokit-sdk/pull/1131)
-  MetaObject attributes - [#1129](https://github.com/xeokit/xeokit-sdk/pull/1129)
-  Add MetaModel types for multi XKT loading support - [#1127](https://github.com/xeokit/xeokit-sdk/pull/1127)
-  Extend XKTLoaderPlugin, MetaScene & MetaModel to batch-load split XKT… - [#1126](https://github.com/xeokit/xeokit-sdk/pull/1126)
-  Integrate refactorings - [#1125](https://github.com/xeokit/xeokit-sdk/pull/1125)
-  Use a `ResizeObserver` to detect changes in canvas size - [#1121](https://github.com/xeokit/xeokit-sdk/pull/1121)
-  Fix pset originalSystemId - [#1120](https://github.com/xeokit/xeokit-sdk/pull/1120)
-  Fix pset originalSystemId - [#1119](https://github.com/xeokit/xeokit-sdk/pull/1119)
-  simplify getSnapshotWithPlugins - [#1118](https://github.com/xeokit/xeokit-sdk/pull/1118)
-  VBOSceneModel: Support skew in instancing matrices for AABB initialization - [#1115](https://github.com/xeokit/xeokit-sdk/pull/1115)
-  DataTextureSceneModel: Support skew in instancing matrices for AABB initialization - [#1116](https://github.com/xeokit/xeokit-sdk/pull/1116)
-  Support line-strip geometry in XKT - [#1114](https://github.com/xeokit/xeokit-sdk/pull/1114)
-  VBO Scene Model Renderers refactoring and performance improvement - [#1113](https://github.com/xeokit/xeokit-sdk/pull/1113)
-  use Uniform Block Buffer for main matrices in VBO Scene Model triangle layers - [#9](https://github.com/xeokit/xeokit-sdk/pull/9)
-  Fix texture binding in instancing renderer - [#1111](https://github.com/xeokit/xeokit-sdk/pull/1111)
-  Fix MetaScene.js - metaObject is undefined - [#1106](https://github.com/xeokit/xeokit-sdk/pull/1106)
-  Fix snapshots =&gt; flip Y - [#1104](https://github.com/xeokit/xeokit-sdk/pull/1104)
-  Improved merging algorithm for federated models - [#1103](https://github.com/xeokit/xeokit-sdk/pull/1103)
-  Update MousePanRotateDollyHandler.js - Add page scroll support - [#1100](https://github.com/xeokit/xeokit-sdk/pull/1100)
-  Fix pick triangle surface of mesh with origin - [#1092](https://github.com/xeokit/xeokit-sdk/pull/1092)
-  fix ray picking -&gt; RenderBuffer read y - [#1098](https://github.com/xeokit/xeokit-sdk/pull/1098)
-  FaceAlignedSectionPlanesPlugin - [#1088](https://github.com/xeokit/xeokit-sdk/pull/1088)
-  Fix entity `.destroy()` memory leaks linked to Scene.*Updated functions - [#1090](https://github.com/xeokit/xeokit-sdk/pull/1090)
-  Fix metaObject leaks - [#1087](https://github.com/xeokit/xeokit-sdk/pull/1087)
-  Stats `fps` field - [#1084](https://github.com/xeokit/xeokit-sdk/pull/1084)
-  Add stats typings - [#1085](https://github.com/xeokit/xeokit-sdk/pull/1085)
-  data-tex: use 12 instead of 16 floats to store entity matrices - [#1082](https://github.com/xeokit/xeokit-sdk/pull/1082)
-  VBOSceneModel - TriangleBatching - Only draw pick depth & normals of the picked mesh - [#1078](https://github.com/xeokit/xeokit-sdk/pull/1078)
-  fix & clean VBOSceneModel renderers - [#1077](https://github.com/xeokit/xeokit-sdk/pull/1077)
-  data-tex: reduce number of per-portion matrices - [#1075](https://github.com/xeokit/xeokit-sdk/pull/1075)
-  Remove useless Renderer picking commented code - [#1071](https://github.com/xeokit/xeokit-sdk/pull/1071)
-  Fix full precision picking in triangle instancing layer - [#1074](https://github.com/xeokit/xeokit-sdk/pull/1074)
-  Adapt the `DistanceMeasurementControl` so it can snap to vertex. - [#6](https://github.com/xeokit/xeokit-sdk/pull/6)
-  Show annotations and measurements in snapshots - [#1068](https://github.com/xeokit/xeokit-sdk/pull/1068)
-  Reduce VBOSceneModel flags memory footprint - [#1060](https://github.com/xeokit/xeokit-sdk/pull/1060)
-  Fire error event when loading a modal fails - [#1058](https://github.com/xeokit/xeokit-sdk/pull/1058)
-  Expose rtc maths globally - [#1056](https://github.com/xeokit/xeokit-sdk/pull/1056)
-  remove buffer.flags & flags2 arrays - [#1051](https://github.com/xeokit/xeokit-sdk/pull/1051)
-  Fix missing GLSL version on top of PointsBatchingOcclusionRenderer fragment shader - [#1047](https://github.com/xeokit/xeokit-sdk/pull/1047)
-  [fix]: make sure to restore `gl.pixelStatei` changes in `Texture2D` class - [#1044](https://github.com/xeokit/xeokit-sdk/pull/1044)
-  Upgrade CodeSee workflow to version 2 - [#968](https://github.com/xeokit/xeokit-sdk/pull/968)
-  Enable SAO rendering in Safari. - [#1038](https://github.com/xeokit/xeokit-sdk/pull/1038)
-  Annotation plugin custom z-index for markers & labels - [#1017](https://github.com/xeokit/xeokit-sdk/pull/1017)
-  [data-textures]: implement a smart deferred flags update mechanism - [#1037](https://github.com/xeokit/xeokit-sdk/pull/1037)
-  use project north - [#1035](https://github.com/xeokit/xeokit-sdk/pull/1035)
-  Remove duplicated line in Component.js - [#1036](https://github.com/xeokit/xeokit-sdk/pull/1036)
-  Chrome-for-Mac: improved mitigation for data-textures when SAO enabled - [#1029](https://github.com/xeokit/xeokit-sdk/pull/1029)
-  Add SAO support when using data-textures - [#1028](https://github.com/xeokit/xeokit-sdk/pull/1028)
-  Additional data-textures feature toggles - [#1027](https://github.com/xeokit/xeokit-sdk/pull/1027)
-  data-textures: make `VFC` mechanism support non-identity `model.worldMatrix` - [#1026](https://github.com/xeokit/xeokit-sdk/pull/1026)
-  Improvements in the LOD mechanism - [#1018](https://github.com/xeokit/xeokit-sdk/pull/1018)
-  [DataTexturePerformanceModel]: 80% GPU RAM savings! - [#824](https://github.com/xeokit/xeokit-sdk/pull/824)
-  Fix imports - [#1015](https://github.com/xeokit/xeokit-sdk/pull/1015)
-  Fix loaders.gl import - [#1014](https://github.com/xeokit/xeokit-sdk/pull/1014)
-  fix imports to make them ES valid - [#1012](https://github.com/xeokit/xeokit-sdk/pull/1012)
-  fix typo in LineBatchingLayer - [#1010](https://github.com/xeokit/xeokit-sdk/pull/1010)
-  Metadata improvements - [#1005](https://github.com/xeokit/xeokit-sdk/pull/1005)
-  Skip inactive section planes in BCF getViewpoint - [#1003](https://github.com/xeokit/xeokit-sdk/pull/1003)

# [v2.3.9](https://github.com/xeokit/xeokit-sdk/compare/v2.3.7...v2.3.9)

### 2 February 2023

-  Added github actions workflows - [#987](https://github.com/xeokit/xeokit-sdk/pull/987)

# [v2.3.7](https://github.com/xeokit/xeokit-sdk/compare/v2.3.3...v2.3.7)

### 13 January 2023

-  Updated typings - [#984](https://github.com/xeokit/xeokit-sdk/pull/984)

# [v2.3.3](https://github.com/xeokit/xeokit-sdk/compare/v2.3.2...v2.3.3)

### 5 December 2022

-  Missing parenthesis in buildBoxLinesGeometry doc - [#967](https://github.com/xeokit/xeokit-sdk/pull/967)
-  Added a dot to package.json field module and main - [#955](https://github.com/xeokit/xeokit-sdk/pull/955)
-  Added light typings And fixed small error - [#949](https://github.com/xeokit/xeokit-sdk/pull/949)
-  Missing xrayed initialization - [#933](https://github.com/xeokit/xeokit-sdk/pull/933)

# [v2.3.2](https://github.com/xeokit/xeokit-sdk/compare/v2.3.1...v2.3.2)

### 16 September 2022

-  Typings for builders - [#932](https://github.com/xeokit/xeokit-sdk/pull/932)
-  Typings for VBOGeometry and buildGridGeometry - [#931](https://github.com/xeokit/xeokit-sdk/pull/931)
-  Scene object events for XRayed, Highlighted and Selected - [#930](https://github.com/xeokit/xeokit-sdk/pull/930)
-  Fixed that aspect ratio in imagePlanes only worked for images where width &gt;= height - [#923](https://github.com/xeokit/xeokit-sdk/pull/923)
-  Bump terser from 5.10.0 to 5.14.2 - [#895](https://github.com/xeokit/xeokit-sdk/pull/895)

# [v2.3.1](https://github.com/xeokit/xeokit-sdk/compare/v2.3.0...v2.3.1)

### 19 August 2022

-  Fix quantization underflow for reused geometries #917 - [#918](https://github.com/xeokit/xeokit-sdk/pull/918)

# [v2.3.0](https://github.com/xeokit/xeokit-sdk/compare/v2.2.5-beta-4...v2.3.0)

### 16 August 2022

-  Added ticks event for scene - [#911](https://github.com/xeokit/xeokit-sdk/pull/911)
-  Add gamma correction to colorTexture rendering mode - [#905](https://github.com/xeokit/xeokit-sdk/pull/905)
-  Babel es5 compilation - [#903](https://github.com/xeokit/xeokit-sdk/pull/903)
-  Precision mode for touch distance measurement #816 - [#890](https://github.com/xeokit/xeokit-sdk/pull/890)
-  Touch support for measurement plugins  - [#889](https://github.com/xeokit/xeokit-sdk/pull/889)
-  Fix JS imports by adding the proper `.js` suffix to the `import`-ed files - [#882](https://github.com/xeokit/xeokit-sdk/pull/882)
-  Handle bitmaps and lines in BCF viewpoints #327 - [#880](https://github.com/xeokit/xeokit-sdk/pull/880)
-  Rename PerformanceModel as VBOSceneModel #866 - [#867](https://github.com/xeokit/xeokit-sdk/pull/867)
-  Fix XKT v10 transparency; texture loading hack; added example - [#860](https://github.com/xeokit/xeokit-sdk/pull/860)
-  Fixed CameraControl picking and made double click time frame configurable - [#855](https://github.com/xeokit/xeokit-sdk/pull/855)

# [v2.2.5-beta-4](https://github.com/xeokit/xeokit-sdk/compare/2.2.2...v2.2.5-beta-4)

### 12 April 2022

-  Updated typings and added new types - [#841](https://github.com/xeokit/xeokit-sdk/pull/841)
-  Handle container offsets in distance & angle measurement - [#794](https://github.com/xeokit/xeokit-sdk/pull/794)
-  Typed the possible cameraControl events - [#839](https://github.com/xeokit/xeokit-sdk/pull/839)
-  Fixed some jsdoc comments - [#835](https://github.com/xeokit/xeokit-sdk/pull/835)
-  Fix: component.id should be string - [#836](https://github.com/xeokit/xeokit-sdk/pull/836)
-  Fixed minor issues in the typings - [#833](https://github.com/xeokit/xeokit-sdk/pull/833)
-  Error in typings, the componentId is alway a string. - [#830](https://github.com/xeokit/xeokit-sdk/pull/830)
-  Additional typescript events - [#829](https://github.com/xeokit/xeokit-sdk/pull/829)
-  Describing events in components - [#828](https://github.com/xeokit/xeokit-sdk/pull/828)
-  Typescript typings - [#826](https://github.com/xeokit/xeokit-sdk/pull/826)
-  Bump node-fetch from 2.6.1 to 2.6.7 - [#810](https://github.com/xeokit/xeokit-sdk/pull/810)
-  Fix JS imports - [#809](https://github.com/xeokit/xeokit-sdk/pull/809)
-  Fix init when canvas size is changed during initialization - [#798](https://github.com/xeokit/xeokit-sdk/pull/798)

# [2.2.2](https://github.com/xeokit/xeokit-sdk/compare/2.1.0...2.2.2)

### 26 December 2021

-  prevent console warnings on scroll. - [#783](https://github.com/xeokit/xeokit-sdk/pull/783)
-  CityJSONLoaderPlugin - [#782](https://github.com/xeokit/xeokit-sdk/pull/782)

# [2.1.0](https://github.com/xeokit/xeokit-sdk/compare/1.9.0...2.1.0)

### 30 November 2021

-  fix: set skybox unclippable. - [#746](https://github.com/xeokit/xeokit-sdk/pull/746)
-  Add commonjs build - [#773](https://github.com/xeokit/xeokit-sdk/pull/773)
-  Create LASLoaderPlugin #776 - [#777](https://github.com/xeokit/xeokit-sdk/pull/777)
-  FastNavPlugin improved - [#775](https://github.com/xeokit/xeokit-sdk/pull/775)
-  Optimize PerformanceModel finalize #771 - [#772](https://github.com/xeokit/xeokit-sdk/pull/772)
-  XKTLoaderPlugin optimization: selectively batch instanced geometries  - [#770](https://github.com/xeokit/xeokit-sdk/pull/770)
-  Ifcloaderplugin - [#760](https://github.com/xeokit/xeokit-sdk/pull/760)
-  API change: rename "rtcCenter" to "origin" - [#753](https://github.com/xeokit/xeokit-sdk/pull/753)
-  Events + More flexible API for Distance & Angle Measurement Plugins - [#751](https://github.com/xeokit/xeokit-sdk/pull/751)
-  Fix issue https://github.com/xeokit/xeokit-sdk/issues/738 - [#744](https://github.com/xeokit/xeokit-sdk/pull/744)
-  Image Plane destroy #668 - [#739](https://github.com/xeokit/xeokit-sdk/pull/739)
-  Hotfix: add dist back to .gitignore file - [#734](https://github.com/xeokit/xeokit-sdk/pull/734)
-  Set up the env to run XKTLoaderPlugin in headless mode - [#733](https://github.com/xeokit/xeokit-sdk/pull/733)
-  NavCubePlugin: Add visibility option for the shadow - [#732](https://github.com/xeokit/xeokit-sdk/pull/732)
-  fix gltf primitives parser - [#664](https://github.com/xeokit/xeokit-sdk/pull/664)
-  Keyboard handlers should listen to scene inputs instead of document events - [#707](https://github.com/xeokit/xeokit-sdk/pull/707)
-  Enhance the skybox effect - keep skybox in background - [#720](https://github.com/xeokit/xeokit-sdk/pull/720)
-  Fixed the bug in AxisGizmo that x-axis direction is wrong - [#715](https://github.com/xeokit/xeokit-sdk/pull/715)
-  Merge from xeokit-sdk to forked code base - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)
-  Convert to ts - [#714](https://github.com/xeokit/xeokit-sdk/pull/714)
-  Localization - [#694](https://github.com/xeokit/xeokit-sdk/pull/694)
-  Full-precision triangle mesh picking and measurement #691 #692 #690 - [#693](https://github.com/xeokit/xeokit-sdk/pull/693)
-  XKT v9 - [#682](https://github.com/xeokit/xeokit-sdk/pull/682)
-  Fix safari user agent detector in SAO - [#681](https://github.com/xeokit/xeokit-sdk/pull/681)
-  Clean spinner destroy - [#673](https://github.com/xeokit/xeokit-sdk/pull/673)

# [1.9.0](https://github.com/xeokit/xeokit-sdk/compare/1.8.2...1.9.0)

### 14 May 2021

-  Distance measurement axes scale bugfix - [#648](https://github.com/xeokit/xeokit-sdk/pull/648)
-  distance measurement axis correction - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)
-  Example tweaks - [#643](https://github.com/xeokit/xeokit-sdk/pull/643)
-  XKT V8 - [#642](https://github.com/xeokit/xeokit-sdk/pull/642)
-  Add index.js for base js files - [#637](https://github.com/xeokit/xeokit-sdk/pull/637)

# [1.7.1](https://github.com/xeokit/xeokit-sdk/compare/1.7.0-alpha.4...1.7.1)

### 18 March 2021

-  XKT v7 - [#584](https://github.com/xeokit/xeokit-sdk/pull/584)

# [1.7.0-alpha.4](https://github.com/xeokit/xeokit-sdk/compare/1.7.0-alpha.1...1.7.0-alpha.4)

### 5 March 2021

-  Take window scroll into account when placing follow pointer - [#575](https://github.com/xeokit/xeokit-sdk/pull/575)

# [1.7.0-alpha.1](https://github.com/xeokit/xeokit-sdk/compare/1.6.0...1.7.0-alpha.1)

### 27 January 2021

-  Fix surface picking option to not pick surface normal #550 - [#551](https://github.com/xeokit/xeokit-sdk/pull/551)

# [1.6.0](https://github.com/xeokit/xeokit-sdk/compare/1.5.22...1.6.0)

### 19 January 2021

-  fix #535 - correct canvas coordinate from event - [#537](https://github.com/xeokit/xeokit-sdk/pull/537)
-  Adds CameraControl#smartPivot - [#534](https://github.com/xeokit/xeokit-sdk/pull/534)
-  Logarithmic depthbuffer - [#532](https://github.com/xeokit/xeokit-sdk/pull/532)
-  Pan/Rotate: mousemove event listen on document instead of canvas - [#527](https://github.com/xeokit/xeokit-sdk/pull/527)
-  SectionPlanesPlugin optional overview canvas id. - [#524](https://github.com/xeokit/xeokit-sdk/pull/524)
-  Remove default cursor style. - [#522](https://github.com/xeokit/xeokit-sdk/pull/522)
-  Load the beautiful Basilic - [#518](https://github.com/xeokit/xeokit-sdk/pull/518)
-  Optional offsets - [#517](https://github.com/xeokit/xeokit-sdk/pull/517)
-  Fix unwanted "picked*" events from pinch-to-zoom on touch devices #438 - [#512](https://github.com/xeokit/xeokit-sdk/pull/512)
-  Remove duplicated line in Renderer.js - [#508](https://github.com/xeokit/xeokit-sdk/pull/508)

# [1.5.22](https://github.com/xeokit/xeokit-sdk/compare/1.5.14...1.5.22)

### 10 December 2020

-  simplify BCF plugin - [#497](https://github.com/xeokit/xeokit-sdk/pull/497)
-  Fix sectionplane control size - [#496](https://github.com/xeokit/xeokit-sdk/pull/496)
-  Multimodels - [#495](https://github.com/xeokit/xeokit-sdk/pull/495)

# [1.5.13](https://github.com/xeokit/xeokit-sdk/compare/1.5.11...1.5.13)

### 23 November 2020

-  CHANGE_LOG updates - [#476](https://github.com/xeokit/xeokit-sdk/pull/476)
-  Fix case for which SectionPlane does not clip everything #474 - [#475](https://github.com/xeokit/xeokit-sdk/pull/475)

# [1.5.3](https://github.com/xeokit/xeokit-sdk/compare/1.5.2...1.5.3)

### 23 December 2020

-  Fix unwanted "picked*" events from pinch-to-zoom on touch devices #438 - [#512](https://github.com/xeokit/xeokit-sdk/pull/512)
-  Remove duplicated line in Renderer.js - [#508](https://github.com/xeokit/xeokit-sdk/pull/508)
-  simplify BCF plugin - [#497](https://github.com/xeokit/xeokit-sdk/pull/497)

# [1.5.2](https://github.com/xeokit/xeokit-sdk/compare/1.5.1...1.5.2)

### 9 December 2020

-  Fix sectionplane control size - [#496](https://github.com/xeokit/xeokit-sdk/pull/496)
-  Multimodels - [#495](https://github.com/xeokit/xeokit-sdk/pull/495)
-  CHANGE_LOG updates - [#476](https://github.com/xeokit/xeokit-sdk/pull/476)
-  Fix case for which SectionPlane does not clip everything #474 - [#475](https://github.com/xeokit/xeokit-sdk/pull/475)

# [1.5.0](https://github.com/xeokit/xeokit-sdk/compare/v1.4.7...1.5.0)

### 12 November 2020

-  Add Scene#getAABB() full-precision coordinate support #457 - [#460](https://github.com/xeokit/xeokit-sdk/pull/460)
-  Add Scene#getAABB() full-precision coordinate support #457 - [#459](https://github.com/xeokit/xeokit-sdk/pull/459)
-  Add Scene#getAABB() full-precision coordinate support #457 - [#458](https://github.com/xeokit/xeokit-sdk/pull/458)
-  Support full-precision model geometry  - [#456](https://github.com/xeokit/xeokit-sdk/pull/456)

# [v1.4.7](https://github.com/xeokit/xeokit-sdk/compare/v1.4.4...v1.4.7)

### 28 October 2020

-  Fix setViewpoint colors - [#444](https://github.com/xeokit/xeokit-sdk/pull/444)

# [v1.4.0](https://github.com/xeokit/xeokit-sdk/compare/v1.3.8...v1.4.0)

### 10 September 2020

-  Multilevel ContextMenu - [#418](https://github.com/xeokit/xeokit-sdk/pull/418)
-  Improve CameraControl touch dolly/pan - [#415](https://github.com/xeokit/xeokit-sdk/pull/415)

# [v1.3.8](https://github.com/xeokit/xeokit-sdk/compare/v1.3.7...v1.3.8)

### 14 August 2020

-  Upgrade to bimserver 1.5.182 - example and fixes - [#409](https://github.com/xeokit/xeokit-sdk/pull/409)
-  Added missing BIMServerLoaderPlugin "modelLoaded" event #287 - [#408](https://github.com/xeokit/xeokit-sdk/pull/408)
-  Upgrade to bimserver 1.5.182 - [#407](https://github.com/xeokit/xeokit-sdk/pull/407)
-  Support BIMServer 1.5.182 #287 - [#405](https://github.com/xeokit/xeokit-sdk/pull/405)
-  CameraControl picking optimizations and fixes - [#404](https://github.com/xeokit/xeokit-sdk/pull/404)

# [v1.3.7](https://github.com/xeokit/xeokit-sdk/compare/1.3.6...v1.3.7)

### 7 August 2020

-  Remappable cameracontrol keys - [#395](https://github.com/xeokit/xeokit-sdk/pull/395)
-  add cameraControl.touchDollyRate config and simplify touch code - [#392](https://github.com/xeokit/xeokit-sdk/pull/392)
-  Bump lodash from 4.17.15 to 4.17.19 - [#383](https://github.com/xeokit/xeokit-sdk/pull/383)

# [1.3.6](https://github.com/xeokit/xeokit-sdk/compare/1.3.4...1.3.6)

### 16 July 2020

-  Add pan rate config for touch - [#363](https://github.com/xeokit/xeokit-sdk/pull/363)
-  Not initializing lastX and lastY leads to NaN - [#357](https://github.com/xeokit/xeokit-sdk/pull/357)
-  View culling - [#355](https://github.com/xeokit/xeokit-sdk/pull/355)
-  Dynamically movable Entities - [#353](https://github.com/xeokit/xeokit-sdk/pull/353)
-  Concurrent model loading - [#348](https://github.com/xeokit/xeokit-sdk/pull/348)

# [1.3.4](https://github.com/xeokit/xeokit-sdk/compare/1.1.0...1.3.4)

### 15 June 2020

-  Feature/bcf opacity - [#345](https://github.com/xeokit/xeokit-sdk/pull/345)
-  Remove console.log - [#344](https://github.com/xeokit/xeokit-sdk/pull/344)
-  implement getViewpoint coloring - [#342](https://github.com/xeokit/xeokit-sdk/pull/342)
-  Fix BCF clipping planes realWorldOffset - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)
-  Implement BCF coloring in setViewpoint - [#334](https://github.com/xeokit/xeokit-sdk/pull/334)
-  Add creation/version/authoring properties to MetaModel - [#330](https://github.com/xeokit/xeokit-sdk/pull/330)
-  Fix clipping planes with yUp models and add option to reverse clippin… - [#323](https://github.com/xeokit/xeokit-sdk/pull/323)
-  Fix initializing BatchingLayer.colorsBuf - [#314](https://github.com/xeokit/xeokit-sdk/pull/314)

# [1.1.0](https://github.com/xeokit/xeokit-sdk/compare/v0.7.2-sao-deferred...1.1.0)

### 25 May 2020

-  Remove debug logs - [#312](https://github.com/xeokit/xeokit-sdk/pull/312)
-  XKTLoaderPlugin refactor - factor out parsers for various XKT formats into modules  - [#297](https://github.com/xeokit/xeokit-sdk/pull/297)
-  Improved camera controls - [#296](https://github.com/xeokit/xeokit-sdk/pull/296)
-  Fix: Fix DistanceMeasurement plugin length property - [#295](https://github.com/xeokit/xeokit-sdk/pull/295)
-  Optimizations #1 - [#283](https://github.com/xeokit/xeokit-sdk/pull/283)
-  Fixes: Tree Plugin not working when loading models from the BIMServer - [#273](https://github.com/xeokit/xeokit-sdk/pull/273)
-  Added support for BIMServer 1.5.180 - [#270](https://github.com/xeokit/xeokit-sdk/pull/270)
-  Preserve edge emphasis with SAO - [#249](https://github.com/xeokit/xeokit-sdk/pull/249)

# [0.5.21](https://github.com/xeokit/xeokit-sdk/compare/v0.5.0...0.5.21)

### 9 December 2020

-  Fix sectionplane control size - [#496](https://github.com/xeokit/xeokit-sdk/pull/496)
-  Multimodels - [#495](https://github.com/xeokit/xeokit-sdk/pull/495)
-  CHANGE_LOG updates - [#476](https://github.com/xeokit/xeokit-sdk/pull/476)
-  Fix case for which SectionPlane does not clip everything #474 - [#475](https://github.com/xeokit/xeokit-sdk/pull/475)
-  Add Scene#getAABB() full-precision coordinate support #457 - [#460](https://github.com/xeokit/xeokit-sdk/pull/460)
-  Add Scene#getAABB() full-precision coordinate support #457 - [#459](https://github.com/xeokit/xeokit-sdk/pull/459)
-  Add Scene#getAABB() full-precision coordinate support #457 - [#458](https://github.com/xeokit/xeokit-sdk/pull/458)
-  Support full-precision model geometry  - [#456](https://github.com/xeokit/xeokit-sdk/pull/456)
-  Fix setViewpoint colors - [#444](https://github.com/xeokit/xeokit-sdk/pull/444)
-  Multilevel ContextMenu - [#418](https://github.com/xeokit/xeokit-sdk/pull/418)
-  Improve CameraControl touch dolly/pan - [#415](https://github.com/xeokit/xeokit-sdk/pull/415)
-  Upgrade to bimserver 1.5.182 - example and fixes - [#409](https://github.com/xeokit/xeokit-sdk/pull/409)
-  Added missing BIMServerLoaderPlugin "modelLoaded" event #287 - [#408](https://github.com/xeokit/xeokit-sdk/pull/408)
-  Upgrade to bimserver 1.5.182 - [#407](https://github.com/xeokit/xeokit-sdk/pull/407)
-  Support BIMServer 1.5.182 #287 - [#405](https://github.com/xeokit/xeokit-sdk/pull/405)
-  CameraControl picking optimizations and fixes - [#404](https://github.com/xeokit/xeokit-sdk/pull/404)
-  Remappable cameracontrol keys - [#395](https://github.com/xeokit/xeokit-sdk/pull/395)
-  add cameraControl.touchDollyRate config and simplify touch code - [#392](https://github.com/xeokit/xeokit-sdk/pull/392)
-  Bump lodash from 4.17.15 to 4.17.19 - [#383](https://github.com/xeokit/xeokit-sdk/pull/383)
-  Add pan rate config for touch - [#363](https://github.com/xeokit/xeokit-sdk/pull/363)
-  Not initializing lastX and lastY leads to NaN - [#357](https://github.com/xeokit/xeokit-sdk/pull/357)
-  View culling - [#355](https://github.com/xeokit/xeokit-sdk/pull/355)
-  Dynamically movable Entities - [#353](https://github.com/xeokit/xeokit-sdk/pull/353)
-  Concurrent model loading - [#348](https://github.com/xeokit/xeokit-sdk/pull/348)
-  Feature/bcf opacity - [#345](https://github.com/xeokit/xeokit-sdk/pull/345)
-  Remove console.log - [#344](https://github.com/xeokit/xeokit-sdk/pull/344)
-  implement getViewpoint coloring - [#342](https://github.com/xeokit/xeokit-sdk/pull/342)
-  Fix BCF clipping planes realWorldOffset - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)
-  Implement BCF coloring in setViewpoint - [#334](https://github.com/xeokit/xeokit-sdk/pull/334)
-  Add creation/version/authoring properties to MetaModel - [#330](https://github.com/xeokit/xeokit-sdk/pull/330)
-  Fix clipping planes with yUp models and add option to reverse clippin… - [#323](https://github.com/xeokit/xeokit-sdk/pull/323)
-  Fix initializing BatchingLayer.colorsBuf - [#314](https://github.com/xeokit/xeokit-sdk/pull/314)
-  Remove debug logs - [#312](https://github.com/xeokit/xeokit-sdk/pull/312)
-  XKTLoaderPlugin refactor - factor out parsers for various XKT formats into modules  - [#297](https://github.com/xeokit/xeokit-sdk/pull/297)
-  Improved camera controls - [#296](https://github.com/xeokit/xeokit-sdk/pull/296)
-  Fix: Fix DistanceMeasurement plugin length property - [#295](https://github.com/xeokit/xeokit-sdk/pull/295)
-  Optimizations #1 - [#283](https://github.com/xeokit/xeokit-sdk/pull/283)
-  Fixes: Tree Plugin not working when loading models from the BIMServer - [#273](https://github.com/xeokit/xeokit-sdk/pull/273)
-  Added support for BIMServer 1.5.180 - [#270](https://github.com/xeokit/xeokit-sdk/pull/270)
-  Preserve edge emphasis with SAO - [#249](https://github.com/xeokit/xeokit-sdk/pull/249)
-  Initial SAO - [#248](https://github.com/xeokit/xeokit-sdk/pull/248)
-  Snapshot option - BCFViewpointsPlugin getViewpoint - [#228](https://github.com/xeokit/xeokit-sdk/pull/228)
-  Remove cursor style on document mouseup event - [#226](https://github.com/xeokit/xeokit-sdk/pull/226)
-  Remove default cursor style on canvas - [#225](https://github.com/xeokit/xeokit-sdk/pull/225)
-  fix GLTF load with file instead of src - [#224](https://github.com/xeokit/xeokit-sdk/pull/224)
-  BCFViewpointsPlugin setViewpoint reset objects - [#214](https://github.com/xeokit/xeokit-sdk/pull/214)
-  Implement real-world coordinates and z-up camera for BCF compliance - [#207](https://github.com/xeokit/xeokit-sdk/pull/207)
-  setViewpoint not immediate - [#180](https://github.com/xeokit/xeokit-sdk/pull/180)
-  Allow Z axis to be set as up in NavCubePlugin - [#191](https://github.com/xeokit/xeokit-sdk/pull/191)

# [v0.5.0](https://github.com/xeokit/xeokit-sdk/compare/v0.4.0...v0.5.0)

### 22 October 2019

-  revert #172 and fix #171 - [#173](https://github.com/xeokit/xeokit-sdk/pull/173)
-  panRightClick config option misplaced - [#172](https://github.com/xeokit/xeokit-sdk/pull/172)
-  allow disabling camera on right click - [#171](https://github.com/xeokit/xeokit-sdk/pull/171)
-  Objects not properly deregistered from scene when destroyed - [#170](https://github.com/xeokit/xeokit-sdk/pull/170)
-  Story plans plugin - BETA - [#169](https://github.com/xeokit/xeokit-sdk/pull/169)
-  Fix syntax error in XKT loader - [#165](https://github.com/xeokit/xeokit-sdk/pull/165)
-  Fix last entity not loaded - [#164](https://github.com/xeokit/xeokit-sdk/pull/164)
-  fix pako import when using rollup - [#161](https://github.com/xeokit/xeokit-sdk/pull/161)
-  fix wrong event name subscription - [#159](https://github.com/xeokit/xeokit-sdk/pull/159)
-  Quick fix - no entity sent on hoverOut event - [#156](https://github.com/xeokit/xeokit-sdk/pull/156)
-  XKT V2 - [#153](https://github.com/xeokit/xeokit-sdk/pull/153)
-  Fixed BCF selection reset. - [#141](https://github.com/xeokit/xeokit-sdk/pull/141)
-  Bump eslint-utils from 1.3.1 to 1.4.2 - [#136](https://github.com/xeokit/xeokit-sdk/pull/136)

# [v0.4.0](https://github.com/xeokit/xeokit-sdk/compare/v0.3.0...v0.4.0)

### 25 August 2019

-  Distance measurement - [#133](https://github.com/xeokit/xeokit-sdk/pull/133)
-  fix bcfSnapshot png format - [#132](https://github.com/xeokit/xeokit-sdk/pull/132)
-  Implemented canvasElement config option - [#127](https://github.com/xeokit/xeokit-sdk/pull/127)
-  ESDoc tweaks - [#126](https://github.com/xeokit/xeokit-sdk/pull/126)
-  Bump lodash from 4.17.11 to 4.17.15 - [#125](https://github.com/xeokit/xeokit-sdk/pull/125)
-  Distance measurement - [#124](https://github.com/xeokit/xeokit-sdk/pull/124)
-  Input.js &gt; remove duplicates and treat Ctrl and Alt Keys correctly - [#121](https://github.com/xeokit/xeokit-sdk/pull/121)
-  Revert PR #98 - [#113](https://github.com/xeokit/xeokit-sdk/pull/113)
-  revert PR #99 - [#112](https://github.com/xeokit/xeokit-sdk/pull/112)
-  Fixed pako import to work with bundlers. - [#119](https://github.com/xeokit/xeokit-sdk/pull/119)

# [v0.3.0](https://github.com/xeokit/xeokit-sdk/compare/v0.2.0...v0.3.0)

### 8 July 2019

-  add default params for createSectionPlane - [#104](https://github.com/xeokit/xeokit-sdk/pull/104)
-  remove shownControlId when section plane destroyed - [#103](https://github.com/xeokit/xeokit-sdk/pull/103)
-  Rename some example pages - [#102](https://github.com/xeokit/xeokit-sdk/pull/102)
-  Add XKTLoaderPlugin - [#101](https://github.com/xeokit/xeokit-sdk/pull/101)
-  arguments in wrong order in GLTFLoaderPlugin - [#99](https://github.com/xeokit/xeokit-sdk/pull/99)
-  arguments in the wrong order in GLTFQualityLoader - [#98](https://github.com/xeokit/xeokit-sdk/pull/98)
-  Include only src dir in package.json for node installs - [#82](https://github.com/xeokit/xeokit-sdk/pull/82)
-  Customizable spinner appearance - [#80](https://github.com/xeokit/xeokit-sdk/pull/80)

# [v0.2.0](https://github.com/xeokit/xeokit-sdk/compare/v0.1.7...v0.2.0)

### 27 May 2019

-  Annotations - [#75](https://github.com/xeokit/xeokit-sdk/pull/75)
-  Remove background canvas div - [#67](https://github.com/xeokit/xeokit-sdk/pull/67)
-  Tweak SectionPlanesPlugin overview FOV and zoom - [#66](https://github.com/xeokit/xeokit-sdk/pull/66)
-  Cross section control - [#65](https://github.com/xeokit/xeokit-sdk/pull/65)
-  Remove unused code (which includes globals) - [#63](https://github.com/xeokit/xeokit-sdk/pull/63)
-  Cross section control - [#62](https://github.com/xeokit/xeokit-sdk/pull/62)
-  Ability to configure GLTFLoaderPlugin with a custom data source - [#54](https://github.com/xeokit/xeokit-sdk/pull/54)
-  Screenshots - [#53](https://github.com/xeokit/xeokit-sdk/pull/53)
-  Same treatement for status code == 0 as for status code == 200 when loading JSON files. - [#47](https://github.com/xeokit/xeokit-sdk/pull/47)
-   Prioritize loading of glTF nodes by IFC type - [#41](https://github.com/xeokit/xeokit-sdk/pull/41)
-  Fix BatchingBuffer reuse - [#39](https://github.com/xeokit/xeokit-sdk/pull/39)
-  PerformanceModel tiles benchmark for geometry batching - [#38](https://github.com/xeokit/xeokit-sdk/pull/38)
-  Performance model tiles - [#37](https://github.com/xeokit/xeokit-sdk/pull/37)
-  3D Picking for PerformanceModel - [#36](https://github.com/xeokit/xeokit-sdk/pull/36)

# [v0.1.7](https://github.com/xeokit/xeokit-sdk/compare/v0.1.6...v0.1.7)

### 9 March 2019

-   Fix for - MetaDataReader.js 'Request' was not found in './request.js'  - [#30](https://github.com/xeokit/xeokit-sdk/pull/30)
-  Sync with master - [#3](https://github.com/xeokit/xeokit-sdk/pull/3)
-  Sync with master - [#2](https://github.com/xeokit/xeokit-sdk/pull/2)

# [v0.1.5](https://github.com/xeokit/xeokit-sdk/compare/v0.1.4...v0.1.5)

### 6 March 2019

-  Adds Support for loading IFC4 models - [#21](https://github.com/xeokit/xeokit-sdk/pull/21)
-  Sync with master - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)
-  Fix for two minor bugs that cause the removePlugin() function to fail. - [#18](https://github.com/xeokit/xeokit-sdk/pull/18)

# [v0.1.4](https://github.com/xeokit/xeokit-sdk/compare/v0.1.3...v0.1.4)

### 18 February 2019

-  Implemented colorize for PerformanceModel - [#16](https://github.com/xeokit/xeokit-sdk/pull/16)

# [v0.1](https://github.com/xeokit/xeokit-sdk/compare/v0.1.0...v0.1)

### 21 January 2019

-  Refactor duplicated loadJson helpers into the util one - [#2](https://github.com/xeokit/xeokit-sdk/pull/2)
