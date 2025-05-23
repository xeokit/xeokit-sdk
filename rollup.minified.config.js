import {nodeResolve} from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import banner from 'rollup-plugin-banner';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

let gitCommitHash = 'unknown';
try {
    gitCommitHash = execSync('git rev-parse HEAD').toString().trim();
} catch(err) {
    console.warn('Unable to get git commit hash: ', err.message);
}

const buildTimeStamp = new Date().toISOString();

const versionInfo = `xeokit-sdk v${pkg.version}\n Commit: ${gitCommitHash}\n Built: ${buildTimeStamp}`;

export default {
    input: './src/index.js',
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
            format: 'es',
            name: 'bundle',
            plugins: [
                getBabelOutputPlugin({ 
                    presets: ['@babel/preset-env']
                })
            ]
        }
    ],
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        terser(),
        banner(versionInfo)
    ]
}