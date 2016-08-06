import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  entry: 'bin/src/index.js',
  dest: 'bin/lambdasync',
  format: 'cjs',
  banner: '#!/usr/bin/env node',
  plugins: [
    buble(),
    commonjs({
      include: 'node_modules/**',
      exclude: 'node_modules/acorn/**'
    }),
    nodeResolve({
      main: true
    })
  ],
  external: [
    'fs',
    'path',
    'module',
    'source-map-support'
  ]
};
