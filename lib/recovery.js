import { tables } from './constants';

const Revision = require('../lib/revision.js');
const Rollback = require('../lib/rollback.js');

let db;
const dateThreshold = new Date();
dateThreshold.setMinutes(dateThreshold.getMinutes() - 30);

function processRevisions() {
  console.log('Scanning for pending revisions.');
  return new Promise((resolve, reject) => {
    const pending = [];

    db(tables.REVISIONS)
    .find({ lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('recovering pending revision:', r._id);
      const p = (new Revision(db)).recover(r).then(() => {
        console.log(`revision #${r._id} successfully processed`);
      }).catch((err) => {
        console.log(`revision #${r._id} failed to processed (${err})`);
      });
      pending.push(p);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(pending).then(resolve);
      }
    });
  });
}

function processRollbacks() {
  console.log('Scanning for pending rollbacks.');
  return new Promise((resolve, reject) => {
    const pending = [];

    const q = {
      type: 'rollback',
      state: { $nin: ['done', 'canceled'] },
      lastModified: { $lt: dateThreshold },
    };

    db(tables.CHANGESETS)
    .find(q)
    .forEach((r) => {
      console.log('recovering pending rollbacks:', r._id);
      const p = (new Rollback(db)).recover(r).then(() => {
        console.log(`rollback #${r._id} successfully processed`);
      }).catch((err) => {
        console.log(`rollback #${r._id} failed to processed (${err})`);
      });
      pending.push(p);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(pending).then(resolve);
      }
    });
  });
}

function logError(err) {
  console.error(err);
}

function recovery(_db) {
  db = _db;

  return processRevisions()
    .catch(logError)
    .then(processRollbacks)
    .catch(logError);
}

module.exports = recovery;
