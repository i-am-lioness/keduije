/* eslint camelcase: 0 */
import request from 'supertest';
import APP from '../../lib/app';
import reviewChanges from '../../lib/review-changes';
import backupMedia from '../../lib/backup';
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
const mediaInfo = {};
let activeUser = null;

const CANCEL_EDIT = 'cancel_edit';
const DELETE_SONG = 'delete_song';
const DONT_SAVE = 'dont_save';

function printResults() {
  console.log(`${users.length} users generated`);
  console.log(`${media.length} media generated`);
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

function navigate_NEW_MUSIC(toSave) {
  return request(server)
    .get('/new_music')
    .then((res) => {
      const changesetID = res.header['inserted-id'];
      console.log(`started "new" changeset(${changesetID})`);
      return { changesetID, toSave };
    })
    .catch((err) => {
      console.error(err);
      debugger;
    });
}

function action_NEW_MUSIC_save(params) {
  if (params.toSave === DONT_SAVE) {
    console.log('will navigate away from new_music page without saving');
    return Promise.resolve(null);
  }

  const changesetID = params.changesetID;

  const mediaCnt = media.length;

  let type = mediaTypes.AUDIO;
  let videoID = null;
  if (Math.random() > 0.5) {
    type = mediaTypes.VIDEO;
    videoID = `video${mediaCnt}`;
  }
  const title = `media${mediaCnt}`;
  const artist = `artist${mediaCnt}`;
  const src = `http://src${mediaCnt}`;
  const img = `http://img${mediaCnt}.jpg`;

  const mediaObj = {
    type,
    title,
    artist,
    src,
    img,
    videoID,
    changesetID,
    version: 1,
  };
  return request(server)
    .post('/api/media/new')
    .send(mediaObj)
    .then((res) => {
      const mediaID = res.header['inserted-id'];
      console.log(`created new media (${mediaID})`);
      media.push(mediaID);
      lines[mediaID] = [];
      mediaInfo[mediaID] = mediaObj;
    });
}

function chooseElement(options) {
  if ((options === null) || (typeof options === 'undefined')) return undefined;

  const choice = options[Math.floor(Math.random() * options.length)];

  return choice;
}

class Node {
  constructor(url, behavior, nextPaths) {
    this.url = url;
    this.behavior = behavior;
    this.nextPaths = nextPaths;
  }

  with(...params) {
    return new Node(
      this.url,
      () => this.behavior(...params),
      this.nextPaths,
    );
  }

  runChild(param, children) {
    if (children.length < 1) return null;

    const link = children.shift();
    if (typeof link === 'undefined') return null;

    return link.run(param).then(() => this.runChild(param, children));
  }

  run(param) {
    // console.log(`running '${this.url}'`);

    return this.behavior(param).then((ret) => {
      let children;

      // if function, it follows all of returned children
      if (typeof this.nextPaths === 'function') {
        children = this.nextPaths(ret);
      } else { // if object, it follows just one of them
        const link = chooseElement(this.nextPaths, 0);
        children = [link];
      }

      return this.runChild(ret, children);
    });
  }
}

// save --> null
const save_music = new Node('save', action_NEW_MUSIC_save);

// new_music --> save_music
const new_music = new Node('new_music', navigate_NEW_MUSIC, [save_music]);

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
    });
});

// updateLine --> null
const updateLine = new Node('updateLine', (params) => {
  const changesetID = params.changesetID;
  const mediaID = params.mediaID;

  const currLine = chooseElement(lines[mediaID]);

  if (typeof currLine === 'undefined') return Promise.resolve();

  const changes = chooseElement([
    { text: `${currLine.text}_updated` },
    { deleted: true },
    { text: 'hello' },
    { startTime: currLine.startTime + 1 },
    { endTime: currLine.startTime - 1 },
  ]);

  const updateObj = {
    original: currLine,
    changes,
    changesetID,
    mediaID,
  };
  return request(server)
    .post(`/api/media/${mediaID}/updateLine`)
    .send(updateObj)
    .then((res) => {
      console.log(`updated line from "${updateObj.original.text}" to "${updateObj.changes.text}"`);
      lines[mediaID] = res.body;
    });
});

// updateInfo --> null
const updateInfo = new Node('updateInfo', (params) => {
  const changesetID = params.changesetID;
  const mediaID = params.mediaID;

  const original = mediaInfo[mediaID];

  let changes;
  if (params.path === DELETE_SONG) {
    changes = { status: 'deleted' };
  } else {
    changes = chooseElement([
      { artist: `${original.artist}_updated` },
      { title: `${original.artist}_` },
      { src: `${original.artist}_updated` },
      { img: `${original.artist}_updated` },
    ]);
  }

  const updateObj = {
    original,
    changes,
    changesetID,
    mediaID,
  };
  return request(server)
    .post(`/api/media/${mediaID}/updateInfo`)
    .send(updateObj)
    .then((res) => {
      console.log(`updated media info from "${updateObj.original.artist}" to "${updateObj.changes.artist}"`);
      mediaInfo[mediaID] = res.body;
    });
});

// start_edit --> addline, updateline
const start_edit = new Node('start_edit', (params) => {
  const mediaID = media[params.mediaIdx];

  return request(server)
    .post(`/api/start_edit/${mediaID}`)
    .then((res) => {
      const changesetID = res.text;
      console.log(`started "update" changeset(${changesetID})`);
      return {
        changesetID,
        mediaID,
        path: params.path,
      };
    })
    .catch((err) => {
      console.error(err);
    });
}, (params) => {
  debugger;
  const children = [];

  if (params.path === CANCEL_EDIT) {
    console.log('will cancel edit without making any revisions');
  } else if (params.path === DELETE_SONG) {
    children.push(updateInfo.with(params));
  } else {
    for (let i = 0; i < 10; i += 1) {
      children.push(chooseElement([addline, updateLine, updateLine, updateLine, updateInfo]));
    }
  }

  return children;
});

const view_song = new Node(
  'view_song',
  (mediaIdx, path) => Promise.resolve({ mediaIdx, path }),
  [start_edit],
);

const review_changes = new Node(
  'review_changes',
  () => {
    console.log('=== REVIEW CHANGES ===');
    return reviewChanges(db);
  },
);

const backup = new Node(
  'backup',
  () => {
    console.log('=== BACKUP ===');
    return backupMedia(db);
  });

const browse = new Node('browse', () => setUser(), () => [
  new_music, // 0
  new_music, // 1
  new_music, // 2
  new_music, // 3
  new_music, // 4
  new_music, // 5
  new_music, // 6
  view_song.with(0),
  view_song.with(0),
  view_song.with(1),
  view_song.with(2),
  view_song.with(2),
  view_song.with(2),
  view_song.with(2),
  view_song.with(2),
  view_song.with(2),
  view_song.with(3),
  view_song.with(3), // 4 songs "dirty", 2 songs clean
  review_changes, // 4 marked for back-up
  backup, // 4 snapshots
  view_song.with(0),
  view_song.with(0),
  view_song.with(1),
  view_song.with(1),
  view_song.with(1),
  view_song.with(1),
  review_changes, // 2 marked for backup
  view_song.with(2),
  view_song.with(3),
  view_song.with(3),
  view_song.with(4, DELETE_SONG),
  view_song.with(5), // total of 6 dirty" (4 of which yet to be marked )
  new_music.with(DONT_SAVE),
  new_music.with(DONT_SAVE),
  new_music.with(DONT_SAVE), // 3 extraneous "new" changesets
  view_song.with(0, CANCEL_EDIT),
  view_song.with(2, CANCEL_EDIT),
  view_song.with(2, CANCEL_EDIT),
  view_song.with(3, CANCEL_EDIT),
  view_song.with(3, CANCEL_EDIT), // 5 extraneous "update" changesets
  new_music,
  new_music, //to have 2 unprocessed new media that will remain after review_change
]);

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
