require('dotenv').config();
const revision = require('../lib/revision.js');

let db;
const dateThreshold = new Date();
dateThreshold.setMinutes(dateThreshold.getMinutes() - 30);


function forPending() {
  console.log('Scanning for pending revisions.');
  return new Promise((resolve, reject) => {
    const pending = [];

    db.collection('revisions')
    .find({ state: 'pending', lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('recovering pending revision:', r._id);
      const p = revision(db).processRevision(r).then(() => {
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

function forApplied() {
  console.log('Scanning for applied revisions.');
  return new Promise((resolve, reject) => {
    const applied = [];

    db.collection('revisions')
    .find({ state: 'applied', lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('finishing applied revision:', r);
      const a = revision(db).finishRevision(r);
      applied.push(a);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(applied).then(resolve);
      }
    });
  });
}

function forDone() {
  console.log('Scanning for done revisions.');
  return new Promise((resolve, reject) => {
    const dones = [];

    db.collection('revisions')
    .find({ state: 'done', lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('finishing applied revision:', r);
      const d = revision(db).logRevision(r);
      dones.push(d);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(dones).then(resolve);
      }
    });
  });
}

function forLogged() {
  console.log('Scanning for done revisions.');
  return new Promise((resolve, reject) => {
    const logged = [];

    db.collection('revisions')
    .find({ state: 'logged', lastModified: { $lt: dateThreshold } })
    .forEach((r) => {
      console.log('clearing logged revision:', r);
      const l = revision(db).clearRevision(r);
      logged.push(l);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(logged).then(resolve);
      }
    });
  });
}
// todo: also remove revisions withe empty "newValues"
function forCanceled() {
  console.log('Scanning for canceled revisions.');
  return new Promise((resolve, reject) => {
    const canceled = [];

    db.collection('revisions')
    .find({ state: 'canceled' })
    .forEach((r) => {
      console.log('deleting canceled revision:', r._id);
      const c = db.collection('revisions')
        .deleteOne({ _id: r._id })
        .then(() => {
          console.log(`revision #${r._id} successfully deleted`);
        })
        .catch((err) => {
          console.log(`revision #${r._id} failed to delete (${err})`);
        });
      canceled.push(c);
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        Promise.all(canceled).then(resolve);
      }
    });
  });
}

function logError(err) {
  console.error(err);
}

function recovery(_db) {
  db = _db;

  return forPending()
    .catch(logError)
    .then(forApplied)
    .catch(logError)
    .then(forDone)
    .catch(logError)
    .then(forLogged)
    .catch(logError)
    .then(forCanceled)
    .catch(logError);
}

module.exports = recovery;
