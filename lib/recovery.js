require('dotenv').config();
const revision = require('../lib/revision.js');

let db;
const dateThreshold = new Date();
dateThreshold.setMinutes(dateThreshold.getMinutes() - 30);

function processRevisions() {
  console.log('Scanning for pending revisions.');
  return new Promise((resolve, reject) => {
    const pending = [];

    db.collection('revisions')
    .find({ lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('recovering pending revision:', r._id);
      const p = revision(db).recover(r).then(() => {
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

function logError(err) {
  console.error(err);
}

function recovery(_db) {
  db = _db;

  return processRevisions()
    .catch(logError);
}

module.exports = recovery;
