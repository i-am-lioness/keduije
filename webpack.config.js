const webpack = require('webpack');
const path = require('path');

const DEV = path.resolve(__dirname, 'react');
const OUTPUT = path.resolve(__dirname, 'out');
const TEST = path.resolve(__dirname, 'test');

module.exports = {
  context: DEV,
  entry: {
    history: './edits.jsx',
    search: './search.jsx',
    player: './player.jsx',
    new_music: './new-music.jsx',
    global: './global.js',
    home: './home.js',
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
      include: [DEV, TEST],
      loader: 'babel-loader',
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
    'react/lib/ReactContext': true
  },
};
