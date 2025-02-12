import percySnapshot from '@percy/playwright';
import { test, expect } from '@playwright/test';
import 'dotenv/config';

async function testPage(pageName) {

    return test(`should check if scene loaded for ${pageName}`, async ({ page }) => {

        const loadedContent = page.locator('#percyLoaded');
        await page.goto(`http://localhost:8080/test-scenes/${pageName}.html`);

        await expect(loadedContent).toBeAttached();

        await page.mouse.move(640, 350);

        await percySnapshot(page, pageName, {
            widths: [1280]
        });
    });
}

async function wait() {
    return new Promise((resolve) => { setTimeout(() => { resolve("Waited 3 seconds"); }, 3000); })
}

test.beforeAll("wait", async () => await wait());

test.describe("Add visual effect to picked entity on mouseover", async () => {
    testPage('effects_dtx_batching_colorize');
    testPage('effects_dtx_batching_highlight');
    testPage('effects_dtx_batching_opacity');
    testPage('effects_dtx_batching_select');
    testPage('effects_vbo_batching_colorize');
    testPage('effects_vbo_batching_highlight');
    testPage('effects_vbo_batching_opacity');      
    testPage('effects_vbo_batching_select');
    testPage('effects_vbo_batching_xray');
    testPage('effects_vbo_instancing_colorize');
    testPage('effects_vbo_instancing_highlight');
    testPage('effects_vbo_instancing_opacity');
    testPage('effects_vbo_instancing_select');
    testPage('effects_vbo_instancing_xray');
});




