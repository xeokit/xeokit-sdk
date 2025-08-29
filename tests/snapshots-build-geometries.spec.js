import { test, testPage } from "./lib.js";

test.describe("Build a scene model", async () => {
    test.describe("check with DTX enabled", async () => {
        testPage("dtx_batching_autocompressed_triangles");
        testPage("dtx_batching_autocompressed_triangles_rtc");
        testPage("dtx_batching_geometries");
        testPage("dtx_batching_precompressed_bucketed_triangles");
        testPage("dtx_batching_precompressed_triangles");
        testPage("dtx_instancing_autocompressed_triangles");
        testPage("dtx_instancing_geometries");
        testPage("dtx_instancing_precompressed_bucketed_triangles");
        testPage("dtx_instancing_precompressed_triangles");
    });

    test.describe("check with VBO", async () => {
        testPage("vbo_batching_autocompressed_triangles");
        testPage("vbo_batching_autocompressed_triangles_rtc");
        testPage("vbo_batching_geometries");
        testPage("vbo_batching_precompressed_triangles");
        testPage("vbo_batching_precompressed_triangles_rtc");
        testPage("vbo_instancing_autocompressed_triangles");
        testPage("vbo_instancing_autocompressed_triangles_rtc");
        testPage("vbo_instancing_geometries");
        testPage("vbo_instancing_precompressed_triangles");
        testPage("vbo_instancing_precompressed_triangles_rtc");

        testPage("vbo_batching_flat_geometries_lights");
    });

    test.describe("isUI objects", async () => {
        testPage("isUI_transparencies");
    });
});
