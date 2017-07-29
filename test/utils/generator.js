/* eslint camelcase: 0 */
import request from 'supertest';
import APP from '../../lib/app';
import aggregateActvity from '../../lib/review-changes';
import TestDB from './db';
import { tables } from '../../lib/constants';
import { mediaTypes } from '../../react/keduije-media';
import { users as Users, mail } from './mocks';

require('dotenv').config();

let server;
let db;

const users = [];
const media = [];
const lines = {};
const dirty = {};
let activeUser = null;

function printResults() {
  console.log(`${users.length} users generated`);
  console.log(`${media.length} media generated`);
  let toBackupCnt = 0;
  Object.values(dirty).forEach((isDirty) => {
    if (isDirty) toBackupCnt += 1;
  });
  console.log(`${toBackupCnt} need to be backedup`);
  Object.keys(lines).forEach((m) => {
    console.log(`media(${m}) has ${lines[m].length} lines`);
  });
}

const ensureLoggedIn = (req, res, next) => {
  req.user = activeUser;
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

APP.__Rewire__('ensureLoggedIn', () => ensureLoggedIn);
APP.__Rewire__('DB_URL', process.env.TEST_DB_URL);
APP.__Rewire__('users', Users);
APP.__Rewire__('mail', mail);


function createUser() {
  const facebookID = users.length;
  const newUser = {
    facebookID,
    displayName: `fbuser${facebookID}`,
    role: 'admin',
    isAdmin: true,
    photo: `http://graph.facebook.com/v2.8/${facebookID}/picture`,
    lastLogin: new Date(),
  };
  return db(tables.USERS).insertOne(newUser).then(() => {
    users.push(newUser);
  });
}

function setUser(index) {
  const idx = (typeof index === 'undefined') ? 0 : index;
  activeUser = users[idx];
  return Promise.resolve();
}

function navigate_NEW_MUSIC() {
  return request(server)
    .get('/new_music')
    .then((res) => {
      const changesetID = res.header['inserted-id'];
      console.log(`started "new" changeset(${changesetID})`);
      return changesetID;
    })
    .catch((err) => {
      console.error(err);
      debugger;
    });
}

function action_NEW_MUSIC_save(changesetID) {
  const mediaCnt = media.length;

  let type = mediaTypes.AUDIO;
  let videoID = null;
  if (Math.random() > 0.5) {
    type = mediaTypes.VIDEO;
    videoID = `video${mediaCnt}`;
  }
  const title = `media${mediaCnt}`;
  const src = `http://src${mediaCnt}`;
  const img = `http://img${mediaCnt}.jpg`;

  const mediaObj = {
    type,
    title,
    src,
    img,
    videoID,
    changesetID,
  };
  return request(server)
    .post('/api/media/new')
    .send(mediaObj)
    .then((res) => {
      const mediaID = res.header['inserted-id'];
      console.log(`created new media (${mediaID})`);
      media.push(mediaID);
      lines[mediaID] = [];
      dirty[mediaID] = false;
    });
}

function chooseElement(options, miss) {
  let addition = 0;
  if (typeof miss !== 'undefined') {
    addition = miss;
  }
  if ((options === null) || (typeof options === 'undefined')) return undefined;
  const choice = options[Math.floor(Math.random() * (options.length + addition))];
  return choice;
}

class Node {
  constructor(url, behavior, nextPaths) {
    this.url = url;
    this.behavior = behavior;
    this.nextPaths = nextPaths;
  }

  runChild(param, children) {
    if (children.length < 1) return null;

    const link = children.shift();
    if (typeof link === 'undefined') return null;

    return link.run(param).then(() => this.runChild(param, children));
  }

  run(param) {
    // console.log(`running '${this.url}'`);

    let children;
    if (typeof this.nextPaths === 'function') {
      children = this.nextPaths();
    } else {
      const link = chooseElement(this.nextPaths, 0);
      children = [link];
    }

    return this.behavior(param).then((ret) => {
      if (ret && ret.break) return null;
      return this.runChild(ret, children);
    });
  }
}

// save --> null
const save_music = new Node('save', action_NEW_MUSIC_save);

// new_music --> save_music
let toCancelNewMusic = 0;
const new_music = new Node('new_music', navigate_NEW_MUSIC, () => {
  toCancelNewMusic += 1;

  let result = save_music;
  if (toCancelNewMusic % 4 === 0) {
    console.log('will navigate away from new_music page without saving');
    result = undefined;
  }
  // [save_music]
  return [result];
});

// addline --> null
const addline = new Node('addline', (params) => {
  const changesetID = params.changesetID;
  const mediaID = params.mediaID;

  const lineCnt = lines[mediaID].length;

  const text = `line${lineCnt}`;
  const startTime = lineCnt * 5;
  const endTime = startTime + 4;

  const lineObj = {
    text,
    startTime,
    endTime,
    changesetID,
  };
  return request(server)
    .post(`/api/media/${mediaID}/addline`)
    .send(lineObj)
    .then((res) => {
      console.log(`added new line "${lineObj.text}" to media(${mediaID})`);
      lines[mediaID] = res.body;
      dirty[mediaID] = true;
    });
});

// updateLine --> null
const updateLine = new Node('updateLine', (params) => {
  const changesetID = params.changesetID;
  const mediaID = params.mediaID;

  const currLine = chooseElement(lines[mediaID]);

  if (typeof currLine === 'undefined') return Promise.resolve();

  const text = `${currLine.text}_updated`;

  const updateObj = {
    original: currLine,
    changes: { text },
    changesetID,
    mediaID,
  };
  return request(server)
    .post(`/api/media/${mediaID}/updateLine`)
    .send(updateObj)
    .then((res) => {
      console.log(`updated line from "${updateObj.original.text}" to "${updateObj.changes.text}"`);
      lines[mediaID] = res.body;
      dirty[mediaID] = true;
    });
});


let toCancelEdit = 0;
// start_edit --> addline, updateline
const start_edit = new Node('start_edit', (mediaID) => {
  if (!mediaID) return Promise.resolve({ break: true });

  return request(server)
    .post(`/api/start_edit/${mediaID}`)
    .then((res) => {
      const changesetID = res.text;
      console.log(`started "update" changeset(${changesetID})`);
      return {
        changesetID,
        mediaID,
      };
    })
    .catch((err) => {
      console.error(err);
    });
}, () => {
  toCancelEdit += 1;

  const children = [];

  if (toCancelEdit % 3 === 0) {
    console.log('will cancel edit without making any revisions');
  } else {
    for (let i = 0; i < 10; i += 1) {
      children.push(chooseElement([addline, updateLine]));
    }
  }

  return children;
});

const view_song = new Node('view_song', () => {
  const currMedia = chooseElement(media);
  return Promise.resolve(currMedia);
}, [start_edit]);

const review_changes = new Node(
  'review_changes',
  () => {

    debugger;
    return aggregateActvity(db);
  },
);

const browse = new Node('browse', () => setUser(), () => {
  const children = [new_music, new_music];
  for (let i = 0; i < 10; i += 1) {
    children.push(chooseElement([new_music, view_song]));
  }
  children.push(new_music);
  children.push(new_music);
  children.push(review_changes);

  return children;
});

function start() {
  const env = process.env;
  env.DB_URL = process.env.LOCAL_DB ? process.env.LOCAL_DB_URL : process.env.TEST_DB_URL;
  return APP(env).then((result) => {
    server = result.server;
    db = result.db;
    return TestDB.clear(db);
  });
}

function runBasicStory() {
  return start()
    .then(createUser)
    .then(() => browse.run())
    .catch((err) => {
      console.error(err);
    })
    .then(() => {
      printResults();
      db._DB.close();
      process.exit();
    });
}

runBasicStory();
