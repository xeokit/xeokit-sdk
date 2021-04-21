const PercyScript = require('@percy/script');
const httpServer = require('http-server');

PercyScript.run(async (page, percySnapshot) => {

    async function testPage(pageName) {
        await page.goto('http://localhost:3000/tests/' + pageName);
        await page.waitForFunction(() => !!document.querySelector('#percyLoaded'));
        await percySnapshot(pageName, {
            widths: [1280]
        });
    }

    let server = httpServer.createServer();

    server.listen(3000);

    console.log(`Server started`);

    //------------------------------------------------------------------------------------------------------------------
    // Scene representation within the graphics engine
    //------------------------------------------------------------------------------------------------------------------

    // High-performance representation for high detail

    await testPage('sceneRepresentation_PerformanceModel_batching_triangles.html'); // Performance model representation; triangle geometry primitives;  no geometry reuse
    await testPage('sceneRepresentation_PerformanceModel_batching_geometries.html'); // Performance model representation; every geometry primitive type; no geometry reuse
    await testPage('sceneRepresentation_PerformanceModel_batching_RTC_triangles.html'); // Performance model representation; triangle geometry primitives; relative-to-center coordinates; no geometry reuse
    await testPage('sceneRepresentation_PerformanceModel_batching_PBR_spheres.html'); // Performance model representation; triangle geometry primitives; physically-based rendering; no geometry reuse

    await testPage('sceneRepresentation_PerformanceModel_instancing_triangles.html'); // Performance model representation; triangle geometry primitives;  reused geometry
    await testPage('sceneRepresentation_PerformanceModel_instancing_geometries.html'); // Performance model representation; every geometry primitive type; reused geometry
    await testPage('sceneRepresentation_PerformanceModel_instancing_RTC_triangles.html'); // Performance model representation; triangle geometry primitives; relative-to-center coordinates; reused geometry
    await testPage('sceneRepresentation_PerformanceModel_instancing_PBR_spheres.html'); // Performance model representation; triangle geometry primitives; physically-based rendering; reused geometry

    // Scene graph representation for flexibility and low-detail

    await testPage('sceneRepresentation_sceneGraph_VBOGeometry_Phong.html'); // Scene graph with GPU-resident geometry and Phong shading
    await testPage('sceneRepresentation_sceneGraph_ReadableGeometry_Phong.html'); // Scene graph with browser-resident geometry and Phong shading

    //------------------------------------------------------------------------------------------------------------------
    // Lighting
    //------------------------------------------------------------------------------------------------------------------

    // Scene graph with Phong shading

    await testPage('lighting_AmbientLight_sceneGraph_Phong.html'); // Scene graph with ambient light source and Phong materials
    await testPage('lighting_DirLight_view_sceneGraph_Phong.html'); // Scene graph with directional View-space light source and Phong materials
    await testPage('lighting_DirLight_world_sceneGraph_Phong.html'); // Scene graph with directional World-space light source and Phong materials
    await testPage('lighting_PointLight_view_sceneGraph_Phong.html'); // Scene graph with positional View-space light source and Phong materials
    await testPage('lighting_PointLight_world_sceneGraph_Phong.html'); // Scene graph with positional World-space light source and Phong materials

    // Scene graph with metallic-roughness PBR shading

    await testPage('lighting_AmbientLight_sceneGraph_metallicRoughness.html'); // Scene graph with ambient light source and metallic/rough PBR materials
    await testPage('lighting_DirLight_view_sceneGraph_metallicRoughness.html'); // Scene graph with directional View-space light source and metallic/rough PBR materials
    await testPage('lighting_DirLight_world_sceneGraph_metallicRoughness.html'); // Scene graph with directional World-space light source and metallic/rough PBR materials
    await testPage('lighting_PointLight_view_sceneGraph_metallicRoughness.html'); // Scene graph with positional View-space light source and metallic/rough PBR materials
    await testPage('lighting_PointLight_world_sceneGraph_metallicRoughness.html'); // Scene graph with positional World-space light source and metallic/rough PBR materials

    // Higher-level tests

    await testPage('lighting_DirLight_view.html'); // All scene representations; directional View-space light sources
    await testPage('lighting_DirLight_world.html'); // All scene representations; directional World-space light sources
    await testPage('lighting_PointLight_view.html'); // All scene representations; positional View-space light sources
    await testPage('lighting_PointLight_world.html'); // All scene representations; positional World-space light sources

    //------------------------------------------------------------------------------------------------------------------
    // Section planes
    //------------------------------------------------------------------------------------------------------------------

    await testPage('sectionPlanes_PerformanceModel.html');
    await testPage('sectionPlanes_PerformanceModel_ortho.html');

    //------------------------------------------------------------------------------------------------------------------
    // Visual effects
    //------------------------------------------------------------------------------------------------------------------

    // Scalable ambient obscurance (SAO)

    await testPage('effects_SAO_XKT_OTCConferenceCenter.html');

    // Logarithmic depth buffer

    await testPage('effects_logarithmicDepthBuffer_sceneGraph_RTC.html');
    await testPage('effects_logarithmicDepthBuffer_PerformanceModel_batching_RTC.html');
    await testPage('effects_logarithmicDepthBuffer_PerformanceModel_instancing_RTC.html');

    //------------------------------------------------------------------------------------------------------------------
    // Loading models
    //------------------------------------------------------------------------------------------------------------------

    // XKT

    await testPage('loading_XKT.html'); // Loading a single-precision BIM model from XKT format
    await testPage('loading_XKT_pointCloud.html');
    await testPage('loading_XKT_doublePrecision.html'); // Loading a double-precision BIM model from XKT format
    await testPage('loading_XKT_dataSource.html');

    // STL

    await testPage('loading_STL_doublePrecision.html');
    await testPage('loading_STL_dataAsParam.html');
    await testPage('loading_STL_dataSource.html');

    // 3DXML

    // OBJ

    await testPage('loading_OBJ.html');

    // 3DS

    await testPage('loading_3DS.html');

    // glTF

    await testPage('loading_glTF_dataSource.html');
    await testPage('loading_glTF_PerformanceModel_transform.html');

    //------------------------------------------------------------------------------------------------------------------
    // BCF interoperability
    //------------------------------------------------------------------------------------------------------------------

    // Loading BCF viewpoints

    await testPage('bcf_BCFViewpointsPlugin_loadViewpoint.html'); // Loading a single model and a BCF viewpoint
    await testPage('bcf_BCFViewpointsPlugin_loadViewpoint_multipleModels.html'); // Loading multiple models and a BCF viewpoint


    // Highlighting


    server.close();

});

