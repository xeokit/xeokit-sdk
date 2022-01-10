import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

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
        }
    ],
    plugins: [
        nodeResolve(),
        terser()
    ]
}