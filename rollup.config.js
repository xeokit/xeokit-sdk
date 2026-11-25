import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import banner from 'rollup-plugin-banner';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

let gitCommitHash = 'unknown';
try {
    gitCommitHash = execSync('git rev-parse HEAD').toString().trim();
} catch (err) {
    console.warn('Unable to get git commit hash: ', err.message);
}

const buildTimeStamp = new Date().toISOString();

const versionInfo = `xeokit-sdk v${pkg.version}\n Commit: ${gitCommitHash}\n Built: ${buildTimeStamp}`;

const bannerCode = `if (typeof window !== 'undefined') {
    window.__XEOKIT__ = { version: '${pkg.version}', commit: '${gitCommitHash}', built: '${buildTimeStamp}' };
}
`;

const output = (file, plugins) => ({
    file,
    format: 'es',
    banner: bannerCode,
    // The version comment goes last, so that terser does not remove it.
    plugins: [...plugins, banner(versionInfo)]
});

// "rollup --config rollup.config.js --configDev" skips the slow minified build.
export default (commandLineArgs) => ({
    input: './src/index.js',
    output: [
        output('./dist/xeokit-sdk.es.js', []),
        ...(commandLineArgs.configDev ? [] : [output('./dist/xeokit-sdk.min.es.js', [terser()])])
    ],
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        })
    ]
});
