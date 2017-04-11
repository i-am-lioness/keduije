/* eslint-env browser */
/* global changesetID, gapi */
import React from 'react';
import ReactDOM from 'react-dom';
import SongInfoForm from './song-info-form';
import KeduIje from './keduije';

window.googleApiClientReady = () => {
  gapi.client.init({
    apiKey: 'AIzaSyBLYlu4hbmzhr1iOCiD_o2PTrjzvQBuQUA',
  }).then(() => {
    gapi.client.load('youtube', 'v3', () => {
      // handleAPILoaded();
    });
  });
};

function submitSongInfo(data) {
  data.changeset = changesetID;
  KeduIje.createSong(data, (slug) => {
    window.location = `/music/${slug}`;
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
