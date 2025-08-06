import { test, testPage } from "./lib.js";

test.describe("Add visual effect to picked entity on mouseover", async () => {
    const testWithMouseMove = pageName => testPage(pageName, async page => await page.mouse.move(640, 350));
    testWithMouseMove("effects_dtx_batching_colorize");
    testWithMouseMove("effects_dtx_batching_highlight");
    testWithMouseMove("effects_dtx_batching_opacity");
    testWithMouseMove("effects_dtx_batching_select");
    testWithMouseMove("effects_vbo_batching_colorize");
    testWithMouseMove("effects_vbo_batching_highlight");
    testWithMouseMove("effects_vbo_batching_opacity");
    testWithMouseMove("effects_vbo_batching_select");
    testWithMouseMove("effects_vbo_batching_xray");
    testWithMouseMove("effects_vbo_instancing_colorize");
    testWithMouseMove("effects_vbo_instancing_highlight");
    testWithMouseMove("effects_vbo_instancing_opacity");
    testWithMouseMove("effects_vbo_instancing_select");
    testWithMouseMove("effects_vbo_instancing_xray");
});
