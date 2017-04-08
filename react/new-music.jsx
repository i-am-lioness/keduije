/* eslint-env browser */
/* global KeduIje, submitSongInfo */

import React from 'react';
import ReactDOM from 'react-dom';
import SongInfoForm from './song-info-form';

ReactDOM.render(
  <SongInfoForm
    newSong
    onSubmit={submitSongInfo}
    onCancel={() => { KeduIje.deleteSong(null); }}
  />,
  document.getElementById('root')
);
