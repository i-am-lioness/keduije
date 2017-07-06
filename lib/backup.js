import { tables } from './constants';

let db;


function saveSnapshot(m) {
  const snapshot = Object.assign({}, m);
  snapshot.media = m._id;
  delete snapshot._id;

  return db(tables.SNAPSHOTS).insertOne(snapshot).then(() => {
    console.log('successfuly saved snapshot for  media #', m._id);
  }).catch((err) => {
    console.log(`Failed to save snapshot for media #${m._id} (${err})`);
  })
  .then(() => db(tables.MEDIA)
    .updateOne({ _id: snapshot.media }, { $set: { toBackup: false } })
  );
}

function backupMedia(_db) {
  console.log('Scanning for empty changesets.');
  db = _db;
  return new Promise((resolve, reject) => {
    const snapshots = [];
    let s;
    db(tables.MEDIA).aggregate([
      { $match: { toBackup: true },
      },
      { $lookup: {
        from: 'lines',
        localField: '_id',
        foreignField: 'media',
        as: 'lines',
      } },
      /*{ $project: {
        title: 1,
        artist: 1,
        img: 1,
        lines: 1,
      } }*/
    ]).each((err, media) => {
      if (err) console.error(err);
      if (media) {
        s = saveSnapshot(media);
        snapshots.push(s);
      } else {
        Promise.all(snapshots).then(resolve);
      }
    });
  });
}

module.exports = backupMedia;
