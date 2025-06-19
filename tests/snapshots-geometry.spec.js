import { expect, setupPage, test } from "./lib.js";

test.describe("Test geometry data", async () => {

    const testViewerEntitiesGeometryData = (pageName) => {
        setupPage(
            `getGeometryData_${pageName}`,
            `${pageName}.html`,
            async page => {
                const data = await page.evaluate(() => JSON.stringify(window.model.entityList.map(entity => entity.getGeometryData()), null, 4));
                expect(data).toMatchSnapshot();
            });
    };

    testViewerEntitiesGeometryData("vbo_batching_geometries");

    testViewerEntitiesGeometryData("vbo_batching_autocompressed_triangles");
    testViewerEntitiesGeometryData("vbo_batching_autocompressed_triangles_rtc");

    testViewerEntitiesGeometryData("vbo_batching_precompressed_triangles");
    testViewerEntitiesGeometryData("vbo_batching_precompressed_triangles_rtc");

    testViewerEntitiesGeometryData("vbo_instancing_geometries");

    testViewerEntitiesGeometryData("vbo_instancing_autocompressed_triangles");
    testViewerEntitiesGeometryData("vbo_instancing_autocompressed_triangles_rtc");

    testViewerEntitiesGeometryData("vbo_instancing_precompressed_triangles");
    testViewerEntitiesGeometryData("vbo_instancing_precompressed_triangles_rtc");
});
