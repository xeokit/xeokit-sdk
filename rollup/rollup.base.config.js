import {nodeResolve} from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const excludePath = '**/node_modules/**';

function buildBaseConfig(input, name) {
  return {
    input: input,
    output: [
      {
        file: `./dist/${name}.es.js`,
        format: 'es',
        exports: 'named',
        sourcemap: true,
      },
      {
        file: `./dist/${name}.cjs.js`,
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
      },
      {
        file: `./dist/${name}.es5.js`,
        format: 'es',
        exports: 'named',
        sourcemap: true,
      }
    ],
    plugins: [
      peerDepsExternal(),
      commonjs(),
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      babel({
        presets: [
          '@babel/env',
        ],
        plugins: [
          '@babel/plugin-external-helpers',
          '@babel/plugin-transform-runtime',
        ],
        exclude: excludePath,
        babelHelpers: 'runtime',
        extensions: ['.js']
      })
    ]
  }
}

export default buildBaseConfig;