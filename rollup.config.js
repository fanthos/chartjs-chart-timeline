import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default [
    // browser-friendly UMD build
    {
        input: 'src/timeline.js',
        external: ['chart.js', 'moment'],
        output: {
            file: pkg.browser,
            format: 'umd',
            globals: {
                'chart.js': 'Chart',
                'moment': 'moment'
            }
        },
        plugins: [
            resolve(), // so Rollup can find `ms`
            commonjs() // so Rollup can convert `ms` to an ES module
        ]
    },
];