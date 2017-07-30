/* eslint-env mocha */
import { expect } from 'chai';
import sinon from 'sinon';
import getToken from '../lib/spotify';

const resp = {
  statusCode: 200,
};

const body = '6';
const localError = new Error('localError');

const request = sinon.stub();
request.yields(localError, resp, body);

describe('spotify.js', function () {
  describe('getToken', function () {
    before(function () {
      getToken.__Rewire__('request', request);
    });

    beforeEach(function () {
      resp.statusCode = 200;
    });

    after(function () {
      getToken.__ResetDependency__('request');
    });

    // ✓ GOOD
    it('parse token response', function () {
      return getToken(null, null).then((t) => {
        expect(t).to.equal(6);
      });
    });

    // ✓ GOOD
    it('handles local error', function () {
      resp.statusCode = null;
      return getToken(null, null).catch(err => err).then((error) => {
        expect(error.message).to.equal('localError');
      });
    });
  });

  describe('with remote connection', function () {
    // ✓ GOOD
    it('parse token response', function () {
      return getToken(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET)
        .then((t) => {
          console.log(t);
          expect(t).to.be.ok;
        });
    });

    // ✓ GOOD
    it('handles error', function () {
      return getToken(process.env.SPOTIFY_CLIENT_ID, null)
        .catch(err => err).then((error) => {
          console.log(error);
          expect(error).to.be.ok;
        });
    });
  });
});
