/* eslint-env browser */
/* global changesetID */
import React from 'react';
import ReactDOM from 'react-dom';
import SongInfoForm from './components/song-info-form';
import KeduIje from './keduije';

function submitSongInfo(data) {
  data.changesetID = changesetID;
  KeduIje.createSong(data).then((slug) => {
    window.location = `/music/${slug}`;
  });
}

ReactDOM.render(
  <SongInfoForm
    newSong
    onSubmit={submitSongInfo}
    onCancel={() => { KeduIje.deleteSong(null); }} // to do: go to home page on canceled
  />,
  document.getElementById('root')
);
