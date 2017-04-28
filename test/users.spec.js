/* eslint-env mocha */
import { expect } from 'chai';
import request from 'supertest';
import APP from '../lib/app';
import TestDB from './utils/db';

const users = require('../lib/users.js')();

const testUser = {
  username: 'test',
  displayName: 'Test',
  photo: 'https://cdn3.iconfinder.com/data/icons/pretty-office-part-10-shadow-style/128/Test-paper.png',
};

describe('users.js', () => {
  let server;
  let db;

  before(function () {
    return APP().then((result) => {
      server = result.server;
      db = result.db;
    }).catch(function (error) {
      debugger;
      this.skip();
      console.error(error);
      throw error;
    }.bind(this));
  });

  after(function () {
   // return TestDB.close(db).then(() => server.close());
  });

  it('redirects to facebook, for facebook strategy', function () {
    return request(server)
        .get('/login/facebook')
        .expect(302)
        .then((res) => {
          expect(res.header.location).to.match(/https:\/\/www.facebook.com\/dialog\/oauth\?response_type=code&redirect_uri=(.*)&client_id=(.*)/);
        });
  });

  it.skip('successfully logs in via facebook', function () {
    return request(server)
        .get('/login/facebook/return')
        .query({ code: 'AQDHXiotxoU7tI2MZGWPGNjksKw1YldxYEMzBkhyhjVrRzfaTzCzKjK0oSYXZHnSm35KxlUjZSRWMMGcQ4YUUjoXY_RwlWdXka1mbqK0dgH3Dz95wRfBUa0odEBS5v9Zz8y2IKlruJjXMaD5_Y242HQP5AIv1laXwNUf-MDkZGtwTvSvLJ2ZFbovDDiltnCaPGTNVc9Q3jrBoDzrwldbrP4mvot3_ZK6VrYqDY6bQkcLEUPFv1t79J48F3TLZXJaSisehoH0nf4TAzzDmtNiRkqROuA_Jyv0UuZN-NvUXg9OkFdDntq9_mGfvythHrkAka-op34BTOb2wCPccAaYO5MJzUns7hYXCwdmp5LLzCmGRQ' })
        .expect(302)
        .then((res) => {
          console.log(res.header.location);
          expect(res.header.location).to.equal('/');
        });
  });

  it('redirects to original page after sign in');

  it('cleans up sessions');

  it('manages sessions');

  it('[integration] with server');
});
