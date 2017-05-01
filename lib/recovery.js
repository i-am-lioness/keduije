require('dotenv').config();
const revision = require('../lib/revision.js');

let db;
const dateThreshold = new Date();
dateThreshold.setMinutes(dateThreshold.getMinutes() - 30);


function deleteChangeset(c) {
  console.log('to delete changeset #', c._id);
  return db.collection('changesets').deleteOne({ _id: c._id }).then(() => {
    console.log('successfuly deleted changeset #', c._id);
  }).catch((err) => {
    console.log(`Failed to delete changeset #${c._id} (${err})`);
  });
}

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

function forEmptyChangesets() {
  console.log('Scanning for empty changesets.');
  return new Promise((resolve, reject) => {
    const empties = [];
    let e;
    db.collection('changesets').aggregate([
      { $project: { _id: true } },
      { $lookup: {
        from: 'media',
        localField: '_id',
        foreignField: 'changeset',
        as: 'media',
      } },
      { $lookup: {
        from: 'revisions',
        localField: '_id',
        foreignField: 'changeset',
        as: 'revisions',
      } },
      { $lookup: {
        from: 'lines',
        localField: '_id',
        foreignField: 'changeset',
        as: 'lines',
      } },
      { $project: {
        updates: { $size: '$revisions' },
        adds: { $size: '$lines' },
        listings: { $size: '$media' },
      } },
      { $project: {
        children: { $add: ['$updates', '$adds', '$listings'] },
      } },
      { $match: {
        children: 0,
      } }
    ]).each((err, cs) => {
      if (err) console.error(err);
      if (cs) {
        // console.log(cs);
        e = deleteChangeset(cs);
        empties.push(e);
      } else {
        Promise.all(empties).then(resolve);
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
    .then(forCanceled)
    .catch(logError)
    .then(forEmptyChangesets)
    .catch(logError);
}

module.exports = recovery;
