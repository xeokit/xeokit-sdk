import { test, testPage } from "./lib.js";

test.describe("Slicing test", async () => {
    const testWithTimeout = (pageName) => testPage(pageName, async (page) => await page.waitForTimeout(5000));
    testWithTimeout("slicing/SectionCaps_at_distance");
});
