const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const terser = require('rollup-plugin-terser').terser;

const pkg = require('./package.json');

const mainInputFile = 'src/timeline.js';
const banner = `/*!
 * chartjs-plugin-timeline.js v${pkg.version}
 * ${pkg.homepage}
 * (c) ${new Date().getFullYear()} Boyi C
 * Released under the BSD 2-Clause License
 */`;

module.exports = [
    // browser-friendly UMD build
    {
        input: mainInputFile,
        external: ['chart.js', 'moment'],
        output: {
            name: 'Timeline',
            file: 'dist/chartjs-plugin-timeline.js',
            banner: banner,
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
        input: mainInputFile,
        external: ['chart.js', 'moment'],
        output: {
            name: 'Timeline',
            file: 'dist/chartjs-plugin-timeline.min.js',
            format: 'umd',
            globals: {
                'chart.js': 'Chart',
                'moment': 'moment'
            }
        },
        plugins: [
            resolve(),
            commonjs(),
            terser()
        ]
    }
];