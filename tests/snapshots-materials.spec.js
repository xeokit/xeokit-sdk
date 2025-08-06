import { test, testPage } from "./lib.js";

test.describe("Materials test", async () => {
    const testWithTimeout = (pageName) => testPage(pageName, async (page) => await page.waitForTimeout(5000));
    testWithTimeout("scenegraph/materials_Fresnel");
    testWithTimeout("scenegraph/materials_LambertMaterial");
    testWithTimeout("scenegraph/materials_MetallicMaterial");
    testWithTimeout("scenegraph/materials_MetallicMaterialLightReflection");
});
