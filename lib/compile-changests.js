
let db;

function updateOrDeleteChangeset(c) {
  if (c.children > 0) {
    const updateDoc = {
      revisions: c.revisions,
      lines: c.lines,
    };
    return db.collection('changeset').updateOne({ _id: c._id, updateDoc });
  }
  return db.collection('changeset').deleteOne({ _id: c._id });
}

function aggregateActvity(_db) {
  console.log('Scanning changesets.');
  db = _db;
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
        lines: 1,
        revisions: 1,
        media: 1,
        allTime: { $add: ['$allTime', '$current'] },
        children: { $add: [
          { $size: '$revisions' },
          { $size: '$lines' },
          { $size: '$media' }
        ] },
      } }
    ]).each((err, cs) => {
      if (err) console.error(err);
      if (cs) {
        // console.log(cs);
        e = updateOrDeleteChangeset(cs);
        empties.push(e);
      } else {
        Promise.all(empties).then(resolve);
      }
    });
  });
}

module.exports = aggregateActvity;
