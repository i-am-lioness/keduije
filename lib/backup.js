import { tables } from './constants';

let db;


function saveSnapshot(m) {
  const snapshot = Object.assign({}, m);
  snapshot.media = m._id;
  delete snapshot._id;

  return db(tables.SNAPSHOTS).insertOne(snapshot).then(() => {
    console.log(`successfuly saved snapshot for media "${m.title}"`);
  })
  .then(() => db(tables.MEDIA)
    .updateOne({ _id: snapshot.media }, { $set: { toBackup: false } })
  );
}

const pipeline = [
  { $match: { toBackup: true } },
  { $lookup: {
    from: 'lines',
    localField: '_id',
    foreignField: 'media',
    as: 'lines',
  } }
];

function backupMedia(_db) {
  console.log('Scanning for empty changesets.');
  db = _db;
  return new Promise((resolve, reject) => {
    const snapshots = [];
    let s;
    db(tables.MEDIA)
      .aggregate(pipeline)
      .each((err, media) => {
        if (err) {
          console.error(err);
          reject(err);
        } else if (media) {
          s = saveSnapshot(media);
          snapshots.push(s);
        } else {
          Promise.all(snapshots).then(resolve);
        }
      });
  });
}

module.exports = backupMedia;
