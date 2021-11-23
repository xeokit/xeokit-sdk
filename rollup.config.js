import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    input: './src/index.js',
    output: [
        {
            file: './dist/xeokit-sdk.es.js',
            format: 'es',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-sdk.cjs.js',
            format: 'cjs',
            name: 'bundle'
        }
    ],
    plugins: [
        nodeResolve()
    ]
}