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

async function wait() {
    return new Promise((resolve) => { setTimeout(() => { resolve("Waited 3 seconds"); }, 3000); })
}

test.beforeAll("wait", async () => await wait());

test.describe("Build a scene model", async () => {
    test.describe("check with DTX enabled", async () => {
        testPage('effects_dtx_batching_SAO');
        testPage('effects_dtx_instancing_SAO');
    });

    test.describe("check with VBO", async () => {
        testPage('effects_vbo_batching_SAO');
        testPage('effects_vbo_instancing_SAO');
    });
});




