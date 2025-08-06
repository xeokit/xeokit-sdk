import percySnapshot from "@percy/playwright";
import { test, expect } from "@playwright/test";
import "dotenv/config";

const isLocal = process.env.PLAYWRIGHT_LOCAL && (process.env.PLAYWRIGHT_LOCAL !== "0");

const setupPage = async (testName, pageName, callWithPage) => {
    return test(testName, async ({ page }) => {
        await page.goto(`http://localhost:${isLocal ? 8081 : 8080}/test-scenes/${pageName}`);
        await expect(page.locator("#percyLoaded")).toBeAttached();
        await callWithPage(page);
    });
};

const testPage = async (pageName, callWithPage) => {
    return setupPage(
        `should check if scene loaded for ${pageName}`,
        `${pageName}.html`,
        async page => {
            if (callWithPage) {
                await callWithPage(page);
            }
            if (isLocal) {
                await expect(page).toHaveScreenshot();
            } else {
                await percySnapshot(page, pageName.replaceAll("/", "_"), { widths: [1280] });
            }
        });
};

export { expect, setupPage, test, testPage };
