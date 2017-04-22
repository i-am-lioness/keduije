/* eslint-env mocha, browser */
import { expect } from 'chai';
import sinon from 'sinon';
import { Audio, Video } from '../react/keduije-media';

function Player(iframe, params) {
  params.events.onReady();
  this.seekTo = sinon.stub();
  this.getCurrentTime = sinon.stub();
  this.getCurrentTime.returns(40);
  this.getDuration = sinon.stub();
  this.getDuration.returns(256);
}

const YT = {
  Player,
  PlayerState: { PAUSED: 0, PLAYING: 1 },
};

global.YT = YT;

const playerReadyHandler = sinon.stub();
const handlePaused = sinon.stub();
const handleResume = sinon.stub();

describe('keduije-media.js', function () {
  afterEach(function () {
    playerReadyHandler.resetHistory();
    handlePaused.resetHistory();
    handleResume.resetHistory();
  });

  describe('video', function () {
    it('video constructor', function () {
      const v = new Video(null, playerReadyHandler, null, null);
      expect(v).to.be.ok;
      expect(playerReadyHandler.called).to.be.true;
    });

    it('video on play', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      expect(v).to.be.ok;
      v.onPlayerStateChange({ data: YT.PlayerState.PLAYING });
      expect(handleResume.called).to.be.true;
      expect(handlePaused.called).to.be.false;
    });

    it('video on pause', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      v.onPlayerStateChange({ data: YT.PlayerState.PAUSED });
      expect(handlePaused.called).to.be.true;
      expect(handleResume.called).to.be.false;
    });

    it('video on unknown state', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      v.onPlayerStateChange({ data: 3 });
      expect(handlePaused.called).to.be.false;
      expect(handleResume.called).to.be.false;
    });

    it('video seekTo', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      v.seekTo(60, null);
      expect(v.media.seekTo.called).to.be.true;
    });

    it('video getCurrentTime', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      const ct = v.getCurrentTime();
      expect(ct).to.equal(40);
    });

    it('video getDuration', function () {
      const v = new Video(null, playerReadyHandler, handlePaused, handleResume);
      const d = v.getDuration();
      expect(d).to.equal(256);
    });
  });

  describe('audio', function () {
    it('audio constructor', function () {
      function load() {
        this.oncanplay();
      }
      const a = new Audio({ load }, playerReadyHandler, null, null);
      expect(a).to.be.ok;
      expect(playerReadyHandler.called).to.be.true;
    });

    it('mount audio', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      expect(a).to.be.ok;
    });

    it('play audio', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      a.play();
    });

    it('pause audio', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      a.pause();
    });

    it('get current time', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      const ct = a.getCurrentTime();
      expect(ct).to.be.a('Number');
    });

    it('get duration', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      const d = a.getDuration();
      expect(d).to.be.a('Number');
    });

    // to do: finish. or make for browser testing
    it('seek to', function () {
      const audio = document.createElement('AUDIO');
      const a = new Audio(audio, playerReadyHandler, null, null);
      a.seekTo(20, null);
      // expect(a.currentTime).to.equal(20);
    });
  });
});
