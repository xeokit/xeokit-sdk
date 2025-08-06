import { test, testPage } from "./lib.js";

test.describe("Lighting visual test", async () => {
    const testWithTimeout = (pageName) => testPage(pageName, async (page) => await page.waitForTimeout(5000));
    testWithTimeout("vbo_batching_autocompressed_triangles_textures_jpg");
    testWithTimeout("vbo_batching_autocompressed_triangles_textures_ktx2");
    testWithTimeout("vbo_batching_precompressed_triangles_textures_jpg");
    testWithTimeout("vbo_batching_precompressed_triangles_textures_ktx2");
    testWithTimeout("vbo_instancing_autocompressed_triangles_textures_jpg");
    testWithTimeout("vbo_instancing_autocompressed_triangles_textures_ktx2");
    testWithTimeout("vbo_instancing_precompressed_triangles_textures_jpg");
    testWithTimeout("vbo_instancing_precompressed_triangles_textures_ktx2");
});
