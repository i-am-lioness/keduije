import { newMedia } from './client-data';
import { changesets, lines, revisions, media, snapshots } from './data';
import { tables } from '../../lib/constants';

const ObjectId = require('mongodb').ObjectId;

let db;
let mediaID;

function addLines(cnt) {
  const i = cnt - 1;
  const newLine = {
    text: `line ${i}`,
    startTime: i * 6,
    endTime: i * 7,
  };

  /* newLine.creator = req.user._id;
  newLine.changeset = ObjectId(changesetID); */
  newLine.media = ObjectId(mediaID);
  newLine.version = 1;
  newLine.deleted = false;
  newLine.heading = null;

  return db(tables.LINES).insertOne(newLine)
    .then(() => {
      if (i > 0) {
        return addLines(i);
      }
      return null;
    });
}

function addMedia() {
  newMedia[0].stats = {
    views: 0,
    history: [],
    weeklyTotal: 0,
    allTime: 0,
  };
  return db(tables.MEDIA).insertOne(newMedia[0]).then((res) => {
    mediaID = res.insertedId;
    return mediaID;
  });
}

function loadLines() {
  return db(tables.LINES).insertMany(lines).then(() => lines.length);
}

function loadChangesets() {
  return db(tables.CHANGESETS).insertMany(changesets).then(() => changesets.length);
}

function loadRevisions() {
  return db(tables.REVISIONS).insertMany(revisions).then(() => revisions.length);
}

function loadMedia() {
  return db(tables.MEDIA).insertMany(media).then(() => media.length);
}

function loadSnapshots() {
  return db(tables.SNAPSHOTS).insertMany(snapshots).then(() => snapshots.length);
}

function populate(_db) {
  db = _db;

  return {
    addLines,
    addMedia,
    loadLines,
    loadChangesets,
    loadRevisions,
    loadMedia,
    loadSnapshots,
  };
}

export default populate;
