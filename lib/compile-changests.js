
let db;

function updateOrDeleteChangeset(c) {
  const q = { _id: c._id };
  let updateDoc;
  debugger;
  if (c.children > 0) {
    if (c.type === 'new') {
      updateDoc = { media: c.media[0] };
    } else {
      updateDoc = {
        revisions: c.revisions,
        lines: c.lines,
      };
    }
    return db.collection('changesets').updateOne(q, { $set: updateDoc });
  }
  return db.collection('changesets').deleteOne(q);
}

function aggregateActvity(_db) {
  console.log('Scanning changesets.');
  db = _db;
  return new Promise((resolve, reject) => {
    const empties = [];
    let e;
    db.collection('changesets').aggregate([
      { $project: { _id: true, type: true } },
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
        type: 1,
        lines: 1,
        revisions: 1,
        media: 1,
        // allTime: { $add: ['$allTime', '$current'] },
        children: { $add: [
          { $size: '$revisions' },
          { $size: '$lines' },
          { $size: '$media' }
        ] },
      } }
    ]).each((err, cs) => {
      if (err) console.error(err);
      if (cs !== null) {
        // console.log(cs);
        e = updateOrDeleteChangeset(cs);
        empties.push(e);
      } else {
        Promise.all(empties).then(resolve).catch(reject);
      }
    });
  });
}

module.exports = aggregateActvity;
