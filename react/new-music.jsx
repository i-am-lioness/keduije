/* eslint-env browser */
/* global submitSongInfo */

import React from 'react';
import ReactDOM from 'react-dom';
import SongInfoForm from './song-info-form';
import KeduIje from './keduije';

ReactDOM.render(
  <SongInfoForm
    newSong
    onSubmit={submitSongInfo}
    onCancel={() => { KeduIje.deleteSong(null); }}
  />,
  document.getElementById('root')
);
