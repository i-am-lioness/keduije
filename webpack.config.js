const path = require('path');

const DEV = path.resolve(__dirname, 'react');
const OUTPUT = path.resolve(__dirname, 'out');

module.exports = {
  context: DEV,
  entry: {
    history: './edits.js',
    search: './search.js',
    player: './media-player.js',
    new_music: './new-music.jsx',
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
