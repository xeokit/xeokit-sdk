import { test, testPage } from "./lib.js";

test.describe("Add visual effect to picked entity on mouseover", async () => {
    testPage("snapToVertex_vbo_batching_triangles", async (page) => {
        const mousePosition = await page.evaluate(async () => {
            return [parseInt(window.canvasPos[0] - 10), parseInt(window.canvasPos[1] - 10)];
        });
        await page.mouse.move(...mousePosition);
        await page.waitForTimeout(500);
    });
});
