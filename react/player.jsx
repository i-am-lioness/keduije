/* eslint-env browser */
/* global mediaType, canEdit, mediaSrc, videoID, mediaID */
import React from 'react';
import ReactDOM from 'react-dom';
import MediaPlayer from './media-player';

ReactDOM.render(
  <MediaPlayer
    canEdit={canEdit}
    src={mediaSrc}
    videoID={videoID}
    mediaType={mediaType}
    mediaID={mediaID}
  />,
  document.getElementById('root')
);
