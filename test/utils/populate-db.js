import { newMedia } from './client-data';
import { changesets, lines, revisions, media } from './data';

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

  return db.collection('lines').insertOne(newLine)
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
  return db.collection('media').insertOne(newMedia[0]).then((res) => {
    mediaID = res.insertedId;
    return mediaID;
  });
}

function loadLines() {
  return db.collection('lines').insertMany(lines).then(() => lines.length);
}

function loadChangesets() {
  return db.collection('changesets').insertMany(changesets).then(() => changesets.length);
}

function loadRevisions() {
  return db.collection('revisions').insertMany(revisions).then(() => revisions.length);
}

function loadMedia() {
  return db.collection('media').insertMany(media).then(() => media.length);
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
  };
}

export default populate;
