/* eslint-env mocha, browser */
import { expect, assert } from 'chai';
import Keduije from '../react/keduije';
import { configureAjaxBehavior } from './utils/mocks';


describe('keduije.js', function () {
  before(function () {
    configureAjaxBehavior(true);
    Keduije.init('58e745d22f1435db632f81fa');
  });

  afterEach(function () {
    global.$.post.resetHistory();
    global.$.get.resetHistory();
    configureAjaxBehavior(true);
    alert.resetHistory();
  });

  after(function () {
  });

  it('search', function () {
    return Keduije.search('ph').then((res) => {
      expect(res).to.be.an('array');
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
    configureAjaxBehavior(false);
    return Keduije.startEditSession(true).then(() => {
      expect(global.$.post.called).to.be.true;
      expect(alert.called).to.be.true;
    });
  });

  describe('.getMediaInfo', function () {
    before(function () {
      return Keduije.getMediaInfo(5);
    });

    // GOOD
    it('passes the right url to $.get', function () {
      expect(global.$.get.calledOnce).to.be.true;
      assert(global.$.get.lastCall.calledWithExactly('/api/media/5'));
    });
  });

  describe('.getSpotifyToken', function () {
    before(function () {
      return Keduije.getSpotifyToken();
    });

    // GOOD
    it('passes the right url to $.get', function () {
      expect(global.$.get.calledOnce).to.be.true;
      assert(global.$.get.lastCall.calledWithExactly('/api/spotify/token'));
    });
  });


  describe('-editing-', function () {
    before(function () {
      return Keduije.startEditSession(true);
    });

    beforeEach(function () {
      global.$.post.resetHistory();
    });

    it('does not send newValues for times that did not change');

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
        const path = global.$.post.lastCall.args[0];
        const postData = global.$.post.lastCall.args[1];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes).to.equal(changes);
        expect(postData.original).to.be.ok;
        expect(path).to.match(/\/api\/media\/.*\/updateLine/);
        expect(path).to.equal(`/api/media/${postData.mediaID}/updateLine`);
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
        const path = global.$.post.lastCall.args[0];
        expect(postData.changesetID).to.be.ok;
        expect(postData.mediaID).to.be.ok;
        expect(postData.changes).to.equal(changes);
        expect(path).to.match(/\/api\/media\/.*\/updateInfo/);
        expect(path).to.equal(`/api/media/${postData.mediaID}/updateInfo`);
      });
    });

    it('binds error handler', function () {
      global.onerror();
      expect(global.$.post.called).to.be.true;
      const path = global.$.post.lastCall.args[0];
      expect(path).to.equal('/api/logError');
    });

    it('does not log error for localhost', function () {
      Object.defineProperty(window.location, 'hostname', {
        writable: true,
        value: 'localhost',
      });
      global.onerror();
      expect(global.$.post.called).to.be.false;
    });

    it('does not bind error handler', function () {
    });
  });
});
