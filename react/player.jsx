/* eslint-env browser */
/* global props */
import React from 'react';
import ReactDOM from 'react-dom';
import MediaPlayer from './media-player';

ReactDOM.render(
  <MediaPlayer
    canEdit={props.canEdit}
    src={props.src}
    videoID={props.videoID}
    mediaType={props.mediaType}
    mediaID={props.mediaID}
    img={props.img}
    artist={props.artist}
    title={props.title}
    slug={props.slug}
  />,
  document.getElementById('root')
);
