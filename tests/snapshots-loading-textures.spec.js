import percySnapshot from "@percy/playwright";
import { test, expect } from "@playwright/test";
import "dotenv/config";

async function testPage(pageName) {
  return test(`should check if scene loaded for ${pageName}`, async ({
    page,
  }) => {
    const loadedContent = page.locator("#percyLoaded");
    await page.goto(`http://localhost:8080/test-scenes/${pageName}.html`);

    await expect(loadedContent).toBeAttached();

    await page.waitForTimeout(5000);

    await percySnapshot(page, pageName, {
      widths: [1280],
    });
  });
}

async function wait() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Waited 3 seconds");
    }, 3000);
  });
}

test.beforeAll("wait", async () => await wait());

test.describe("Lighting visual test", async () => {
  testPage("vbo_batching_autocompressed_triangles_textures_jpg");
  testPage("vbo_batching_autocompressed_triangles_textures_ktx2");
  testPage("vbo_batching_precompressed_triangles_textures_jpg");
  testPage("vbo_batching_precompressed_triangles_textures_ktx2");
  testPage("vbo_instancing_autocompressed_triangles_textures_jpg");
  testPage("vbo_instancing_autocompressed_triangles_textures_ktx2");
  testPage("vbo_instancing_precompressed_triangles_textures_jpg");
  testPage("vbo_instancing_precompressed_triangles_textures_ktx2");
});
