import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

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
        nodeResolve(),
        terser()
    ]
}