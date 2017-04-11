const path = require('path');

const DEV = path.resolve(__dirname, 'react');
const OUTPUT = path.resolve(__dirname, 'out');

module.exports = {
  context: DEV,
  entry: {
    history: './edits.jsx',
    search: './search.jsx',
    player: './player.jsx',
    new_music: './new-music.jsx',
    global: './global.js',
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
      include: DEV,
      loader: 'babel-loader',
    }],
  },
};
