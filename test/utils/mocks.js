/* eslint-env browser */
import sinon from 'sinon';
import { lyrics, songInfo, searchResults } from './data';
import { response as ytApiReponse } from '../utils/data/youtube-data';
import { raw as spotifyResponse } from '../utils/data/spotifyData';
import { token as spotifyToken } from './data/spotifyData';
import { revisionTypes } from '../../lib/revision';
import { tables } from '../../lib/constants';

const ObjectId = require('mongodb').ObjectId;

const videoDuration = 300;

let ajaxSuccess = true;

const googleApiResponse = Object.assign({}, ytApiReponse);
const googleApiResponseItems = Object.assign([], ytApiReponse.items);

function configureAjaxBehavior(success, content) {
  ajaxSuccess = success;
  if (success) {
    if (content) {
      googleApiResponse.items = content;
    } else {
      googleApiResponse.items = googleApiResponseItems;
    }
  } else {
    googleApiResponse.errorMessage = content;
  }
}

sinon.stub(global.jQuery, 'get').callsFake(() => {
  const xhr = global.jQuery.Deferred();

  if (ajaxSuccess) {
    setTimeout(xhr.resolve.bind(null, googleApiResponse), 1);
  } else {
    setTimeout(xhr.reject.bind(null, null, null, googleApiResponse.errorMessage), 1);
  }

  return xhr;
});

sinon.stub(global.jQuery, 'getScript').callsFake(() => {
  setTimeout(window.onYouTubeIframeAPIReady, 0);
});

// for now, only used for spotify
sinon.stub(global.jQuery, 'ajax').resolves(spotifyResponse);

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


const send = sinon.stub();
const mail = () => ({ send });
mail.send = send;

const ensureLoggedIn = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

function Revision(db) {
  function onUpdateRequest(changesetID, mediaID, type, data) {
    if (type === revisionTypes.LINE_ADD) {
      const newLine = data;
      newLine.media = ObjectId(mediaID);
      newLine.changeset = ObjectId(changesetID);
      newLine.version = 1;
      newLine.deleted = false;
      newLine.heading = null;
      return db(tables.LINES).insertOne(newLine);
    }
    // else
    let collectionName = tables.MEDIA;
    let forID = ObjectId(mediaID);
    if (type === revisionTypes.LINE_EDIT) {
      collectionName = tables.LINES;
      forID = ObjectId(data.original._id);
    }
    const queryObj = { _id: ObjectId(forID) };
    const updateObj = {
      $currentDate: { lastModified: true },
      $set: data.changes,
      $inc: { version: 1 },
    };


    return db(collectionName)
      .findOneAndUpdate(queryObj, updateObj, { returnOriginal: false })
      .then(result => result.value);
  }

  this.execute = onUpdateRequest;
}

// db that throws errors
function each(cb) {
  cb(new Error(), null);
}

function aggregate() {
  return { each };
}

const rejectError = sinon.stub();
rejectError.rejects(new Error('mock error'));

/* function rejectError() {
  return Promise.reject(new Error());
}*/

/* const forEach = sinon.stub();
forEach.callsArgOnWith(1, 'cat');
*/

function forEach(it, cb) {
  cb(new Error());
}

const faultyCursor = { forEach };

function find(query) {
  //console.log(`query ${query} will fail`);
  console.log(query);
  debugger;
  return faultyCursor;
}

function errorDB(name) {
  console.log(`collection ${name} will fail`);
  debugger;
  const collection = {
    aggregate,
    findOne: rejectError,
    find,
  };
  return collection;
}

function callBack(cb) {
  cb();
}

const collection = {
  // findAndModify: callBack,
  // findOne: callBack,
  insertOne: sinon.stub(),
};

collection.insertOne.resolves();

function mockDB() {
  return collection;
}
mockDB.reset = () => {
  Object.values(collection).forEach(((meth) => {
    meth.resetHistory();
  }));
};

function dbObjGenerator(DB, TABLE_NAME, METHOD, behavior) {
  return (tableName) => {
    if (tableName === TABLE_NAME) {
      const originalCollection = DB(tableName);
      // originalCollection.constructor.prototype[METHOD] = behavior;
      originalCollection[METHOD] = behavior;
      return originalCollection;
    }

    return DB(tableName);
  };
}

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
  ensureLoggedIn,
  Revision,
  errorDB,
  mockDB,
  dbObjGenerator,
  configureAjaxBehavior,
};
