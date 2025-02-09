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
  });
});
