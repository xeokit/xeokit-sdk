import { test, testPage } from "./lib.js";

test.describe("Build a scene model", async () => {
    test.describe("check with DTX enabled", async () => {
        testPage("effects_dtx_batching_SAO");
        testPage("effects_dtx_instancing_SAO");
    });

    test.describe("check with VBO", async () => {
        testPage("effects_vbo_batching_SAO");
        testPage("effects_vbo_instancing_SAO");
    });
});
