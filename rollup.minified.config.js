import {nodeResolve} from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

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
        replace({
            delimiters: ['', ''],
            '__VIEWER_VERSION__': JSON.stringify(pkg.version),
            preventAssignment: true
        }),
    ]
}