/* eslint-env browser */
/* global changesetID */
import React from 'react';
import ReactDOM from 'react-dom';
import SongInfoForm from './song-info-form';
import KeduIje from './keduije';

function submitSongInfo(data) {
  data.changeset = changesetID;
  KeduIje.createSong(data, (slug) => {
    window.location = '/music/' + slug;
  });
}

ReactDOM.render(
  <SongInfoForm
    newSong
    onSubmit={submitSongInfo}
    onCancel={() => { KeduIje.deleteSong(null); }}
  />,
  document.getElementById('root')
);
