import {nodeResolve} from '@rollup/plugin-node-resolve';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';

export default {
    input: './src/index.js',
    output: [
        {
            file: './dist/xeokit-sdk.es.js',
            format: 'es',
            name: 'bundle'
        }
    ],
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        })
    ]
}