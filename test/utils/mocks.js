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
  getChangesets: sinon.stub(),
};

KeduIje.loadLyrics.resolves(lyrics);
KeduIje.startEditSession.resolves(true);
KeduIje.loadSongInfo.resolves(songInfo);
KeduIje.updateLyric.resolves(lyrics);
KeduIje.addLyric.resolves(lyrics);
KeduIje.deleteLyric.resolves(lyrics);
KeduIje.saveSongInfo.resolves(songInfo);


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

/* ajax requests */
const reqs = {};
// gets
reqs['/api/search?query=ph'] = [{ _id: '58e46ebdf3a3f330ed306e75', title: 'Achikolo', slug: 'Achikolo', artist: 'Zoro ft Phyno' }, { _id: '58e477ba003ee1372ed7e987', title: 'Gbo Gan Gbom', slug: 'Gbo-Gan-Gbom', artist: 'Flavour ft. Phyno' }, { _id: '58e47895003ee1372ed7e98a', title: 'E Sure For Me', slug: 'E-Sure-For-Me', artist: 'Phyno' }, { _id: '58e60884068dbc4e3ea77285', title: 'Nnunu', slug: 'Nnunu', artist: 'Phyno ft Storm Rex' }, { _id: '58e745d22f1435db632f81fa', title: 'Fada Fada', slug: 'Fada-Fada', artist: 'Phyno' }];
reqs['/api/lines/58e745d22f1435db632f81fa'] = [{ _id: '58e80748878e98070772e326', text: 'a di kwa mu loyal o', endTime: 56, deleted: 'false', startTime: 54, heading: '', changeset: '58e7e8f708091bfe6d06a49a', creator: '58e451206b5df803808e5912', version: 1, media: '58e745d22f1435db632f81fa' }, { _id: '58e746de2f1435db632f81fd', text: 'Chineke Nna emego kwa nwa ogbenye ezege', endTime: 19, deleted: 'false', startTime: 15, heading: 'verse 1', changeset: '58e746a32f1435db632f81fb', creator: '58e451206b5df803808e5912', version: 2, pendingRevisions: [], lastModified: '2017-04-14T21:39:47.840Z', media: '58e745d22f1435db632f81fa' }, { _id: '58e7e85808091bfe6d06a498', text: 'never forget where i come from na from ghetto', endTime: 37, deleted: 'false', startTime: 34, heading: '', changeset: '58e7e82a08091bfe6d06a496', creator: '58e451206b5df803808e5912', version: 1, media: '58e745d22f1435db632f81fa' }, { _id: '58e7e86808091bfe6d06a499', text: 'I just want to say oh "Thank you Jehovah" oh', endTime: 45, deleted: 'false', startTime: 42, heading: '', changeset: '58e7e82a08091bfe6d06a496', creator: '58e451206b5df803808e5912', version: 1, media: '58e745d22f1435db632f81fa' }, { _id: '58e80758878e98070772e327', text: 'fada fada eh, fada fada eh', endTime: 61, deleted: 'false', startTime: 56, heading: '', changeset: '58e7e8f708091bfe6d06a49a', creator: '58e451206b5df803808e5912', version: 1, media: '58e745d22f1435db632f81fa' }];
reqs['/api/media/58e745d22f1435db632f81fa'] = { _id: '58e745d22f1435db632f81fa', title: 'Fada Fada', src: 'https://www.youtube.com/watch?v=9F53UQ_2L_I', img: 'https://i.scdn.co/image/213283296b0d2cae08dd3248e9cb591e031b1bd9', videoID: '9F53UQ_2L_I', type: '1', changeset: '58e745c92f1435db632f81f9', creator: '58e451206b5df803808e5912', status: 'published', slug: 'Fada-Fada', version: 2, views: 14, pendingRevisions: [], lastModified: '2017-04-07T07:58:45.207Z', artist: 'Phyno' };
reqs['/api/changesets/list?mediaID=58e745d22f1435db632f81fa'] = [{ _id: '58f1a701c83da3c715daf19e', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58f1419a763731c03353a1f5', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e80773878e98070772e328', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e7e8f708091bfe6d06a49a', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e7e82a08091bfe6d06a496', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e746a32f1435db632f81fb', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }];
reqs['/api/media?changesetID=58fa130609ef9a7c03067d7a'] = { _id: '58fa135009ef9a7c03067d7b', title: 'Nobody Ugly', artist: 'P-Square', src: 'https://www.youtube.com/watch?v=Z7N64vUHxvw', img: 'https://i.ytimg.com/vi/Z7N64vUHxvw/mqdefault.jpg', videoID: 'Z7N64vUHxvw', type: '1', changeset: '58fa130609ef9a7c03067d7a', creator: '58e451206b5df803808e5912', status: 'published', slug: 'Nobody-Ugly', version: 1, views: 1 };
reqs['/api/start_edit/58e745d22f1435db632f81fa'] = '58e7e82a08091bfe6d06a496';

// posts
reqs['/api/media/58e745d22f1435db632f81fa/addline'] = lyrics;
reqs['/api/lines/edit/58e7e85808091bfe6d06a498'] = lyrics;
reqs['/api/media/edit/58e745d22f1435db632f81fa'] = songInfo;
reqs['/api/media/new'] = 'Ada';

export {
  KeduIje,
  Video,
  Audio,
  videoDuration,
  audioDuration,
  scrollIfOutOfView,
  convertToTime,
  reqs,
};
