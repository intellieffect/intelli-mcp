/**
 * Simple webpack configuration for Electron renderer process
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'web',
  entry: {
    renderer: './src/ui/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false, // Don't clean main process files
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui/index.html',
      filename: 'index.html',
      inject: true,
      minify: !isDevelopment,
    }),
    new webpack.DefinePlugin({
      'process.env.WEBPACK_DEV_SERVER': JSON.stringify(process.env.WEBPACK_DEV_SERVER || 'false'),
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  performance: {
    hints: false,
  },
};

module.exports = config;