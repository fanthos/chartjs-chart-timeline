import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import uglify from 'rollup-plugin-uglify';


export default [
    // browser-friendly UMD build
    {
        input: 'src/timeline.js',
        external: ['chart.js', 'moment'],
        output: {
            file: 'timeline.js',
            format: 'umd',
            globals: {
                'chart.js': 'Chart',
                'moment': 'moment'
            }
        },
        plugins: [
            resolve(),
            commonjs()
        ]
    },
    {
        input: 'src/timeline.js',
        external: ['chart.js', 'moment'],
        output: {
            file: 'timeline.min.js',
            format: 'umd',
            globals: {
                'chart.js': 'Chart',
                'moment': 'moment'
            }
        },
        plugins: [
            resolve(),
            commonjs(),
            uglify()
        ]
    }
];