/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';

describe.only('The backend', () => {
  let server;
  let err = null;

  beforeEach(function (done) {
    require('../lib/app').then((app) => {
      server = app;
      done();
    }).catch((error) => {
      err = error;
      done();
    });
  });

  afterEach(function () {
    // server.close();
  });

  it('loads environment variables', (done) => {
    // const server = require('../lib/app');
  });

  it.only('server connects', () => {
    expect(err).to.be.null;
    expect(server).to.exist;
  });

  it('restricts pages by user', (done) => {

  });

  it('redirects to original page after sign in', (done) => {

  });

  it('can login user via twitter', (done) => {

  });

  it('stores all numbers as numbers instead of strings', function () {

  });

  it('counts views for songs', function () {

  });

  it('updates url/slug when title changes', function () {

  });

  it('does not allow title/slug changes after a certain number of views', function () {

  });

  it('maintais daily count of views', function () {

  });

  it('cleans up sessions', function () {

  });

  it('does not allow editing of stale line', function () {

  });

  it('clears failed revisions', function () {

  });

  it('renders media player on server', function () {

  });

  it('youtube source url always has matching protocol', function () {

  });
});
