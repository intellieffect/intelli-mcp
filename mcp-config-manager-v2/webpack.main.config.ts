/**
 * Simple webpack configuration for Electron main process
 */

const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'electron-main',
  entry: {
    main: './src/main/index.ts',
    preload: './src/main/preload.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false, // Don't clean the dist directory since renderer files are also there
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    electron: 'commonjs2 electron',
  },
  optimization: {
    minimize: false, // Keep readable for debugging
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.WEBPACK_DEV_SERVER': JSON.stringify(process.env.WEBPACK_DEV_SERVER || 'false'),
    }),
  ],
};

module.exports = config;