/* eslint camelcase: 0 */
import fs from 'fs';
import path from 'path';
import TestDB from './db';
import { tables } from '../../lib/constants';

require('dotenv').config();

function saveToFile(text, name) {
  return new Promise((resolve, reject) => {
    const fileName = path.resolve(__dirname, `data/${name}.json`);
    console.log('fileName', fileName);
    fs.writeFile(fileName, text, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

let db;

const toDump = ['CHANGESETS', 'MEDIA', 'LINES', 'SNAPSHOTS'];
const counts = {};

function dumpTable() {
  if (toDump.length < 1) return null;

  const table = toDump.pop();

  return db(tables[table]).find().toArray().then((arr) => {
    counts[table] = arr.length;
    const str = JSON.stringify(arr);
    return saveToFile(str, tables[table]);
  })
  .then(dumpTable);
}

let statsText = '';

function log(text) {
  console.log(text);
  statsText += `${text}\n`;
}
function saveStatsFile() {
  return new Promise((resolve, reject) => {
    const fileName = path.resolve(__dirname, 'data/data_stats.txt');
    fs.writeFile(fileName, statsText, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

function countChangesets() {
  return db(tables.CHANGESETS).count().then((cnt) => {
    log(`Total Changesets: ${cnt}`);
  });
}
function countProcessedChangesets() {
  return db(tables.CHANGESETS).count({ processed: true }).then((cnt) => {
    log(`Processed Changesets: ${cnt}`);
  });
}
function countNewChangesets() {
  return db(tables.CHANGESETS).count({ type: 'new' }).then((cnt) => {
    log(`"new" Changesets: ${cnt}`);
  });
}
function countEditChangesets() {
  return db(tables.CHANGESETS).count({ type: 'edit' }).then((cnt) => {
    log(`"edit" Changesets: ${cnt}`);
  });
}
function countExraneousChangesets() {
  return db(tables.CHANGESETS).count({
    $or: [
      { type: 'new', media: { $exists: false } },
      { type: 'edit', revisions: { $size: 0 } },
    ],
  })
  .then((cnt) => {
    log(`empty changesets: ${cnt}`);
  });
}
function countRevisionlessEdits() {
  return db(tables.CHANGESETS).count(
      { type: 'edit', revisions: { $size: 0 } },
  )
  .then((cnt) => {
    log(`empty "edit" changesets: ${cnt}`);
  });
}
function countUnfinishedMediaCreations() {
  return db(tables.CHANGESETS).count(
      { type: 'edit', revisions: { $size: 0 } },
  )
  .then((cnt) => {
    log(`childless "new" changesets: ${cnt}`);
  });
}
function countMedia() {
  return db(tables.MEDIA).count().then((cnt) => {
    log(`Total Media: ${cnt}`);
  });
}
function countDirtyMedia() {
  return db(tables.MEDIA).count({ toBackup: true }).then((cnt) => {
    log(`Media to backup: ${cnt}`);
  });
}
function countSnapshots() {
  return db(tables.SNAPSHOTS).count().then((cnt) => {
    log(`Total Snapshots: ${cnt}`);
  });
}
function mediaStats() {
  return new Promise((resolve, reject) => {
    db(tables.MEDIA).aggregate([
      { $lookup: {
        from: 'lines',
        localField: '_id',
        foreignField: 'media',
        as: 'lines',
      } },
      { $lookup: {
        from: 'changesets',
        localField: '_id',
        foreignField: 'media',
        as: 'changesets',
      } },
      { $lookup: {
        from: 'snapshots',
        localField: '_id',
        foreignField: 'media',
        as: 'snapshots',
      } },
    ]).each((err, m) => {
      if (err) {
        reject(err);
      } else if (m) {
        log(`${m.title} has ${m.lines.length} lines, ${m.changesets.length} changesets, and ${m.snapshots.length} snapshots.`);
      } else {
        resolve();
      }
    });
  });
}

function printStats() {
  const queries = [
    countChangesets(),
    countNewChangesets(),
    countEditChangesets(),
    countProcessedChangesets(),
    countExraneousChangesets(),
    countUnfinishedMediaCreations(),
    countRevisionlessEdits(),
    countMedia(),
    countDirtyMedia(),
    countSnapshots(),
    mediaStats(),
  ];

  return Promise.all(queries).then(saveStatsFile);
}

function dump() {
  return TestDB.open().then((_db) => {
    db = _db;
    return dumpTable();
  })
  .catch((err) => {
    console.error(err);
  })
  .then(printStats)
  .then(() => {
    process.exit();
  });
}

dump();
