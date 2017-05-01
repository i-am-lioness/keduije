

let db;


function calculateWeeklyTotal(m) {
  const updateDoc = {
    $push: {
      'stats.history': {
        $each: [m.stats.views],
        $slice: -7,
      },
    },
    $set: {
      'stats.weeklyTotal': m.weeklyTotal,
      'stats.views': 0,
    },
  };
  return db.collection('media').updateOne({ _id: m._id }, updateDoc).then(() => {
    console.log('successfuly calculated view history for media #', m._id);
  }).catch((err) => {
    console.log(`Failed to calculate view history for media #${m._id} (${err})`);
  });
}

function aggegateViewCounts(_db) {
  console.log('Scanning for empty changesets.');
  db = _db;
  return new Promise((resolve, reject) => {
    const snapshots = [];
    let s;
    db.collection('media').aggregate([
      { $project: {
        'stats.views': 1,
        weeklyTotal: { $sum: '$stats.history' },
      } }
    ]).each((err, media) => {
      if (err) console.error(err);
      if (media) {
        console.log('weeklyTotal', media.weeklyTotal);
        s = calculateWeeklyTotal(media);
        snapshots.push(s);
      } else {
        Promise.all(snapshots).then(resolve);
      }
    });
  });
}

module.exports = aggegateViewCounts;
