const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

// https://stackoverflow.com/questions/41692643/webpack-and-express-critical-dependencies-warning

module.exports = {
    entry: './src/index.ts',
    // devtool: '',
    mode: 'production',
    target: 'node',
    // externals: [nodeExternals()],
    // node: {
    //     console: true,
    //     fs: 'empty',
    //     net: 'empty',
    //     tls: 'empty'
    // },
    plugins: [
        new MomentLocalesPlugin({
            localesToKeep: ['zh-cn'],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        plugins: [new TsconfigPathsPlugin({configFile: 'tsconfig.prod.json'})],
    },
    output: {
        filename: 'bundle-prod.js',
        path: path.resolve(__dirname, 'dist')
    },
};
