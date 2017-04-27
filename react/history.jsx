/* eslint-env browser */
/* global props */
import React from 'react';
import ReactDOM from 'react-dom';
import Edits from './components/edits';

ReactDOM.render(
  <Edits
    userID={props.userID}
    mediaID={props.mediaID}
  />,
  document.getElementById('root')
);

