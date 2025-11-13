import { nodeResolve } from '@rollup/plugin-node-resolve';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import banner from 'rollup-plugin-banner';
import replace from '@rollup/plugin-replace';
import { terser } from "rollup-plugin-terser";
import commonjs from '@rollup/plugin-commonjs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

let gitCommitHash = 'unknown';
try {
    gitCommitHash = execSync('git rev-parse HEAD').toString().trim();
} catch (err) {
    console.warn('Unable to get git commit hash: ', err.message);
}

const buildTimeStamp = new Date().toISOString();

const versionInfo = `xeokit-sdk v${pkg.version}\n Commit: ${gitCommitHash}\n Built: ${buildTimeStamp}`;

// Common configuration for both standard and minified builds
const input = './src/index.js';
const bannerPlugin = banner(versionInfo);
const replacePlugin = replace({
    'import.meta.url': 'typeof document === "undefined" ? "" : document.currentScript.src',
    preventAssignment: true
});


// Standard build configuration
const standardBuildConfig = {
    input,
    output: [
        {
            file: './dist/xeokit-sdk.es.js',
            format: 'es',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-sdk.cjs.js',
            format: 'cjs',
            name: 'xeokit'
        },
        {
            file: './dist/xeokit-sdk.es5.js',
            format: 'umd',
            name: 'xeokit',
            sourcemap: false,
            plugins: [
                getBabelOutputPlugin({
                    allowAllFormats: true,
                    presets: [
                        ['@babel/preset-env', {
                            targets: {
                                ie: '11',
                                chrome: '58',
                                firefox: '54',
                                safari: '10'
                            },
                            modules: false,
                            useBuiltIns: 'entry',
                            corejs: { version: 3, proposals: true }
                        }]
                    ]
                })
            ]
        }
    ],
    plugins: [
        replacePlugin,
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs(),
        bannerPlugin
    ]
};

// Minified build configuration
const minifiedBuildConfig = {
    input,
    output: [
        {
            file: './dist/xeokit-sdk.min.es.js',
            format: 'es',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-sdk.min.cjs.js',
            format: 'cjs',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-sdk.min.es5.js',
            format: 'umd',
            name: 'xeokit',
            sourcemap: false,
            plugins: [
                getBabelOutputPlugin({
                    allowAllFormats: true,
                    presets: [
                        ['@babel/preset-env', {
                            targets: {
                                ie: '11',
                                chrome: '58',
                                firefox: '54',
                                safari: '10'
                            },
                            modules: false,
                            useBuiltIns: 'entry',
                            corejs: { version: 3, proposals: true }
                        }]
                    ]
                }),
                terser()
            ]
        }
    ],
    plugins: [
        replacePlugin,
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs(),
        terser(),
        bannerPlugin
    ]
};

// Export both configurations as an array
export default [standardBuildConfig, minifiedBuildConfig];