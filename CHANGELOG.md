## xeokit-sdk Changelog

# [v2.6.95](https://github.com/xeokit/xeokit-sdk/compare/v2.6.94...v2.6.95)

### 18 November 2025

-  Added memory leak test example
-  XEOK-378 Rectifies some inaccuracies related to SectionCaps generation.
-  BREAKING CHANGE: XEOK-361 Improves SectionCaps feature feedback (by throwing an exception) if Entity::capMaterial assigned to when readableGeometryEnabled: false.
Code that previously would silently fail will now throw an error.
This should make the readableGeometryEnabled requirement more clear.

# [v2.6.94](https://github.com/xeokit/xeokit-sdk/compare/v2.6.93...v2.6.94)

### 03 November 2025

XEOK-377 Consider DirLight.space="space" same as "world" and fix DirLight.space documentation [#1977](https://github.com/xeokit/xeokit-sdk/pull/1977)

# [v2.6.93](https://github.com/xeokit/xeokit-sdk/compare/v2.6.92...v2.6.93)

### 20 October 2025

IMPORTANT: Please read the details in the comment at https://github.com/xeokit/xeokit-sdk/pull/1850#issuecomment-3397906988
Renderers refactor - a large change, but shouldn't require any integration effort in user code, unless it relied on `TrianglesColorTextureRenderer`'s color texture.

# [v2.6.92](https://github.com/xeokit/xeokit-sdk/compare/v2.6.91...v2.6.92)

### 16 October 2025

XCD-391 Implement labelStringFormat [#1940](https://github.com/xeokit/xeokit-sdk/pull/1967)

# [v2.6.91](https://github.com/xeokit/xeokit-sdk/compare/v2.6.90...v2.6.91)

### 06 October 2025

Update LICENSE and CONTRIBUTING.md
chore: upgrade loaders.gl and cxconverter.
feat: set `__XEOKIT__` in window object [#1947](https://github.com/xeokit/xeokit-sdk/pull/1947)
fix: add error message for Device Orientation permission and improve user feedback [#1948](https://github.com/xeokit/xeokit-sdk/pull/1948
XEOK-372 Import external deps from a common location [#1954](https://github.com/xeokit/xeokit-sdk/pull/1954)
XCD-386 Fix zoom speed after empty space zoom [#1958](https://github.com/xeokit/xeokit-sdk/pull/1958)
XCD-383 Fix extreme zoom-out/in with touch control [#1957](https://github.com/xeokit/xeokit-sdk/pull/1957)
XEOK-373 Declare ViewerConfiguration::readableGeometryEnabled [#1962](https://github.com/xeokit/xeokit-sdk/pull/1962)

# [v2.6.90](https://github.com/xeokit/xeokit-sdk/compare/v2.6.89...v2.6.90)

### 29 August 2025

XCD-369 Fix transparents rendering when using isUI meshes, and add a test-scene [#1940](https://github.com/xeokit/xeokit-sdk/pull/1940)

# [v2.6.89](https://github.com/xeokit/xeokit-sdk/compare/v2.6.88...v2.6.89)

### 26 August 2025

fix(XCD-350): improve clipping logic in clipSegment function for paralel lines [#1937](https://github.com/xeokit/xeokit-sdk/pull/1937)

# [v2.6.88](https://github.com/xeokit/xeokit-sdk/compare/v2.6.87...v2.6.88)

### 11 August 2025

- fix: Update links in README and index.html for consistency; change image source in getSnapshot example
- feat: XCD-343 Add touch event support for NavCube interactions
- XCD-349 Remove rootNode when destroy
- refactor: update type definitions for touchPointSelector to be generic
- fix(XEOK-168): DotBIMLoaderPlugin - update mesh ID generation to include dbMeshId for uniqueness
- refactor(XEOK-321) : remove @creooxag/cxconverter-dependency
- Xeok 168 errors inside examples set 1

# [v2.6.87](https://github.com/xeokit/xeokit-sdk/compare/v2.6.86...v2.6.87)

### 31 July 2025

- XCD-345 Don't trigger touch rightClick when cameraControl is not active - [#1927](https://github.com/xeokit/xeokit-sdk/pull/1927)

# [v2.6.86](https://github.com/xeokit/xeokit-sdk/compare/v2.6.85...v2.6.86)

### 29 July 2025

- XCD-332 Change addContextMenuListener to listen to touch events on iPads
- XCD-341 Apply x and y scale for billboards

# [v2.6.84](https://github.com/xeokit/xeokit-sdk/compare/v2.6.83...v2.6.84)

### 16 July 2025

- FIX ContextMenu horizontal position if parented by document.body (XEOK-306)

# [v2.6.83](https://github.com/xeokit/xeokit-sdk/compare/v2.6.82...v2.6.83)

### 8 July 2025

- Technical release aiming to rollout new CI mechanism. No other code changes.

# [v2.6.67](https://github.com/xeokit/xeokit-sdk/compare/v2.6.66...v2.6.67)

### 27 February 2025

-  XEOK-35: Render IfcAxisLabels - [#1808](https://github.com/xeokit/xeokit-sdk/pull/1808)
-  [DOCUMENTATION] Adding missing types and update documentation for includeIds in XKTLoaderPlugin - [#1817](https://github.com/xeokit/xeokit-sdk/pull/1817)
-  Upgrade loaders.gl - [#1815](https://github.com/xeokit/xeokit-sdk/pull/1815)
-  chore: fix percy token passing, remove percy abel once test done - [#1814](https://github.com/xeokit/xeokit-sdk/pull/1814)
-  [FEATURE] Load only specified elements - [#1813](https://github.com/xeokit/xeokit-sdk/pull/1813)
-  Implement section caps through sceneModelEntity:capMaterial - [#1775](https://github.com/xeokit/xeokit-sdk/pull/1775)
-  Feat/percy visual testing - [#1801](https://github.com/xeokit/xeokit-sdk/pull/1801)
-  FIX: allow to change the `snapRadius` during snap picking - [#1811](https://github.com/xeokit/xeokit-sdk/pull/1811)
-  Fix typings of 'WebIFCLoaderPlugin' - [#1804](https://github.com/xeokit/xeokit-sdk/pull/1804)

# [v2.6.66](https://github.com/xeokit/xeokit-sdk/compare/v2.6.65...v2.6.66)

### 11 February 2025

-  Update package.json - [#1806](https://github.com/xeokit/xeokit-sdk/pull/1806)
-  XCD-230 Don't cull backfaces of solid objects - [#1805](https://github.com/xeokit/xeokit-sdk/pull/1805)
-  #1704 Optimize Annotations' position update - [#1761](https://github.com/xeokit/xeokit-sdk/pull/1761)
-  Fix overlay examples - [#1800](https://github.com/xeokit/xeokit-sdk/pull/1800)
-  XEOK-136: Deprecate preset property on EmphasisMaterial - [#1797](https://github.com/xeokit/xeokit-sdk/pull/1797)
-  XEOK-205 Fix math.mat4ToEuler to return angles in degrees, not radians - [#1796](https://github.com/xeokit/xeokit-sdk/pull/1796)
-  Remove SceneModel LoD examples from index, for now - [#1795](https://github.com/xeokit/xeokit-sdk/pull/1795)
-  Add types for touchPointSelector - [#1794](https://github.com/xeokit/xeokit-sdk/pull/1794)
-  Add PointerCircle.d.ts - [#1793](https://github.com/xeokit/xeokit-sdk/pull/1793)
-  XCD-242 Fix near and far values for ray picking - [#1791](https://github.com/xeokit/xeokit-sdk/pull/1791)
-  [EXAMPLES] Comments clean-up - [#1790](https://github.com/xeokit/xeokit-sdk/pull/1790)
-  XEOK-197 Implement SectionPlane::quaternion and ::roll - [#1789](https://github.com/xeokit/xeokit-sdk/pull/1789)
-  Much cleaner edge rendering when enabling logarithmic depth buffer - [#1788](https://github.com/xeokit/xeokit-sdk/pull/1788)
-  XEOK-198 Update SceneModel::rotation on SceneModel::matrix change - [#1787](https://github.com/xeokit/xeokit-sdk/pull/1787)
-  XEOK-196 Rotate the SectionPlane Control gizmo to be Y-up by default - [#1786](https://github.com/xeokit/xeokit-sdk/pull/1786)
-  [EXAMPLE] Adds example of creating a section plane with a short tap - [#1785](https://github.com/xeokit/xeokit-sdk/pull/1785)

# [v2.6.65](https://github.com/xeokit/xeokit-sdk/compare/v2.6.64...v2.6.65)

### 22 January 2025

-  Fix/XV-574: markerClicked event is not fired on ios safari - [#1784](https://github.com/xeokit/xeokit-sdk/pull/1784)
-  Fixes for touch Angle- and DistanceMeasurement creation. - [#1782](https://github.com/xeokit/xeokit-sdk/pull/1782)
-  XEOK-185: Lines are not clipped by SectionPlanes - [#1781](https://github.com/xeokit/xeokit-sdk/pull/1781)
-  XCD-231 Change rotation gizmo to rely on 2D canvas pos-&gt;point angle - [#1780](https://github.com/xeokit/xeokit-sdk/pull/1780)
-  Add AngleMeasurementsTouchControl to index.d.ts - [#1779](https://github.com/xeokit/xeokit-sdk/pull/1779)
-  Optional sorting functions - [#1776](https://github.com/xeokit/xeokit-sdk/pull/1776)
-  Updated typings - [#1774](https://github.com/xeokit/xeokit-sdk/pull/1774)
-  XEOK-191 Fix math.transformPoint4 call - [#1773](https://github.com/xeokit/xeokit-sdk/pull/1773)

# [v2.6.64](https://github.com/xeokit/xeokit-sdk/compare/v2.6.63...v2.6.64)

### 9 January 2025

-  XCD-176 IPad Cut Mode - [#1770](https://github.com/xeokit/xeokit-sdk/pull/1770)

# [v2.6.63](https://github.com/xeokit/xeokit-sdk/compare/v2.6.62...v2.6.63)

### 9 January 2025

-  [FIX] SceneModel robustness for invalid tri mesh edgeIndices - [#1772](https://github.com/xeokit/xeokit-sdk/pull/1772)
-  XEOK-171: CameraControl stops reacting when using system shortcuts - [#1771](https://github.com/xeokit/xeokit-sdk/pull/1771)

# [v2.6.62](https://github.com/xeokit/xeokit-sdk/compare/v2.6.61...v2.6.62)

### 30 December 2024

-  XCD-196 Render Zones ordered by camera distance - [#1769](https://github.com/xeokit/xeokit-sdk/pull/1769)
-  Context menu appears after each zoom or pan - [#1768](https://github.com/xeokit/xeokit-sdk/pull/1768)
-  Submenu is not visible/usable when there is not enough space on the sides - [#1767](https://github.com/xeokit/xeokit-sdk/pull/1767)
-  XCD-210: First pick does not work with doublePickFlyTo enabled - [#1766](https://github.com/xeokit/xeokit-sdk/pull/1766)
-  Implement missing cross section from dtx renderer - [#1765](https://github.com/xeokit/xeokit-sdk/pull/1765)
-  XCD-224: Annotations cannot be deleted - [#1764](https://github.com/xeokit/xeokit-sdk/pull/1764)
-  XCD-223: Adapt the change of metaModels from array to object - [#1763](https://github.com/xeokit/xeokit-sdk/pull/1763)

# [v2.6.61](https://github.com/xeokit/xeokit-sdk/compare/v2.6.60...v2.6.61)

### 11 December 2024

-  XCD-208 Make FastNavPlugin revert to the original canvas resolutionScale on switchToHighQuality - [#1760](https://github.com/xeokit/xeokit-sdk/pull/1760)
-  [FEATURE] Add optional IfcProject root node to TreeViewPlugin "storeys" hierarchy - [#1759](https://github.com/xeokit/xeokit-sdk/pull/1759)

# [v2.6.60](https://github.com/xeokit/xeokit-sdk/compare/v2.6.59...v2.6.60)

### 6 December 2024

-  [FIX] Add missing types for MarqueePicker and ObjectsKdTree3 - [#1758](https://github.com/xeokit/xeokit-sdk/pull/1758)

# [v2.6.59](https://github.com/xeokit/xeokit-sdk/compare/v2.6.58...v2.6.59)

### 5 December 2024

-  [FIX] Fix deletion from MetaScene.rootMetaObjects - [#1755](https://github.com/xeokit/xeokit-sdk/pull/1755)
-  XCD-212 Fix toClipSpace to transform its argument after view/proj matrices stabilize - [#1754](https://github.com/xeokit/xeokit-sdk/pull/1754)

# [v2.6.58](https://github.com/xeokit/xeokit-sdk/compare/v2.6.57...v2.6.58)

### 3 December 2024

-  [FIX] Fix missing MetaObject-&gt;metaModels links - [#1753](https://github.com/xeokit/xeokit-sdk/pull/1753)

# [v2.6.57](https://github.com/xeokit/xeokit-sdk/compare/v2.6.55...v2.6.57)

### 2 December 2024

-  StoreyViewsPlugin::Remove unit conversion to meters - [#1752](https://github.com/xeokit/xeokit-sdk/pull/1752)
-  Import os in context menu example - [#1751](https://github.com/xeokit/xeokit-sdk/pull/1751)
-  Fix context menus on mobile devices - [#1747](https://github.com/xeokit/xeokit-sdk/pull/1747)
-  [EXAMPLES] Fix picking examples - [#1749](https://github.com/xeokit/xeokit-sdk/pull/1749)
-  XCD-144 Fix shaking measurement - [#1719](https://github.com/xeokit/xeokit-sdk/pull/1719)
-  XEOK-169 Fix undefined this._entity.model - [#1748](https://github.com/xeokit/xeokit-sdk/pull/1748)
-  XEOK-160 Fix AngleMeasurementsMouseControl's red dot position - [#1746](https://github.com/xeokit/xeokit-sdk/pull/1746)
-  [EXAMPLE] Add 2 new cards for 3D zoning and 2D overlay - [#1742](https://github.com/xeokit/xeokit-sdk/pull/1742)
-  Use elevation property to clip overlapping bounding boxes - [#1741](https://github.com/xeokit/xeokit-sdk/pull/1741)
-  fix: hide pivot element on touchend - [#1740](https://github.com/xeokit/xeokit-sdk/pull/1740)
-  XEOK-146 Use isSceneModelEntity instead of instanceOf SceneModelEntity - [#1739](https://github.com/xeokit/xeokit-sdk/pull/1739)
-  Expose the link to floorPlan_example from examples/scenegraph category - [#1738](https://github.com/xeokit/xeokit-sdk/pull/1738)
-  XEOK-151 Fix label's text offset in an html2canvas capture - [#1736](https://github.com/xeokit/xeokit-sdk/pull/1736)
-  Fix when manifestSrc contains a Shared Access Key - [#1735](https://github.com/xeokit/xeokit-sdk/pull/1735)
-  Add ability to capture whole models::StoreyViewsPlugin - [#1733](https://github.com/xeokit/xeokit-sdk/pull/1733)
-  Updated typings - [#1732](https://github.com/xeokit/xeokit-sdk/pull/1732)
-  XCD-197 Fix planView panning in CameraControls - [#1731](https://github.com/xeokit/xeokit-sdk/pull/1731)

# [v2.6.55](https://github.com/xeokit/xeokit-sdk/compare/v2.6.54...v2.6.55)

### 11 November 2024

-  Implement custom cursors for camera movement - [#1730](https://github.com/xeokit/xeokit-sdk/pull/1730)
-  [FIX] Robustness for VBOs and edgeIndices - [#1729](https://github.com/xeokit/xeokit-sdk/pull/1729)

# [v2.6.54](https://github.com/xeokit/xeokit-sdk/compare/v2.6.53...v2.6.54)

### 7 November 2024

-  Add support for model ids when there are multiple models on the scene - [#1728](https://github.com/xeokit/xeokit-sdk/pull/1728)
-  Fix/pan right click - [#1727](https://github.com/xeokit/xeokit-sdk/pull/1727)
-  XCD-153 Reset snapshotCanvas transformation applied by html2canvas - [#1722](https://github.com/xeokit/xeokit-sdk/pull/1722)
-  [FIX] Fix IfcBuildingStorey elevation sort - [#1721](https://github.com/xeokit/xeokit-sdk/pull/1721)
-  Fix regression caused by camera controls mapping feature - [#1720](https://github.com/xeokit/xeokit-sdk/pull/1720)
-  Add option to configure camera control using keymaps in CameraControl - [#1718](https://github.com/xeokit/xeokit-sdk/pull/1718)
-  [FIX] Adding a shallow copy of worldPos for _lastClickedWorldPos - [#1716](https://github.com/xeokit/xeokit-sdk/pull/1716)
-  [FEATURE] Rotate around previous pivot when clicking on background - [#1713](https://github.com/xeokit/xeokit-sdk/pull/1713)
-  [FIX] Fixes examples using libs/dat.gui.min.js - [#1712](https://github.com/xeokit/xeokit-sdk/pull/1712)

# [v2.6.53](https://github.com/xeokit/xeokit-sdk/compare/v2.6.52...v2.6.53)

### 25 October 2024

-  [FIX] TreeViewPlugin sortNodes fix - [#1711](https://github.com/xeokit/xeokit-sdk/pull/1711)

# [v2.6.52](https://github.com/xeokit/xeokit-sdk/compare/v2.6.51...v2.6.52)

### 24 October 2024

-  [FEATURE] StoreyViewsPlugin sort on IfcBuildingStorey elevation - [#1710](https://github.com/xeokit/xeokit-sdk/pull/1710)
-  Update ObjectsMemento::StoreyViewsPlugin to restore only visibility - [#1709](https://github.com/xeokit/xeokit-sdk/pull/1709)

# [v2.6.51](https://github.com/xeokit/xeokit-sdk/compare/v2.6.50...v2.6.51)

### 22 October 2024

-  Update typings: setCheckbox method signature to include optional indeterminate… - [#1708](https://github.com/xeokit/xeokit-sdk/pull/1708)
-  Updated typings: setCheckbox method signature to include indeterminate parameter - [#1707](https://github.com/xeokit/xeokit-sdk/pull/1707)
-  XCD-175 Fix {Angle,Distance}MeasurementsMouseControl green/red marker's misplacement - [#1703](https://github.com/xeokit/xeokit-sdk/pull/1703)
-  Fix rootnames showing as 'na' in TreeViewPlugin - [#1702](https://github.com/xeokit/xeokit-sdk/pull/1702)
-  [FIX] Regression for name of root object of TreeViewPlugin (XCD-174) - [#1700](https://github.com/xeokit/xeokit-sdk/pull/1700)
-  Make SceneModel::matrix setter decompose to other transformation properties - [#1699](https://github.com/xeokit/xeokit-sdk/pull/1699)
-  XEOK-50 Adjust example code for an upcoming 2D Overlay tutorial - [#1697](https://github.com/xeokit/xeokit-sdk/pull/1697)

# [v2.6.50](https://github.com/xeokit/xeokit-sdk/compare/v2.6.49...v2.6.50)

### 15 October 2024

-  StoreyViewsPlugin storeysList - [#1698](https://github.com/xeokit/xeokit-sdk/pull/1698)
-  Fix model not scaling when loading using XKTLoaderPlugin - [#1696](https://github.com/xeokit/xeokit-sdk/pull/1696)

# [v2.6.49](https://github.com/xeokit/xeokit-sdk/compare/v2.6.48...v2.6.49)

### 15 October 2024

-  [EXAMPLE] Fixes and adds an example of Section + FastNavPlugin - [#1695](https://github.com/xeokit/xeokit-sdk/pull/1695)
-  XCD-153 Compensate canvas offset when snapshotting a plugin - [#1694](https://github.com/xeokit/xeokit-sdk/pull/1694)
-  XCD-136 Fix SectionPlane interaction with translated SceneModel - [#1692](https://github.com/xeokit/xeokit-sdk/pull/1692)
-  Define point size when using gl.Points::VBOBatchingPointsSnapInitRenderer - [#1691](https://github.com/xeokit/xeokit-sdk/pull/1691)

# [v2.6.47](https://github.com/xeokit/xeokit-sdk/compare/v2.6.46...v2.6.47)

### 6 October 2024

-  [FIX] Change MetaScene.metaObjects from array to object - [#1689](https://github.com/xeokit/xeokit-sdk/pull/1689)

# [v2.6.46](https://github.com/xeokit/xeokit-sdk/compare/v2.6.45...v2.6.46)

### 2 October 2024

-  Fix(vbo-layer) Fixing get each vertex api in VBOInstancingTrianglesLayer - [#1585](https://github.com/xeokit/xeokit-sdk/pull/1585)
-  Fix rotation transformation in getEachVertex. - [#1685](https://github.com/xeokit/xeokit-sdk/pull/1685)
-  [FIX] XKTLoaderPlugin returns sceneModel before it is defined - [#1682](https://github.com/xeokit/xeokit-sdk/pull/1682)

# [v2.6.45](https://github.com/xeokit/xeokit-sdk/compare/v2.6.44...v2.6.45)

### 30 September 2024

-  [FEATURE] LASLoaderPlugin point transform options - [#1684](https://github.com/xeokit/xeokit-sdk/pull/1684)
-  XEOK-17 Fix SectionPlanes for rotated models - [#1683](https://github.com/xeokit/xeokit-sdk/pull/1683)
-  [FIX] Fixing the glbTreeViewPlugin.html behaviour by using autoMetaModel - [#1677](https://github.com/xeokit/xeokit-sdk/pull/1677)

# [v2.6.44](https://github.com/xeokit/xeokit-sdk/compare/v2.6.43...v2.6.44)

### 25 September 2024

-  API documentation fix - [#1681](https://github.com/xeokit/xeokit-sdk/pull/1681)
-  [IMPROVEMENT]: Simpler and more robust obtention of mouse canvas coordinates - [#1679](https://github.com/xeokit/xeokit-sdk/pull/1679)
-  XCD-159 Optionally globalize GLTF's entityId - [#1680](https://github.com/xeokit/xeokit-sdk/pull/1680)
-  XCD-158 Demonstrate Zone hiding and showing with an example - [#1678](https://github.com/xeokit/xeokit-sdk/pull/1678)
-  [FIX] Fix snapshots in presence of multiple plugins - [#1676](https://github.com/xeokit/xeokit-sdk/pull/1676)
-  [FIX] Fill empty name of property sets for elements in DotBIMLoaderPlugin - [#1675](https://github.com/xeokit/xeokit-sdk/pull/1675)
-  Copy SceneModelMesh::aabb before translating by origin - [#1674](https://github.com/xeokit/xeokit-sdk/pull/1674)
-  XEOK-115 Fix object.numPrimitives and numTriangles are NaN #1671 - [#1673](https://github.com/xeokit/xeokit-sdk/pull/1673)
-  XEOK-114 Fix wrong aabb value after rotating a model - [#1670](https://github.com/xeokit/xeokit-sdk/pull/1670)
-  Update indeterminate state in TreeViewPlugin - [#1663](https://github.com/xeokit/xeokit-sdk/pull/1663)
-  Add submenu position attribute on the li tag containing a submenu - [#1668](https://github.com/xeokit/xeokit-sdk/pull/1668)
-  Return created SceneModelEntity in SceneModel.createEntity method - [#1669](https://github.com/xeokit/xeokit-sdk/pull/1669)

# [v2.6.43](https://github.com/xeokit/xeokit-sdk/compare/v2.6.42...v2.6.43)

### 12 September 2024

-  XCD-155 Fix missing touchPointSelector - [#1666](https://github.com/xeokit/xeokit-sdk/pull/1666)
-  fix: use css class to mark submenu - [#1662](https://github.com/xeokit/xeokit-sdk/pull/1662)
-  XEOK-111 Prevent LASLoaderPlugin infinite loop - [#1661](https://github.com/xeokit/xeokit-sdk/pull/1661)
-  chore: disable dtx console.info logs which slow down render - [#1660](https://github.com/xeokit/xeokit-sdk/pull/1660)

# [v2.6.42](https://github.com/xeokit/xeokit-sdk/compare/v2.6.41...v2.6.42)

### 9 September 2024

-  XEOK-87 Fix handling of big las models - [#1658](https://github.com/xeokit/xeokit-sdk/pull/1658)
-  Update classes to be documentation friendly - [#1657](https://github.com/xeokit/xeokit-sdk/pull/1657)

# [v2.6.41](https://github.com/xeokit/xeokit-sdk/compare/v2.6.38...v2.6.41)

### 4 September 2024

-  Fix ShowNode method in TreeViewPlugin does not collapse the tree - [#1650](https://github.com/xeokit/xeokit-sdk/pull/1650)
-  XCD-147 Implement an example of annotation touch create - [#1654](https://github.com/xeokit/xeokit-sdk/pull/1654)
-  XCD-145 Fix GLTFLoaderPlugin KTX loading - [#1653](https://github.com/xeokit/xeokit-sdk/pull/1653)
-  Fix: update VBOBatchingTrianglesBuffer constructor  - [#1648](https://github.com/xeokit/xeokit-sdk/pull/1648)
-  Updated FastNavPlugin type definitions - [#1649](https://github.com/xeokit/xeokit-sdk/pull/1649)
-  Add navigation examples - [#1647](https://github.com/xeokit/xeokit-sdk/pull/1647)
-  Removed implementation of visible and hidden classes - [#1646](https://github.com/xeokit/xeokit-sdk/pull/1646)
-  Wrong id passed to collapseNode method - [#1644](https://github.com/xeokit/xeokit-sdk/pull/1644)
-  [FIX] Undefined metadata in DotBIMLoaderPlugin - [#1643](https://github.com/xeokit/xeokit-sdk/pull/1643)
-  Add option for indeterminate checkbox in TreeViewPlugin - [#1642](https://github.com/xeokit/xeokit-sdk/pull/1642)

# [v2.6.38](https://github.com/xeokit/xeokit-sdk/compare/v2.6.36...v2.6.38)

### 26 August 2024

-  XCD-139 GLB displayed incorrectly in treeview - [#1639](https://github.com/xeokit/xeokit-sdk/pull/1639)
-  Add separator as an independent li tag. - [#1640](https://github.com/xeokit/xeokit-sdk/pull/1640)
-  XEOK-99 Fix dotbim_Multicolor house on macOS - [#1641](https://github.com/xeokit/xeokit-sdk/pull/1641)

# [v2.6.36](https://github.com/xeokit/xeokit-sdk/compare/v2.6.35...v2.6.36)

### 24 August 2024

-  Added minimap example link to navigation examples html page - [#1638](https://github.com/xeokit/xeokit-sdk/pull/1638)
-  Take into account canvas rect for touch-based measurements - [#1628](https://github.com/xeokit/xeokit-sdk/pull/1628)
-  [TIDY] Removed unused RGBA packing func from depth shader - [#1634](https://github.com/xeokit/xeokit-sdk/pull/1634)
-  [FIX] Support unsorted set of meshes for face colors - [#1637](https://github.com/xeokit/xeokit-sdk/pull/1637)
-  XEOK-96 DTX minimap interaction fix - [#1636](https://github.com/xeokit/xeokit-sdk/pull/1636)
-  Add examples using entity's surfaceArea and volume properties - [#1632](https://github.com/xeokit/xeokit-sdk/pull/1632)
-  Use documentElement instead of body for client{X,Y}=&gt;canvasPos transformation - [#1630](https://github.com/xeokit/xeokit-sdk/pull/1630)
-  XEOK-94 Fix DTX snapshot rendering - [#1629](https://github.com/xeokit/xeokit-sdk/pull/1629)

# [v2.6.35](https://github.com/xeokit/xeokit-sdk/compare/v2.6.34...v2.6.35)

### 14 August 2024

-  XEOK-93 Fix AngleMeasurementsMouseControl dot - [#1625](https://github.com/xeokit/xeokit-sdk/pull/1625)
-  Move examples/picking/overlapping.js to examples/libs/overlappingPick.js - [#1624](https://github.com/xeokit/xeokit-sdk/pull/1624)
-  XCD-101 Picking overlapping objects - [#1623](https://github.com/xeokit/xeokit-sdk/pull/1623)

# [v2.6.34](https://github.com/xeokit/xeokit-sdk/compare/v2.6.33...v2.6.34)

### 13 August 2024

-  Export types for `DistanceMeasurementsTouchControl` - [#1622](https://github.com/xeokit/xeokit-sdk/pull/1622)

# [v2.6.33](https://github.com/xeokit/xeokit-sdk/compare/v2.6.32...v2.6.33)

### 8 August 2024

-  [FIX] Fix getEachVertex for instanced VBO triangles - [#1621](https://github.com/xeokit/xeokit-sdk/pull/1621)
-  [FIX] Fix getEachVertex for instanced VBO triangles - [#1620](https://github.com/xeokit/xeokit-sdk/pull/1620)
-  Fix MeshVolume::volume calculation - [#1619](https://github.com/xeokit/xeokit-sdk/pull/1619)
-  Remove preemptively added touch floor plan editing example link - [#1618](https://github.com/xeokit/xeokit-sdk/pull/1618)
-  Allow to set different wireframe axes for distance measurements - [#1615](https://github.com/xeokit/xeokit-sdk/pull/1615)
-  Fix/exported types update - [#1617](https://github.com/xeokit/xeokit-sdk/pull/1617)
-  Fix/pointer lens - [#1616](https://github.com/xeokit/xeokit-sdk/pull/1616)
-  update source - [#1](https://github.com/xeokit/xeokit-sdk/pull/1)

# [v2.6.32](https://github.com/xeokit/xeokit-sdk/compare/v2.6.31...v2.6.32)

### 7 August 2024

-  Added XKTLoaderPlugin renderOrder option - [#1614](https://github.com/xeokit/xeokit-sdk/pull/1614)
-  Use SceneModel.renderOrder in renderer - [#1613](https://github.com/xeokit/xeokit-sdk/pull/1613)
-  XEOK-50 Overlay 2D - [#1612](https://github.com/xeokit/xeokit-sdk/pull/1612)
-  [DOCUMENTATION] Replacing README.md example with XKT loading - [#1609](https://github.com/xeokit/xeokit-sdk/pull/1609)

# [v2.6.31](https://github.com/xeokit/xeokit-sdk/compare/v2.6.30...v2.6.31)

### 2 August 2024

-  [FIX] Fix TreeiewPlugin error report when Storeys view not possible - [#1608](https://github.com/xeokit/xeokit-sdk/pull/1608)
-  Fixed glb loader not loading when nodes are with names - [#1607](https://github.com/xeokit/xeokit-sdk/pull/1607)
-  Adding some missing types in loaders - [#1605](https://github.com/xeokit/xeokit-sdk/pull/1605)
-  XEOK-83 Fix null matrix handling in parseNodeMesh - [#1602](https://github.com/xeokit/xeokit-sdk/pull/1602)
-  [FEATURE] Support face_colors for dotbim - [#1603](https://github.com/xeokit/xeokit-sdk/pull/1603)
-  [FEATURE] add snap picking default picking data - [#1601](https://github.com/xeokit/xeokit-sdk/pull/1601)

# [v2.6.30](https://github.com/xeokit/xeokit-sdk/compare/v2.6.29...v2.6.30)

### 29 July 2024

-  Auto gltf metamodel - [#1600](https://github.com/xeokit/xeokit-sdk/pull/1600)
-  Make GLTFLoaderPlugin generate automatic metadata - [#1599](https://github.com/xeokit/xeokit-sdk/pull/1599)
-  XEOK-77 Fix incorrect color composition in TrianglesColorTextureRenderer - [#1597](https://github.com/xeokit/xeokit-sdk/pull/1597)
-  [FIX] snap picking - [#1595](https://github.com/xeokit/xeokit-sdk/pull/1595)
-  XCD-36 GLTF alphaCutoff support - [#1596](https://github.com/xeokit/xeokit-sdk/pull/1596)
-  XEOK-75 Bring back missing SceneModel::_createDefaultIndices definition - [#1594](https://github.com/xeokit/xeokit-sdk/pull/1594)
-  Rebuild to fix XCD-127 - [#1591](https://github.com/xeokit/xeokit-sdk/pull/1591)
-  [FIX] marker occlusion - [#1579](https://github.com/xeokit/xeokit-sdk/pull/1579)

# [v2.6.29](https://github.com/xeokit/xeokit-sdk/compare/v2.6.28...v2.6.29)

### 16 July 2024

-  [FIX] Fix SceneModel.getEachVertex - [#1587](https://github.com/xeokit/xeokit-sdk/pull/1587)
-  [FEATURE] Progressive SceneModel loading - [#1586](https://github.com/xeokit/xeokit-sdk/pull/1586)
-  XEOK-64 PointerCircle::destroy error - [#1583](https://github.com/xeokit/xeokit-sdk/pull/1583)
-  [FIX] Incorrect imports - [#1578](https://github.com/xeokit/xeokit-sdk/pull/1578)
-  XEOK-62 Fix Zone sides winding - [#1576](https://github.com/xeokit/xeokit-sdk/pull/1576)
-  Mesh volume and area - [#1574](https://github.com/xeokit/xeokit-sdk/pull/1574)
-  XEOK-59 Zone area - [#1573](https://github.com/xeokit/xeokit-sdk/pull/1573)
-  Fix ZonesPlugin_createZones glyph CSS width - [#1571](https://github.com/xeokit/xeokit-sdk/pull/1571)
-  Example/minimap - [#1570](https://github.com/xeokit/xeokit-sdk/pull/1570)
-  XEOK-53 Zone volume - [#1569](https://github.com/xeokit/xeokit-sdk/pull/1569)
-  Fix/measurement types - [#1568](https://github.com/xeokit/xeokit-sdk/pull/1568)
-  XCD-109 Snapping change of a measurement in progress - [#1565](https://github.com/xeokit/xeokit-sdk/pull/1565)

# [v2.6.28](https://github.com/xeokit/xeokit-sdk/compare/v2.6.27...v2.6.28)

### 2 July 2024

-  [FIX] Camera incorrectly zooms to end of measurement after completion - [#1566](https://github.com/xeokit/xeokit-sdk/pull/1566)
-  Contributing.md - [#1559](https://github.com/xeokit/xeokit-sdk/pull/1559)

# [v2.6.27](https://github.com/xeokit/xeokit-sdk/compare/v2.6.26...v2.6.27)

### 2 July 2024

-  Add missing type defs - [#1564](https://github.com/xeokit/xeokit-sdk/pull/1564)
-  [FIX] Spector example removal - [#1562](https://github.com/xeokit/xeokit-sdk/pull/1562)
-  XEOK-40 snap pick from ray - [#1563](https://github.com/xeokit/xeokit-sdk/pull/1563)
-  chore: missing type declarations - [#1560](https://github.com/xeokit/xeokit-sdk/pull/1560)
-  Fix typo in DistanceMeasurementPlugin - [#1555](https://github.com/xeokit/xeokit-sdk/pull/1555)
-  show correct distance for z axis when useRotationAdjustment is false - [#1556](https://github.com/xeokit/xeokit-sdk/pull/1556)
-  Fix(measurements) Removed deletion of in progress measurement when us… - [#1558](https://github.com/xeokit/xeokit-sdk/pull/1558)

# [v2.6.26](https://github.com/xeokit/xeokit-sdk/compare/v2.6.25...v2.6.26)

### 27 June 2024

-  [FIX] Fix types for measurement plugin events] - [#1557](https://github.com/xeokit/xeokit-sdk/pull/1557)
-  XEOK-44 Annotation text adjustment - [#1554](https://github.com/xeokit/xeokit-sdk/pull/1554)
-  [FIX] Incorrect cached scene center - [#1553](https://github.com/xeokit/xeokit-sdk/pull/1553)
-  [FEATURE] Add camera control keyboardEnabledOnlyIfMouseover - [#1552](https://github.com/xeokit/xeokit-sdk/pull/1552)

# [v2.6.25](https://github.com/xeokit/xeokit-sdk/compare/v2.6.24...v2.6.25)

### 25 June 2024

-  [FIX] Include buildLineGeometry in build] - [#1551](https://github.com/xeokit/xeokit-sdk/pull/1551)
-  XEOK-37 Edit Annotation Example - [#1550](https://github.com/xeokit/xeokit-sdk/pull/1550)
-  XEOK-36 Edit Measurement update - [#1548](https://github.com/xeokit/xeokit-sdk/pull/1548)
-  Fix failing XKTDefaultDataSource load - [#1549](https://github.com/xeokit/xeokit-sdk/pull/1549)

# [v2.6.24](https://github.com/xeokit/xeokit-sdk/compare/v2.6.23...v2.6.24)

### 21 June 2024

-  [FIX] Fix Mesh measurement - [#1546](https://github.com/xeokit/xeokit-sdk/pull/1546)

# [v2.6.23](https://github.com/xeokit/xeokit-sdk/compare/v2.6.22...v2.6.23)

### 19 June 2024

-  XEOK-36 Edit Measurement - [#1545](https://github.com/xeokit/xeokit-sdk/pull/1545)

# [v2.6.22](https://github.com/xeokit/xeokit-sdk/compare/v2.6.21...v2.6.22)

### 18 June 2024

-  Fix split properties decompress - [#1544](https://github.com/xeokit/xeokit-sdk/pull/1544)

# [v2.6.21](https://github.com/xeokit/xeokit-sdk/compare/v2.6.20...v2.6.21)

### 18 June 2024

-  [FIX] Fix decompression of properties in split metadata files - [#1543](https://github.com/xeokit/xeokit-sdk/pull/1543)

# [v2.6.20](https://github.com/xeokit/xeokit-sdk/compare/v2.6.19...v2.6.20)

### 17 June 2024

-  [FIX] Rollback drawable ordering - [#1542](https://github.com/xeokit/xeokit-sdk/pull/1542)

# [v2.6.19](https://github.com/xeokit/xeokit-sdk/compare/v2.6.18...v2.6.19)

### 17 June 2024

-  [FEATURE] Added SceneModel.renderOrder and Mesh.renderOrder - [#1541](https://github.com/xeokit/xeokit-sdk/pull/1541)
-  Fix XEOK-39 - [#1540](https://github.com/xeokit/xeokit-sdk/pull/1540)
-  [FIX] Expect canvasPos for Scene.snapPick, fix docs - [#1539](https://github.com/xeokit/xeokit-sdk/pull/1539)

# [v2.6.18](https://github.com/xeokit/xeokit-sdk/compare/v2.6.17...v2.6.18)

### 17 June 2024

-  [FEATURE] Cache busting for loader plugin data sources - [#1538](https://github.com/xeokit/xeokit-sdk/pull/1538)
-  [FIX] Making optional control of precision of annotation occluding - [#1536](https://github.com/xeokit/xeokit-sdk/pull/1536)
-  Fix(measurements) Fixed the distance difference in useRotationAdjustment - [#1533](https://github.com/xeokit/xeokit-sdk/pull/1533)
-  [FIX] Remove shader offset for OcclusionTester.js to increase OcclusionTester.js precision - [#1534](https://github.com/xeokit/xeokit-sdk/pull/1534)
-  [FEATURE] Extend pattern to end point - [#1532](https://github.com/xeokit/xeokit-sdk/pull/1532)
-  [FEATURE] Additional method for styled lines geometry - [#1529](https://github.com/xeokit/xeokit-sdk/pull/1529)
-  Fix Viewer.js html2canvas import - [#1528](https://github.com/xeokit/xeokit-sdk/pull/1528)
-  [FEATURE] 3d zoning feature - [#1523](https://github.com/xeokit/xeokit-sdk/pull/1523)

# [v2.6.17](https://github.com/xeokit/xeokit-sdk/compare/v2.6.15...v2.6.17)

### 5 June 2024

-  [FIX] Fix occlusion for Marker worldPos update case - [#1522](https://github.com/xeokit/xeokit-sdk/pull/1522)

# [v2.6.15](https://github.com/xeokit/xeokit-sdk/compare/v2.6.14...v2.6.15)

### 3 June 2024

-  [FIX] Fix LASLoaderPlugin intensity and chunking for v1.2 - [#1521](https://github.com/xeokit/xeokit-sdk/pull/1521)
-  Fix/measurement controls - [#1520](https://github.com/xeokit/xeokit-sdk/pull/1520)
-  Add annotations snapshots example - [#1518](https://github.com/xeokit/xeokit-sdk/pull/1518)
-  [EXAMPLE] Change teapot example to test also double-precision precision - [#1517](https://github.com/xeokit/xeokit-sdk/pull/1517)

# [v2.6.14](https://github.com/xeokit/xeokit-sdk/compare/v2.6.13...v2.6.14)

### 1 June 2024

-  Dotbim psets - [#1516](https://github.com/xeokit/xeokit-sdk/pull/1516)
-  [EXAMPLE] Add non-ifc-&gt;.bim examples - [#1514](https://github.com/xeokit/xeokit-sdk/pull/1514)

# [v2.6.13](https://github.com/xeokit/xeokit-sdk/compare/v2.6.12...v2.6.13)

### 29 May 2024

-  [FEATURE] DotBIMLoaderPlugin - [#1510](https://github.com/xeokit/xeokit-sdk/pull/1510)
-  Added LASLoaderPlugin entityId param - [#1512](https://github.com/xeokit/xeokit-sdk/pull/1512)
-  [FEATURE] Added GLTFLoaderPlugin.load() entityId parameter - [#1511](https://github.com/xeokit/xeokit-sdk/pull/1511)
-  Feature/rotation adjusted distance - [#1497](https://github.com/xeokit/xeokit-sdk/pull/1497)
-  Changed variable names used for toggling x,y,z and length labels - [#1496](https://github.com/xeokit/xeokit-sdk/pull/1496)
-  Added test for loading glTF with KHR_mesh_quantization - [#1493](https://github.com/xeokit/xeokit-sdk/pull/1493)

# [v2.6.12](https://github.com/xeokit/xeokit-sdk/compare/v2.6.11...v2.6.12)

### 16 May 2024

-  [FIX] Make programmatically-created distance measurements initially clickable - [#1492](https://github.com/xeokit/xeokit-sdk/pull/1492)
-  Feature/toggle length labels - [#1491](https://github.com/xeokit/xeokit-sdk/pull/1491)

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
