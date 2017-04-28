/* eslint-env browser */
/* global $ */
import React from 'react';
import ReactDOM from 'react-dom';
import Search from './components/search';

require('bootstrap');

$(() => {
  ReactDOM.render(
    <Search />,
    document.getElementById('search-root')
  );
});
