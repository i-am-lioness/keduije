
let db;

function deleteChangeset(q, updateDoc) {
  return db.collection('changesets').deleteOne(q);
}

function updateChangeset(q, updateDoc) {
  return db.collection('changesets').updateOne(q, { $set: updateDoc });
}

function processMediaCreate(c, q, updateDoc) {
  if ((c.mediaArr) && (c.mediaArr.length > 0)) {
    updateDoc.media = c.mediaArr[0];
    return updateChangeset(q, updateDoc);
  }
  return deleteChangeset(q);
}

function processMediaUpdate(c, q, updateDoc) {
  if ((c.revisions) && (c.revisions.length > 0)) {
    return db.collection('media').updateOne({ _id: c.media }, { $set: { toBackup: true } })
      .then(() => {
        updateChangeset(q, updateDoc);
      });
  }
  return deleteChangeset(q);
}

function processChangeset(c) {
  const q = { _id: c._id };
  const updateDoc = { processed: true };

  if (c.type === 'new') {
    return processMediaCreate(c, q, updateDoc);
  }
  return processMediaUpdate(c, q, updateDoc);
}

function aggregateActvity(_db) {
  console.log('Scanning changesets.');
  db = _db;

  return new Promise((resolve, reject) => {
    const empties = [];
    let e;
    db.collection('changesets').aggregate([
      { $match: { processed: { $ne: true } } },
      { $lookup: {
        from: 'media',
        localField: '_id',
        foreignField: 'changeset',
        as: 'mediaArr',
      } }
    ]).each((err, cs) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      if (cs !== null) {
        e = processChangeset(cs);
        empties.push(e);
      } else {
        Promise.all(empties).then(resolve).catch(reject);
      }
    });
  });
}

module.exports = aggregateActvity;
