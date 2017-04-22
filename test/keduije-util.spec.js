/* eslint-env mocha */
import { expect, assert } from 'chai';
// import sinon from 'sinon';
import KeduijeUtil from '../react/keduije-util';

global.$ = require('jquery');

KeduijeUtil.__Rewire__('API_KEY', 'AIzaSyAZoi72Rr-ft3ffrgJ9gDZ-O5_fyVNDe_k');


describe('keduije-util.js', function () {
  it('find video info from ID', function () {
    const url = 'https://www.youtube.com/watch?v=KUFZgJ32xU8';
    return KeduijeUtil.getYTdata(url)
      .then(function (vid) {
        expect(vid).not.to.be.null;
      });
  });

  it('throws error, when yt video not found', function () {
    const url = 'https://www.youtube.com/watch?v=5';
    return KeduijeUtil.getYTdata(url)
      .then(function () {
        assert.fail(0, 1, 'Exception not thrown');
      })
      .catch(function (err) {
        expect(err).to.be.ok;
        expect(err.message).to.equal('Video data not found.');
      });
  });

  it('throws error, when video id not extracted from url', function () {
    const url = 'https://www.youtube.com/';
    return KeduijeUtil.getYTdata(url)
      .then(function () {
        assert.fail(0, 1, 'Exception not thrown');
      })
      .catch(function (err) {
        expect(err).to.be.ok;
        expect(err.message).to.equal('No Video ID found.');
      });
  });

  it('will not look for video url for non youtube url');

  it('finds artwork given a string', function () {
    return KeduijeUtil.searchImages('Flavour')
      .then(function (images) {
        expect(images).to.be.ok;
      });
  });

  it('loads youtube iframe api', function (done) {
    function cb() {
      done();
    }
    KeduijeUtil.loadYoutubeIFrameAPI(cb);
  });

  it('sends discriptive error for 403 from server');

  // describe('url parsing');
});
