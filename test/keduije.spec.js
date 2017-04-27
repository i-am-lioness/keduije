/* eslint-env mocha, browser */
import { expect } from 'chai';
import sinon from 'sinon';
import Keduije from '../react/keduije';
import { reqs } from './utils/mocks';


let shouldThrow = false;

function get(path, query) {
  let req = path;
  if (query) {
    const q = global.$.param(query);
    req += `?${q}`;
  }
  const resp = reqs[req];
  return Promise.resolve(resp);
}

function post(path) {
  if (shouldThrow) return Promise.reject();
  const resp = reqs[path];
  return Promise.resolve(resp);
}

describe('keduije.js', function () {
  let originalGet;
  let originalPut;
  before(function () {
    originalGet = global.$.get;
    originalPut = global.$.post;

    global.$.get = sinon.stub();
    global.$.post = sinon.stub();

    global.$.get.callsFake(get);
    global.$.post.callsFake(post);

    Keduije.init('58e745d22f1435db632f81fa');
  });

  afterEach(function () {
    global.$.post.resetHistory();
    shouldThrow = false;
    alert.resetHistory();
  });

  after(function () {
    debugger;
    global.$.get = originalGet;
    global.$.put = originalPut;
    // global.$.get.restore();
    // global.$.post.restore();
  });

  it('search', function () {
    return Keduije.search('ph').then((res) => {
      expect(res).to.be.an('array');
    });
  });

  it('get lyrics', function () {
    return Keduije.loadLyrics().then((res) => {
      expect(res).to.be.an('array');
    });
  });

  it('get song info', function () {
    return Keduije.loadSongInfo().then((res) => {
      expect(res).to.be.an('object');
    });
  });

  it('get changesets', function () {
    const q = { mediaID: '58e745d22f1435db632f81fa' };
    return Keduije.getChangesets(q).then((res) => {
      expect(res).to.be.an('array');
    });
  });

  it('start edit session', function () {
    return Keduije.startEditSession(true).then((res) => {
      expect(res).to.be.true;
      expect(global.$.post.called).to.be.true;
    });
  });

  it('finish edit session', function () {
    return Keduije.startEditSession(false).then((res) => {
      expect(res).to.be.false;
      expect(global.$.post.called).to.be.false;
    });
  });

  it('handles edit session failure', function () {
    shouldThrow = true;
    return Keduije.startEditSession(true).then(() => {
      expect(global.$.post.called).to.be.true;
      expect(alert.called).to.be.true;
    });
  });

  describe('editing', function () {
    before(function () {
      return Keduije.startEditSession(true);
    });

    beforeEach(function () {
      global.$.post.resetHistory();
    });

    it('add a lyric (should add changeset info before submitting)', function () {
      const newLyric = {
        text: 'never forget where i come from na from ghetto',
        endTime: 37,
        startTime: 34,
      };
      return Keduije.addLyric(newLyric).then((res) => {
        expect(res).to.be.an('array');
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
      });
    });

    it('edit a lyric (should add changeset info before submitting)', function () {
      const oldLyric = {
        _id: '58e7e85808091bfe6d06a498',
        text: 'never forget where i come from na from ghetto',
        endTime: 37,
        startTime: 34,
      };

      const changes = {
        text: 'whatever',
      };

      return Keduije.updateLyric(oldLyric, changes).then((res) => {
        expect(res).to.be.an('array');
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes).to.equal(changes);
      });
    });

    it('delete a lyric (should add changeset info before submitting)', function () {
      const oldLyric = {
        _id: '58e7e85808091bfe6d06a498',
        text: 'never forget where i come from na from ghetto',
        endTime: 37,
        startTime: 34,
      };

      return Keduije.deleteLyric(oldLyric).then((res) => {
        expect(res).to.be.an('array');
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes.deleted).to.be.true;
      });
    });

    it('creates a new song', function () {
      return Keduije.createSong({}).then((res) => {
        expect(res).to.be.a('string');
      });
    });

    it('deletes a song', function () {
      return Keduije.deleteSong({}).then(() => {
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes.status).to.equal('deleted');
        // expect(window.location).to.equal('/');
      });
    });

    it('edits a song (should add changeset info before submitting)', function () {
      const originalSong = {};

      const changes = {
        title: 'whatever',
      };

      return Keduije.saveSongInfo(originalSong, changes).then((res) => {
        expect(res).to.be.an('object');
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes).to.equal(changes);
      });
    });

    it('binds error handler', function () {
      window.onerror();
      expect(global.$.post.called).to.be.true;
      const path = global.$.post.lastCall.args[0];
      expect(path).to.equal('/api/logError');
    });

    it('does not log error for localhost', function () {
      Object.defineProperty(window.location, 'hostname', {
        writable: true,
        value: 'localhost',
      });
      window.onerror();
      expect(global.$.post.called).to.be.false;
    });

    it('does not bind error handler', function () {
    });
  });
});
