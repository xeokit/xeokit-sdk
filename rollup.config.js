import resolve from 'rollup-plugin-node-resolve';

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
        resolve({
            browser: true,
            preferBuiltins: false
        })
    ]
}