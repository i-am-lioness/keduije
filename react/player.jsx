/* eslint-env browser */
/* global props */
import React from 'react';
import ReactDOM from 'react-dom';
import MediaPlayer from './components/media-player';

ReactDOM.render(
  <MediaPlayer
    canEdit={props.canEdit}
    src={props.src}
    mediaType={props.mediaType}
    mediaID={props.mediaID}
    img={props.img}
    artist={props.artist}
    title={props.title}
    slug={props.slug}
  />,
  document.getElementById('root')
);
