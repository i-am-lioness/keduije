/* eslint-env browser */
import sinon from 'sinon';
import { lyrics, songInfo, searchResults } from './data';
import { token as spotifyToken } from './data/spotifyData';


const videoDuration = 300;

const KeduIje = {
  init: sinon.spy(),
  startEditSession: sinon.stub(),
  deleteLyric: sinon.stub(),
  updateLyric: sinon.stub(),
  addLyric: sinon.stub(),
  saveSongInfo: sinon.stub(),
  deleteSong: sinon.spy(),
  getMediaInfo: sinon.stub(),
  getChangesets: sinon.stub(),
  search: sinon.stub(),
  getSpotifyToken: sinon.stub(),
};

KeduIje.startEditSession.resolves(true);
KeduIje.updateLyric.resolves(lyrics);
KeduIje.addLyric.resolves(lyrics);
KeduIje.deleteLyric.resolves(lyrics);
KeduIje.saveSongInfo.resolves(songInfo);
KeduIje.search.resolves(searchResults);
KeduIje.getSpotifyToken.resolves(spotifyToken);


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


if (typeof prompt !== 'undefined') prompt = sinon.stub();
if (typeof confirm !== 'undefined') {
  confirm = sinon.stub();
  confirm.returns(true);
}
if (typeof alert !== 'undefined') alert = sinon.stub();

/* ajax requests */
const reqs = {};
// gets
reqs['/api/search?query=ph'] = [{ _id: '58e46ebdf3a3f330ed306e75', title: 'Achikolo', slug: 'Achikolo', artist: 'Zoro ft Phyno' }, { _id: '58e477ba003ee1372ed7e987', title: 'Gbo Gan Gbom', slug: 'Gbo-Gan-Gbom', artist: 'Flavour ft. Phyno' }, { _id: '58e47895003ee1372ed7e98a', title: 'E Sure For Me', slug: 'E-Sure-For-Me', artist: 'Phyno' }, { _id: '58e60884068dbc4e3ea77285', title: 'Nnunu', slug: 'Nnunu', artist: 'Phyno ft Storm Rex' }, { _id: '58e745d22f1435db632f81fa', title: 'Fada Fada', slug: 'Fada-Fada', artist: 'Phyno' }];
reqs['/api/changesets/list?mediaID=58e745d22f1435db632f81fa'] = [{ _id: '58f1a701c83da3c715daf19e', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58f1419a763731c03353a1f5', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e80773878e98070772e328', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e7e8f708091bfe6d06a49a', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e7e82a08091bfe6d06a496', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }, { _id: '58e746a32f1435db632f81fb', user: '58e451206b5df803808e5912', media: '58e745d22f1435db632f81fa' }];
reqs['/api/media?changesetID=58fa130609ef9a7c03067d7a'] = { _id: '58fa135009ef9a7c03067d7b', title: 'Nobody Ugly', artist: 'P-Square', src: 'https://www.youtube.com/watch?v=Z7N64vUHxvw', img: 'https://i.ytimg.com/vi/Z7N64vUHxvw/mqdefault.jpg', videoID: 'Z7N64vUHxvw', type: '1', changeset: '58fa130609ef9a7c03067d7a', creator: '58e451206b5df803808e5912', status: 'published', slug: 'Nobody-Ugly', version: 1, views: 1 };
reqs['/api/start_edit/58e745d22f1435db632f81fa'] = '58e7e82a08091bfe6d06a496';

// posts
reqs['/api/media/58e745d22f1435db632f81fa/addline'] = lyrics;
reqs['/api/lines/edit/58e7e85808091bfe6d06a498'] = lyrics;
reqs['/api/media/edit/58e745d22f1435db632f81fa'] = songInfo;
reqs['/api/media/new'] = 'Ada';

/* users */

let loggedInUser;

function setLoggedInUser(val) {
  loggedInUser = val;
}

const passportInitialize = (req, res, next) => { next(); };
const passportSession = (req, res, next) => {
  req.user = loggedInUser;
  next();
};

const login = (vendor, req, res, next) => {
  if (req.query.code) {
    next();
  } else {
    res.redirect(`/login/${vendor}/return?code=111`);
  }
};

const users = {
  log: sinon.stub(),
  setDB: sinon.stub(),
  initialize: () => passportInitialize,
  session: () => passportSession,
  authenticate: vendor => login.bind(null, vendor),
};
users.log.resolves();

const mail = {
  send: sinon.stub(),
};

export {
  KeduIje,
  Video,
  Audio,
  videoDuration,
  audioDuration,
  scrollIfOutOfView,
  convertToTime,
  reqs,
  users,
  mail,
  setLoggedInUser,
};
