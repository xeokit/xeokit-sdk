import percySnapshot from '@percy/playwright';
import { test, expect } from '@playwright/test';
import 'dotenv/config';

async function testPage(pageName) {

    return test(`should check if scene loaded for ${pageName}`, async ({ page }) => {

        const loadedContent = page.locator('#percyLoaded');
        await page.goto(`http://localhost:8080/test-scenes/${pageName}.html`);

        await expect(loadedContent).toBeAttached();

        await percySnapshot(page, pageName, {
            widths: [1280]
        });

    });
}

async function waitThreeSeconds() {
    return new Promise((resolve) => { setTimeout(() => { resolve("Waited 3 seconds"); }, 3000); })
}

test.beforeAll("wait", async () => await waitThreeSeconds());

test.describe("Compare snapshot of a scene to the reference", async () => {
    //------------------------------------------------------------------------------------------------------------------
    // Scene representation within the graphics engine
    //------------------------------------------------------------------------------------------------------------------
    // High-performance representation for high detail


    testPage('sceneRepresentation_SceneModel_batching_triangles'); // Performance model representation; triangle geometry primitives;  no geometry reuse
    testPage('sceneRepresentation_SceneModel_batching_geometries'); // Performance model representation; every geometry primitive type; no geometry reuse
    testPage('sceneRepresentation_SceneModel_batching_RTC_triangles'); // Performance model representation; triangle geometry primitives; relative-to-center coordinates; no geometry reuse
    testPage('sceneRepresentation_SceneModel_instancing_triangles'); // Performance model representation; triangle geometry primitives;  reused geometry
    testPage('sceneRepresentation_SceneModel_instancing_geometries'); // Performance model representation; every geometry primitive type; reused geometry
    testPage('sceneRepresentation_SceneModel_instancing_RTC_triangles'); // Performance model representation; triangle geometry primitives; relative-to-center coordinates; reused geometry
});




