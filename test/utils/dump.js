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

const toDump = ['CHANGESETS', 'MEDIA', 'LINES'];
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

/* function printStats() {
}*/

function dump() {
  return TestDB.open().then((_db) => {
    db = _db;
    return dumpTable();
  })
  .catch((err) => {
    console.error(err);
  })
  .then(() => {
    console.log('done');
    process.exit();
  });
}

dump();
