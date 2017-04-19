const webpack = require('webpack');
const path = require('path');

const REACT = path.resolve(__dirname, '../react');
const TEST = path.resolve(__dirname, '../test');
const OUTPUT = path.resolve(__dirname, '../out');

module.exports = env => ({
  context: TEST,
  entry: {
    test: './test-runner.js',
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  output: {
    filename: '[name].bundle.js',
    path: OUTPUT,
  },
  module: {
    loaders: [{
      include: [TEST, REACT],
      loader: 'babel-loader?plugins=babel-plugin-rewire',
    }],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    })
  ],
  externals: {
    'cheerio': 'window',
    'react/addons': true,
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
  },
});


