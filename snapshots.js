const PercyScript = require('@percy/script');
const httpServer = require('http-server');

PercyScript.run(async (page, percySnapshot) => {

    async function testPage(pageName) {
        await page.goto('http://localhost:8080/examples/visualTests/' + pageName);
        await page.waitFor(() => !!document.querySelector('#percyLoaded'));
        await percySnapshot(pageName);
    }

    let server = httpServer.createServer();

    server.listen(8080);

    console.log(`Server started`);

    await testPage('XKTLoaderPlugin_load_Duplex.html');
    await testPage('XKTLoaderPlugin_load_doublePrecision_MAP.html');

    await testPage('BCFViewpointsPlugin_loadViewpoint.html');

    await testPage('PerformanceModel_batching.html');
    await testPage('PerformanceModel_batching_geometries.html');
    await testPage('PerformanceModel_batching_RTC.html');
    await testPage('PerformanceModel_batching_PBR_spheres.html');

    await testPage('PerformanceModel_instancing.html');
    await testPage('PerformanceModel_instancing_geometries.html');
    await testPage('PerformanceModel_instancing_RTC.html');
    await testPage('PerformanceModel_instancing_PBR_spheres.html');

    await testPage('SAO_XKT_OTCConferenceCenter.html');

    server.close();

});

