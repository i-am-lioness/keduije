/* eslint-env browser */
import sinon from 'sinon';
import { lyrics, songInfo } from './data';

const videoDuration = 300;

const KeduIje = {
  init: sinon.spy(),
  loadLyrics: sinon.stub(),
  loadSongInfo: sinon.stub(),
  startEditSession: sinon.stub(),
  deleteLyric: sinon.stub(),
  updateLyric: sinon.stub(),
  addLyric: sinon.stub(),
  saveSongInfo: sinon.stub(),
  deleteSong: sinon.spy(),
};

KeduIje.loadLyrics.callsArgWith(0, lyrics);
KeduIje.loadSongInfo.callsArgWith(0, songInfo);
KeduIje.updateLyric.callsArgWith(2, lyrics);
KeduIje.addLyric.callsArgWith(1, lyrics);
KeduIje.deleteLyric.callsArgWith(1, lyrics);
KeduIje.saveSongInfo.callsArgWith(2, songInfo);

/* KeduijeUtil */
const convertToTime = sinon.stub();
const scrollIfOutOfView = sinon.stub();

convertToTime.returns('0:00');

const mockVideo = function (iframe, onPlayerReady, handlePaused, handleResume) {
  const mediaPlay = sinon.stub();
  const mediaPause = sinon.stub();
  const mediaSeek = sinon.stub();
  const mediaCurrentTime = sinon.stub();
  const mediaDuration = sinon.stub();
  mediaDuration.returns(videoDuration);

  this.currentTime = 0;
  mediaPlay.callsFake(handleResume);
  mediaPause.callsFake(handlePaused);
  mediaCurrentTime.callsFake(function () {
    this.currentTime += 1;
    return this.currentTime;
  }.bind(this));
  mediaSeek.callsFake(function (time) {
    this.currentTime = time;
  }.bind(this));

  this.pause = mediaPause;
  this.play = mediaPlay;
  this.seekTo = mediaSeek;
  this.getCurrentTime = mediaCurrentTime;
  this.getDuration = mediaDuration;
  setTimeout(onPlayerReady, 5);
};


const audioDuration = 250;

const mockAudio = function (audio, playerReadyHandler, pausedHandler, resumeHandler) {
  const audioPlay = sinon.stub();
  const audioPause = sinon.stub();
  const audioSeek = sinon.stub();
  const audioCurrentTime = sinon.stub();
  const audioGetDuration = sinon.stub();
  audioGetDuration.returns(audioDuration);

  this.currentTime = 0;
  audioPlay.callsFake(resumeHandler);
  audioPause.callsFake(pausedHandler);
  audioCurrentTime.callsFake(function () {
    this.currentTime += 1;
    return this.currentTime;
  }.bind(this));
  audioSeek.callsFake(function (time) {
    this.currentTime = time;
  }.bind(this));

  this.pause = audioPause;
  this.play = audioPlay;
  this.seekTo = audioSeek;
  this.getCurrentTime = audioCurrentTime;
  this.getDuration = audioGetDuration;
  setTimeout(playerReadyHandler, 5);
};

const Video = sinon.stub().callsFake(mockVideo);
const Audio = sinon.stub().callsFake(mockAudio);


prompt = sinon.stub();
confirm = sinon.stub();
alert = sinon.stub();
confirm.returns(true);

export { KeduIje, Video, Audio, videoDuration, audioDuration, scrollIfOutOfView, convertToTime };
