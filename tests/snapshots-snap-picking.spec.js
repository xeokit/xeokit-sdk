import { expect, test, setupPage, testPage } from "./lib.js";

test.describe("Add visual effect to picked entity on mouseover", async () => {
    testPage("snapToVertex_vbo_batching_triangles", async (page) => {
        const mousePosition = await page.evaluate(async () => {
            return [parseInt(window.canvasPos[0] - 10), parseInt(window.canvasPos[1] - 10)];
        });
        await page.mouse.move(...mousePosition);
        await page.waitForTimeout(500);
    });

    const pageName = "snap_pick_ViewCullPlugin";
    setupPage(
        `getGeometryData_${pageName}`,
        `${pageName}.html`,
        async page => {
            const data = await page.evaluate(() => JSON.stringify([...window.xeokitViewer.scene.pick({canvasPos: [300, 300], pickSurface: true, snapToVertex: true}).worldPos], null, 4));
            // if vertexCullX is not "2.0" for (!isSnapInit) then fails on webkit/safari
            expect(data).toMatchSnapshot();
        });
});
