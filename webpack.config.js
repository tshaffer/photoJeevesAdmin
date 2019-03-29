var webpack = require('webpack');
var CopyWebpackPlugin =  require('copy-webpack-plugin');

module.exports = {
  entry: "./src/index.tsx",
  output: {
    libraryTarget: "umd",
    publicPath: './build/',
    filename: "bundle.js",
    path: __dirname + "/build"
  },

  devtool: "source-map",

  target: 'electron',

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"]
  },

  externals: {
    'core-js/fn/object/assign' : 'commonjs core-js/fn/object/assign',
  },

  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
    ],
  }
};