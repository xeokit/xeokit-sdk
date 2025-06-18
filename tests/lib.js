import percySnapshot from "@percy/playwright";
import { test, expect } from "@playwright/test";
import "dotenv/config";

const testPage = ((process.env.PLAYWRIGHT_LOCAL && (process.env.PLAYWRIGHT_LOCAL !== "0"))
                  ? async (pageName, callWithPage) => {
                      return test(`should check if scene loaded for ${pageName}`, async ({ page }) => {
                          await page.goto(`http://localhost:8081/test-scenes/${pageName}.html`);
                          await expect(page.locator("#percyLoaded")).toBeAttached({ timeout: 10000 });

                          if (callWithPage) {
                              await callWithPage(page);
                          }

                          await expect(page).toHaveScreenshot();
                      });
                  }
                  : (function() {
                      test.beforeAll("wait", async () => new Promise((resolve) => setTimeout(() => resolve("Waited 3 seconds"), 3000)));
                      return async (pageName, callWithPage) => {
                          return test(`should check if scene loaded for ${pageName}`, async ({ page }) => {
                              const loadedContent = page.locator("#percyLoaded");
                              await page.goto(`http://localhost:8080/test-scenes/${pageName}.html`);

                              await expect(loadedContent).toBeAttached();

                              if (callWithPage) {
                                  await callWithPage(page);
                              }

                              await percySnapshot(page, pageName.replaceAll("/", "_"), { widths: [1280] });
                          });
                      };
                  })());

export { test, testPage };
