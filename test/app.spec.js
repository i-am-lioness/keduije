/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';

const chai = require('chai')
  , chaiHttp = require('chai-http');

chai.use(chaiHttp);

const request = chai.request;

describe('The backend', () => {
  let server;
  let err = null;
  let env = null;

  before(function (done) {
    require('../lib/app').then((result) => {
      server = result.server;
      env = result.env;
      done();
    }).catch((error) => {
      err = error;
      done();
    });
  });

  after(function (done) {
    server.close(done);
  });

  describe('server initialization', function () {
    it('loads environment variables', function () {
      expect(env.HOST).to.not.be.empty;
      expect(env.FB_CLIENT_ID).to.not.be.empty;
      expect(env.FB_CLIENT_SECRET).to.not.be.empty;
      expect(env.TWITTER_CONSUMER_KEY).to.not.be.empty;
      expect(env.DB_URL).to.not.be.empty;
      expect(env.TWITTER_CONSUMER_SECRET).to.not.be.empty;
      expect(env.DEVELOPER_IP).to.not.be.empty;
      expect(env.EMAIL_ADDRESS).to.not.be.empty;
      expect(env.EMAIL_PASSWORD).to.not.be.empty;
    });

    it('connects to server', function () {
      expect(err).to.be.null;
      expect(server).to.exist;
    });
  });

  it('responds to /', function () {
    request(server)
      .get('/')
      .then(function (res) {
        expect(res).to.have.status(200);
      });
  });

  describe('authorization', function () {
    it('should redirect anonymous user to login for restricted page', function (done) {
      request(server)
      .get('/new_music')
      .then(function (res) {
        expect(res).to.redirect;
        done();
      });
    });

    describe('with admin user', function () {
      beforeEach(function (done) {
        request(server)
          .post('/login/test')
          .field('username', 'test-admin')
          .field('password', 'pw')
          .then(function (res) {
            debugger;
            expect(res).to.redirectTo('/');
            done();
          })
          .catch((error) => {
            debugger;
            // console.log(error);
            done();
          });
      });

      it('allows admin to enter restricted page', function (done) {
        request(server)
          .get('/new_music')
          .then(function (res) {
            expect(res).to.have.status(200);
            done();
          });
      });
    });
  });

  describe.skip('with non-admin user', function () {
      before(function (done) {
        request(app)
          .post('/login/test')
          .field('username', 'test')
          .field('password', 'pw')
          .then(function (res) {
            console.log(res);
            debugger;
            expect(res).to.redirectTo('/');
            done();
          });
      });

    it.skip('should forbid non admin from adding new music', function (done) {
      request(server)
      .get('/new_music')
      .then(function (res) {
        expect(res).to.have.status(403);
        done();
      });
    });
  });

  it('counts views for songs', function () {

  });

  it('does not allow editing of stale line');

  it('redirects to original page after sign in');

  it('can login user via twitter');

  it('stores all numbers as numbers instead of strings');

  it('updates url/slug when title changes');

  it('does not allow title/slug changes after a certain number of views');

  it('maintais daily count of views');

  it('cleans up sessions');

  it('clears failed revisions');

  it('renders media player on server');

  it('youtube source url always has matching protocol');
});
