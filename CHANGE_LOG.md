# xeokit-sdk Change Log 

Find releases on npm: [@xeokit/xeokit-sdk](https://www.npmjs.com/package/@xeokit/xeokit-sdk)

# 1.6.0

Unreleased

* CameraControl
  * Additional Camera properties to support un-projection. [#530](https://github.com/xeokit/xeokit-sdk/issues/530) ([**@xeolabs**](https://github.com/xeolabs))
  * Pan/Rotate: mousemove event listen on document instead of canvas. [#527](https://github.com/xeokit/xeokit-sdk/pull/527) ([**@Kurtil**](https://github.com/Kurtil))
  * Remove default CameraControl cursor style. [#522](https://github.com/xeokit/xeokit-sdk/pull/522) ([**@Kurtil**](https://github.com/Kurtil))
  * Smart Pivot. [#533](https://github.com/xeokit/xeokit-sdk/pull/533) ([**@xeolabs**](https://github.com/xeolabs), [**@amoki**](https://github.com/amoki))
  * Remove default CameraControl cursor style. [#522](https://github.com/xeokit/xeokit-sdk/pull/522) ([**@Kurtil**](https://github.com/Kurtil)) 
* SectionPlanesPlugin
  * Make SectionPlanesPlugin overviewCanvasId optional. [#524](https://github.com/xeokit/xeokit-sdk/pull/524) ([**@Kurtil**](https://github.com/Kurtil)
* Viewer
  * Logarithmic depth buffer. [#254](https://github.com/xeokit/xeokit-sdk/issues/254) ([**@xeolabs**](https://github.com/xeolabs))
    
### Breaking changes

* Viewer
  * Option to enable or disable Entity#offset. [#514](https://github.com/xeokit/xeokit-sdk/issues/514) ([**@xeolabs**](https://github.com/xeolabs))  
  
# 1.5.3

December 23, 2020

* CameraControl
  * Orbit Camera#look when click-dragging on empty canvas in "orbit" mode. [#503](https://github.com/xeokit/xeokit-sdk/issues/503) ([**@xeolabs**](https://github.com/xeolabs))
  * Apply followPointer when pointer over empty canvas. [#502](https://github.com/xeokit/xeokit-sdk/issues/502) ([**@xeolabs**](https://github.com/xeolabs))
  * Apply followPointer in orthographic mode. [#242](https://github.com/xeokit/xeokit-sdk/issues/242) ([**@xeolabs**](https://github.com/xeolabs))
  * Touch-pivot about Camera#look by default in orbit mode. [#510](https://github.com/xeokit/xeokit-sdk/issues/510) ([**@xeolabs**](https://github.com/xeolabs))
  * Don't show CameraControl pivot position while panning. [#509](https://github.com/xeokit/xeokit-sdk/issues/509) ([**@xeolabs**](https://github.com/xeolabs))
  * Fix unwanted "picked*" events from pinch-to-zoom on touch devices. [#438](https://github.com/xeokit/xeokit-sdk/issues/438) ([**@xeolabs**](https://github.com/xeolabs))
* Entity
  * Fix Entity#offset for PerformanceModel instancing. [#505](https://github.com/xeokit/xeokit-sdk/issues/505) ([**@xeolabs**](https://github.com/xeolabs))
* PerformanceModel
  * Fix PerformanceModel batched geometry opaque fill on Android 10. [#507](https://github.com/xeokit/xeokit-sdk/issues/507) ([**@xeolabs**](https://github.com/xeolabs))
* StoreyViewsPlugin
  * Fix memory leak in StoreyViewsPlugin#destroy(). [#499](https://github.com/xeokit/xeokit-sdk/issues/499) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.22

December 10, 2020

* BCFViewpointsPlugin
    * Simplify BCFViewpointsPlugin#getViewpoint(). [#497](https://github.com/xeokit/xeokit-sdk/pull/497) ([**@amoki**](https://github.com/amoki))

# 1.5.21

December 9, 2020

* SectionPlane, SectionPlanesPlugin
    * Fix size of SectionPlane editing control (2). [#480](https://github.com/xeokit/xeokit-sdk/issues/480) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.2

December 9, 2020

* CameraControl
    * Fix CameraControl zoom for ortho mode when followPointer false. [#484](https://github.com/xeokit/xeokit-sdk/pull/484) ([**@xeolabs**](https://github.com/xeolabs))
    * Prevent middle mouse button from rotating the camera. [#492](https://github.com/xeokit/xeokit-sdk/pull/492) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix CameraControl pivot marker centering for custom size. [#471](https://github.com/xeokit/xeokit-sdk/pull/471) ([**@xeolabs**](https://github.com/xeolabs))
* Entity
    * Improve rendering of translucent objects. [#489](https://github.com/xeokit/xeokit-sdk/issues/489) ([**@xeolabs**](https://github.com/xeolabs))   
* Entity, EdgeMaterial, EmphasisMaterial
    * Fix rendering of translucent edges. [#490](https://github.com/xeokit/xeokit-sdk/issues/490) ([**@xeolabs**](https://github.com/xeolabs))
* SectionPlane, SectionPlanesPlugin
    * Fix SectionPlane slicing for transformed PerformanceModels. [#494](https://github.com/xeokit/xeokit-sdk/issues/494) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix SectionPlanesPlugin overview for orthographic projection. [#145](https://github.com/xeokit/xeokit-sdk/issues/145) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix size of SectionPlane editing control. [#480](https://github.com/xeokit/xeokit-sdk/issues/480) ([**@xeolabs**](https://github.com/xeolabs))
* XKTLoaderPlugin, BCFViewpointsPlugin
    * Ability to load multiple copies of same IFC model without object ID clashes. [#485](https://github.com/xeokit/xeokit-sdk/pull/495) ([**@xeolabs**](https://github.com/xeolabs))

    
# 1.5.14

November 25, 2020

* SectionPlane, SectionPlanesPlugin
    * Fix SectionPlane failure to clip certain objects. [#481](https://github.com/xeokit/xeokit-sdk/issues/481) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.13

November 23, 2020

* SectionPlane, SectionPlanesPlugin
    * Fix rotation bug in SectionPlanesPlugin editing control. [#479](https://github.com/xeokit/xeokit-sdk/issues/479) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.12

November 18, 2020

* SectionPlane, SectionPlanesPlugin
    * Fix case for which SectionPlane does not clip everything. [#474](https://github.com/xeokit/xeokit-sdk/issues/474) ([**@xeolabs**](https://github.com/xeolabs))
* CameraControl
    * CameraControl picking robustness. [#473](https://github.com/xeokit/xeokit-sdk/issues/473) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.11

November 13, 2020

* CameraControl
    * A better way to dolly CameraControl through objects. [#472](https://github.com/xeokit/xeokit-sdk/pull/472) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.1

November 13, 2020

* CameraControl
    * Fix disappearing models after pivot from downward-looking direction. [#289](https://github.com/xeokit/xeokit-sdk/issues/289) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix disappearing models when CameraControl zooming in orbit mode. [#468](https://github.com/xeokit/xeokit-sdk/issues/468) ([**@xeolabs**](https://github.com/xeolabs))
    * Improve CameraControl dollying through objects. [#469](https://github.com/xeokit/xeokit-sdk/pull/469) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix CameraControl first-person rotation and dolly for touch devices. [#470](https://github.com/xeokit/xeokit-sdk/pull/470) ([**@xeolabs**](https://github.com/xeolabs))

# 1.5.0

November 10, 2020

* CameraControl
    * Improve CameraControl#followPointer behaviour for ortho projection. [#462](https://github.com/xeokit/xeokit-sdk/pull/462) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix CameraControl#dragRotationRate sensitivity. [#466](https://github.com/xeokit/xeokit-sdk/pull/466) ([**@xeolabs**](https://github.com/xeolabs))

# 1.4.9

November 1, 2020

* Scene  
    * Add Scene#getAABB() full-precision coordinate support. [#457](https://github.com/xeokit/xeokit-sdk/pull/457) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.4.8

October 20, 2020

* PerformanceModel, Mesh, XKTLoaderPlugin  
    * Support full-precision model geometry. [#456](https://github.com/xeokit/xeokit-sdk/pull/456) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.4.7

October 28, 2020

* BCFViewpointsPlugin
    * Fix BCFViewpointsPlugin visibility update for composite elements. [#452](https://github.com/xeokit/xeokit-sdk/issues/446) ([**@xeolabs**](https://github.com/xeolabs))  
    * Don't return empty non-mandatory nodes. [#454](https://github.com/xeokit/xeokit-sdk/issues/454) ([**@xeolabs**](https://github.com/xeolabs))
* TreeViewPlugin
    * Fix TreeViewPlugin node checked states. [#455](https://github.com/xeokit/xeokit-sdk/issues/455) ([**@xeolabs**](https://github.com/xeolabs))
* Picking
    * Fix PickResult#worldPos for arbitrary ray picking. [#447](https://github.com/xeokit/xeokit-sdk/issues/447) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.4.6

October 13, 2020

* SectionPlane, SectionPlanesPlugin
    * When flipping SectionPlanes, also flip the editing control. [#439](https://github.com/xeokit/xeokit-sdk/issues/446) ([**@xeolabs**](https://github.com/xeolabs))  
* BCFViewpointsPlugin
    * Fix setViewpoint colors. [#444](https://github.com/xeokit/xeokit-sdk/pull/444) ([**@amoki**](https://github.com/amoki))

# 1.4.5

October 2, 2020

* Annotation, AnnotationsPlugin
    * Workaround for iOS14 bug affecting WebGL framebuffers. [#439](https://github.com/xeokit/xeokit-sdk/issues/439) ([**@xeolabs**](https://github.com/xeolabs))  

# 1.4.4

September 30, 2020

* ObjectsMemento  
    * Support null Entity#colorize values in ObjectsMemento#saveobjects. [#437](https://github.com/xeokit/xeokit-sdk/issues/437) ([**@xeolabs**](https://github.com/xeolabs))     
    
# 1.4.3

September 28, 2020

* ContextMenu  
    * Remove ellipsis from ContextMenu items with sub-menus. [#435](https://github.com/xeokit/xeokit-sdk/issues/435) ([**@xeolabs**](https://github.com/xeolabs))     
    
# 1.4.2

September 25, 2020

* Picking  
    * Fix Scene#setObjectsPickable. [#434](https://github.com/xeokit/xeokit-sdk/issues/434) ([**@xeolabs**](https://github.com/xeolabs))     
    
# 1.4.1

September 10, 2020

* CameraControl  
    * Optimize CameraControl proximity-dependent dolly speed. [#429](https://github.com/xeokit/xeokit-sdk/issues/429) ([**@xeolabs**](https://github.com/xeolabs)) 
* ContextMenu 
    * Add ContextMenu "shown" and "hidden" events. [#425](https://github.com/xeokit/xeokit-sdk/issues/425) ([**@xeolabs**](https://github.com/xeolabs))
    * Add ContextMenu "hideOnMouseDown" option. [#430](https://github.com/xeokit/xeokit-sdk/issues/430) ([**@xeolabs**](https://github.com/xeolabs))
* Viewer
    * Ability to disable Viewer anti-aliasing. [#427](https://github.com/xeokit/xeokit-sdk/issues/427) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.3.91

August 24, 2020

* ContextMenu 
    * Fix ContextMenu getEnabled() callbacks. [#419](https://github.com/xeokit/xeokit-sdk/pull/419) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.9

August 24, 2020

* CameraControl 
    * Improve CameraControl touch dolly/pan. [#415](https://github.com/xeokit/xeokit-sdk/pull/415) ([**@amoki**](https://github.com/amoki))
* ContextMenu 
    * Multi-level ContextMenu. [#418](https://github.com/xeokit/xeokit-sdk/pull/418) ([**@xeolabs**](https://github.com/xeolabs))
* SectionPlane, SectionPlanesPlugin 
    * Ability to flip direction of a SectionPlane. [#417](https://github.com/xeokit/xeokit-sdk/issues/417) ([**@xeolabs**](https://github.com/xeolabs))
             
# 1.3.8

August 14, 2020

* BIMServerLoaderPlugin
    * Support BIMServer 1.5.182. [#287](https://github.com/xeokit/xeokit-sdk/issues/287) ([**@dimone-kun**](https://github.com/dimone-kun))
* CameraControl 
    * Picking optimizations and fixes. [#404](https://github.com/xeokit/xeokit-sdk/pull/404) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix CameraControl dolly/rotate interference. [#349](https://github.com/xeokit/xeokit-sdk/issues/349) ([**@xeolabs**](https://github.com/xeolabs))
    * Set CameraControl rotationInertia zero by default. [#411](https://github.com/xeokit/xeokit-sdk/issues/411) ([**@xeolabs**](https://github.com/xeolabs))
    *  Fix CameraControl "picked" event. [#412](https://github.com/xeokit/xeokit-sdk/issues/412) ([**@xeolabs**](https://github.com/xeolabs))
* Entity
    * Fix Rendering glitch on Chrome/FF/Android. [#402](https://github.com/xeokit/xeokit-sdk/issues/402) ([**@xeolabs**](https://github.com/xeolabs))       
    * Fix shading breakage for Phong, metallic and specular materials. [#410](https://github.com/xeokit/xeokit-sdk/issues/410) ([**@xeolabs**](https://github.com/xeolabs))
       
# 1.3.7

August 7, 2020

* CameraControl 
    * Customizable CameraControl key mappings. [#395](https://github.com/xeokit/xeokit-sdk/pull/395) ([**@xeolabs**](https://github.com/xeolabs))
    * Add CameraControl#touchDollyRate and simplify touch code. [#392](https://github.com/xeokit/xeokit-sdk/pull/392) ([**@amoki**](https://github.com/amoki))
    * Prevent CameraControl touch rotation in plan view mode. [#396](https://github.com/xeokit/xeokit-sdk/pull/396) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix CameraControl followPointer for pinch-dollying on touch devices. [#397](https://github.com/xeokit/xeokit-sdk/issues/397) ([**@xeolabs**](https://github.com/xeolabs))
    * CameraControl one-finger panning in planView mode on touch devices. [#398](https://github.com/xeokit/xeokit-sdk/issues/398) ([**@xeolabs**](https://github.com/xeolabs))
* GLTFLoaderPlugin
    * Fix edgeThreshold config for GLTFLoaderPlugin and PerformanceModel. [#385](https://github.com/xeokit/xeokit-sdk/issues/385) ([**@xeolabs**](https://github.com/xeolabs))
* Entity
    * Fix broken emphasis fill effect. [#394](https://github.com/xeokit/xeokit-sdk/issues/394) ([**@xeolabs**](https://github.com/xeolabs))       
   
# 1.3.6

July 16, 2020

* ImagePlane
    * Embed images in section planes and ground planes. [#378](https://github.com/xeokit/xeokit-sdk/issues/378) ([**@xeolabs**](https://github.com/xeolabs))
* Scene
    * Fix doublePickedNothing event arguments. [#365](https://github.com/xeokit/xeokit-sdk/issues/365) ([**@xeolabs**](https://github.com/xeolabs))
* Annotation
    * Create example of creating annotation at center of clicked object. [#374](https://github.com/xeokit/xeokit-sdk/issues/374) ([**@xeolabs**](https://github.com/xeolabs))
* buildPlaneGeometry()
    * Flip buildPlaneGeometry() UVs horizontally.  [7c8bfe5](https://github.com/xeokit/xeokit-sdk/commit/7c8bfe51e336e6a424d6a9fbf04272cd2fc4e580) ([**@xeolabs**](https://github.com/xeolabs))
* Mesh
    * Fix Mesh emissive mapping.  [#379](https://github.com/xeokit/xeokit-sdk/issues/379) ([**@xeolabs**](https://github.com/xeolabs))
* Canvas
    * Fix blend alpha function for non-transparent canvas.  [#381](https://github.com/xeokit/xeokit-sdk/issues/381) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.3.53

July 4, 2020

* PerformanceModel
    * Fix PerformanceModel for uncompressed mesh/geometry positions. [#370](https://github.com/xeokit/xeokit-sdk/issues/370) ([**@xeolabs**](https://github.com/xeolabs))
* CameraControl 
    * Add pan rate config for touch. [#363](https://github.com/xeokit/xeokit-sdk/issues/363) ([**@juho-ylikyla**](https://github.com/juho-ylikyla))
    * Fix "Not initializing lastX and lastY leads to NaN". [#357](https://github.com/xeokit/xeokit-sdk/pull/357) ([**@Kurtil**](https://github.com/Kurtil))
* ViewCullPlugin
    * Fix ViewCullPlugin: fix ObjectCullStates memory leak. [#322](https://github.com/xeokit/xeokit-sdk/issues/322) ([**@xeolabs**](https://github.com/xeolabs))
* XKTLoaderPlugin
    * Fix XKTLoaderPlugin: MetaModel not destroyed with PerformanceModel. [#360](https://github.com/xeokit/xeokit-sdk/issues/360) ([**@xeolabs**](https://github.com/xeolabs))
    
# 1.3.52

June 14, 2020

* PerformanceModel
    * Restore missing PerformanceModel#entityList. [#320](https://github.com/xeokit/xeokit-sdk/issues/320) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.51

June 18, 2020

* ViewCullPlugin
    * View Culling. [#322](https://github.com/xeokit/xeokit-sdk/issues/322), [#555](https://github.com/xeokit/xeokit-sdk/pull/355) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.5

June 17, 2020

* Entity
    * Dynamically movable Entity types. [#208](https://github.com/xeokit/xeokit-sdk/issues/208), [#535](https://github.com/xeokit/xeokit-sdk/pull/353) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.43

June 16, 2020

* CameraControl 
    * Don't fire "hover" events while right mouse button down. [#335](https://github.com/xeokit/xeokit-sdk/issues/335),  [````6accb69````](https://github.com/xeokit/xeokit-sdk/commit/6accb69cd8ff19d2c157e27e3e33fdd704e60481) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.42

June 15, 2020

* XKTLoaderPlugin 
    * Concurrent model loading. [#347](https://github.com/xeokit/xeokit-sdk/issues/347), [#348](https://github.com/xeokit/xeokit-sdk/pull/348) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.41

June 15, 2020

* StoreyViewsPlugin 
    * Fix flickering glitch with ````createStoreyMap()````. [#303](https://github.com/xeokit/xeokit-sdk/issues/303), [````e4d6236````](https://github.com/xeokit/xeokit-sdk/commit/e4d6236b54f160de5a3c0b7a0b5752bc68c243a2) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.4

June 15, 2020

* BCFViewpointsPlugin 
    * Fix clipping planes and realWorldOffset [#339](https://github.com/xeokit/xeokit-sdk/pull/339), [````6b2d070````](https://github.com/xeokit/xeokit-sdk/commit/6b2d070d0a07638e02cea2fe9ed0d22d9e18e6b4) ([**@amoki**](https://github.com/Amoki)) 
    * Save & load object colors and opacities [#328](https://github.com/xeokit/xeokit-sdk/issues/328), [#345](https://github.com/xeokit/xeokit-sdk/pull/345) [````0dd5efd````](https://github.com/xeokit/xeokit-sdk/commit/0dd5efdf5487fa81e289e2329996b9f3bcff2108) ([**@amoki**](https://github.com/Amoki))
* CameraControl   
    * Fix wrong entity on doublePick. [#333](https://github.com/xeokit/xeokit-sdk/issues/333), [````f1d5761````](https://github.com/xeokit/xeokit-sdk/commit/f1d576120c98d26f866b1d346d4b47bf6f669a16) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix overly-sensitive touch rotation and dolly. [#313](https://github.com/xeokit/xeokit-sdk/issues/313), [````b98ddbb````](https://github.com/xeokit/xeokit-sdk/commit/b98ddbbfb25d2729f9aece6ebc5810bd8229bd43) ([**@xeolabs**](https://github.com/xeolabs))
    * Fix memory leak. [````5436074````](https://github.com/xeokit/xeokit-sdk/commit/5436074174fba36d7f90964f003a1528d182b510) ([**@xeolabs**](https://github.com/xeolabs))
* ContextMenu
    * Dynamic item titles [#338](https://github.com/xeokit/xeokit-sdk/issues/338), [````8576910````](https://github.com/xeokit/xeokit-sdk/commit/85769100d722f8f63d83b1dd5dc9330457a34834) ([**@xeolabs**](https://github.com/xeolabs))
* Scene
    * Add Scene#opacityObjects [#343](https://github.com/xeokit/xeokit-sdk/issues/343), [````37dc831````](https://github.com/xeokit/xeokit-sdk/commit/37dc831696d63824ef0f77ebc2673a69aff683c6) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.3

June 8, 2020

* ContextMenu
    * Ignore clicks on disabled items. [#331](https://github.com/xeokit/xeokit-sdk/issues/331), [````20e857f````](https://github.com/xeokit/xeokit-sdk/commit/20e857fa54d868c63c4d1cd1a33a0c573522e7a9) ([**@xeolabs**](https://github.com/xeolabs))
    * Added ContextMenu#shown. [````4f719ef````](https://github.com/xeokit/xeokit-sdk/commit/4f719efd0e87e08c97b849729be6f191ed5f55ce) ([**@xeolabs**](https://github.com/xeolabs))
* CameraControl
    * Don't consume keyboard events on canvas. [#337](https://github.com/xeokit/xeokit-sdk/issues/337), [````6c9c831````](https://github.com/xeokit/xeokit-sdk/commit/6c9c831955cd488679ba80ad8aa02d036849a850) ([**@xeolabs**](https://github.com/xeolabs))
    * Don't fire "hover" events while mouse down. [#335](https://github.com/xeokit/xeokit-sdk/issues/335), [````5986a29````](https://github.com/xeokit/xeokit-sdk/commit/5986a2954a12685d2810bbffadc27f1b324a0b1d) ([**@xeolabs**](https://github.com/xeolabs))
    * Only fire "picked" on left click. [#336](https://github.com/xeokit/xeokit-sdk/issues/336), [````4e6b103````](https://github.com/xeokit/xeokit-sdk/commit/4e6b103eb063215dc0aeda8bb01eb64cb34ac2d5) ([**@xeolabs**](https://github.com/xeolabs))
* BCFViewpointsPlugin
    * Fix clipping planes with yUp models and add option to reverse planes. [#323](https://github.com/xeokit/xeokit-sdk/pull/323) ([**@amoki**](https://github.com/Amoki))

# 1.3.2

June 8, 2020

* NavCubePlugin 
    * Ignore right-click. [````91badf2````](https://github.com/xeokit/xeokit-sdk/commit/91badf2092027f00987990ecc3fbcd765aa1a77f) ([**@xeolabs**](https://github.com/xeolabs))
     
# 1.3.1

June 8, 2020

* MetaModel
    * Add creation/version/authoring properties. [````6c154c7````](https://github.com/xeokit/xeokit-sdk/commit/42ebe1f5cbd6b7bb2ed3b59bcec98d7ab32e8c27) ([**@xeolabs**](https://github.com/xeolabs))

# 1.3.0

June 5, 2020

* Fix alpha blending for X-Ray. [#318](https://github.com/xeokit/xeokit-sdk/issues/318), [````145ca17````](https://github.com/xeokit/xeokit-sdk/commit/145ca17d1839a4ba464c650e3647f305caf90816) ([**@xeolabs**](https://github.com/xeolabs))
* Fix missing objects in large .XKT models. [#315](https://github.com/xeokit/xeokit-sdk/issues/315), [````1b42a8````](https://github.com/xeokit/xeokit-sdk/commit/1b424a8ababff35fe5202993eea33a3cc3667847)  ([**@lasselaakkonen**](https://github.com/lasselaakkonen)), ([**@xeolabs**](https://github.com/xeolabs)) 
* Add PerformanceModel#entityList. [#320](https://github.com/xeokit/xeokit-sdk/issues/320), [````184443d````](https://github.com/xeokit/xeokit-sdk/commit/184443d3bb062e7659be7dc2af9e15c275b66da3)  ([**@xeolabs**](https://github.com/xeolabs))
* Fix CameraFlightAnimation; make it stop running animations when destroyed. [#317](https://github.com/xeokit/xeokit-sdk/issues/317), [````42ebe1f````](https://github.com/xeokit/xeokit-sdk/commit/42ebe1f5cbd6b7bb2ed3b59bcec98d7ab32e8c27)  ([**@xeolabs**](https://github.com/xeolabs))
* Enhance CameraControl; add dollyMinSpeed and dollyProximityThreshold. [````baea53e````](https://github.com/xeokit/xeokit-sdk/commit/baea53e382e67c3aa70a8ae9596738fd0c17727b) ([**@xeolabs**](https://github.com/xeolabs))

# 1.2.1

May 29, 2020

* PerformanceModel
    * Fix initializing BatchingLayer.colorsBuf. [#314](https://github.com/xeokit/xeokit-sdk/pull/314), [````0f60018````](https://github.com/xeokit/xeokit-sdk/commit/0f600180abe6fbc01a9b98bd7b89f919df2192ed) ([**@xeolabs**](https://github.com/xeolabs))


# 1.1.0

May 25, 2020

* IFCObjectDefaults
    * Fix types with no props not falling back on "DEFAULT". [#276](https://github.com/xeokit/xeokit-sdk/issues/276), [````b3e6ce3````](https://github.com/xeokit/xeokit-sdk/commit/b3e6ce370f347ab9a355a7400ce70990a9f7b1af) ([**@xeolabs**](https://github.com/xeolabs))
* CameraControl 
    * Dolly rate proportional to target distance. [#311](https://github.com/xeokit/xeokit-sdk/issues/311), [````0fe3c46````](https://github.com/xeokit/xeokit-sdk/commit/0fe3c4679e370b6071ae2f2a3c1f8f7e6632981d) ([**@xeolabs**](https://github.com/xeolabs))







