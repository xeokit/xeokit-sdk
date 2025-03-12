Percy Testing Service
=========================

Percy is a service that allows us to automate visual testing. It integrates with Playwright to capture screenshots of example 3d scenes from [/test-scenes/](/test-scenes/) directory and compare them against a baseline, ensuring that visual regressions are caught and fixed.

Our tests are divided thematically within test files located in [/tests/](/tests/) directory. In each of the files there might be more than one example scenes used.

## Running Percy Tests Locally

**Step 1: Install Dependencies**

Install the required dependencies by running `npm install` in the root directory.

**Step 2: Set up Percy Token**

Create a .env file in the root directory.

Copy PERCY_TOKEN into your .env file, replacing `<your-percy-token>` with actual Percy token. 

```
PERCY_TOKEN=<your-percy-token>
```
A Percy token is generated when a Percy project is created. The token is a write-only API key that is unique for each project. If you have an access to the project, you can find it on the Project Settings page. If you don't have the access, please contact project maintainers.

![Percy Project Settings](https://www.browserstack.com/docs/static/img/percy-app-percy/get-started/percy-get-token.webp)

**Step 3: Run Tests**

After you commit your changes, run all tests from /tests/ directory using the following command:

```
npm test
```

or a single test file using:

```
npx percy exec -- npx playwright <test-file-name>
```

This command will run local dev server on port 8080 first and trigger Playwright tests based on html files capture screenshots. Percy will then compare these screenshots against the baseline and report any visual regressions. During the process you will get the link to the build. If Percy will detect any visual changes you will see it in the build results. The 'failed' comparisons can be also approved if the changes are desired - they will become a new baseline.

## Creating your own tests

Feel free to add more tests if necessary. 

First thing you need to do is preparing an html file with a script that initializes viewer and loads geometries/models you would like to test.
In the end of the script you need to use ['signalTestComplete'](/test-scenes/lib/utils.js) utility function, which will add a specific html component to the DOM. Then in the test script it's necessary to check if the component is attached to prevent taking a snapshot of the web page before the scene has fully loaded.

```
const loadedContent = page.locator("#percyLoaded");
await page.goto(`http://localhost:8080/test-scenes/${pageName}.html`);
await expect(loadedContent).toBeAttached();
```

Test script with 'spec.js' extension is a standard Playwright test. The only difference is that we import "percySnapshot" function from ["@percy/playwright"](https://github.com/percy/percy-playwright) module, which we need to run inside the test. If you're not familiar with Plyawright library and the tests syntax please check out the [Playwright docs](https://playwright.dev/docs/writing-tests).

## Troubleshooting

If you encounter any issues while running Percy tests locally, you can try the following:

- check that you have the correct Percy token in your .env file,
- verify that you have the latest version of Playwright installed,
- check the Percy dashboard for any errors or issues related to your project

